import { AlertTriangle, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { formatScope, PHASE_LABELS } from '../../shared/defaults';
import { SourceLink } from '../../shared/SourceLink';
import type { DashboardProps, Festival, Phase, SiteAnalysis } from '../../shared/types';
import './dashboard.css';

// Member 4 owns this baseline component after bootstrap.
export function Dashboard({ analysis, filters, selectedSiteId, onFiltersChange, onSelectSite }: DashboardProps) {
  const selected = analysis.sites.find((item) => item.site.id === selectedSiteId) ?? analysis.sites[0];
  const assessable = analysis.sites.filter((item) => item.rank !== null).length;
  const incomplete = analysis.sites.filter((item) => item.coverage.numericBenchmarkSlots < item.coverage.expectedBenchmarkSlots).length;
  const hasScope = filters.years.length > 0 && filters.festivals.length > 0 && filters.phases.length > 0;

  function toggleFestival(festival: Festival) {
    onFiltersChange({ ...filters, festivals: filters.festivals.includes(festival)
      ? filters.festivals.filter((value) => value !== festival) : [...filters.festivals, festival] });
  }
  function togglePhase(phase: Phase) {
    onFiltersChange({ ...filters, phases: filters.phases.includes(phase)
      ? filters.phases.filter((value) => value !== phase) : [...filters.phases, phase] });
  }

  return (
    <section className="dashboard">
      <div className="section-heading">
        <div><p className="eyebrow">Officer workspace</p><h2>Ghat priorities</h2></div>
        <span className="small-label">Class B comparison</span>
      </div>
      <div className="filter-bar">
        <SlidersHorizontal size={17} className="filter-icon" aria-hidden="true" />
        <label className="year-filter">Year
          <select aria-label="Year" value={filters.years.length === 3 ? 'all' : filters.years[0] ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, years: event.target.value === 'all' ? [2023, 2024, 2025] : event.target.value ? [Number(event.target.value)] : [] })}>
            <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option>
            <option value="all">2023–2025</option><option value="">None</option>
          </select>
        </label>
        <fieldset><legend>Festival</legend>{(['Ganesh', 'Durga'] as const).map((festival) => (
          <label key={festival}><input type="checkbox" checked={filters.festivals.includes(festival)} onChange={() => toggleFestival(festival)} />{festival}</label>
        ))}</fieldset>
        <fieldset><legend>Phase</legend>{(['pre', 'during', 'after'] as const).map((phase) => (
          <label key={phase}><input type="checkbox" checked={filters.phases.includes(phase)} onChange={() => togglePhase(phase)} />{PHASE_LABELS[phase]}</label>
        ))}</fieldset>
      </div>
      <p className="scope-label" aria-live="polite">{formatScope(filters)}</p>

      <div className="summary-band">
        <div><span>Ghats in scope</span><strong>{analysis.sites.length}<small>Bhopal</small></strong></div>
        <div><span>With numeric evidence</span><strong>{assessable}<small>of {analysis.sites.length} ghats</small></strong></div>
        <div><span>Incomplete coverage</span><strong>{incomplete}<small>fresh testing needed</small></strong></div>
      </div>

      {!hasScope && <div className="scope-empty" role="status">No period selected. Priorities are unavailable.</div>}
      <div className="dashboard-grid">
        <section className="priority-section" aria-label="Ghat priority list">
          <div className="subsection-heading"><h3>Observed concern</h3><span>{analysis.sites.length} ghats</span></div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Ghat priorities table">
            <table className="priority-table"><thead><tr><th scope="col">Rank</th><th scope="col">Ghat</th><th scope="col">Breaches</th><th scope="col">Evidence</th></tr></thead>
              <tbody>{analysis.sites.map((item) => <tr key={item.site.id} className={selected?.site.id === item.site.id ? 'selected-row' : undefined}>
                <td><span className="rank-number">{item.rank ?? '—'}</span></td>
                <td><button className="site-button" type="button" onClick={() => onSelectSite(item.site.id)}
                  aria-pressed={selected?.site.id === item.site.id}>
                  <span><strong>{item.site.name}</strong><small>{item.site.waterBody}</small><span className={`status-label ${item.zeroDo ? 'critical' : item.rank === null ? 'unknown' : ''}`}>{hasScope ? statusLabel(item) : 'No selected data'}</span></span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button></td>
                <td className="numeric-cell">{item.benchmarkNumericCount ? `${item.benchmarkBreachCount}/${item.benchmarkNumericCount}` : 'Unknown'}</td>
                <td className="numeric-cell">{item.coverage.numericBenchmarkSlots}/{item.coverage.expectedBenchmarkSlots}<small>numeric slots</small></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        {selected && <aside className="ghat-detail" aria-label="Selected ghat details">
          <p className="eyebrow">Selected ghat</p><h3>{selected.site.name}</h3>
          <p className="detail-waterbody">{selected.site.waterBody}</p>
          <div className="metric-list">{selected.metrics.map((metric) => <div key={metric.parameter}>
            <span>{metric.parameter}{metric.parameter === 'Dissolved oxygen' ? ' · minimum' : metric.parameter === 'BOD' ? ' · maximum' : ' · range'}</span>
            <strong>{metric.numericCount === 0 ? 'Unknown' : metric.parameter === 'pH' ? `${metric.min}–${metric.max}` : metric.parameter === 'Dissolved oxygen' ? metric.min : metric.max}
              {metric.numericCount > 0 && metric.parameter !== 'pH' && <small> mg/l</small>}</strong>
          </div>)}</div>
          <div className="detail-benchmark"><strong>Class B comparison</strong><span>DO ≥ 5 · BOD ≤ 3 mg/l · pH 6.5–8.5</span></div>
          {selected.warnings.map((warning) => <p key={warning} className="detail-warning"><AlertTriangle size={15} aria-hidden="true" />{warning}</p>)}
          <h4>Evidence states</h4>
          <dl className="coverage-list"><div><dt>Numeric</dt><dd>{selected.coverage.numericBenchmarkSlots}</dd></div>
            <div><dt>BDL / ND</dt><dd>{selected.coverage.censoredBenchmarkSlots}</dd></div>
            <div><dt>Not sampled</dt><dd>{selected.coverage.explicitMissingBenchmarkSlots}</dd></div>
            <div><dt>Absent</dt><dd>{selected.coverage.absentBenchmarkSlots}</dd></div>
            <div><dt>Unknown</dt><dd>{selected.coverage.unknownBenchmarkSlots}</dd></div></dl>
          <h4>Reading references</h4>
          <div className="reading-list">{selected.metrics.flatMap((metric) => metric.readings).slice(0, 3).map((reading) => (
            <div key={reading.id}><span>{reading.parameter}<small>{reading.festival} · {PHASE_LABELS[reading.phase]}</small></span>
              <span><strong>{reading.valueAsPrinted}</strong><SourceLink source={reading.source} /></span>
            </div>
          ))}</div>
          {!selected.benchmarkNumericCount && <p className="muted">Insufficient numeric evidence for a priority rank.</p>}
        </aside>}
      </div>
      <div className="limitations-band"><AlertTriangle size={17} aria-hidden="true" /><p>Historical evidence only. Units are assumed. Total coliform was not measured; full Class B compliance cannot be assessed. Missing data does not mean clean water.</p></div>
    </section>
  );
}

function statusLabel(item: SiteAnalysis): string {
  if (item.rank === null) return 'Testing needed';
  if (item.zeroDo) return 'Zero DO observed';
  return item.benchmarkBreachCount > 0 ? 'Breaches observed' : 'No observed breach';
}
