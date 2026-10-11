import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_FILTERS } from '../../shared/defaults';
import { createFixtureAnalysis } from '../../shared/fixture';
import { reportUrl } from '../../shared/sources';
import type { EvaluatedReading, Filters, SiteAnalysis } from '../../shared/types';
import { Dashboard } from './Dashboard';
import {
  buildPhaseChart, buildYearComparison, describeReading, DO_PARAMETER, formatCriterion, metricFor,
  reasonText, statusLabel, toggleValue,
} from './model';

const base = createFixtureAnalysis(DEFAULT_FILTERS);
const site = (id: string, analysis = base) => analysis.sites.find((item) => item.site.id === id)!;
const doReading = site('bairagarh').metrics[0].readings[0];

function render(filters: Filters, selectedSiteId: string | null = 'bairagarh') {
  return renderToStaticMarkup(<Dashboard analysis={createFixtureAnalysis(filters)} filters={filters}
    selectedSiteId={selectedSiteId} onFiltersChange={() => {}} onSelectSite={() => {}} />);
}

function withReading(reading: EvaluatedReading, patch: Partial<EvaluatedReading>): EvaluatedReading {
  return { ...reading, ...patch };
}

describe('dashboard reading states', () => {
  it('keeps numeric zero, censored, not sampled, unknown and absent distinct', () => {
    const zero = describeReading(withReading(doReading, { value: 0, status: 'numeric', comparison: 'breaches' }));
    expect(zero).toMatchObject({ kind: 'numeric', text: '0' });
    expect(describeReading(withReading(doReading, { value: null, status: 'bdl' })).kind).toBe('censored');
    expect(describeReading(withReading(doReading, { value: null, status: 'nd' })).text).toBe('ND');
    expect(describeReading(withReading(doReading, { value: null, status: 'not_sampled', rawFlag: '*' })))
      .toMatchObject({ kind: 'missing', note: 'Printed “*”' });
    expect(describeReading(withReading(doReading, { value: null, status: 'unknown' })).kind).toBe('unknown');
    expect(describeReading(undefined).kind).toBe('absent');
  });

  it('formats criteria from loaded data, with no invented limits', () => {
    expect(formatCriterion(doReading.criterion)).toBe('≥ 5 mg/l');
    expect(formatCriterion({ parameter: 'pH', class: 'B', type: 'range', min: 6.5, max: 8.5, unit: '' })).toBe('6.5–8.5');
    expect(formatCriterion(null)).toBe('No Class B limit');
  });
});

describe('phase charts and comparisons', () => {
  it('plots numeric zero, leaves censored and absent slots as gaps, one series per period', () => {
    const filters: Filters = { years: [2025], festivals: ['Ganesh', 'Durga'], phases: ['pre', 'during', 'after'] };
    const analysis = createFixtureAnalysis(filters);
    const bairagarh = buildPhaseChart(metricFor(site('bairagarh', analysis), DO_PARAMETER), DO_PARAMETER, filters);
    expect(bairagarh.series.map((series) => series.key)).toEqual(['Ganesh 2025', 'Durga 2025']);
    expect(bairagarh.rows.map((row) => row['Ganesh 2025'])).toEqual([2, 0, 1]);
    // Bairagarh has no Durga 2025 table: gaps, never interpolated or zero.
    expect(bairagarh.rows.map((row) => row['Durga 2025'])).toEqual([null, null, null]);
    const malikhedi = buildPhaseChart(metricFor(site('malikhedi', analysis), DO_PARAMETER), DO_PARAMETER, filters);
    expect(malikhedi.numericPoints).toBe(0);
  });

  it('separates years into distinct series and compares only matching slots', () => {
    const single = createFixtureAnalysis(DEFAULT_FILTERS);
    expect(buildYearComparison(site('khatlapura', single), DEFAULT_FILTERS)).toEqual([]);
    const filters: Filters = { ...DEFAULT_FILTERS, years: [2024, 2025] };
    const multi = createFixtureAnalysis(filters);
    const chart = buildPhaseChart(metricFor(site('khatlapura', multi), DO_PARAMETER), DO_PARAMETER, filters);
    expect(chart.series.map((series) => series.key)).toEqual(['Ganesh 2024', 'Durga 2024', 'Ganesh 2025', 'Durga 2025']);
    // The fixture has no 2024 rows, so no slot has two years to compare.
    expect(buildYearComparison(site('khatlapura', multi), filters)).toEqual([]);
  });

  it('keeps filter values in a stable order', () => {
    expect(toggleValue([2025], 2023, [2023, 2024, 2025])).toEqual([2023, 2025]);
    expect(toggleValue([2023, 2025], 2025, [2023, 2024, 2025])).toEqual([2023]);
  });
});

describe('labels never imply safety', () => {
  it('labels unranked sites as testing needed and no-breach sites without a safety claim', () => {
    expect(statusLabel(site('malikhedi'), true).text).toContain('testing needed');
    expect(statusLabel(site('bairagarh'), true).text).toBe('Zero DO observed');
    const hathaikheda = site('hathaikheda');
    expect(statusLabel(hathaikheda, true).text).toBe('No observed breach in available readings');
    const noBreach = hathaikheda.reasons.find((reason) => reason.code === 'no_observed_breach')!;
    expect(reasonText(noBreach)).toContain('not a safety finding');
    for (const item of base.sites) expect(statusLabel(item, true).text.toLowerCase()).not.toContain('safe');
  });
});

describe('Dashboard', () => {
  it('lists all seven ghats, testing-needed summary, warnings and limitations', () => {
    const html = render(DEFAULT_FILTERS);
    for (const item of base.sites) expect(html).toContain(item.site.name.replace('&', '&amp;'));
    expect(html).toContain('Testing needed before 20 October 2026');
    expect(html).toContain('Malikhedi kund');
    expect(html).toContain('Total coliform was not measured');
    expect(html).toContain('Site identity to verify');
    expect(html).toContain('Absent');
    expect(html).toContain('BDL');
    expect(html.toLowerCase()).not.toMatch(/\bsafe\b/);
  });

  it('shows a no-scope state with no ranks', () => {
    const empty: Filters = { years: [], festivals: ['Ganesh'], phases: ['pre'] };
    const html = render(empty);
    expect(html).toContain('No period selected');
    expect(html).not.toContain('Testing needed before');
    expect(html).not.toContain('<span class="rank-number">1</span>');
  });

  it('renders source page links for cited readings and falls back to the first site', () => {
    const analysis = createFixtureAnalysis(DEFAULT_FILTERS);
    const source = { documentId: 'immersion-2025', pdfUrl: reportUrl('Ganesh_and_Durga_visarjan_report-2025.pdf'), page: 28, siteAsPrinted: 'Bairagarh' };
    const sites: SiteAnalysis[] = analysis.sites.map((item) => ({
      ...item, metrics: item.metrics.map((metric) => ({ ...metric, readings: metric.readings.map((reading) => ({ ...reading, source })) })),
    }));
    const readings = analysis.readings.map((reading) => ({ ...reading, source }));
    const html = renderToStaticMarkup(<Dashboard analysis={{ ...analysis, sites, readings }} filters={DEFAULT_FILTERS}
      selectedSiteId="not-a-site" onFiltersChange={() => {}} onSelectSite={() => {}} />);
    expect(html).toContain('#page=28');
    expect(html).toContain(`Selected ghat · Rank 1`);
  });
});
