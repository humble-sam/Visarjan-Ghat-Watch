import { PHASE_LABELS } from '../../shared/defaults';
import type {
  Criterion, EvaluatedReading, Festival, Filters, Metric, Phase, Reason, SiteAnalysis, SourceRef,
} from '../../shared/types';

// Presentation helpers only. Comparisons, ranks and coverage come from Analysis;
// nothing here re-evaluates a reading against a criterion.

export const AVAILABLE_YEARS = [2023, 2024, 2025] as const;
export const FESTIVALS: readonly Festival[] = ['Ganesh', 'Durga'];
export const PHASES: readonly Phase[] = ['pre', 'during', 'after'];

export const DO_PARAMETER = 'Dissolved oxygen';
export const BOD_PARAMETER = 'BOD';
export const PH_PARAMETER = 'pH';
export const BENCHMARK_PARAMETERS = [DO_PARAMETER, BOD_PARAMETER, PH_PARAMETER] as const;

export function hasScope(filters: Filters): boolean {
  return filters.years.length > 0 && filters.festivals.length > 0 && filters.phases.length > 0;
}

export function toggleValue<T>(values: readonly T[], value: T, order: readonly T[]): T[] {
  const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return order.filter((item) => next.includes(item));
}

export function isBenchmark(parameter: string): boolean {
  return (BENCHMARK_PARAMETERS as readonly string[]).includes(parameter);
}

export function shortParameter(parameter: string): string {
  return parameter === DO_PARAMETER ? 'DO' : parameter;
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function withUnit(value: string, unit: string): string {
  return unit ? `${value} ${unit}` : value;
}

/** Human-readable Class B comparison, taken from the loaded criterion. */
export function formatCriterion(criterion: Criterion | null): string {
  if (!criterion) return 'No Class B limit';
  if (criterion.type === 'range' && criterion.min !== null && criterion.max !== null) {
    return withUnit(`${formatNumber(criterion.min)}–${formatNumber(criterion.max)}`, criterion.unit);
  }
  if (criterion.min !== null) return withUnit(`≥ ${formatNumber(criterion.min)}`, criterion.unit);
  if (criterion.max !== null) return withUnit(`≤ ${formatNumber(criterion.max)}`, criterion.unit);
  return 'No Class B limit';
}

export type CellKind = 'numeric' | 'censored' | 'missing' | 'unknown' | 'absent';
export interface CellDisplay {
  kind: CellKind;
  text: string;
  note: string;
}

/** Numeric, censored, explicitly missing, unknown and absent are always distinct. */
export function describeReading(reading: EvaluatedReading | undefined): CellDisplay {
  if (!reading) return { kind: 'absent', text: 'Absent', note: 'No row in the source report' };
  switch (reading.status) {
    case 'numeric':
      return reading.value === null
        ? { kind: 'unknown', text: 'Unknown', note: 'Invalid numeric value' }
        : { kind: 'numeric', text: formatNumber(reading.value), note: comparisonNote(reading) };
    case 'bdl':
      return { kind: 'censored', text: 'BDL', note: 'Below detection limit · not zero' };
    case 'nd':
      return { kind: 'censored', text: 'ND', note: 'Not detected · not zero' };
    case 'not_sampled':
      return { kind: 'missing', text: 'Not sampled', note: reading.rawFlag ? `Printed “${reading.rawFlag}”` : 'Explicitly missing' };
    default:
      return { kind: 'unknown', text: 'Unknown', note: reading.valueAsPrinted ? `Printed “${reading.valueAsPrinted}”` : 'Unrecognised entry' };
  }
}

function comparisonNote(reading: EvaluatedReading): string {
  if (reading.comparison === 'breaches') return 'Breaches Class B comparison';
  if (reading.comparison === 'meets') return 'Meets Class B comparison';
  if (reading.comparison === 'no_criterion') return 'No Class B limit';
  return 'Not compared';
}

export interface Period {
  key: string;
  year: number;
  festival: Festival;
  label: string;
}

/** Selected year x festival periods in a stable order. */
export function selectedPeriods(filters: Filters): Period[] {
  const years = [...filters.years].sort((a, b) => a - b);
  return years.flatMap((year) => FESTIVALS.filter((festival) => filters.festivals.includes(festival))
    .map((festival) => ({ key: `${festival} ${year}`, year, festival, label: `${festival} ${year}` })));
}

export function selectedPhases(filters: Filters): Phase[] {
  return PHASES.filter((phase) => filters.phases.includes(phase));
}

/** First source row per (year, festival, phase, parameter), matching the analysis convention. */
export function indexReadings(readings: EvaluatedReading[]): Map<string, EvaluatedReading> {
  const index = new Map<string, EvaluatedReading>();
  for (const reading of readings) {
    const key = slot(reading.year, reading.festival, reading.phase, reading.parameter);
    if (!index.has(key)) index.set(key, reading);
  }
  return index;
}

export function slot(year: number, festival: Festival, phase: Phase, parameter: string): string {
  return `${year}|${festival}|${phase}|${parameter}`;
}

export function metricFor(site: SiteAnalysis, parameter: string): Metric | undefined {
  return site.metrics.find((metric) => metric.parameter === parameter);
}

/** Benchmark readings come from the analysed metrics; other parameters from filtered evidence. */
export function siteReadings(site: SiteAnalysis, readings: EvaluatedReading[]): EvaluatedReading[] {
  const benchmark = site.metrics.flatMap((metric) => metric.readings);
  const other = readings.filter((reading) => reading.siteId === site.site.id && !isBenchmark(reading.parameter));
  return [...benchmark, ...other];
}

export function otherParameters(readings: EvaluatedReading[]): string[] {
  return [...new Set(readings.filter((reading) => !isBenchmark(reading.parameter)).map((reading) => reading.parameter))];
}

export function criterionFor(metric: Metric | undefined): Criterion | null {
  return metric?.readings.find((reading) => reading.criterion)?.criterion ?? null;
}

// Fixed series colour per period, so a filter never repaints a surviving series.
// Validated categorical slots 1-6; Durga lines are also dashed (not colour alone).
const SERIES_COLORS: Record<string, string> = {
  'Ganesh 2023': '#2a78d6', 'Durga 2023': '#eb6834',
  'Ganesh 2024': '#1baf7a', 'Durga 2024': '#eda100',
  'Ganesh 2025': '#e87ba4', 'Durga 2025': '#008300',
  'Ganesh 2026': '#6250d6', 'Durga 2026': '#e34948',
};
export function seriesColor(periodKey: string): string {
  return SERIES_COLORS[periodKey] ?? '#6d7779';
}

export interface ChartRow {
  phase: Phase;
  label: string;
  [series: string]: number | string | null;
}
export interface PhaseChart {
  parameter: string;
  rows: ChartRow[];
  series: Period[];
  numericPoints: number;
}

/**
 * One row per selected phase; one series per year/festival. Only numeric readings
 * are plotted. Censored, missing and absent slots stay null so lines show gaps.
 */
export function buildPhaseChart(metric: Metric | undefined, parameter: string, filters: Filters): PhaseChart {
  const index = indexReadings(metric?.readings ?? []);
  const series = selectedPeriods(filters);
  let numericPoints = 0;
  const rows = selectedPhases(filters).map((phase) => {
    const row: ChartRow = { phase, label: PHASE_LABELS[phase] };
    for (const period of series) {
      const reading = index.get(slot(period.year, period.festival, phase, parameter));
      const value = reading?.status === 'numeric' && reading.value !== null ? reading.value : null;
      if (value !== null) numericPoints += 1;
      row[period.key] = value;
    }
    return row;
  });
  return { parameter, rows, series, numericPoints };
}

export interface YearComparisonRow {
  key: string;
  parameter: string;
  festival: Festival;
  phase: Phase;
  cells: { year: number; reading: EvaluatedReading | undefined }[];
}

/** Matching festival/phase/parameter across selected years. Empty unless 2+ years are selected. */
export function buildYearComparison(site: SiteAnalysis, filters: Filters): YearComparisonRow[] {
  const years = [...filters.years].sort((a, b) => a - b);
  if (years.length < 2) return [];
  const index = indexReadings(site.metrics.flatMap((metric) => metric.readings));
  const rows: YearComparisonRow[] = [];
  for (const parameter of BENCHMARK_PARAMETERS) {
    for (const festival of FESTIVALS.filter((item) => filters.festivals.includes(item))) {
      for (const phase of selectedPhases(filters)) {
        const cells = years.map((year) => ({ year, reading: index.get(slot(year, festival, phase, parameter)) }));
        // Only a comparison if at least two years have some row for this exact slot.
        if (cells.filter((cell) => cell.reading).length >= 2) {
          rows.push({ key: `${parameter}|${festival}|${phase}`, parameter, festival, phase, cells });
        }
      }
    }
  }
  return rows;
}

export function statusLabel(site: SiteAnalysis, scoped: boolean): { text: string; tone: 'critical' | 'warning' | 'unknown' | 'neutral' } {
  if (!scoped) return { text: 'No period selected', tone: 'unknown' };
  if (site.rank === null) return { text: 'Insufficient evidence · testing needed', tone: 'unknown' };
  if (site.zeroDo) return { text: 'Zero DO observed', tone: 'critical' };
  if (site.benchmarkBreachCount > 0) return { text: 'Breaches observed', tone: 'warning' };
  return { text: 'No observed breach in available readings', tone: 'neutral' };
}

export function isIncomplete(site: SiteAnalysis): boolean {
  return site.coverage.numericBenchmarkSlots < site.coverage.expectedBenchmarkSlots;
}

function value(observed: number | null): string {
  return observed === null ? 'unknown' : formatNumber(observed);
}

/** Plain-language reason text built only from the structured reason fields. */
export function reasonText(reason: Reason): string {
  const ratio = reason.count !== null && reason.total !== null ? `${reason.count} of ${reason.total}` : null;
  switch (reason.code) {
    case 'zero_do':
      return `Dissolved oxygen was recorded as 0 mg/l in ${ratio ?? 'some'} numeric DO readings.`;
    case 'do_breach':
      return `DO was below ${value(reason.limit)} mg/l in ${ratio ?? 'some'} numeric readings; lowest ${value(reason.observed)} mg/l.`;
    case 'bod_breach':
      return `BOD was above ${value(reason.limit)} mg/l in ${ratio ?? 'some'} numeric readings; highest ${value(reason.observed)} mg/l.`;
    case 'ph_breach':
      return `pH was outside the Class B range in ${ratio ?? 'some'} numeric readings; most extreme ${value(reason.observed)} (limit ${value(reason.limit)}).`;
    case 'incomplete_evidence':
      return `Only ${ratio ?? 'some'} expected DO/BOD/pH slots have numeric readings. Missing evidence is not clean water.`;
    case 'site_ambiguity':
      return 'Source reports name this site differently and it may combine two locations. Verify site identity.';
    case 'no_observed_breach':
      return `No DO/BOD/pH breach in ${reason.total ?? 'the'} numeric readings available. This is not a safety finding.`;
  }
}

export function reasonTone(reason: Reason): 'critical' | 'warning' | 'unknown' | 'neutral' {
  if (reason.code === 'zero_do') return 'critical';
  if (reason.code.endsWith('_breach')) return 'warning';
  if (reason.code === 'no_observed_breach') return 'neutral';
  return 'unknown';
}

/** Operational suggestions for officer review; derived only from reason codes. */
export function suggestedActions(site: SiteAnalysis): string[] {
  const codes = new Set(site.reasons.map((reason) => reason.code));
  const actions = ['Obtain fresh DO, BOD and pH samples before 20 October 2026.'];
  if (codes.has('zero_do') || codes.has('do_breach')) actions.push('Review aeration where low DO was recorded.');
  if (codes.has('bod_breach')) actions.push('Review cleanup and organic load where BOD was high.');
  if (codes.has('incomplete_evidence') || site.rank === null) actions.push('Fill the evidence gaps; absent readings are unknown, not clean.');
  if (codes.has('site_ambiguity')) actions.push('Verify which physical location the reports refer to.');
  return actions;
}

/** Unique report pages cited by a set of readings, in first-seen order. */
export function uniqueSources(readings: EvaluatedReading[]): { key: string; year: number; source: SourceRef }[] {
  const seen = new Map<string, { key: string; year: number; source: SourceRef }>();
  for (const reading of readings) {
    const key = `${reading.source.documentId}|${reading.source.page}`;
    if (!seen.has(key)) seen.set(key, { key, year: reading.year, source: reading.source });
  }
  return [...seen.values()];
}
