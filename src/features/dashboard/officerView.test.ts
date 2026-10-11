import { describe, expect, it } from 'vitest';
import { loadTrackData } from '../../data/loadTrackData';
import { analyze } from '../../domain/analyze';
import { DEFAULT_FILTERS } from '../../shared/defaults';
import { buildBrief } from '../brief/buildBrief';
import { limitsCsv } from './LimitsTable';
import { headlineReading, rankSummary } from './model';

describe('officer view: reasons, traceability and limits', async () => {
  const data = await loadTrackData();
  const analysis = analyze(data, DEFAULT_FILTERS);
  const site = (id: string) => analysis.sites.find((item) => item.site.id === id)!;

  it('gives every ghat a plain-words reason for its rank', () => {
    for (const item of analysis.sites) expect(rankSummary(item, true).length).toBeGreaterThan(20);
    expect(rankSummary(site('bairagarh'), true)).toContain('Oxygen fell to 0 mg/l');
    expect(rankSummary(site('bairagarh'), true)).toContain('only 3 of 18 expected tests have numbers');
    expect(rankSummary(site('kamla-park'), true)).toContain('site name may cover two places');
    expect(rankSummary(site('bairagarh'), false)).toBe('Select a period to see why.');
  });

  it('marks unrankable ghats as needing testing, never as clean', () => {
    const durga = analyze(data, { years: [2025], festivals: ['Durga'], phases: ['pre', 'during', 'after'] });
    const bairagarh = durga.sites.find((item) => item.site.id === 'bairagarh')!;
    expect(bairagarh.rank).toBeNull();
    expect(rankSummary(bairagarh, true)).toContain('cannot be ranked');
    expect(rankSummary(bairagarh, true)).not.toMatch(/safe|clean water/i);
  });

  it('cites the reading behind each rank with its report page', () => {
    const cited = headlineReading(site('bairagarh'), analysis.readings)!;
    expect(cited.value).toBe(0);
    expect(cited.parameter).toBe('Dissolved oxygen');
    expect(cited.source.page).toBe(28);
    expect(cited.source.pdfUrl).toContain('Ganesh_and_Durga_visarjan_report-2025.pdf');
    for (const item of analysis.sites.filter((entry) => entry.rank !== null)) {
      expect(headlineReading(item, analysis.readings)?.source.page).toBeGreaterThan(0);
    }
  });

  it('exports every benchmark reading against its CPCB limit with the page', () => {
    const lines = limitsCsv(analysis).trim().split('\r\n');
    const counted = analysis.sites.reduce((sum, item) => sum + item.metrics.reduce((s, m) => s + m.readings.length, 0), 0);
    expect(lines).toHaveLength(counted + 1);
    expect(lines[0]).toContain('class_b_limit');
    expect(lines.some((line) => line.includes('outside limit'))).toBe(true);
    expect(lines.some((line) => line.includes('no number - not assessed'))).toBe(true);
    expect(lines.every((line, index) => index === 0 || /,\d+,(bpl|upload)-/.test(line))).toBe(true);
  });

  it('forwards briefs that keep report and page references in both languages', () => {
    expect(buildBrief(analysis, 'en').text).toContain('PDF page 28');
    expect(buildBrief(analysis, 'hi').text).toContain('PDF पृष्ठ 28');
  });
});
