import { describe, expect, it } from 'vitest';
import {
  BHOPAL_SITES,
  loadTrackData,
  normalizeReadingValue,
  parseBhopalReadings,
  parseCriteria,
  parseTrackData,
  SOURCE_COMMIT,
} from './loadTrackData';

describe('loadTrackData - primary Bhopal dataset ingestion', () => {
  it('loads real Bhopal dataset with exact verified counts and properties', async () => {
    const data = await loadTrackData();

    // 1. Total row count matches exactly 1,524 rows
    expect(data.readings).toHaveLength(1524);

    // 2. Exactly seven sites mapped
    expect(data.sites).toHaveLength(7);
    const siteIds = new Set(data.readings.map((r) => r.siteId));
    expect(siteIds.size).toBe(7);
    for (const site of BHOPAL_SITES) {
      expect(siteIds.has(site.id)).toBe(true);
    }

    // 3. Year breakdown: 2025 has 453 rows, 2024 has 546 rows, 2023 has 525 rows
    const readings2025 = data.readings.filter((r) => r.year === 2025);
    const readings2024 = data.readings.filter((r) => r.year === 2024);
    const readings2023 = data.readings.filter((r) => r.year === 2023);
    expect(readings2025).toHaveLength(453);
    expect(readings2024).toHaveLength(546);
    expect(readings2023).toHaveLength(525);

    // 4. Dissolved oxygen: 116 numeric, 42 below 5
    const doNumeric = data.readings.filter(
      (r) => r.parameter === 'Dissolved oxygen' && r.status === 'numeric' && r.value !== null
    );
    expect(doNumeric).toHaveLength(116);
    const doBelow5 = doNumeric.filter((r) => r.value! < 5.0);
    expect(doBelow5).toHaveLength(42);

    // 5. BOD: 112 numeric, 100 above 3
    const bodNumeric = data.readings.filter(
      (r) => r.parameter === 'BOD' && r.status === 'numeric' && r.value !== null
    );
    expect(bodNumeric).toHaveLength(112);
    const bodAbove3 = bodNumeric.filter((r) => r.value! > 3.0);
    expect(bodAbove3).toHaveLength(100);

    // 6. Exactly four numeric DO=0 readings across the entire file
    const doZero = doNumeric.filter((r) => r.value === 0);
    expect(doZero).toHaveLength(4);
    // All four DO=0 readings occur at Bairagarh (Sant Hirdaram) kund
    for (const zeroReading of doZero) {
      expect(zeroReading.siteId).toBe('bairagarh');
      expect(zeroReading.value).toBe(0);
      expect(zeroReading.status).toBe('numeric');
    }

    // 7. Source commit provenance
    expect(data.sourceCommit).toBe(SOURCE_COMMIT);
    expect(data.sourceCommit).toBe('6b96823f27aaab18ce2f07dfc71a3732011bd4ab');
  });

  it('correctly normalizes CPCB Class B criteria', async () => {
    const data = await loadTrackData();

    expect(data.criteria).toHaveLength(4);
    const criteriaByParam = Object.fromEntries(data.criteria.map((c) => [c.parameter, c]));

    // DO: min 5 mg/l
    expect(criteriaByParam['Dissolved oxygen']).toEqual({
      parameter: 'Dissolved oxygen',
      class: 'B',
      type: 'min',
      min: 5,
      max: null,
      unit: 'mg/l',
    });

    // BOD normalized from 'BOD (5 days 20C)': max 3 mg/l
    expect(criteriaByParam['BOD']).toEqual({
      parameter: 'BOD',
      class: 'B',
      type: 'max',
      min: null,
      max: 3,
      unit: 'mg/l',
    });

    // pH: range 6.5 - 8.5
    expect(criteriaByParam['pH']).toEqual({
      parameter: 'pH',
      class: 'B',
      type: 'range',
      min: 6.5,
      max: 8.5,
      unit: '',
    });

    // Total coliform: max 500 MPN/100 ml (retained even though unmeasured in reports)
    expect(criteriaByParam['Total coliform']).toEqual({
      parameter: 'Total coliform',
      class: 'B',
      type: 'max',
      min: null,
      max: 500,
      unit: 'MPN/100 ml',
    });
  });

  it('generates stable sequential row IDs matching CONTRACTS bpl-000001 pattern', async () => {
    const data = await loadTrackData();
    expect(data.readings[0].id).toBe('bpl-000001');
    expect(data.readings[1].id).toBe('bpl-000002');
    expect(data.readings[1523].id).toBe('bpl-001524');
  });

  it('assigns correct year-based local PDF filenames and source pages', async () => {
    const data = await loadTrackData();

    // Verify 2023 source refs
    const sample2023 = data.readings.find((r) => r.year === 2023)!;
    expect(sample2023.source.documentId).toBe('immersion-2023');
    expect(sample2023.source.pdfUrl).toContain('Idol_immer._Report_23_CPCB.pdf');
    expect(sample2023.source.page).toBeGreaterThan(0);

    // Verify 2024 source refs
    const sample2024 = data.readings.find((r) => r.year === 2024)!;
    expect(sample2024.source.documentId).toBe('immersion-2024');
    expect(sample2024.source.pdfUrl).toContain('Ganesh_and_Durga_visarjan_report-2024.pdf');
    expect(sample2024.source.page).toBeGreaterThan(0);

    // Verify 2025 source refs
    const sample2025 = data.readings.find((r) => r.year === 2025)!;
    expect(sample2025.source.documentId).toBe('immersion-2025');
    expect(sample2025.source.pdfUrl).toContain('Ganesh_and_Durga_visarjan_report-2025.pdf');
    expect(sample2025.source.page).toBeGreaterThan(0);
  });

  it('preserves unitsAssumed: true on all readings', async () => {
    const data = await loadTrackData();
    for (const r of data.readings) {
      expect(r.unitsAssumed).toBe(true);
    }
  });

  it('preserves printed fields including siteAsPrinted and parameterAsPrinted', async () => {
    const data = await loadTrackData();
    const first = data.readings[0];
    expect(first.source.siteAsPrinted).toBe('Khatlapura Visarjanghat, Bhopal');
    expect(first.parameterAsPrinted).toBe('pH');
    expect(first.valueAsPrinted).toBe('6.98');
  });
});

describe('normalizeReadingValue - flag and numeric boundary rules', () => {
  it('treats BDL as censored with null value, never 0, never numeric', () => {
    const warnings: string[] = [];
    const result = normalizeReadingValue('', 'BDL', 'BDL', 'test-1', 'DO', warnings);
    expect(result.status).toBe('bdl');
    expect(result.value).toBeNull();
    expect(result.rawFlag).toBe('BDL');
    expect(warnings).toHaveLength(0);
  });

  it('treats ND as censored with null value', () => {
    const warnings: string[] = [];
    const result = normalizeReadingValue('', 'ND', 'ND', 'test-2', 'Lead', warnings);
    expect(result.status).toBe('nd');
    expect(result.value).toBeNull();
    expect(result.rawFlag).toBe('ND');
    expect(warnings).toHaveLength(0);
  });

  it('treats missing flags (*, **, not sampled, _, -) as not_sampled with null value', () => {
    for (const flag of ['*', '**', 'not sampled', '_', '-']) {
      const warnings: string[] = [];
      const result = normalizeReadingValue('', flag, flag, 'test-3', 'DO', warnings);
      expect(result.status).toBe('not_sampled');
      expect(result.value).toBeNull();
    }
  });

  it('preserves numeric zero (0 and 0.0) as number 0, distinct from missing or censored', () => {
    const warnings: string[] = [];
    const result = normalizeReadingValue('0.0', '', '0.0', 'test-4', 'Dissolved oxygen', warnings);
    expect(result.status).toBe('numeric');
    expect(result.value).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('turns corrupt non-numeric input into unknown status with a warning', () => {
    const warnings: string[] = [];
    const result = normalizeReadingValue('invalid_num', '', 'invalid_num', 'test-5', 'DO', warnings);
    expect(result.status).toBe('unknown');
    expect(result.value).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('invalid_num');
  });

  it('handles empty value with unrecognized flag as unknown with a warning', () => {
    const warnings: string[] = [];
    const result = normalizeReadingValue('', 'weird_flag', 'weird_flag', 'test-6', 'DO', warnings);
    expect(result.status).toBe('unknown');
    expect(result.value).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('weird_flag');
  });
});

describe('parseTrackData - CSV parsing with quotes and edge cases', () => {
  it('correctly handles quoted fields with embedded commas', () => {
    const sampleCsv = `year,festival,site,water_body,phase,parameter,value,unit_assumed,flag,value_as_printed,parameter_as_printed,site_as_printed,site_match_confidence,source_page
2025,Ganesh,"Bairagarh (Sant Hirdaram) kund","Upper Lake",pre,pH,7.45,,,"7.45",pH,"Sant Hirdaram Visarjankund, Bairagarh, Bhopal",high,28
2025,Ganesh,"Bairagarh (Sant Hirdaram) kund","Upper Lake",during,"Dissolved oxygen",0.0,mg/l,,"0.0",D.Oxygen,"Sant Hirdaram Visarjankund, Bairagarh, Bhopal",high,28
2025,Ganesh,"Bairagarh (Sant Hirdaram) kund","Upper Lake",after,Lead,,mg/l,BDL,BDL,Lead,"Sant Hirdaram Visarjankund, Bairagarh, Bhopal",high,28`;

    const sampleCriteria = `class,designated_best_use,parameter,limit_type,limit,unit
B,"Outdoor bathing (organised)","BOD (5 days 20C)",max,3,mg/l
B,"Outdoor bathing (organised)",pH,range,6.5-8.5,
B,"Outdoor bathing (organised)",Dissolved oxygen,min,5,mg/l`;

    const trackData = parseTrackData(sampleCsv, sampleCriteria);
    expect(trackData.readings).toHaveLength(3);

    // Row 1: quoted site_as_printed with comma
    expect(trackData.readings[0].source.siteAsPrinted).toBe('Sant Hirdaram Visarjankund, Bairagarh, Bhopal');
    expect(trackData.readings[0].value).toBe(7.45);
    expect(trackData.readings[0].status).toBe('numeric');

    // Row 2: numeric zero
    expect(trackData.readings[1].value).toBe(0);
    expect(trackData.readings[1].status).toBe('numeric');

    // Row 3: BDL censored
    expect(trackData.readings[2].value).toBeNull();
    expect(trackData.readings[2].status).toBe('bdl');
    expect(trackData.readings[2].rawFlag).toBe('BDL');

    // Criteria BOD normalized
    expect(trackData.criteria.find((c) => c.parameter === 'BOD')).toBeDefined();
  });

  it('records warnings when unknown site name is passed', () => {
    const csv = `year,festival,site,water_body,phase,parameter,value,unit_assumed,flag,value_as_printed,parameter_as_printed,site_as_printed,site_match_confidence,source_page
2025,Ganesh,"Non Existent Ghat","Some Lake",pre,pH,7.1,,,7.1,pH,"Non Existent Ghat",low,10`;
    const criteria = `class,designated_best_use,parameter,limit_type,limit,unit
B,Bathing,pH,range,6.5-8.5,`;

    const data = parseTrackData(csv, criteria);
    expect(data.readings).toHaveLength(1);
    expect(data.readings[0].siteId).toBe('unknown');
    expect(data.warnings.some((w) => w.includes('unknown site name'))).toBe(true);
  });

  it('directly validates parseBhopalReadings and parseCriteria helper exports', () => {
    const readingCsv = `year,festival,site,water_body,phase,parameter,value,unit_assumed,flag,value_as_printed,parameter_as_printed,site_as_printed,site_match_confidence,source_page
2024,Durga,"Khatlapura ghat","Lower Lake",during,COD,45,mg/l,,45,COD,"Khatlapura",high,15`;
    const { readings, warnings: rWarn } = parseBhopalReadings(readingCsv);
    expect(readings).toHaveLength(1);
    expect(readings[0].parameter).toBe('COD');
    expect(readings[0].value).toBe(45);
    expect(rWarn).toHaveLength(0);

    const criteriaCsv = `class,designated_best_use,parameter,limit_type,limit,unit
A,Drinking,pH,range,6.5-8.5,
B,Bathing,Dissolved oxygen,min,5,mg/l`;
    const { criteria, warnings: cWarn } = parseCriteria(criteriaCsv);
    expect(criteria).toHaveLength(1);
    expect(criteria[0].parameter).toBe('Dissolved oxygen');
    expect(criteria[0].class).toBe('B');
    expect(cWarn).toHaveLength(0);
  });
});
