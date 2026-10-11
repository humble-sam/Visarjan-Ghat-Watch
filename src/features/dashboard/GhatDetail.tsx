import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { PHASE_LABELS } from '../../shared/defaults';
import { SourceLink } from '../../shared/SourceLink';
import type { EvaluatedReading, Filters, SiteAnalysis } from '../../shared/types';
import {
  BENCHMARK_PARAMETERS, BOD_PARAMETER, buildPhaseChart, buildYearComparison, criterionFor, describeReading,
  DO_PARAMETER, formatCriterion, formatNumber, hasScope, indexReadings, metricFor, otherParameters, reasonText,
  reasonTone, selectedPeriods, selectedPhases, shortParameter, siteReadings, slot, statusLabel,
  suggestedActions, uniqueSources,
} from './model';
import { PhaseChart } from './PhaseChart';

interface GhatDetailProps {
  site: SiteAnalysis;
  readings: EvaluatedReading[];
  filters: Filters;
}

export function GhatDetail({ site, readings, filters }: GhatDetailProps) {
  const scoped = hasScope(filters);
  const status = statusLabel(site, scoped);
  const byId = new Map(readings.map((reading) => [reading.id, reading]));
  const rows = siteReadings(site, readings);
  const index = indexReadings(rows);
  const periods = selectedPeriods(filters);
  const phases = selectedPhases(filters);
  const others = otherParameters(rows);
  const yearRows = buildYearComparison(site, filters);
  const sourceYears = [...new Set(rows.map((reading) => reading.year))].sort();
  const coverage = site.coverage;

  return (
    <aside className="ghat-detail" aria-label="Selected ghat details">
      <p className="eyebrow">Selected ghat{site.rank !== null ? ` · Rank ${site.rank}` : ''}</p>
      <h3>{site.site.name}</h3>
      <p className="detail-waterbody">{site.site.waterBody}
        {sourceYears.length > 0 && <> · Source years {sourceYears.join(', ')}</>}</p>
      <p className={`status-pill ${status.tone}`}>{status.text}</p>

      {site.warnings.map((warning) => (
        <p key={warning} className="detail-warning"><AlertTriangle size={15} aria-hidden="true" />{warning}</p>
      ))}

      <h4>Class B comparisons</h4>
      <div className="metric-list">{BENCHMARK_PARAMETERS.map((parameter) => {
        const metric = metricFor(site, parameter);
        const criterion = criterionFor(metric);
        const numeric = metric?.numericCount ?? 0;
        const observed = !metric || numeric === 0 || metric.min === null || metric.max === null ? 'Unknown'
          : parameter === DO_PARAMETER ? formatNumber(metric.min)
          : parameter === BOD_PARAMETER ? formatNumber(metric.max)
          : `${formatNumber(metric.min)}–${formatNumber(metric.max)}`;
        return (
          <div key={parameter}>
            <span>{shortParameter(parameter)} · {parameter === DO_PARAMETER ? 'lowest' : parameter === BOD_PARAMETER ? 'highest' : 'range'}
              <small>Class B {formatCriterion(criterion)}</small></span>
            <span className="metric-value">
              <strong className={numeric === 0 ? 'unknown-value' : undefined}>{observed}</strong>
              <small>{numeric ? `${metric?.breachCount ?? 0}/${numeric} breach` : 'No numeric readings'}</small>
            </span>
          </div>
        );
      })}</div>
      <p className="detail-note">Units assumed by the source pack. Total coliform was not measured, so full Class B compliance cannot be assessed.</p>

      <h4>Why this position</h4>
      {site.reasons.length === 0 ? <p className="muted">No structured reasons for this scope.</p> : (
        <ul className="reason-list">{site.reasons.map((reason) => {
          const evidence = reason.evidenceIds.flatMap((id) => byId.get(id) ?? []);
          const sources = uniqueSources(evidence);
          return (
            <li key={reason.code} className={reasonTone(reason)}>
              <p>{reasonText(reason)}</p>
              {sources.length > 0 && <div className="reason-sources">
                {sources.slice(0, 4).map((item) => <span key={item.key}>{item.year} report <SourceLink source={item.source} /></span>)}
                {sources.length > 4 && <span className="muted">+{sources.length - 4} more pages</span>}
              </div>}
              {evidence.length > 0 && <details>
                <summary>{evidence.length} source reading{evidence.length === 1 ? '' : 's'}</summary>
                <ul className="evidence-ids">{evidence.map((reading) => (
                  <li key={reading.id}><code>{reading.id}</code> {shortParameter(reading.parameter)} · {reading.festival} {reading.year} {PHASE_LABELS[reading.phase]} · printed “{reading.valueAsPrinted || reading.rawFlag || '—'}”</li>
                ))}</ul>
              </details>}
            </li>
          );
        })}</ul>
      )}

      {scoped && <>
        <h4>Readings by phase</h4>
        <div className="chart-grid">
          {[DO_PARAMETER, BOD_PARAMETER].map((parameter) => {
            const metric = metricFor(site, parameter);
            const criterion = criterionFor(metric);
            return <PhaseChart key={parameter} chart={buildPhaseChart(metric, parameter, filters)}
              criterion={criterion} unit={criterion?.unit ?? 'mg/l'} />;
          })}
        </div>

        <h4>Benchmark evidence table</h4>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Benchmark readings by period and phase">
          <table className="evidence-table">
            <thead><tr><th scope="col">Period</th><th scope="col">Parameter</th>
              {phases.map((phase) => <th key={phase} scope="col">{PHASE_LABELS[phase]}</th>)}</tr></thead>
            <tbody>{periods.flatMap((period) => BENCHMARK_PARAMETERS.map((parameter, row) => (
              <tr key={`${period.key}|${parameter}`} className={row === 0 ? 'period-start' : undefined}>
                {row === 0 && <th scope="rowgroup" rowSpan={BENCHMARK_PARAMETERS.length}>{period.label}</th>}
                <td>{shortParameter(parameter)}</td>
                {phases.map((phase) => <ReadingCell key={phase}
                  reading={index.get(slot(period.year, period.festival, phase, parameter))} />)}
              </tr>
            )))}</tbody>
          </table>
        </div>
        <p className="detail-note">Absent: no row in the report. Not sampled: printed as missing. BDL/ND: censored, not zero and not a pass.</p>
      </>}

      {yearRows.length > 0 && <>
        <h4>Year comparison · matching festival and phase</h4>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Year comparison">
          <table className="evidence-table compact">
            <thead><tr><th scope="col">Slot</th>
              {yearRows[0].cells.map((cell) => <th key={cell.year} scope="col">{cell.year}</th>)}</tr></thead>
            <tbody>{yearRows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{shortParameter(row.parameter)} · {row.festival} · {PHASE_LABELS[row.phase]}</th>
                {row.cells.map((cell) => <ReadingCell key={cell.year} reading={cell.reading} />)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      {others.length > 0 && <details className="other-parameters">
        <summary>Other measured parameters ({others.length}) · no Class B limit</summary>
        <p className="detail-note">COD, solids, turbidity, conductivity and metals are shown as printed, without pass/fail.</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Other parameters">
          <table className="evidence-table compact">
            <thead><tr><th scope="col">Parameter</th><th scope="col">Period</th>
              {phases.map((phase) => <th key={phase} scope="col">{PHASE_LABELS[phase]}</th>)}</tr></thead>
            <tbody>{others.flatMap((parameter) => periods.filter((period) => phases.some((phase) =>
              index.has(slot(period.year, period.festival, phase, parameter)))).map((period) => (
              <tr key={`${parameter}|${period.key}`}>
                <th scope="row">{parameter}</th><td>{period.label}</td>
                {phases.map((phase) => <ReadingCell key={phase} reading={index.get(slot(period.year, period.festival, phase, parameter))} />)}
              </tr>
            )))}</tbody>
          </table>
        </div>
      </details>}

      <h4>Evidence coverage</h4>
      <dl className="coverage-list">
        <div><dt>Expected DO/BOD/pH slots</dt><dd>{coverage.expectedBenchmarkSlots}</dd></div>
        <div><dt>Numeric</dt><dd>{coverage.numericBenchmarkSlots}</dd></div>
        <div><dt>BDL / ND (censored)</dt><dd>{coverage.censoredBenchmarkSlots}</dd></div>
        <div><dt>Not sampled</dt><dd>{coverage.explicitMissingBenchmarkSlots}</dd></div>
        <div><dt>Absent from reports</dt><dd>{coverage.absentBenchmarkSlots}</dd></div>
        <div><dt>Unknown</dt><dd>{coverage.unknownBenchmarkSlots}</dd></div>
      </dl>

      {scoped && <>
        <h4>For officer review</h4>
        <ul className="action-list">{suggestedActions(site).map((action) => (
          <li key={action}><ClipboardCheck size={14} aria-hidden="true" />{action}</li>
        ))}</ul>
        <p className="detail-note">Suggestions from historical evidence only; not an immersion permission, forecast or health assessment.</p>
      </>}
    </aside>
  );
}

function ReadingCell({ reading }: { reading: EvaluatedReading | undefined }) {
  const cell = describeReading(reading);
  const tone = reading?.comparison === 'breaches' ? 'breach' : cell.kind;
  return (
    <td className={`reading-cell ${tone}`}>
      <strong>{cell.text}{cell.kind === 'numeric' && reading?.unit ? <small> {reading.unit}</small> : null}</strong>
      <small>{cell.note}</small>
      {reading && <SourceLink source={reading.source} />}
    </td>
  );
}
