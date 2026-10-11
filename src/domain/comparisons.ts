import type { Analysis, EvaluatedReading, Festival, Phase } from '../shared/types';
import { benchmarkKey, isNumericReading, type BenchmarkKey } from './analyze';

// Grouping helpers for detail views. They never average, interpolate or
// re-evaluate readings: every point is one source row (or an explicit gap).

const PHASES: Phase[] = ['pre', 'during', 'after'];
const FESTIVALS: Festival[] = ['Ganesh', 'Durga'];

export interface PhasePoint {
  phase: Phase;
  /** First source row for the slot, or null when the slot is wholly absent. */
  reading: EvaluatedReading | null;
  /** Numeric value only; censored, missing and absent points are gaps. */
  value: number | null;
}

export interface PhaseSeries {
  key: string;
  year: number;
  festival: Festival;
  parameter: BenchmarkKey;
  points: PhasePoint[];
}

function slotReading(readings: EvaluatedReading[], siteId: string, year: number,
  festival: Festival, phase: Phase, parameter: BenchmarkKey): EvaluatedReading | null {
  return readings.find((row) => row.siteId === siteId && row.year === year && row.festival === festival
    && row.phase === phase && benchmarkKey(row.parameter) === parameter) ?? null;
}

/** One before/during/after series per selected year x festival; never merges unrelated observations. */
export function phaseSeries(analysis: Analysis, siteId: string, parameter: BenchmarkKey): PhaseSeries[] {
  const { years, festivals, phases } = analysis.filters;
  return years.flatMap((year) => FESTIVALS.filter((festival) => festivals.includes(festival)).map((festival) => ({
    key: `${year} ${festival}`, year, festival, parameter,
    points: PHASES.filter((phase) => phases.includes(phase)).map((phase) => {
      const reading = slotReading(analysis.readings, siteId, year, festival, phase, parameter);
      return { phase, reading, value: reading && isNumericReading(reading) ? reading.value : null };
    }),
  })));
}

export interface YearComparison {
  festival: Festival;
  phase: Phase;
  parameter: BenchmarkKey;
  /** One entry per selected year, in year order; gaps stay null. */
  byYear: { year: number; reading: EvaluatedReading | null; value: number | null }[];
}

/**
 * Year-over-year comparisons for matching festival and phase. Requires at least
 * two selected years; returns only slots where two or more years are numeric.
 */
export function yearComparisons(analysis: Analysis, siteId: string, parameter: BenchmarkKey): YearComparison[] {
  const { years, festivals, phases } = analysis.filters;
  if (years.length < 2) return [];
  const result: YearComparison[] = [];
  for (const festival of FESTIVALS.filter((item) => festivals.includes(item))) {
    for (const phase of PHASES.filter((item) => phases.includes(item))) {
      const byYear = years.map((year) => {
        const reading = slotReading(analysis.readings, siteId, year, festival, phase, parameter);
        return { year, reading, value: reading && isNumericReading(reading) ? reading.value : null };
      });
      if (byYear.filter((item) => item.value !== null).length >= 2) result.push({ festival, phase, parameter, byYear });
    }
  }
  return result;
}
