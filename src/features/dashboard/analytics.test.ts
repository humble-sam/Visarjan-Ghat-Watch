import { describe, expect, it } from 'vitest';
import { loadTrackData } from '../../data/loadTrackData';
import { analyze } from '../../domain/analyze';
import { breachHeatmap, doBodPairs, headline, phaseImpact, siteBreachBars, yearlyBreachShare } from './analytics';

describe('analytics chart models', async () => {
  const data = await loadTrackData();
  const all = analyze(data, { years: [2023, 2024, 2025], festivals: ['Ganesh', 'Durga'], phases: ['pre', 'during', 'after'] });
  const y2025 = analyze(data, { years: [2025], festivals: ['Ganesh', 'Durga'], phases: ['pre', 'during', 'after'] });

  it('agrees with the ranking counts', () => {
    for (const bar of siteBreachBars(y2025)) {
      const site = y2025.sites.find((item) => item.site.id === bar.siteId)!;
      expect([bar.breaches, bar.numeric, bar.rank]).toEqual([site.benchmarkBreachCount, site.benchmarkNumericCount, site.rank]);
    }
    const stats = headline(all);
    expect(stats.numeric).toBe(all.sites.reduce((sum, item) => sum + item.benchmarkNumericCount, 0));
    expect(stats.breaches).toBe(all.sites.reduce((sum, item) => sum + item.benchmarkBreachCount, 0));
    expect(stats.lowestDo?.value).toBe(0);
  });

  it('heatmap cells match per-parameter metrics; no numeric is null, not zero', () => {
    const rows = breachHeatmap(all);
    const doTotal = rows.reduce((sum, row) => sum + row.cells[0].numeric, 0);
    const doBreaches = rows.reduce((sum, row) => sum + row.cells[0].breaches, 0);
    expect([doTotal, doBreaches]).toEqual([116, 42]);
    const empty = analyze(data, { years: [2025], festivals: ['Durga'], phases: ['pre'] });
    expect(breachHeatmap(empty).find((row) => row.siteId === 'bairagarh')!.cells.every((cell) => cell.share === null)).toBe(true);
  });

  it('phase impact accounts for every counted benchmark reading', () => {
    const rows = phaseImpact(all);
    expect(rows.map((row) => row.phase)).toEqual(['pre', 'during', 'after']);
    const counted = all.sites.reduce((sum, item) => sum + item.metrics.reduce((s, metric) => s + metric.readings.length, 0), 0);
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(counted);
    for (const row of rows) expect(row.meets + row.breaches + row.noNumeric).toBe(row.total);
  });

  it('pairs DO and BOD only from the same sample', () => {
    const points = doBodPairs(all);
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      const [doRow, bodRow] = point.evidenceIds.map((id) => all.readings.find((row) => row.id === id)!);
      expect([doRow.siteId, doRow.year, doRow.festival, doRow.phase]).toEqual([bodRow.siteId, bodRow.year, bodRow.festival, bodRow.phase]);
      expect([doRow.value, bodRow.value]).toEqual([point.do, point.bod]);
    }
  });

  it('year comparison needs two or more years', () => {
    expect(yearlyBreachShare(y2025)).toEqual([]);
    expect(yearlyBreachShare(all).map((row) => row.year)).toEqual([2023, 2024, 2025]);
  });
});
