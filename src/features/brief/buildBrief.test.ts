import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../shared/defaults';
import { createFixtureAnalysis } from '../../shared/fixture';
import { reportUrl } from '../../shared/sources';
import { createBriefTestAnalysis } from './__fixtures__/analysis';
import { buildBrief, buildBriefContent } from './buildBrief';
import { briefFilename, briefTextBlob } from './exportBrief';

describe('bilingual officer brief', () => {
  it('uses exact values, source pages and printed names from the supplied CSV', () => {
    const csv = readFileSync(new URL('../../../public/assets/track-2/data/bhopal_ghats_2023_2025.csv', import.meta.url), 'utf8');
    const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
    for (const reading of createBriefTestAnalysis().readings) {
      const row = rows[Number(reading.id.slice(4)) - 1];
      expect(Number(row.value)).toBe(reading.value);
      expect(Number(row.source_page)).toBe(reading.source.page);
      expect(row.site_as_printed).toBe(reading.source.siteAsPrinted);
      expect(row.parameter).toBe(reading.parameter);
      expect(row.festival).toBe(reading.festival);
      expect(row.phase).toBe(reading.phase);
    }
  });

  it('preserves upstream ranks instead of recalculating them', () => {
    const analysis = createBriefTestAnalysis();
    analysis.sites.find((item) => item.site.id === 'bairagarh')!.rank = 3;
    analysis.sites.find((item) => item.site.id === 'khatlapura')!.rank = 1;
    const content = buildBriefContent(analysis, 'en');
    const priorities = content.sections.find((section) => section.title === 'Observed priorities')!.lines;
    expect(priorities[0]).toContain('1. Khatlapura ghat');
    expect(priorities[2]).toContain('3. Bairagarh');
    expect(content.exportBlockReason).toBeNull();
  });

  it('keeps all numbers and evidence IDs identical across English and Hindi', () => {
    const analysis = createBriefTestAnalysis();
    const en = buildBrief(analysis, 'en');
    const hi = buildBrief(analysis, 'hi');
    expect(hi.evidenceIds).toEqual(en.evidenceIds);
    expect(hi.text.match(/\d+(?:\.\d+)?/g)).toEqual(en.text.match(/\d+(?:\.\d+)?/g));
    expect(en.text).toContain('DO 0 mg/l');
    expect(hi.text).toContain('DO 0 mg/l');
    expect(en.text).toContain('BOD 4.6 mg/l');
    expect(hi.text).toContain('PDF पृष्ठ 64');
  });

  it('takes measurements and criteria from evidence, not reason summary numbers', () => {
    const analysis = createBriefTestAnalysis();
    for (const site of analysis.sites) for (const reason of site.reasons) { reason.observed = 999999; reason.limit = 42; }
    const brief = buildBrief(analysis, 'en');
    expect(brief.text).not.toContain('999999');
    expect(brief.text).not.toContain('at least 42');
    expect(brief.text).toContain('at least 5 mg/l');
  });

  it('includes missing coverage, site ambiguity and full-compliance limitations', () => {
    const text = buildBrief(createBriefTestAnalysis(), 'en').text;
    expect(text).toContain('Malikhedi kund: numeric slots 0/6');
    expect(text).toContain('may cover two locations');
    expect(text).toContain('Total coliform is absent');
    expect(text).toContain('does not grant immersion permission');
    expect(text).toContain('BDL/ND are not zero');
  });

  it('blocks exports for synthetic data even if its warning is removed', () => {
    const analysis = createFixtureAnalysis(DEFAULT_FILTERS);
    analysis.warnings = [];
    expect(buildBriefContent(analysis, 'en').exportBlockReason).toBe('synthetic');
    expect(buildBrief(analysis, 'hi').evidenceIds).toEqual([]);
  });

  it('blocks wrong-year, invalid-page and stale or cross-site references', () => {
    for (const change of [
      (analysis: ReturnType<typeof createBriefTestAnalysis>) => { analysis.readings[0].source.page = 93; },
      (analysis: ReturnType<typeof createBriefTestAnalysis>) => { analysis.readings[0].source.pdfUrl = reportUrl('Idol_immer._Report_23_CPCB.pdf'); },
      (analysis: ReturnType<typeof createBriefTestAnalysis>) => { analysis.readings[0].year = 2024; },
      (analysis: ReturnType<typeof createBriefTestAnalysis>) => { analysis.readings[0].siteId = 'khatlapura'; },
    ]) {
      const analysis = createBriefTestAnalysis(); change(analysis);
      expect(buildBriefContent(analysis, 'en').exportBlockReason).toBe('untraceable');
      expect(buildBrief(analysis, 'en').evidenceIds).not.toContain(analysis.readings[0].id);
    }
  });

  it('does not turn censored or missing reason evidence into a numeric zero', () => {
    for (const status of ['bdl', 'nd', 'not_sampled', 'unknown'] as const) {
      const analysis = createBriefTestAnalysis();
      analysis.readings[0].status = status;
      analysis.readings[0].value = null;
      analysis.readings[0].valueAsPrinted = status;
      expect(buildBriefContent(analysis, 'en').exportBlockReason).toBe('untraceable');
      expect(buildBrief(analysis, 'en').text).not.toContain('DO 0 mg/l');
    }
  });

  it('allows a testing-only brief without inventing priorities when all evidence is absent', () => {
    const analysis = createBriefTestAnalysis();
    analysis.readings = [];
    for (const item of analysis.sites) { item.rank = null; item.reasons = []; item.coverage.numericBenchmarkSlots = 0; item.coverage.absentBenchmarkSlots = 6; }
    expect(buildBriefContent(analysis, 'en').exportBlockReason).toBeNull();
    const brief = buildBrief(analysis, 'en');
    expect(brief.evidenceIds).toEqual([]);
    expect(brief.text).toContain('No numeric benchmark evidence');
    expect(brief.text).not.toContain('1. Bairagarh');
  });

  it('removes priorities and disables export when filters have no scope', () => {
    const analysis = createBriefTestAnalysis(); analysis.filters.phases = [];
    expect(buildBriefContent(analysis, 'en').exportBlockReason).toBe('empty_scope');
    expect(buildBrief(analysis, 'hi').text).toContain('कोई अवधि नहीं चुनी गई');
    expect(buildBrief(analysis, 'hi').evidenceIds).toEqual([]);
  });

  it('does not mutate analysis or filters while preparing either language', () => {
    const analysis = createBriefTestAnalysis(); const before = structuredClone(analysis);
    buildBrief(analysis, 'hi'); buildBrief(analysis, 'en');
    expect(analysis).toEqual(before);
  });

  it('exports UTF-8 Hindi with a BOM and a filename identifying the current scope', async () => {
    const analysis = createBriefTestAnalysis(); const brief = buildBrief(analysis, 'hi');
    const blob = briefTextBlob(brief);
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)]).toEqual([239, 187, 191]);
    expect(await blob.text()).toBe(brief.text);
    expect(briefFilename(analysis.filters, 'hi')).toBe('visarjan-ghat-brief-hi-2025-ganesh-durga-during.txt');
  });
});
