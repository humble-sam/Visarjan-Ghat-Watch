import type {
  Analysis, Comparison, Coverage, Criterion, EvaluatedReading, Festival, Filters,
  Metric, Phase, Reading, Reason, Site, SiteAnalysis, TrackData,
} from '../shared/types';

// Observed concern ordering for a selected historical period. This is a team
// heuristic (see docs/METHODOLOGY.md), not an official CPCB ranking or forecast.

export type BenchmarkKey = 'DO' | 'BOD' | 'pH';
export const BENCHMARK_KEYS: readonly BenchmarkKey[] = ['DO', 'BOD', 'pH'];

/** Display parameter names used by the data module, the fixture and the dashboard. */
export const BENCHMARK_PARAMETERS: Record<BenchmarkKey, string> = {
  DO: 'Dissolved oxygen',
  BOD: 'BOD',
  pH: 'pH',
};

const FESTIVAL_ORDER: Festival[] = ['Ganesh', 'Durga'];
const PHASE_ORDER: Phase[] = ['pre', 'during', 'after'];

export const ANALYSIS_LIMITATIONS = [
  'Class B (outdoor bathing) is used as a comparison benchmark only: DO >= 5 mg/l, BOD <= 3 mg/l, pH 6.5-8.5.',
  'Total coliform is not measured in the supplied readings. Full Class B compliance cannot be assessed.',
  'COD, solids, turbidity, conductivity and metals have no Class B limit; they are shown without pass/fail.',
  'Units are assumed; the reports print none. Historical readings do not describe current 2026 conditions.',
  'Ordering is a team heuristic over available samples, not an official CPCB ranking, forecast or immersion permission.',
];

export const NO_SCOPE_WARNING = 'No period selected. Choose at least one year, festival and phase.';

/** Maps any supplied parameter label (e.g. `D.Oxygen`, `BOD (5 days 20C)`) to a benchmark key. */
export function benchmarkKey(parameter: string): BenchmarkKey | null {
  const label = parameter.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (label === 'ph') return 'pH';
  if (label === 'do' || label === 'd oxygen' || label === 'dissolved oxygen') return 'DO';
  if (label === 'bod' || label.startsWith('bod ') || label.startsWith('biochemical oxygen demand')) return 'BOD';
  return null;
}

/** Class B criteria for DO/BOD/pH. Other criteria (e.g. coliform) have no readings here. */
export function benchmarkCriteria(criteria: Criterion[]): Partial<Record<BenchmarkKey, Criterion>> {
  const result: Partial<Record<BenchmarkKey, Criterion>> = {};
  for (const criterion of criteria) {
    if (criterion.class !== 'B') continue;
    const key = benchmarkKey(criterion.parameter);
    if (key && !result[key]) result[key] = criterion;
  }
  return result;
}

/** A value equal to a limit meets it: DO 5, BOD 3, pH 6.5 and pH 8.5 all meet. */
export function compareValue(value: number, criterion: Criterion): 'meets' | 'breaches' {
  if (criterion.min !== null && value < criterion.min) return 'breaches';
  if (criterion.max !== null && value > criterion.max) return 'breaches';
  return 'meets';
}

export function isNumericReading(reading: Reading): reading is Reading & { value: number } {
  return reading.status === 'numeric' && typeof reading.value === 'number' && Number.isFinite(reading.value);
}

export function evaluateReading(
  reading: Reading, criteria: Partial<Record<BenchmarkKey, Criterion>>,
): EvaluatedReading {
  const key = benchmarkKey(reading.parameter);
  const criterion = key ? criteria[key] ?? null : null;
  let comparison: Comparison;
  if (!criterion) comparison = 'no_criterion';
  // Censored, missing or invalid values are never compared and never pass.
  else if (!isNumericReading(reading)) comparison = 'unknown';
  else comparison = compareValue(reading.value, criterion);
  return { ...reading, comparison, criterion };
}

export function normalizeFilters(filters: Filters): Filters {
  return {
    years: [...new Set(filters.years)].sort((a, b) => a - b),
    festivals: FESTIVAL_ORDER.filter((festival) => filters.festivals.includes(festival)),
    phases: PHASE_ORDER.filter((phase) => filters.phases.includes(phase)),
  };
}

export function hasScope(filters: Filters): boolean {
  return filters.years.length > 0 && filters.festivals.length > 0 && filters.phases.length > 0;
}

export function slotKey(reading: Pick<Reading, 'siteId' | 'year' | 'festival' | 'phase'>, key: BenchmarkKey): string {
  return [reading.siteId, reading.year, reading.festival, reading.phase, key].join('|');
}

interface SlotSelection {
  /** First source row per unique benchmark slot; later rows are retained but not counted. */
  selected: Map<string, EvaluatedReading>;
  duplicates: { siteId: string; warning: string }[];
}

function selectBenchmarkSlots(readings: EvaluatedReading[]): SlotSelection {
  const selected = new Map<string, EvaluatedReading>();
  const duplicates = new Map<string, EvaluatedReading[]>();
  for (const reading of readings) {
    const key = benchmarkKey(reading.parameter);
    if (!key) continue;
    const slot = slotKey(reading, key);
    const first = selected.get(slot);
    if (!first) selected.set(slot, reading);
    else duplicates.set(slot, [...(duplicates.get(slot) ?? [first]), reading]);
  }
  return {
    selected,
    duplicates: [...duplicates.values()].map((rows) => {
      const [first] = rows;
      const conflicting = new Set(rows.map((row) => `${row.status}:${row.value ?? row.rawFlag}`)).size > 1;
      return {
        siteId: first.siteId,
        warning: `Duplicate ${first.parameter} slot (${first.year} ${first.festival} ${first.phase}): `
          + `rows ${rows.map((row) => row.id).join(', ')}. Using ${first.id}.`
          + (conflicting ? ' Values conflict; QA review required.' : ''),
      };
    }),
  };
}

function emptyCoverage(expected: number): Coverage {
  return {
    expectedBenchmarkSlots: expected, numericBenchmarkSlots: 0, censoredBenchmarkSlots: 0,
    explicitMissingBenchmarkSlots: 0, absentBenchmarkSlots: 0, unknownBenchmarkSlots: 0,
  };
}

function buildCoverage(siteId: string, filters: Filters, selected: Map<string, EvaluatedReading>): Coverage {
  const coverage = emptyCoverage(filters.years.length * filters.festivals.length * filters.phases.length * BENCHMARK_KEYS.length);
  for (const year of filters.years) for (const festival of filters.festivals) for (const phase of filters.phases) {
    for (const key of BENCHMARK_KEYS) {
      const reading = selected.get(slotKey({ siteId, year, festival, phase }, key));
      if (!reading) coverage.absentBenchmarkSlots += 1;
      else if (isNumericReading(reading)) coverage.numericBenchmarkSlots += 1;
      else if (reading.status === 'bdl' || reading.status === 'nd') coverage.censoredBenchmarkSlots += 1;
      else if (reading.status === 'not_sampled') coverage.explicitMissingBenchmarkSlots += 1;
      else coverage.unknownBenchmarkSlots += 1;
    }
  }
  return coverage;
}

function buildMetric(key: BenchmarkKey, rows: EvaluatedReading[]): Metric {
  const values = rows.flatMap((row) => isNumericReading(row) ? [row.value] : []);
  return {
    parameter: BENCHMARK_PARAMETERS[key],
    numericCount: values.length,
    breachCount: rows.filter((row) => row.comparison === 'breaches').length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    readings: rows,
  };
}

/** Distance outside the criterion; used to cite the most extreme breach. */
function breachDistance(value: number, criterion: Criterion): number {
  if (criterion.min !== null && value < criterion.min) return criterion.min - value;
  if (criterion.max !== null && value > criterion.max) return value - criterion.max;
  return 0;
}

function breachReason(code: Reason['code'], metric: Metric): Reason | null {
  const failed = metric.readings.filter((row): row is EvaluatedReading & { value: number } =>
    row.comparison === 'breaches' && isNumericReading(row));
  if (!failed.length) return null;
  // Most extreme breach first; ties keep source order.
  const worst = failed.reduce((best, row) =>
    breachDistance(row.value, row.criterion!) > breachDistance(best.value, best.criterion!) ? row : best);
  const criterion = worst.criterion!;
  const limit = criterion.min !== null && worst.value < criterion.min ? criterion.min : criterion.max;
  return {
    code, evidenceIds: failed.map((row) => row.id), observed: worst.value, limit,
    count: failed.length, total: metric.numericCount,
  };
}

function absentPeriods(siteId: string, filters: Filters, selected: Map<string, EvaluatedReading>): string[] {
  const periods: string[] = [];
  for (const year of filters.years) for (const festival of filters.festivals) {
    const any = filters.phases.some((phase) =>
      BENCHMARK_KEYS.some((key) => selected.has(slotKey({ siteId, year, festival, phase }, key))));
    if (!any) periods.push(`${festival} ${year}`);
  }
  return periods;
}

function analyzeSite(
  site: Site, filters: Filters, siteRows: EvaluatedReading[],
  selected: Map<string, EvaluatedReading>, duplicateWarnings: string[],
): SiteAnalysis {
  const counted = siteRows.filter((row) => {
    const key = benchmarkKey(row.parameter);
    return key !== null && selected.get(slotKey(row, key)) === row;
  });
  const metrics = BENCHMARK_KEYS.map((key) =>
    buildMetric(key, counted.filter((row) => benchmarkKey(row.parameter) === key)));
  const [doMetric, bodMetric, phMetric] = metrics;
  const numeric = counted.filter((row) => isNumericReading(row) && row.comparison !== 'no_criterion');
  const breaches = numeric.filter((row) => row.comparison === 'breaches');
  const zeroRows = doMetric.readings.filter((row) => isNumericReading(row) && row.value === 0);
  const coverage = buildCoverage(site.id, filters, selected);

  const reasons: Reason[] = [];
  if (zeroRows.length) {
    reasons.push({
      code: 'zero_do', evidenceIds: zeroRows.map((row) => row.id), observed: 0,
      limit: zeroRows[0].criterion?.min ?? null, count: zeroRows.length, total: doMetric.numericCount,
    });
  }
  for (const [code, metric] of [['do_breach', doMetric], ['bod_breach', bodMetric], ['ph_breach', phMetric]] as const) {
    const reason = breachReason(code, metric);
    if (reason) reasons.push(reason);
  }
  if (coverage.expectedBenchmarkSlots > 0 && coverage.numericBenchmarkSlots < coverage.expectedBenchmarkSlots) {
    reasons.push({
      code: 'incomplete_evidence',
      // Cites the censored/missing/unknown rows that exist; wholly absent slots have no row to cite.
      evidenceIds: counted.filter((row) => !isNumericReading(row)).map((row) => row.id),
      observed: null, limit: null,
      count: coverage.numericBenchmarkSlots, total: coverage.expectedBenchmarkSlots,
    });
  }
  if (site.confidence === 'medium') {
    reasons.push({ code: 'site_ambiguity', evidenceIds: [], observed: null, limit: null, count: null, total: null });
  }
  if (numeric.length && !breaches.length) {
    reasons.push({
      code: 'no_observed_breach', evidenceIds: numeric.map((row) => row.id),
      observed: null, limit: null, count: 0, total: numeric.length,
    });
  }

  const warnings = [...site.warnings];
  const absent = absentPeriods(site.id, filters, selected);
  if (absent.length) {
    warnings.push(`No benchmark readings in the source reports for ${absent.join(', ')}. Evidence is incomplete, not clean.`);
  }
  warnings.push(...duplicateWarnings);

  return {
    site, rank: null, zeroDo: zeroRows.length > 0,
    benchmarkNumericCount: numeric.length, benchmarkBreachCount: breaches.length,
    breachFraction: numeric.length ? breaches.length / numeric.length : null,
    metrics, coverage, reasons, warnings,
  };
}

/** Missing tie-break values sort after numeric values in either direction. */
function compareNullable(a: number | null, b: number | null, direction: 'asc' | 'desc'): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Orders sites and assigns sequential ranks to sites with numeric benchmark readings:
 * DO=0 first, then breach fraction (desc), lowest DO, highest BOD, site ID.
 * Unassessable sites keep `rank = null` and follow in site ID order.
 */
export function rankSites(sites: SiteAnalysis[]): SiteAnalysis[] {
  const ranked = sites.filter((item) => item.benchmarkNumericCount > 0)
    .sort((a, b) => Number(b.zeroDo) - Number(a.zeroDo)
      || compareNullable(a.breachFraction, b.breachFraction, 'desc')
      || compareNullable(a.metrics[0].min, b.metrics[0].min, 'asc')
      || compareNullable(a.metrics[1].max, b.metrics[1].max, 'desc')
      || compareIds(a.site.id, b.site.id))
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const unranked = sites.filter((item) => item.benchmarkNumericCount === 0)
    .sort((a, b) => compareIds(a.site.id, b.site.id))
    .map((item) => ({ ...item, rank: null }));
  return [...ranked, ...unranked];
}

export interface AnalyzeOptions {
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

export function analyze(data: TrackData, filters: Filters, options: AnalyzeOptions = {}): Analysis {
  const scope = normalizeFilters(filters);
  const criteria = benchmarkCriteria(data.criteria);
  const warnings = [...data.warnings, ...ANALYSIS_LIMITATIONS];
  for (const key of BENCHMARK_KEYS) {
    if (!criteria[key]) warnings.push(`No Class B criterion supplied for ${BENCHMARK_PARAMETERS[key]}; its readings are not compared.`);
  }

  const siteIds = new Set(data.sites.map((site) => site.id));
  const unknownSiteRows = data.readings.filter((row) => !siteIds.has(row.siteId));
  if (unknownSiteRows.length) {
    warnings.push(`${unknownSiteRows.length} reading(s) reference an unknown site and are excluded: ${unknownSiteRows.slice(0, 5).map((row) => row.id).join(', ')}${unknownSiteRows.length > 5 ? ', ...' : ''}.`);
  }

  const inScope = hasScope(scope);
  if (!inScope) warnings.push(NO_SCOPE_WARNING);
  const readings = inScope
    ? data.readings
      .filter((row) => siteIds.has(row.siteId) && scope.years.includes(row.year)
        && scope.festivals.includes(row.festival) && scope.phases.includes(row.phase))
      .map((row) => evaluateReading(row, criteria))
    : [];

  const { selected, duplicates } = selectBenchmarkSlots(readings);
  if (duplicates.length) warnings.push(`${duplicates.length} duplicate benchmark slot(s) found; first source row used.`);

  const bySite = new Map<string, EvaluatedReading[]>();
  for (const row of readings) bySite.set(row.siteId, [...(bySite.get(row.siteId) ?? []), row]);

  const sites = data.sites.map((site) => analyzeSite(
    site, scope, bySite.get(site.id) ?? [], selected,
    duplicates.filter((item) => item.siteId === site.id).map((item) => item.warning),
  ));

  return {
    filters: scope,
    comparisonClass: 'B',
    sites: rankSites(sites),
    readings,
    warnings,
    generatedAt: (options.now ?? new Date()).toISOString(),
  };
}
