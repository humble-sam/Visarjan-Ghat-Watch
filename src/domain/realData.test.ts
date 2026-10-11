import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import type { Criterion, Festival, Phase, Reading, ReadingStatus, Site, TrackData } from '../shared/types';
import { analyze } from './analyze';

// Minimal test-only adapter for the original CSVs so the ranking can be checked
// against the acceptance numbers. The production loader belongs to src/data/.
const dataDir = resolve(process.cwd(), 'public/assets/track-2/data');
const csv = (file: string) => Papa.parse<Record<string, string>>(
  readFileSync(resolve(dataDir, file), 'utf-8'), { header: true, skipEmptyLines: true }).data;

const SITE_IDS: Record<string, string> = {
  'Bairagarh (Sant Hirdaram) kund': 'bairagarh', 'Khatlapura ghat': 'khatlapura', 'Prempura ghat': 'prempura',
  'Rani Kamlapati ghat / Kamla Park kund': 'kamla-park', 'Hathaikheda dam / kund': 'hathaikheda',
  'Malikhedi kund': 'malikhedi', 'Shahpura lake ghat': 'shahpura',
};
function status(row: Record<string, string>): ReadingStatus {
  const flag = row.flag.trim().toLowerCase();
  if (flag === 'bdl') return 'bdl';
  if (flag === 'nd') return 'nd';
  if (['*', '**', 'not sampled', '_', '-'].includes(flag)) return 'not_sampled';
  return row.value !== '' && Number.isFinite(Number(row.value)) ? 'numeric' : 'unknown';
}
function loadRealData(): TrackData {
  const rows = csv('bhopal_ghats_2023_2025.csv');
  const sites = new Map<string, Site>();
  const readings: Reading[] = rows.map((row, index) => {
    const siteId = SITE_IDS[row.site];
    if (!sites.has(siteId)) {
      sites.set(siteId, { id: siteId, name: row.site, waterBody: row.water_body,
        confidence: row.site_match_confidence as Site['confidence'], warnings: [] });
    }
    const readingStatus = status(row);
    return {
      id: `bpl-${String(index + 1).padStart(6, '0')}`, siteId, year: Number(row.year),
      festival: row.festival as Festival, phase: row.phase as Phase, parameter: row.parameter,
      parameterAsPrinted: row.parameter_as_printed,
      value: readingStatus === 'numeric' ? Number(row.value) : null, unit: row.unit_assumed,
      unitsAssumed: true, status: readingStatus, rawFlag: row.flag, valueAsPrinted: row.value_as_printed,
      source: { documentId: row.year, pdfUrl: `/report-${row.year}.pdf`, page: Number(row.source_page), siteAsPrinted: row.site_as_printed },
    };
  });
  const criteria: Criterion[] = csv('cpcb_water_quality_criteria.csv').filter((row) => row.class === 'B').map((row) => {
    const [min, max] = row.limit_type === 'range' ? row.limit.split('-').map(Number)
      : row.limit_type === 'min' ? [Number(row.limit), null] : [null, Number(row.limit)];
    return { parameter: row.parameter, class: 'B', type: row.limit_type as Criterion['type'], min, max, unit: row.unit };
  });
  return { sites: [...sites.values()], readings, criteria, sourceCommit: 'test', warnings: [] };
}

describe('original Bhopal dataset', () => {
  const data = loadRealData();
  const all = { years: [2023, 2024, 2025], festivals: ['Ganesh', 'Durga'] as Festival[], phases: ['pre', 'during', 'after'] as Phase[] };

  it('matches the whole-dataset acceptance checks', () => {
    expect(data.readings).toHaveLength(1524);
    expect(data.sites).toHaveLength(7);
    const analysis = analyze(data, all);
    expect(analysis.readings).toHaveLength(1524);
    const metric = (index: number) => analysis.sites.reduce((sum, item) => ({
      numeric: sum.numeric + item.metrics[index].numericCount, breaches: sum.breaches + item.metrics[index].breachCount,
    }), { numeric: 0, breaches: 0 });
    expect(metric(0)).toEqual({ numeric: 116, breaches: 42 });
    expect(metric(1)).toEqual({ numeric: 112, breaches: 100 });
    expect(analysis.readings.filter((row) => row.parameter === 'Dissolved oxygen' && row.value === 0)).toHaveLength(4);
  });

  it('keeps coverage categories summing to expected slots and ranks every assessable site', () => {
    const analysis = analyze(data, all);
    for (const item of analysis.sites) {
      const c = item.coverage;
      expect(c.numericBenchmarkSlots + c.censoredBenchmarkSlots + c.explicitMissingBenchmarkSlots
        + c.absentBenchmarkSlots + c.unknownBenchmarkSlots).toBe(c.expectedBenchmarkSlots);
    }
    expect(analysis.sites.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(analysis.sites[0].site.id).toBe('bairagarh');
    expect(analysis.sites[0].zeroDo).toBe(true);
  });

  it('shows the 2025 Durga gaps at Bairagarh and Malikhedi as incomplete', () => {
    const analysis = analyze(data, { years: [2025], festivals: ['Durga'], phases: ['pre', 'during', 'after'] });
    for (const id of ['bairagarh', 'malikhedi']) {
      const item = analysis.sites.find((site) => site.site.id === id)!;
      expect(item.rank).toBeNull();
      expect(item.coverage.absentBenchmarkSlots).toBe(9);
      expect(item.reasons.map((r) => r.code)).toContain('incomplete_evidence');
      expect(item.warnings.some((w) => w.includes('Durga 2025'))).toBe(true);
    }
    const kamla = analysis.sites.find((site) => site.site.id === 'kamla-park')!;
    expect(kamla.reasons.map((r) => r.code)).toContain('site_ambiguity');
  });
});
