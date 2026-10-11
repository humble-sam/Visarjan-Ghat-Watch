import Papa from 'papaparse';
import type { Festival, Phase, Reading, Site, TrackData } from '../shared/types';
import { normalizeReadingValue, type RawCsvRow } from './loadTrackData';

// Officer-supplied reports for later years. Uploads use the same column layout as
// bhopal_ghats_2023_2025.csv so they flow through the same analysis unchanged.

export const UPLOAD_COLUMNS = [
  'year', 'festival', 'site', 'water_body', 'phase', 'parameter', 'value', 'unit_assumed', 'flag',
  'value_as_printed', 'parameter_as_printed', 'site_as_printed', 'site_match_confidence', 'source_page',
] as const;
const REQUIRED_COLUMNS = ['year', 'festival', 'site', 'phase', 'parameter', 'value', 'flag', 'source_page'] as const;

export const UPLOAD_TEMPLATE_CSV = [
  UPLOAD_COLUMNS.join(','),
  '2026,Ganesh,Prempura ghat,Upper Lake,pre,Dissolved oxygen,6.1,mg/l,,6.1,D.Oxygen,"Prempura ghat, Bhopal",high,12',
  '2026,Ganesh,Prempura ghat,Upper Lake,during,BOD,4.2,mg/l,,4.2,BOD,"Prempura ghat, Bhopal",high,12',
  '2026,Ganesh,Prempura ghat,Upper Lake,after,pH,7.4,,,7.4,pH,"Prempura ghat, Bhopal",high,12',
  '2026,Ganesh,Prempura ghat,Upper Lake,after,Lead,,mg/l,BDL,BDL,Lead,"Prempura ghat, Bhopal",high,12',
  '2026,Durga,Malikhedi kund,Kund,pre,BOD,,mg/l,not sampled,-,BOD,"Maalikhedi visarjan kund, Bhopal",high,40',
].join('\n') + '\n';

export interface StoredUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
  csvText: string;
  pdf?: Blob;
  pdfName?: string;
}

export interface ParsedUpload {
  readings: Reading[];
  newSites: Site[];
  years: number[];
  festivals: Festival[];
  siteIds: string[];
  rowCount: number;
  rejected: string[];
  warnings: string[];
}

const FESTIVALS: Festival[] = ['Ganesh', 'Durga'];
const PHASES: Phase[] = ['pre', 'during', 'after'];

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function slugify(value: string): string {
  return normalizeName(value).replace(/ /g, '-') || 'site';
}

function matchFestival(value: string): Festival | null {
  return FESTIVALS.find((festival) => festival.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

function matchPhase(value: string): Phase | null {
  const label = value.trim().toLowerCase();
  if (label === 'before') return 'pre';
  return PHASES.find((phase) => phase === label) ?? null;
}

/**
 * Parses an uploaded CSV. Malformed rows (no valid year, festival, phase,
 * site or parameter) are rejected and listed; they are never silently dropped.
 * Unrecognised site names become new, medium-confidence sites to verify.
 */
export function parseUploadCsv(text: string, options: {
  uploadId: string; knownSites: Site[]; pdfUrl?: string | null;
}): ParsedUpload {
  const parsed = Papa.parse<RawCsvRow>(text.replace(/^﻿/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim().toLowerCase(),
  });
  const warnings: string[] = [];
  const rejected: string[] = [];
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    return {
      readings: [], newSites: [], years: [], festivals: [], siteIds: [], rowCount: parsed.data.length,
      rejected: [`Missing required column(s): ${missing.join(', ')}. Download the template for the expected layout.`],
      warnings,
    };
  }
  for (const error of parsed.errors) warnings.push(`CSV parse issue on row ${(error.row ?? 0) + 2}: ${error.message}`);

  const byName = new Map<string, Site>();
  for (const site of options.knownSites) {
    byName.set(normalizeName(site.name), site);
    byName.set(normalizeName(site.id), site);
  }
  const newSites = new Map<string, Site>();
  const readings: Reading[] = [];

  parsed.data.forEach((row, index) => {
    const line = index + 2;
    const id = `${options.uploadId}-${String(index + 1).padStart(6, '0')}`;
    const year = Number.parseInt((row.year ?? '').trim(), 10);
    const festival = matchFestival(row.festival ?? '');
    const phase = matchPhase(row.phase ?? '');
    const siteName = (row.site ?? '').trim();
    const parameter = (row.parameter ?? '').trim();
    const problems = [
      !Number.isInteger(year) || year < 1990 || year > 2100 ? `year "${row.year ?? ''}"` : null,
      !festival ? `festival "${row.festival ?? ''}" (use Ganesh or Durga)` : null,
      !phase ? `phase "${row.phase ?? ''}" (use pre, during or after)` : null,
      !siteName ? 'empty site' : null,
      !parameter ? 'empty parameter' : null,
    ].filter(Boolean);
    if (problems.length) {
      rejected.push(`Line ${line}: invalid ${problems.join(', ')}.`);
      return;
    }

    let site = byName.get(normalizeName(siteName));
    if (!site) {
      const siteId = slugify(siteName);
      site = newSites.get(siteId) ?? {
        id: siteId, name: siteName, waterBody: (row.water_body ?? '').trim() || 'Not stated',
        confidence: 'medium', warnings: ['Site added from an uploaded report. Verify site identity and location.'],
      };
      newSites.set(siteId, site);
      byName.set(normalizeName(siteName), site);
    }

    const { value, status, rawFlag } = normalizeReadingValue(row.value, row.flag, row.value_as_printed, id, parameter, warnings);
    const page = Number.parseInt((row.source_page ?? '').trim(), 10);
    if (!Number.isInteger(page) || page < 1) warnings.push(`Line ${line}: invalid source page "${row.source_page ?? ''}"; no citation link.`);

    readings.push({
      id, siteId: site.id, year, festival: festival!, phase: phase!, parameter,
      parameterAsPrinted: row.parameter_as_printed?.trim() || parameter,
      value, unit: row.unit_assumed ?? '', unitsAssumed: true, status, rawFlag,
      valueAsPrinted: row.value_as_printed ?? row.value ?? '',
      source: {
        documentId: options.uploadId, pdfUrl: options.pdfUrl ?? '',
        page: Number.isInteger(page) && page > 0 ? page : 0,
        siteAsPrinted: row.site_as_printed?.trim() || siteName,
      },
    });
  });

  if (!options.pdfUrl && readings.length) warnings.push('No report PDF attached: readings will show "No report citation".');
  if ([...newSites.values()].length) {
    warnings.push(`New site(s) not in the bundled seven: ${[...newSites.values()].map((site) => site.name).join(', ')}. Verify identity.`);
  }

  return {
    readings, newSites: [...newSites.values()],
    years: [...new Set(readings.map((row) => row.year))].sort((a, b) => a - b),
    festivals: FESTIVALS.filter((festival) => readings.some((row) => row.festival === festival)),
    siteIds: [...new Set(readings.map((row) => row.siteId))],
    rowCount: parsed.data.length, rejected, warnings,
  };
}

function slot(row: Reading): string {
  return [row.siteId, row.year, row.festival, row.phase, normalizeName(row.parameter)].join('|');
}

/** Slots in the upload that already exist; analysis keeps the earlier source row. */
export function overlappingSlots(existing: Reading[], incoming: Reading[]): number {
  const present = new Set(existing.map(slot));
  return incoming.filter((row) => present.has(slot(row))).length;
}

/** Appends uploads after the bundled data so the original rows win any duplicate slot. */
export function mergeTrackData(base: TrackData, uploads: { fileName: string; parsed: ParsedUpload }[]): TrackData {
  if (!uploads.length) return base;
  const sites = [...base.sites];
  for (const { parsed } of uploads) {
    for (const site of parsed.newSites) if (!sites.some((item) => item.id === site.id)) sites.push(site);
  }
  return {
    ...base,
    sites,
    readings: [...base.readings, ...uploads.flatMap(({ parsed }) => parsed.readings)],
    warnings: [
      ...base.warnings,
      ...uploads.map(({ fileName, parsed }) =>
        `Uploaded report "${fileName}": ${parsed.readings.length} reading(s) for ${parsed.years.join(', ')}. Officer-supplied; verify against the original report.`),
    ],
  };
}

export function availableYears(data: TrackData): number[] {
  return [...new Set(data.readings.map((row) => row.year).filter((year) => year > 0))].sort((a, b) => a - b);
}
