import Papa from 'papaparse';
import { ASSET_BASE, reportUrl } from '../shared/sources';
import type {
  Criterion,
  Festival,
  Phase,
  Reading,
  ReadingStatus,
  Site,
  SourceRef,
  TrackData,
} from '../shared/types';

export const SOURCE_COMMIT = '6b96823f27aaab18ce2f07dfc71a3732011bd4ab';

export const BHOPAL_SITES: Site[] = [
  {
    id: 'bairagarh',
    name: 'Bairagarh (Sant Hirdaram) kund',
    waterBody: 'Upper Lake',
    confidence: 'high',
    warnings: [],
  },
  {
    id: 'khatlapura',
    name: 'Khatlapura ghat',
    waterBody: 'Lower Lake',
    confidence: 'high',
    warnings: [],
  },
  {
    id: 'prempura',
    name: 'Prempura ghat',
    waterBody: 'Upper Lake',
    confidence: 'high',
    warnings: [],
  },
  {
    id: 'kamla-park',
    name: 'Rani Kamlapati ghat / Kamla Park kund',
    waterBody: 'Lower Lake',
    confidence: 'medium',
    warnings: ['Site mapping may combine two locations. Verify site identity.'],
  },
  {
    id: 'hathaikheda',
    name: 'Hathaikheda dam / kund',
    waterBody: 'Hathaikheda dam',
    confidence: 'high',
    warnings: [],
  },
  {
    id: 'malikhedi',
    name: 'Malikhedi kund',
    waterBody: 'Kund',
    confidence: 'high',
    warnings: [],
  },
  {
    id: 'shahpura',
    name: 'Shahpura lake ghat',
    waterBody: 'Shahpura Lake',
    confidence: 'high',
    warnings: [],
  },
];

export const SITE_NAME_TO_ID: Record<string, string> = {
  'Bairagarh (Sant Hirdaram) kund': 'bairagarh',
  'Khatlapura ghat': 'khatlapura',
  'Prempura ghat': 'prempura',
  'Rani Kamlapati ghat / Kamla Park kund': 'kamla-park',
  'Hathaikheda dam / kund': 'hathaikheda',
  'Malikhedi kund': 'malikhedi',
  'Shahpura lake ghat': 'shahpura',
};

const YEAR_REPORTS: Record<number, { documentId: string; file: string }> = {
  2023: { documentId: 'immersion-2023', file: 'Idol_immer._Report_23_CPCB.pdf' },
  2024: { documentId: 'immersion-2024', file: 'Ganesh_and_Durga_visarjan_report-2024.pdf' },
  2025: { documentId: 'immersion-2025', file: 'Ganesh_and_Durga_visarjan_report-2025.pdf' },
};

export interface RawCsvRow {
  year?: string;
  festival?: string;
  site?: string;
  water_body?: string;
  phase?: string;
  parameter?: string;
  value?: string;
  unit_assumed?: string;
  flag?: string;
  value_as_printed?: string;
  parameter_as_printed?: string;
  site_as_printed?: string;
  site_match_confidence?: string;
  source_page?: string;
  [key: string]: string | undefined;
}

export interface RawCriteriaRow {
  class?: string;
  designated_best_use?: string;
  parameter?: string;
  limit_type?: string;
  limit?: string;
  unit?: string;
  [key: string]: string | undefined;
}

export function normalizeReadingValue(
  valueStr: string | undefined,
  flagStr: string | undefined,
  valueAsPrinted: string | undefined,
  rowId: string,
  parameter: string,
  warnings: string[]
): { value: number | null; status: ReadingStatus; rawFlag: string } {
  const rawFlag = flagStr ?? '';
  const trimmedVal = (valueStr ?? '').trim();
  const trimmedFlag = rawFlag.trim().toLowerCase();
  const trimmedVap = (valueAsPrinted ?? '').trim().toLowerCase();

  // BDL (Below Detection Limit) is censored: never numeric, never zero
  if (trimmedFlag === 'bdl' || trimmedVap === 'bdl') {
    return { value: null, status: 'bdl', rawFlag };
  }

  // ND (Not Detected) is censored: never numeric, never zero
  if (trimmedFlag === 'nd' || trimmedVap === 'nd') {
    return { value: null, status: 'nd', rawFlag };
  }

  // Censored / not sampled flags: *, **, _, -, not sampled
  if (
    trimmedFlag === 'not sampled' ||
    trimmedFlag === '*' ||
    trimmedFlag === '**' ||
    trimmedFlag === '_' ||
    trimmedFlag === '-' ||
    trimmedVap === 'not sampled' ||
    trimmedVap === '*' ||
    trimmedVap === '**' ||
    trimmedVap === '_' ||
    trimmedVap === '-'
  ) {
    return { value: null, status: 'not_sampled', rawFlag };
  }

  // Numeric value string provided
  if (trimmedVal !== '') {
    const num = Number(trimmedVal);
    if (!Number.isNaN(num)) {
      return { value: num, status: 'numeric', rawFlag };
    }
    warnings.push(`Row ${rowId} (${parameter}): non-numeric value "${trimmedVal}" treated as unknown.`);
    return { value: null, status: 'unknown', rawFlag };
  }

  // Empty value with no recognised flag: unknown, never a silent missing or pass
  if (trimmedFlag === '') {
    warnings.push(`Row ${rowId} (${parameter}): empty value with no recognised flag (printed "${valueAsPrinted ?? ''}") treated as unknown.`);
    return { value: null, status: 'unknown', rawFlag };
  }

  warnings.push(`Row ${rowId} (${parameter}): unrecognized flag "${rawFlag}".`);
  return { value: null, status: 'unknown', rawFlag };
}

export function parseBhopalReadings(csvText: string): { readings: Reading[]; warnings: string[] } {
  const warnings: string[] = [];
  const parsed = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      warnings.push(`CSV parse error on row ${error.row}: ${error.message}`);
    }
  }

  const readings: Reading[] = [];

  parsed.data.forEach((row, index) => {
    // Preserve every source row with a 1-based, zero-padded row ID
    const rowId = `bpl-${String(index + 1).padStart(6, '0')}`;

    const rawSite = (row.site ?? '').trim();
    const siteId = SITE_NAME_TO_ID[rawSite];
    if (!siteId) {
      warnings.push(`Row ${rowId}: unknown site name "${rawSite}".`);
    }

    const year = Number.parseInt((row.year ?? '').trim(), 10);
    if (Number.isNaN(year)) {
      warnings.push(`Row ${rowId}: invalid year "${row.year}".`);
    }

    const festival = (row.festival ?? '').trim() as Festival;
    if (festival !== 'Ganesh' && festival !== 'Durga') {
      warnings.push(`Row ${rowId}: unexpected festival "${row.festival}".`);
    }

    const phase = (row.phase ?? '').trim() as Phase;
    if (phase !== 'pre' && phase !== 'during' && phase !== 'after') {
      warnings.push(`Row ${rowId}: unexpected phase "${row.phase}".`);
    }

    const parameter = (row.parameter ?? '').trim();
    const parameterAsPrinted = row.parameter_as_printed ?? parameter;

    const { value, status, rawFlag } = normalizeReadingValue(
      row.value,
      row.flag,
      row.value_as_printed,
      rowId,
      parameter,
      warnings
    );

    // No bundled report for other years: leave the link empty rather than invent a file.
    const reportInfo = YEAR_REPORTS[year];
    if (!reportInfo) {
      warnings.push(`Row ${rowId}: no bundled report for year "${row.year}".`);
    }

    const rawPage = (row.source_page ?? '').trim();
    const pageNum = Number.parseInt(rawPage, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) {
      warnings.push(`Row ${rowId}: invalid source page "${row.source_page}".`);
    }

    const source: SourceRef = {
      documentId: reportInfo?.documentId ?? `immersion-${year}`,
      pdfUrl: reportInfo ? reportUrl(reportInfo.file) : '',
      page: Number.isNaN(pageNum) ? 0 : pageNum,
      siteAsPrinted: row.site_as_printed ?? rawSite,
    };

    readings.push({
      id: rowId,
      siteId: siteId ?? 'unknown',
      year: Number.isNaN(year) ? 0 : year,
      festival,
      phase,
      parameter,
      parameterAsPrinted,
      value,
      unit: row.unit_assumed ?? '',
      unitsAssumed: true,
      status,
      rawFlag,
      valueAsPrinted: row.value_as_printed ?? '',
      source,
    });
  });

  return { readings, warnings };
}

export function parseCriteria(csvText: string): { criteria: Criterion[]; warnings: string[] } {
  const warnings: string[] = [];
  const parsed = Papa.parse<RawCriteriaRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      warnings.push(`Criteria CSV parse error on row ${error.row}: ${error.message}`);
    }
  }

  const criteria: Criterion[] = [];

  for (const row of parsed.data) {
    const rawClass = (row.class ?? '').trim().toUpperCase();
    if (rawClass !== 'B') {
      continue;
    }

    let param = (row.parameter ?? '').trim();
    if (param === 'BOD (5 days 20C)') {
      param = 'BOD';
    }

    const limitType = (row.limit_type ?? '').trim().toLowerCase();
    const rawLimit = (row.limit ?? '').trim();
    const unit = row.unit ?? '';

    let min: number | null = null;
    let max: number | null = null;
    let type: 'min' | 'max' | 'range' = 'min';

    if (limitType === 'min') {
      type = 'min';
      min = Number.parseFloat(rawLimit);
      max = null;
      if (Number.isNaN(min)) {
        warnings.push(`Invalid minimum limit "${rawLimit}" for ${param}.`);
        min = null;
      }
    } else if (limitType === 'max') {
      type = 'max';
      min = null;
      max = Number.parseFloat(rawLimit);
      if (Number.isNaN(max)) {
        warnings.push(`Invalid maximum limit "${rawLimit}" for ${param}.`);
        max = null;
      }
    } else if (limitType === 'range') {
      type = 'range';
      const parts = rawLimit.split('-');
      if (parts.length === 2) {
        min = Number.parseFloat(parts[0].trim());
        max = Number.parseFloat(parts[1].trim());
      } else {
        warnings.push(`Invalid range limit "${rawLimit}" for ${param}.`);
      }
    } else {
      warnings.push(`Unrecognized limit type "${row.limit_type}" for ${param}.`);
    }

    criteria.push({
      parameter: param,
      class: 'B',
      type,
      min,
      max,
      unit,
    });
  }

  return { criteria, warnings };
}

export function parseTrackData(bhopalCsvText: string, criteriaCsvText: string): TrackData {
  const { readings, warnings: readingWarnings } = parseBhopalReadings(bhopalCsvText);
  const { criteria, warnings: criteriaWarnings } = parseCriteria(criteriaCsvText);

  const datasetWarnings: string[] = [
    `Source pack pinned to commit: ${SOURCE_COMMIT}.`,
    'The supplied 2025 Durga section has no tables for Bairagarh kund or Malikhedi kund; those periods are absent, not clean.',
    'Rani Kamlapati ghat / Kamla Park kund combines differently printed Ganesh and Durga site names (confidence: medium).',
    ...readingWarnings,
    ...criteriaWarnings,
  ];

  return {
    sites: BHOPAL_SITES,
    readings,
    criteria,
    sourceCommit: SOURCE_COMMIT,
    warnings: datasetWarnings,
  };
}

async function fetchOrReadText(url: string, localRelativePath: string): Promise<string> {
  // If running in browser or environment where fetch works
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  // Node.js environment (e.g. Vitest CLI)
  const fsMod = 'node:fs/promises';
  const pathMod = 'node:path';
  const fs = await import(/* @vite-ignore */ fsMod);
  const path = await import(/* @vite-ignore */ pathMod);
  const fullPath = path.resolve(process.cwd(), localRelativePath);
  return fs.readFile(fullPath, 'utf-8');
}

export async function loadTrackData(): Promise<TrackData> {
  const bhopalCsvUrl = `${ASSET_BASE}data/bhopal_ghats_2023_2025.csv`;
  const criteriaCsvUrl = `${ASSET_BASE}data/cpcb_water_quality_criteria.csv`;

  const [bhopalCsvText, criteriaCsvText] = await Promise.all([
    fetchOrReadText(bhopalCsvUrl, 'public/assets/track-2/data/bhopal_ghats_2023_2025.csv'),
    fetchOrReadText(criteriaCsvUrl, 'public/assets/track-2/data/cpcb_water_quality_criteria.csv'),
  ]);

  return parseTrackData(bhopalCsvText, criteriaCsvText);
}
