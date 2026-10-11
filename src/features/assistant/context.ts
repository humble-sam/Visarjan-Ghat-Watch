import { formatScope } from '../../shared/defaults';
import type { Analysis, EvaluatedReading, Filters } from '../../shared/types';
import { formatNumber, hasScope, metricFor, reasonText, shortParameter, statusLabel, BENCHMARK_PARAMETERS } from '../dashboard/model';

export type AssistantView = 'workspace' | 'brief' | 'uploads' | 'sources';

export interface AssistantContextInput {
  analysis: Analysis | null;
  filters: Filters;
  selectedSiteId: string | null;
  view: AssistantView;
  uploadedReports: string[];
}

function page(reading: EvaluatedReading): string {
  return reading.source.page > 0 ? `${reading.year} report p.${reading.source.page}` : 'no page';
}

/**
 * Plain-text summary of exactly what the officer is looking at, sent with each
 * question so the assistant uses the app's ranking instead of computing its own.
 */
export function buildAssistantContext({ analysis, filters, selectedSiteId, view, uploadedReports }: AssistantContextInput): string {
  const lines = [`Open view: ${view}`, `Selected period: ${formatScope(filters)}`];
  if (uploadedReports.length) lines.push(`Reports added by the officer on this device: ${uploadedReports.join(', ')}`);
  if (!analysis) return [...lines, 'Analysis: not loaded yet.'].join('\n');
  const scoped = hasScope(filters);
  const selected = analysis.sites.find((item) => item.site.id === selectedSiteId) ?? analysis.sites[0];
  if (selected) lines.push(`Ghat open in the detail panel: ${selected.site.name}`);
  lines.push('', 'Ghats in the order shown (rank, status, breaches/numeric DO-BOD-pH readings, numeric/expected slots):');

  const byId = new Map(analysis.readings.map((reading) => [reading.id, reading]));
  for (const item of analysis.sites) {
    const c = item.coverage;
    lines.push(`- ${item.rank ?? 'no rank'} | ${item.site.name} (${item.site.id}) | ${statusLabel(item, scoped).text} | `
      + `breaches ${item.benchmarkBreachCount}/${item.benchmarkNumericCount} | numeric ${c.numericBenchmarkSlots}/${c.expectedBenchmarkSlots}, `
      + `BDL/ND ${c.censoredBenchmarkSlots}, not sampled ${c.explicitMissingBenchmarkSlots}, absent ${c.absentBenchmarkSlots}, unknown ${c.unknownBenchmarkSlots}`);
    const ranges = BENCHMARK_PARAMETERS.map((parameter) => {
      const metric = metricFor(item, parameter);
      if (!metric || metric.min === null || metric.max === null) return `${shortParameter(parameter)} no numeric`;
      return `${shortParameter(parameter)} ${formatNumber(metric.min)}-${formatNumber(metric.max)}`;
    });
    lines.push(`  observed: ${ranges.join('; ')}`);
    for (const reason of item.reasons) {
      const evidence = reason.evidenceIds.flatMap((id) => byId.get(id) ?? []);
      const pages = [...new Set(evidence.map(page))].slice(0, 4);
      lines.push(`  reason: ${reasonText(reason)}${pages.length ? ` [${pages.join(', ')}]` : ''}`);
    }
    for (const warning of item.warnings) lines.push(`  warning: ${warning}`);
  }
  return lines.join('\n');
}
