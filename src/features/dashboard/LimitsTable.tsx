import { CheckCircle2, Download, MinusCircle, XCircle } from 'lucide-react';
import { formatScope, PHASE_LABELS } from '../../shared/defaults';
import { SourceLink } from '../../shared/SourceLink';
import type { Analysis, EvaluatedReading, Metric } from '../../shared/types';
import { formatCriterion, formatNumber, shortParameter } from './model';
import './analytics.css';

// Member 4 area. Every ghat's DO/BOD/pH readings against the CPCB Class B limits,
// using the comparisons already computed in Analysis.

type Extreme = 'min' | 'max' | 'range';
const COLUMNS: { parameter: string; extreme: Extreme; label: string }[] = [
  { parameter: 'Dissolved oxygen', extreme: 'min', label: 'Lowest DO' },
  { parameter: 'BOD', extreme: 'max', label: 'Highest BOD' },
  { parameter: 'pH', extreme: 'range', label: 'pH range' },
];

function numeric(metric: Metric): (EvaluatedReading & { value: number })[] {
  return metric.readings.filter((row): row is EvaluatedReading & { value: number } =>
    row.status === 'numeric' && row.value !== null && (row.comparison === 'meets' || row.comparison === 'breaches'));
}

/** The reading to show and cite: the extreme value, preferring a breach for pH. */
function citedReading(metric: Metric, extreme: Extreme): EvaluatedReading | null {
  const rows = numeric(metric);
  if (!rows.length) return null;
  if (extreme === 'min') return rows.reduce((a, b) => (b.value < a.value ? b : a));
  if (extreme === 'max') return rows.reduce((a, b) => (b.value > a.value ? b : a));
  return rows.find((row) => row.comparison === 'breaches') ?? rows[0];
}

function LimitCell({ metric, extreme }: { metric: Metric | undefined; extreme: Extreme }) {
  if (!metric || metric.numericCount === 0) {
    const flagged = metric?.readings.length ?? 0;
    return <td className="limit-cell none"><span className="limit-value"><MinusCircle size={17} aria-hidden="true" />No number</span>
      <small>{flagged ? `${flagged} BDL / not sampled / unknown` : 'Not in the report'} · not clean</small></td>;
  }
  const cited = citedReading(metric, extreme);
  const breached = metric.breachCount > 0;
  const shown = extreme === 'range' && metric.min !== null && metric.max !== null
    ? (metric.min === metric.max ? formatNumber(metric.min) : `${formatNumber(metric.min)}–${formatNumber(metric.max)}`)
    : formatNumber(cited!.value!);
  return (
    <td className={`limit-cell ${breached ? 'breach' : 'meets'}`}>
      <span className="limit-value">
        {breached ? <XCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
        {shown}{extreme !== 'range' ? ' mg/l' : ''}
        <span className="visually-hidden">{breached ? ' breaches the limit' : ' within the limit'}</span>
      </span>
      <small>{breached ? `${metric.breachCount} of ${metric.numericCount} outside limit` : `All ${metric.numericCount} within limit`}</small>
      {cited && <small className="limit-source">{cited.festival} {cited.year} · {PHASE_LABELS[cited.phase].toLowerCase()} · <SourceLink source={cited.source} /></small>}
    </td>
  );
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Every DO/BOD/pH reading in scope with its limit, result and report page. */
export function limitsCsv(analysis: Analysis): string {
  const header = ['ghat', 'year', 'festival', 'phase', 'parameter', 'value_as_printed', 'value', 'unit_assumed',
    'status', 'class_b_limit', 'result', 'report', 'pdf_page', 'reading_id'];
  const rows = analysis.sites.flatMap((item) => item.metrics.flatMap((metric) => metric.readings.map((row) => [
    item.site.name, row.year, row.festival, row.phase, row.parameter, row.valueAsPrinted, row.value, row.unit,
    row.status, formatCriterion(row.criterion),
    row.comparison === 'meets' ? 'within limit' : row.comparison === 'breaches' ? 'outside limit' : 'no number - not assessed',
    row.source.documentId, row.source.page || null, row.id,
  ])));
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function downloadCsv(analysis: Analysis) {
  const url = URL.createObjectURL(new Blob([limitsCsv(analysis)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ghat-readings-vs-cpcb-limits-${analysis.filters.years.join('-') || 'none'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LimitsTable({ analysis }: { analysis: Analysis }) {
  const criteria = new Map(analysis.sites.flatMap((item) => item.metrics)
    .flatMap((metric) => metric.readings).flatMap((row) => row.criterion ? [[row.parameter, row.criterion] as const] : []));
  return (
    <section className="limits-section" aria-labelledby="limits-title">
      <div className="subsection-heading">
        <div>
          <h3 id="limits-title">Readings against CPCB limits</h3>
          <p className="limits-intro">CPCB Class B (outdoor bathing) for {formatScope(analysis.filters)}. Each value links to the report page that prints it.</p>
        </div>
        <button type="button" className="command-button" onClick={() => downloadCsv(analysis)}>
          <Download size={16} aria-hidden="true" />Download all readings (CSV)
        </button>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Readings against CPCB limits table">
        <table className="limits-table">
          <thead>
            <tr>
              <th scope="col">Rank</th><th scope="col">Ghat</th>
              {COLUMNS.map((column) => (
                <th scope="col" key={column.parameter}>{column.label}
                  <small>Class B {formatCriterion(criteria.get(column.parameter) ?? null)}</small></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysis.sites.map((item) => (
              <tr key={item.site.id}>
                <td className="limits-rank">{item.rank ?? '—'}</td>
                <th scope="row">{item.site.name}<small>{item.site.waterBody}</small></th>
                {COLUMNS.map((column) => (
                  <LimitCell key={column.parameter} extreme={column.extreme}
                    metric={item.metrics.find((metric) => metric.parameter === column.parameter)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="limits-notes">
        <li><strong>Not assessed:</strong> total coliform is part of Class B but was not measured, so full Class B compliance cannot be judged.</li>
        <li><strong>No Class B limit:</strong> COD, solids, turbidity, conductivity and the four metals ({['Chromium', 'Lead', 'Zinc', 'Copper'].map(shortParameter).join(', ')}) are shown in each ghat's detail without pass/fail.</li>
        <li>Units are assumed (the reports print none). These are historical readings, not today's water quality, and they make no health claim.</li>
      </ul>
    </section>
  );
}
