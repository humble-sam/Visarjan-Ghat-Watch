import type { Analysis, EvaluatedReading, Phase, SiteAnalysis } from '../../shared/types';
import { BOD_PARAMETER, DO_PARAMETER, PH_PARAMETER } from './model';

// Chart models built only from Analysis. They use each reading's precomputed
// comparison and the de-duplicated metric readings, so charts always agree
// with the ranking and coverage. Nothing is averaged or re-evaluated.

// Validated (light, all pairs): blue / amber / red clear CVD and normal-vision
// floors; red-green does not. Amber is below 3:1, so every chart has labels and a table.
// Gray is reserved for "no numeric reading" and is always hatched and labelled.
export const STATUS_COLORS = {
  meets: '#2a78d6',
  serious: '#eda100',
  breaches: '#d03b3b',
  noData: '#aeb6b6',
} as const;
export const BAR_COLOR = '#d03b3b';
/** Single-hue red sequential ramp (light -> dark = fewer -> more breaches); validated monotone. */
export const HEAT_RAMP = ['#fbe3e1', '#f5bdb7', '#ee958d', '#e46b62', '#d03b3b', '#a82a2a', '#7c1d1d'];

const PHASE_ORDER: Phase[] = ['pre', 'during', 'after'];

export function shortSiteName(name: string): string {
  return name.split(/[(/]/)[0].replace(/\b(ghat|kund|lake|dam)\b/gi, '').trim() || name;
}

function countedReadings(item: SiteAnalysis): EvaluatedReading[] {
  return item.metrics.flatMap((metric) => metric.readings);
}

export interface SiteBar {
  siteId: string;
  label: string;
  name: string;
  rank: number | null;
  breaches: number;
  numeric: number;
  percent: number | null;
}

export function siteBreachBars(analysis: Analysis): SiteBar[] {
  return analysis.sites.map((item) => ({
    siteId: item.site.id, label: shortSiteName(item.site.name), name: item.site.name, rank: item.rank,
    breaches: item.benchmarkBreachCount, numeric: item.benchmarkNumericCount,
    percent: item.breachFraction === null ? null : Math.round(item.breachFraction * 100),
  }));
}

export interface HeatCell {
  parameter: string;
  breaches: number;
  numeric: number;
  share: number | null;
}
export interface HeatRow { siteId: string; label: string; cells: HeatCell[] }

export function breachHeatmap(analysis: Analysis): HeatRow[] {
  return analysis.sites.map((item) => ({
    siteId: item.site.id, label: shortSiteName(item.site.name),
    cells: item.metrics.map((metric) => ({
      parameter: metric.parameter, breaches: metric.breachCount, numeric: metric.numericCount,
      share: metric.numericCount ? metric.breachCount / metric.numericCount : null,
    })),
  }));
}

export function heatColor(share: number | null): string {
  if (share === null) return 'transparent';
  return HEAT_RAMP[Math.min(HEAT_RAMP.length - 1, Math.floor(share * HEAT_RAMP.length))];
}

export interface PhaseImpactRow { phase: Phase; meets: number; breaches: number; noNumeric: number; total: number }

/** Benchmark readings by phase across every ghat in scope. Absent slots are not rows, so they are listed separately. */
export function phaseImpact(analysis: Analysis): PhaseImpactRow[] {
  const rows = analysis.sites.flatMap(countedReadings);
  return PHASE_ORDER.filter((phase) => analysis.filters.phases.includes(phase)).map((phase) => {
    const inPhase = rows.filter((row) => row.phase === phase);
    const meets = inPhase.filter((row) => row.comparison === 'meets').length;
    const breaches = inPhase.filter((row) => row.comparison === 'breaches').length;
    return { phase, meets, breaches, noNumeric: inPhase.length - meets - breaches, total: inPhase.length };
  });
}

export type ScatterGroup = 'both_meet' | 'one_breach' | 'both_breach';
export interface ScatterPoint {
  key: string;
  siteId: string;
  site: string;
  period: string;
  do: number;
  bod: number;
  group: ScatterGroup;
  evidenceIds: [string, string];
}

/** Pairs DO and BOD from the same ghat, year, festival and phase when both are numeric. */
export function doBodPairs(analysis: Analysis): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const item of analysis.sites) {
    const dO = item.metrics.find((metric) => metric.parameter === DO_PARAMETER)?.readings ?? [];
    const bod = item.metrics.find((metric) => metric.parameter === BOD_PARAMETER)?.readings ?? [];
    for (const d of dO) {
      if (d.status !== 'numeric' || d.value === null || d.comparison === 'no_criterion' || d.comparison === 'unknown') continue;
      const b = bod.find((row) => row.year === d.year && row.festival === d.festival && row.phase === d.phase);
      if (!b || b.status !== 'numeric' || b.value === null || (b.comparison !== 'meets' && b.comparison !== 'breaches')) continue;
      const breaches = Number(d.comparison === 'breaches') + Number(b.comparison === 'breaches');
      points.push({
        key: `${item.site.id}|${d.year}|${d.festival}|${d.phase}`, siteId: item.site.id, site: item.site.name,
        period: `${d.festival} ${d.year} · ${d.phase === 'pre' ? 'before' : d.phase === 'during' ? 'during' : 'after'}`,
        do: d.value, bod: b.value, group: breaches === 0 ? 'both_meet' : breaches === 1 ? 'one_breach' : 'both_breach',
        evidenceIds: [d.id, b.id],
      });
    }
  }
  return points;
}

export interface YearRow { year: number; breaches: number; numeric: number; percent: number | null }

/** Breach share per selected year, same festivals and phases for every year. Needs two or more years. */
export function yearlyBreachShare(analysis: Analysis): YearRow[] {
  if (analysis.filters.years.length < 2) return [];
  const rows = analysis.sites.flatMap(countedReadings);
  return analysis.filters.years.map((year) => {
    const inYear = rows.filter((row) => row.year === year && (row.comparison === 'meets' || row.comparison === 'breaches'));
    const breaches = inYear.filter((row) => row.comparison === 'breaches').length;
    return { year, breaches, numeric: inYear.length, percent: inYear.length ? Math.round((breaches / inYear.length) * 100) : null };
  });
}

export interface Headline {
  readings: number;
  numeric: number;
  breaches: number;
  lowestDo: { value: number; site: string } | null;
  highestBod: { value: number; site: string } | null;
  phOutside: number;
}

export function headline(analysis: Analysis): Headline {
  const rows = analysis.sites.flatMap((item) => countedReadings(item).map((row) => ({ row, site: item.site.name })));
  const numeric = rows.filter(({ row }) => row.comparison === 'meets' || row.comparison === 'breaches');
  const pick = (parameter: string, better: (a: number, b: number) => boolean) => numeric
    .filter(({ row }) => row.parameter === parameter && row.value !== null)
    .reduce<{ value: number; site: string } | null>((best, { row, site }) =>
      !best || better(row.value!, best.value) ? { value: row.value!, site } : best, null);
  return {
    readings: rows.length,
    numeric: numeric.length,
    breaches: numeric.filter(({ row }) => row.comparison === 'breaches').length,
    lowestDo: pick(DO_PARAMETER, (a, b) => a < b),
    highestBod: pick(BOD_PARAMETER, (a, b) => a > b),
    phOutside: numeric.filter(({ row }) => row.parameter === PH_PARAMETER && row.comparison === 'breaches').length,
  };
}
