import { fixtureTrackData } from '../../../shared/fixture';
import { reportUrl } from '../../../shared/sources';
import type { Analysis, Criterion, EvaluatedReading, Reason, SiteAnalysis } from '../../../shared/types';

// Test-only contract input. Values are source-checked; ranks are illustrative.
const doCriterion: Criterion = { parameter: 'Dissolved oxygen', class: 'B', type: 'min', min: 5, max: null, unit: 'mg/l' };
const bodCriterion: Criterion = { parameter: 'BOD', class: 'B', type: 'max', min: null, max: 3, unit: 'mg/l' };

function reading(row: number, siteId: string, parameter: string, value: number, festival: 'Ganesh' | 'Durga', page: number, siteAsPrinted: string): EvaluatedReading {
  return {
    id: `bpl-${String(row).padStart(6, '0')}`, siteId, year: 2025, festival, phase: 'during',
    parameter, parameterAsPrinted: parameter === 'Dissolved oxygen' ? 'D.Oxygen' : 'BOD',
    value, unit: 'mg/l', unitsAssumed: true, status: 'numeric', rawFlag: '', valueAsPrinted: String(value),
    source: { documentId: 'immersion-2025', pdfUrl: reportUrl('Ganesh_and_Durga_visarjan_report-2025.pdf'), page, siteAsPrinted },
    comparison: 'breaches', criterion: parameter === 'Dissolved oxygen' ? doCriterion : bodCriterion,
  };
}

export function createBriefTestAnalysis(): Analysis {
  const readings = [
    reading(1124, 'bairagarh', 'Dissolved oxygen', 0, 'Ganesh', 28, 'Sant Hirdaram Visarjankund, Bairagarh, Bhopal'),
    reading(1127, 'bairagarh', 'BOD', 8, 'Ganesh', 28, 'Sant Hirdaram Visarjankund, Bairagarh, Bhopal'),
    reading(1430, 'khatlapura', 'BOD', 4.6, 'Durga', 64, 'Khatlapura visarjan ghat (Lower lake), Bhopal'),
    reading(1391, 'kamla-park', 'Dissolved oxygen', 2.4, 'Durga', 64, 'Rani kamlapati visarjan ghat (lower lake)'),
    reading(1394, 'kamla-park', 'BOD', 8.8, 'Durga', 64, 'Rani kamlapati visarjan ghat (lower lake)'),
  ];
  const ranks: Record<string, number> = { bairagarh: 1, 'kamla-park': 2, khatlapura: 3 };
  const sites: SiteAnalysis[] = fixtureTrackData.sites.map((site) => {
    const rows = readings.filter((row) => row.siteId === site.id);
    const reasons: Reason[] = rows.map((row) => ({
      code: row.value === 0 ? 'zero_do' : row.parameter === 'BOD' ? 'bod_breach' : 'do_breach',
      evidenceIds: [row.id], observed: row.value, limit: row.criterion!.min ?? row.criterion!.max,
      count: 1, total: 1,
    }));
    return {
      site: { ...site, warnings: [...site.warnings] }, rank: ranks[site.id] ?? null,
      zeroDo: rows.some((row) => row.value === 0), benchmarkNumericCount: rows.length,
      benchmarkBreachCount: rows.length, breachFraction: rows.length ? 1 : null,
      metrics: [], reasons, warnings: [...site.warnings],
      coverage: { expectedBenchmarkSlots: 6, numericBenchmarkSlots: rows.length, censoredBenchmarkSlots: 0,
        explicitMissingBenchmarkSlots: 0, absentBenchmarkSlots: 6 - rows.length, unknownBenchmarkSlots: 0 },
    };
  });
  return {
    filters: { years: [2025], festivals: ['Ganesh', 'Durga'], phases: ['during'] },
    comparisonClass: 'B', sites, readings,
    warnings: ['QA input: a small, source-checked subset with illustrative ranks. Not a production officer brief.'],
    generatedAt: '2026-10-11T07:00:00.000Z',
  };
}
