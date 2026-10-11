import { describe, expect, it } from 'vitest';
import { analyze } from '../domain/analyze';
import { loadTrackData } from './loadTrackData';
import { availableYears, mergeTrackData, overlappingSlots, parseUploadCsv, UPLOAD_TEMPLATE_CSV } from './uploads';

describe('uploaded reports', async () => {
  const base = await loadTrackData();

  it('parses the template into readings that keep numeric, censored and missing states distinct', () => {
    const parsed = parseUploadCsv(UPLOAD_TEMPLATE_CSV, { uploadId: 'upload-test', knownSites: base.sites, pdfUrl: null });
    expect(parsed.rejected).toEqual([]);
    expect(parsed.readings).toHaveLength(5);
    expect(parsed.years).toEqual([2026]);
    expect(parsed.newSites).toEqual([]);
    expect(parsed.readings.map((row) => row.status)).toEqual(['numeric', 'numeric', 'numeric', 'bdl', 'not_sampled']);
    expect(parsed.readings[3].value).toBeNull();
    expect(parsed.readings[0].siteId).toBe('prempura');
    expect(new Set(parsed.readings.map((row) => row.id)).size).toBe(5);
    expect(parsed.warnings.some((warning) => warning.includes('No report PDF'))).toBe(true);
  });

  it('rejects malformed rows visibly and never drops them silently', () => {
    const csv = 'year,festival,site,phase,parameter,value,flag,source_page\n'
      + '2026,Ganesh,Prempura ghat,pre,BOD,5,,3\n'
      + 'abc,Ganesh,Prempura ghat,pre,BOD,5,,3\n'
      + '2026,Holi,Prempura ghat,pre,BOD,5,,3\n'
      + '2026,Durga,Prempura ghat,midway,BOD,5,,3\n';
    const parsed = parseUploadCsv(csv, { uploadId: 'upload-x', knownSites: base.sites });
    expect(parsed.rowCount).toBe(4);
    expect(parsed.readings).toHaveLength(1);
    expect(parsed.rejected).toHaveLength(3);
    expect(parsed.rejected[0]).toContain('Line 3');
  });

  it('reports missing required columns', () => {
    const parsed = parseUploadCsv('year,site\n2026,Prempura ghat\n', { uploadId: 'upload-x', knownSites: base.sites });
    expect(parsed.readings).toEqual([]);
    expect(parsed.rejected[0]).toContain('Missing required column');
  });

  it('adds unknown ghats as medium-confidence sites to verify', () => {
    const csv = 'year,festival,site,water_body,phase,parameter,value,flag,source_page\n2026,Ganesh,New Lake ghat,New Lake,pre,BOD,5,,3\n';
    const parsed = parseUploadCsv(csv, { uploadId: 'upload-x', knownSites: base.sites });
    expect(parsed.newSites).toHaveLength(1);
    expect(parsed.newSites[0]).toMatchObject({ id: 'new-lake-ghat', confidence: 'medium' });
  });

  it('merges into the analysis, adds the new year and keeps bundled rows on duplicate slots', () => {
    const parsed = parseUploadCsv(UPLOAD_TEMPLATE_CSV, { uploadId: 'upload-test', knownSites: base.sites });
    const merged = mergeTrackData(base, [{ fileName: 'template.csv', parsed }]);
    expect(availableYears(merged)).toEqual([2023, 2024, 2025, 2026]);
    expect(merged.readings).toHaveLength(base.readings.length + 5);
    const analysis = analyze(merged, { years: [2026], festivals: ['Ganesh'], phases: ['pre', 'during', 'after'] });
    const prempura = analysis.sites.find((item) => item.site.id === 'prempura')!;
    expect(prempura.benchmarkNumericCount).toBe(3);
    expect(prempura.benchmarkBreachCount).toBe(1);

    const repeat = 'year,festival,site,phase,parameter,value,flag,source_page\n2025,Ganesh,Prempura ghat,pre,BOD,99,,3\n';
    const duplicate = parseUploadCsv(repeat, { uploadId: 'upload-dup', knownSites: base.sites });
    expect(overlappingSlots(base.readings, duplicate.readings)).toBe(1);
    const dupAnalysis = analyze(mergeTrackData(base, [{ fileName: 'dup.csv', parsed: duplicate }]), { years: [2025], festivals: ['Ganesh'], phases: ['pre'] });
    const bod = dupAnalysis.sites.find((item) => item.site.id === 'prempura')!.metrics[1];
    expect(bod.readings[0].id.startsWith('bpl-')).toBe(true);
  });
});
