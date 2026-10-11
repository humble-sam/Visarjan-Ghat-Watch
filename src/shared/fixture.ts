import type {
  Analysis, Comparison, Criterion, EvaluatedReading, Filters, Phase,
  ReadingStatus, Reason, Site, SiteAnalysis, TrackData,
} from './types';

export const FIXTURE_WARNING = 'Synthetic fixture — not MPPCB measurements. Do not use for operational decisions.';

const sites: Site[] = [
  { id: 'bairagarh', name: 'Bairagarh (Sant Hirdaram) kund', waterBody: 'Upper Lake', confidence: 'high', warnings: [] },
  { id: 'khatlapura', name: 'Khatlapura ghat', waterBody: 'Lower Lake', confidence: 'high', warnings: [] },
  { id: 'prempura', name: 'Prempura ghat', waterBody: 'Upper Lake', confidence: 'high', warnings: [] },
  { id: 'kamla-park', name: 'Rani Kamlapati ghat / Kamla Park kund', waterBody: 'Lower Lake', confidence: 'medium', warnings: ['Site mapping may combine two locations. Verify site identity.'] },
  { id: 'hathaikheda', name: 'Hathaikheda dam / kund', waterBody: 'Hathaikheda dam', confidence: 'high', warnings: [] },
  { id: 'malikhedi', name: 'Malikhedi kund', waterBody: 'Kund', confidence: 'high', warnings: [] },
  { id: 'shahpura', name: 'Shahpura lake ghat', waterBody: 'Shahpura Lake', confidence: 'high', warnings: [] },
];

const criteria: Criterion[] = [
  { parameter: 'Dissolved oxygen', class: 'B', type: 'min', min: 5, max: null, unit: 'mg/l' },
  { parameter: 'BOD', class: 'B', type: 'max', min: null, max: 3, unit: 'mg/l' },
  { parameter: 'pH', class: 'B', type: 'range', min: 6.5, max: 8.5, unit: '' },
  { parameter: 'Total coliform', class: 'B', type: 'max', min: null, max: 500, unit: 'MPN/100 ml' },
];

// Deliberately synthetic scenarios, with hand-labelled comparisons, for parallel UI work.
type Sample = [number | null, Comparison, ReadingStatus?];
type Scenario = { do: Sample[]; bod: Sample[]; ph: Sample[] };
const scenarios: Record<string, Scenario> = {
  bairagarh: { do: [[2, 'breaches'], [0, 'breaches'], [1, 'breaches']], bod: [[12, 'breaches'], [18, 'breaches'], [10, 'breaches']], ph: [[7.1, 'meets'], [7.2, 'meets'], [7.1, 'meets']] },
  khatlapura: { do: [[4, 'breaches'], [2.8, 'breaches'], [4.5, 'breaches']], bod: [[6, 'breaches'], [9, 'breaches'], [5, 'breaches']], ph: [[7.2, 'meets'], [7.3, 'meets'], [7.2, 'meets']] },
  prempura: { do: [[6, 'meets'], [5.2, 'meets'], [5.5, 'meets']], bod: [[2, 'meets'], [4, 'breaches'], [2, 'meets']], ph: [[7, 'meets'], [7.1, 'meets'], [7, 'meets']] },
  'kamla-park': { do: [[5.2, 'meets'], [3.5, 'breaches'], [4.8, 'breaches']], bod: [[4, 'breaches'], [8, 'breaches'], [6, 'breaches']], ph: [[7.4, 'meets'], [8.7, 'breaches'], [7.6, 'meets']] },
  hathaikheda: { do: [[6, 'meets'], [5.8, 'meets'], [6.2, 'meets']], bod: [[2.2, 'meets'], [2.8, 'meets'], [2.1, 'meets']], ph: [[7.4, 'meets'], [7.4, 'meets'], [7.4, 'meets']] },
  malikhedi: { do: [[null, 'unknown', 'bdl'], [null, 'unknown', 'bdl'], [null, 'unknown', 'bdl']], bod: [[null, 'unknown', 'not_sampled'], [null, 'unknown', 'not_sampled'], [null, 'unknown', 'unknown']], ph: [[null, 'unknown', 'nd'], [null, 'unknown', 'nd'], [null, 'unknown', 'nd']] },
  shahpura: { do: [[6, 'meets'], [4.4, 'breaches'], [5.4, 'meets']], bod: [[2.5, 'meets'], [6, 'breaches'], [3, 'meets']], ph: [[7.5, 'meets'], [7.5, 'meets'], [7.5, 'meets']] },
};

const phases: Phase[] = ['pre', 'during', 'after'];
const fixtureReadings: EvaluatedReading[] = sites.flatMap((site) =>
  (['Ganesh', 'Durga'] as const).flatMap((festival) => {
    if (festival === 'Durga' && ['bairagarh', 'malikhedi'].includes(site.id)) return [];
    return phases.flatMap((phase, phaseIndex) => {
      const scenario = scenarios[site.id];
      const samples = [scenario.do[phaseIndex], scenario.bod[phaseIndex], scenario.ph[phaseIndex]];
      return samples.map(([value, comparison, missingStatus], index): EvaluatedReading => {
        const criterion = criteria[index];
        const status = missingStatus ?? 'numeric';
        const rawFlag = status === 'bdl' ? 'BDL' : status === 'nd' ? 'ND'
          : status === 'not_sampled' ? 'not sampled' : status === 'unknown' ? '?' : '';
        return {
          id: `fixture-${site.id}-${festival}-${phase}-${index}`,
          siteId: site.id, year: 2025, festival, phase,
          parameter: criterion.parameter, parameterAsPrinted: criterion.parameter,
          value, unit: criterion.unit, unitsAssumed: true, status, rawFlag,
          valueAsPrinted: value === null ? rawFlag : String(value),
          source: { documentId: 'synthetic-fixture', pdfUrl: '', page: 0, siteAsPrinted: site.name },
          comparison, criterion,
        };
      });
    });
  }),
);

export const fixtureTrackData: TrackData = {
  sites, readings: fixtureReadings, criteria, sourceCommit: 'synthetic-fixture',
  warnings: [FIXTURE_WARNING],
};

export function createFixtureAnalysis(filters: Filters): Analysis {
  const selectedFilters: Filters = {
    years: [...new Set(filters.years)], festivals: [...new Set(filters.festivals)],
    phases: [...new Set(filters.phases)],
  };
  const readings = fixtureReadings.filter((row) => selectedFilters.years.includes(row.year)
    && selectedFilters.festivals.includes(row.festival) && selectedFilters.phases.includes(row.phase));
  const expected = selectedFilters.years.length * selectedFilters.festivals.length * selectedFilters.phases.length * 3;
  const results: SiteAnalysis[] = sites.map((site) => {
    const rows = readings.filter((row) => row.siteId === site.id);
    const numeric = rows.filter((row) => row.status === 'numeric');
    const breaches = numeric.filter((row) => row.comparison === 'breaches');
    const metrics = criteria.slice(0, 3).map((criterion) => {
      const parameterRows = rows.filter((row) => row.parameter === criterion.parameter);
      const numbers = parameterRows.flatMap((row) => row.value === null ? [] : [row.value]);
      return {
        parameter: criterion.parameter, numericCount: numbers.length,
        breachCount: parameterRows.filter((row) => row.comparison === 'breaches').length,
        min: numbers.length ? Math.min(...numbers) : null,
        max: numbers.length ? Math.max(...numbers) : null, readings: parameterRows,
      };
    });
    const zeroRows = rows.filter((row) => row.parameter === 'Dissolved oxygen' && row.value === 0);
    const reasons: Reason[] = [];
    if (zeroRows.length) reasons.push({ code: 'zero_do', evidenceIds: zeroRows.map((r) => r.id), observed: 0, limit: 5, count: zeroRows.length, total: metrics[0].numericCount });
    for (const [index, code] of (['do_breach', 'bod_breach', 'ph_breach'] as const).entries()) {
      const failed = metrics[index].readings.filter((row) => row.comparison === 'breaches');
      if (failed.length) reasons.push({ code, evidenceIds: failed.map((row) => row.id), observed: code === 'do_breach' ? metrics[index].min : metrics[index].max, limit: code === 'do_breach' ? 5 : code === 'bod_breach' ? 3 : 8.5, count: failed.length, total: metrics[index].numericCount });
    }
    if (numeric.length < expected) reasons.push({ code: 'incomplete_evidence', evidenceIds: [], observed: null, limit: null, count: numeric.length, total: expected });
    if (site.confidence === 'medium') reasons.push({ code: 'site_ambiguity', evidenceIds: [], observed: null, limit: null, count: null, total: null });
    if (numeric.length && !breaches.length) reasons.push({ code: 'no_observed_breach', evidenceIds: numeric.map((row) => row.id), observed: null, limit: null, count: 0, total: numeric.length });
    return {
      site, rank: null, zeroDo: zeroRows.length > 0,
      benchmarkNumericCount: numeric.length, benchmarkBreachCount: breaches.length,
      breachFraction: numeric.length ? breaches.length / numeric.length : null,
      metrics, reasons, warnings: [...site.warnings],
      coverage: {
        expectedBenchmarkSlots: expected, numericBenchmarkSlots: numeric.length,
        censoredBenchmarkSlots: rows.filter((row) => ['bdl', 'nd'].includes(row.status)).length,
        explicitMissingBenchmarkSlots: rows.filter((row) => row.status === 'not_sampled').length,
        absentBenchmarkSlots: expected - rows.length,
        unknownBenchmarkSlots: rows.filter((row) => row.status === 'unknown').length,
      },
    };
  });

  // Fixture-only presentation order. Member 3 owns production analysis.
  results.sort((a, b) => Number(b.zeroDo) - Number(a.zeroDo)
    || (b.breachFraction ?? -1) - (a.breachFraction ?? -1)
    || (a.metrics[0].min ?? Infinity) - (b.metrics[0].min ?? Infinity)
    || (b.metrics[1].max ?? -Infinity) - (a.metrics[1].max ?? -Infinity)
    || a.site.id.localeCompare(b.site.id));
  let rank = 0;
  for (const result of results) if (result.benchmarkNumericCount > 0) result.rank = ++rank;

  return {
    filters: selectedFilters, comparisonClass: 'B', sites: results, readings,
    warnings: [FIXTURE_WARNING, 'Total coliform is not measured. Full Class B compliance cannot be assessed.', 'Units are assumed. Historical readings do not describe current 2026 conditions.'],
    generatedAt: new Date().toISOString(),
  };
}
