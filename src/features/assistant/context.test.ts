import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../shared/defaults';
import { createFixtureAnalysis } from '../../shared/fixture';
import { buildAssistantContext } from './context';

describe('assistant context', () => {
  it('summarises the officer view: scope, all ghats in shown order, reasons and gaps', () => {
    const analysis = createFixtureAnalysis(DEFAULT_FILTERS);
    const text = buildAssistantContext({ analysis, filters: DEFAULT_FILTERS, selectedSiteId: 'malikhedi', view: 'workspace', uploadedReports: ['2026.csv'] });
    expect(text).toContain('Selected period: 2025');
    expect(text).toContain('Ghat open in the detail panel: Malikhedi kund');
    expect(text).toContain('2026.csv');
    const order = analysis.sites.map((item) => text.indexOf(`| ${item.site.name} (`));
    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text).toContain('Insufficient evidence');
    expect(text.toLowerCase()).not.toMatch(/\bsafe\b/);
  });

  it('handles a not-yet-loaded analysis and an empty period', () => {
    expect(buildAssistantContext({ analysis: null, filters: DEFAULT_FILTERS, selectedSiteId: null, view: 'brief', uploadedReports: [] }))
      .toContain('not loaded');
    const empty = { years: [], festivals: DEFAULT_FILTERS.festivals, phases: DEFAULT_FILTERS.phases };
    const text = buildAssistantContext({ analysis: createFixtureAnalysis(empty), filters: empty, selectedSiteId: null, view: 'workspace', uploadedReports: [] });
    expect(text).toContain('No period selected');
  });
});
