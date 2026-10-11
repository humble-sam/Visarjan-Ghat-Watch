import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from './defaults';
import { createFixtureAnalysis, fixtureTrackData, FIXTURE_WARNING } from './fixture';
import { sourceHref } from './SourceLink';

describe('shared UI fixture contract', () => {
  it('retains seven sites and cannot provide report citations for synthetic readings', () => {
    const analysis = createFixtureAnalysis(DEFAULT_FILTERS);
    expect(new Set(analysis.sites.map((item) => item.site.id)).size).toBe(7);
    expect(analysis.warnings).toContain(FIXTURE_WARNING);
    expect(fixtureTrackData.sourceCommit).toBe('synthetic-fixture');
    for (const reading of analysis.readings) expect(sourceHref(reading.source)).toBeNull();
  });

  it('keeps numeric zero separate from censored, missing and unknown cases', () => {
    const analysis = createFixtureAnalysis(DEFAULT_FILTERS);
    const zero = analysis.readings.find((row) => row.value === 0);
    expect(zero?.status).toBe('numeric');
    const unavailable = analysis.sites.find((item) => item.site.id === 'malikhedi')!;
    expect(unavailable.rank).toBeNull();
    expect(unavailable.breachFraction).toBeNull();
    expect(unavailable.coverage.censoredBenchmarkSlots).toBeGreaterThan(0);
    expect(unavailable.coverage.explicitMissingBenchmarkSlots).toBeGreaterThan(0);
    expect(unavailable.coverage.unknownBenchmarkSlots).toBeGreaterThan(0);
    for (const row of analysis.readings.filter((reading) => reading.status !== 'numeric')) {
      expect(row.value).toBeNull();
      expect(row.comparison).toBe('unknown');
    }
  });

  it('updates evidence and coverage together, retaining wholly absent sites', () => {
    const filters = { years: [2025], festivals: ['Durga'] as const, phases: ['during'] as const };
    const analysis = createFixtureAnalysis({ ...filters, festivals: [...filters.festivals], phases: [...filters.phases] });
    expect(analysis.sites).toHaveLength(7);
    expect(analysis.readings.every((row) => row.festival === 'Durga' && row.phase === 'during')).toBe(true);
    for (const id of ['bairagarh', 'malikhedi']) {
      const item = analysis.sites.find((site) => site.site.id === id)!;
      expect(item.rank).toBeNull();
      expect(item.coverage.absentBenchmarkSlots).toBe(3);
    }
  });

  it('accounts for every expected slot and references only selected evidence', () => {
    const analysis = createFixtureAnalysis({ ...DEFAULT_FILTERS, years: [2023, 2024, 2025] });
    const ids = new Set(analysis.readings.map((reading) => reading.id));
    for (const item of analysis.sites) {
      const c = item.coverage;
      expect(c.numericBenchmarkSlots + c.censoredBenchmarkSlots + c.explicitMissingBenchmarkSlots
        + c.absentBenchmarkSlots + c.unknownBenchmarkSlots).toBe(c.expectedBenchmarkSlots);
      for (const reason of item.reasons) for (const id of reason.evidenceIds) expect(ids.has(id)).toBe(true);
    }
  });

  it('produces no numbered priorities when the scope is empty', () => {
    const analysis = createFixtureAnalysis({ ...DEFAULT_FILTERS, phases: [] });
    expect(analysis.readings).toHaveLength(0);
    expect(analysis.sites.every((site) => site.rank === null && site.coverage.expectedBenchmarkSlots === 0)).toBe(true);
  });

  it('does not mutate shared filters when the fixture refreshes', () => {
    const before = structuredClone(DEFAULT_FILTERS);
    createFixtureAnalysis(DEFAULT_FILTERS);
    expect(DEFAULT_FILTERS).toEqual(before);
  });
});
