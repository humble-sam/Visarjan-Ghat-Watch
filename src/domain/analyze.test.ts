import { describe, expect, it } from 'vitest';
import type { Criterion, Festival, Filters, Phase, Reading, ReadingStatus, Site, TrackData } from '../shared/types';
import { analyze, benchmarkKey, compareValue, NO_SCOPE_WARNING } from './analyze';
import { phaseSeries, yearComparisons } from './comparisons';

const criteria: Criterion[] = [
  { parameter: 'Total coliform', class: 'B', type: 'max', min: null, max: 500, unit: 'MPN/100 ml' },
  { parameter: 'pH', class: 'B', type: 'range', min: 6.5, max: 8.5, unit: '' },
  { parameter: 'Dissolved oxygen', class: 'B', type: 'min', min: 5, max: null, unit: 'mg/l' },
  { parameter: 'BOD (5 days 20C)', class: 'B', type: 'max', min: null, max: 3, unit: 'mg/l' },
  { parameter: 'Dissolved oxygen', class: 'A' as 'B', type: 'min', min: 6, max: null, unit: 'mg/l' },
];
const site = (id: string, confidence: Site['confidence'] = 'high'): Site =>
  ({ id, name: id, waterBody: 'Lake', confidence, warnings: confidence === 'medium' ? ['Verify site identity.'] : [] });

let counter = 0;
function reading(siteId: string, parameter: string, value: number | null, opts: {
  year?: number; festival?: Festival; phase?: Phase; status?: ReadingStatus;
} = {}): Reading {
  counter += 1;
  const status = opts.status ?? (value === null ? 'not_sampled' : 'numeric');
  return {
    id: `r-${String(counter).padStart(4, '0')}`, siteId, year: opts.year ?? 2025,
    festival: opts.festival ?? 'Ganesh', phase: opts.phase ?? 'pre', parameter, parameterAsPrinted: parameter,
    value, unit: 'mg/l', unitsAssumed: true, status, rawFlag: status === 'numeric' ? '' : status,
    valueAsPrinted: value === null ? status : String(value),
    source: { documentId: 'test', pdfUrl: '/x.pdf', page: 1, siteAsPrinted: siteId },
  };
}
const data = (sites: Site[], readings: Reading[]): TrackData =>
  ({ sites, readings, criteria, sourceCommit: 'test', warnings: [] });
const scope: Filters = { years: [2025], festivals: ['Ganesh'], phases: ['pre'] };
const NOW = new Date('2026-10-11T00:00:00Z');

describe('benchmark comparisons', () => {
  it('treats exact limits as meeting the comparison', () => {
    const [ph, dO, bod] = criteria.slice(1, 4);
    expect(compareValue(5, dO)).toBe('meets');
    expect(compareValue(4.99, dO)).toBe('breaches');
    expect(compareValue(3, bod)).toBe('meets');
    expect(compareValue(3.01, bod)).toBe('breaches');
    expect(compareValue(6.5, ph)).toBe('meets');
    expect(compareValue(8.5, ph)).toBe('meets');
    expect(compareValue(6.49, ph)).toBe('breaches');
    expect(compareValue(8.51, ph)).toBe('breaches');
  });

  it('normalizes printed parameter labels', () => {
    expect(benchmarkKey('BOD (5 days 20C)')).toBe('BOD');
    expect(benchmarkKey('D.Oxygen')).toBe('DO');
    expect(benchmarkKey('Dissolved oxygen')).toBe('DO');
    expect(benchmarkKey('pH')).toBe('pH');
    expect(benchmarkKey('COD')).toBeNull();
    expect(benchmarkKey('Dissolved solids')).toBeNull();
  });

  it('uses only Class B criteria and labels other parameters no_criterion', () => {
    const result = analyze(data([site('a')], [
      reading('a', 'Dissolved oxygen', 5.5), reading('a', 'COD', 90), reading('a', 'Lead', null, { status: 'bdl' }),
    ]), scope, { now: NOW });
    const [dO, cod, lead] = result.readings;
    expect(dO.comparison).toBe('meets');
    expect(dO.criterion?.min).toBe(5);
    expect(cod.comparison).toBe('no_criterion');
    expect(lead.comparison).toBe('no_criterion');
    expect(result.warnings.some((w) => w.includes('Total coliform'))).toBe(true);
  });
});

describe('missing data never passes', () => {
  it('keeps censored, missing, unknown and absent slots distinct', () => {
    const result = analyze(data([site('a')], [
      reading('a', 'Dissolved oxygen', null, { status: 'bdl' }),
      reading('a', 'BOD', null, { status: 'not_sampled' }),
      reading('a', 'pH', null, { status: 'unknown' }),
      reading('a', 'Dissolved oxygen', null, { status: 'nd', phase: 'during' }),
    ]), { years: [2025], festivals: ['Ganesh'], phases: ['pre', 'during'] }, { now: NOW });
    const [item] = result.sites;
    expect(item.rank).toBeNull();
    expect(item.breachFraction).toBeNull();
    expect(item.coverage).toEqual({
      expectedBenchmarkSlots: 6, numericBenchmarkSlots: 0, censoredBenchmarkSlots: 2,
      explicitMissingBenchmarkSlots: 1, absentBenchmarkSlots: 2, unknownBenchmarkSlots: 1,
    });
    expect(result.readings.every((row) => row.comparison === 'unknown')).toBe(true);
    expect(item.reasons.map((r) => r.code)).toEqual(['incomplete_evidence']);
    expect(item.reasons[0].evidenceIds).toHaveLength(4);
  });

  it('treats a numeric status without a finite value as unknown', () => {
    const bad = { ...reading('a', 'Dissolved oxygen', null), status: 'numeric' as const };
    const result = analyze(data([site('a')], [bad]), scope, { now: NOW });
    expect(result.readings[0].comparison).toBe('unknown');
    expect(result.sites[0].coverage.unknownBenchmarkSlots).toBe(1);
    expect(result.sites[0].rank).toBeNull();
  });

  it('marks wholly absent periods as incomplete, not clean', () => {
    const result = analyze(data([site('a')], [reading('a', 'pH', 7)]),
      { years: [2025], festivals: ['Ganesh', 'Durga'], phases: ['pre'] }, { now: NOW });
    const [item] = result.sites;
    expect(item.coverage.absentBenchmarkSlots).toBe(5);
    expect(item.warnings.some((w) => w.includes('Durga 2025'))).toBe(true);
    expect(item.reasons.map((r) => r.code)).toEqual(['incomplete_evidence', 'no_observed_breach']);
  });
});

describe('ranking', () => {
  it('orders zero DO first, then breach fraction, then lowest DO, highest BOD, site ID', () => {
    const readings = [
      // z: DO=0 but low breach fraction (1/3)
      reading('z', 'Dissolved oxygen', 0), reading('z', 'BOD', 2), reading('z', 'pH', 7),
      // y: 3/3 breaches
      reading('y', 'Dissolved oxygen', 4), reading('y', 'BOD', 9), reading('y', 'pH', 9),
      // c, d: 1/3 each; c has lower DO
      reading('c', 'Dissolved oxygen', 4.5), reading('c', 'BOD', 2), reading('c', 'pH', 7),
      reading('d', 'Dissolved oxygen', 4.8), reading('d', 'BOD', 2), reading('d', 'pH', 7),
      // e, f: 1/3 each, same DO 6; f has higher BOD
      reading('e', 'Dissolved oxygen', 6), reading('e', 'BOD', 4), reading('e', 'pH', 7),
      reading('f', 'Dissolved oxygen', 6), reading('f', 'BOD', 5), reading('f', 'pH', 7),
      // g, h: identical -> site ID
      reading('h', 'Dissolved oxygen', 6), reading('h', 'BOD', 2), reading('h', 'pH', 7),
      reading('g', 'Dissolved oxygen', 6), reading('g', 'BOD', 2), reading('g', 'pH', 7),
    ];
    const sites = ['a', 'z', 'y', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => site(id));
    const result = analyze(data(sites, readings), scope, { now: NOW });
    expect(result.sites.map((s) => [s.site.id, s.rank])).toEqual([
      ['z', 1], ['y', 2], ['c', 3], ['d', 4], ['f', 5], ['e', 6], ['g', 7], ['h', 8], ['a', null],
    ]);
  });

  it('sorts missing tie-break values after numeric values', () => {
    // Both 1/1 breach; p has a DO value, q has only BOD.
    const result = analyze(data([site('q'), site('p')], [
      reading('q', 'BOD', 10), reading('p', 'Dissolved oxygen', 4),
    ]), scope, { now: NOW });
    expect(result.sites.map((s) => s.site.id)).toEqual(['p', 'q']);
  });

  it('is deterministic regardless of input order', () => {
    const rows = [
      reading('a', 'Dissolved oxygen', 4), reading('b', 'Dissolved oxygen', 4), reading('c', 'BOD', 4),
    ];
    const sites = [site('c'), site('a'), site('b')];
    const first = analyze(data(sites, rows), scope, { now: NOW });
    const second = analyze(data([...sites].reverse(), [...rows].reverse()), scope, { now: NOW });
    expect(second.sites.map((s) => [s.site.id, s.rank])).toEqual(first.sites.map((s) => [s.site.id, s.rank]));
  });

  it('gives every site rank null in an empty scope', () => {
    const result = analyze(data([site('a')], [reading('a', 'Dissolved oxygen', 0)]),
      { years: [], festivals: ['Ganesh'], phases: ['pre'] }, { now: NOW });
    expect(result.sites[0].rank).toBeNull();
    expect(result.sites[0].coverage.expectedBenchmarkSlots).toBe(0);
    expect(result.sites[0].reasons).toEqual([]);
    expect(result.readings).toEqual([]);
    expect(result.warnings).toContain(NO_SCOPE_WARNING);
  });
});

describe('reasons cite input readings', () => {
  it('reports zero DO, worst breaches and the breached bound', () => {
    const rows = [
      reading('a', 'Dissolved oxygen', 0), reading('a', 'Dissolved oxygen', 3, { phase: 'during' }),
      reading('a', 'BOD', 12), reading('a', 'BOD', 30, { phase: 'during' }),
      reading('a', 'pH', 6.2), reading('a', 'pH', 8.6, { phase: 'during' }),
    ];
    const result = analyze(data([site('a', 'medium')], rows),
      { years: [2025], festivals: ['Ganesh'], phases: ['pre', 'during'] }, { now: NOW });
    const [item] = result.sites;
    const byCode = Object.fromEntries(item.reasons.map((r) => [r.code, r]));
    expect(byCode.zero_do).toMatchObject({ evidenceIds: [rows[0].id], observed: 0, limit: 5, count: 1, total: 2 });
    expect(byCode.do_breach).toMatchObject({ evidenceIds: [rows[0].id, rows[1].id], observed: 0, limit: 5, count: 2 });
    expect(byCode.bod_breach).toMatchObject({ observed: 30, limit: 3, count: 2, total: 2 });
    expect(byCode.ph_breach).toMatchObject({ observed: 6.2, limit: 6.5, count: 2 });
    expect(byCode.site_ambiguity).toBeDefined();
    expect(byCode.no_observed_breach).toBeUndefined();
    expect(item.warnings).toContain('Verify site identity.');
    const ids = new Set(result.readings.map((r) => r.id));
    for (const reason of item.reasons) for (const id of reason.evidenceIds) expect(ids.has(id)).toBe(true);
  });
});

describe('duplicates', () => {
  it('counts the first source row once and warns', () => {
    const first = reading('a', 'Dissolved oxygen', 4);
    const second = reading('a', 'Dissolved oxygen', 6);
    const result = analyze(data([site('a')], [first, second]), scope, { now: NOW });
    const [item] = result.sites;
    expect(result.readings).toHaveLength(2);
    expect(item.coverage.numericBenchmarkSlots).toBe(1);
    expect(item.benchmarkNumericCount).toBe(1);
    expect(item.metrics[0].readings.map((r) => r.id)).toEqual([first.id]);
    expect(item.warnings.some((w) => w.includes('conflict'))).toBe(true);
  });
});

describe('comparisons', () => {
  const rows = [
    reading('a', 'Dissolved oxygen', 4, { year: 2024 }), reading('a', 'Dissolved oxygen', 6, { year: 2025 }),
    reading('a', 'Dissolved oxygen', null, { year: 2025, phase: 'during', status: 'bdl' }),
  ];
  const filters: Filters = { years: [2024, 2025], festivals: ['Ganesh'], phases: ['pre', 'during'] };

  it('builds per-year/festival phase series with gaps, never averages', () => {
    const series = phaseSeries(analyze(data([site('a')], rows), filters, { now: NOW }), 'a', 'DO');
    expect(series.map((s) => s.key)).toEqual(['2024 Ganesh', '2025 Ganesh']);
    expect(series[1].points.map((p) => p.value)).toEqual([6, null]);
    expect(series[1].points[1].reading?.status).toBe('bdl');
    expect(series[0].points[1].reading).toBeNull();
  });

  it('compares years only for matching festival and phase', () => {
    const analysis = analyze(data([site('a')], rows), filters, { now: NOW });
    const comparisons = yearComparisons(analysis, 'a', 'DO');
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0]).toMatchObject({ festival: 'Ganesh', phase: 'pre' });
    expect(comparisons[0].byYear.map((y) => y.value)).toEqual([4, 6]);
    expect(yearComparisons(analyze(data([site('a')], rows), { ...filters, years: [2025] }, { now: NOW }), 'a', 'DO')).toEqual([]);
  });
});
