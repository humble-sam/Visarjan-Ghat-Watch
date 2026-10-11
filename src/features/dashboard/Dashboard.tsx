import { AlertTriangle, ChevronRight, FlaskConical, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_FILTERS, formatScope, PHASE_LABELS } from '../../shared/defaults';
import type { DashboardProps, Filters, SiteAnalysis } from '../../shared/types';
import { AnalyticsPanel } from './AnalyticsPanel';
import { GhatDetail } from './GhatDetail';
import { GhatGallery } from './GhatGallery';
import {
  AVAILABLE_YEARS, FESTIVALS, hasScope, isIncomplete, PHASES, statusLabel, toggleValue,
} from './model';
import './dashboard.css';

// Member 4. Renders the shared Analysis only: no fetching, ranking or re-evaluation.
export function Dashboard({ analysis, filters, selectedSiteId, onFiltersChange, onSelectSite, availableYears = [...AVAILABLE_YEARS] }: DashboardProps) {
  const scoped = hasScope(filters);
  const selected = analysis.sites.find((item) => item.site.id === selectedSiteId) ?? analysis.sites[0];
  const ranked = analysis.sites.filter((item) => item.rank !== null);
  const testingNeeded = analysis.sites.filter((item) => item.rank === null);
  const incompleteRanked = ranked.filter(isIncomplete);
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
  // Gallery and chart clicks jump to the detail panel further down the page.
  const openSite = (siteId: string) => {
    onSelectSite(siteId);
    requestAnimationFrame(() => document.getElementById('ghat-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <section className="dashboard">
      <div className="section-heading">
        <div><p className="eyebrow">Officer workspace</p><h2>Ghat priorities</h2></div>
        <span className="small-label">Observed concern · Class B comparison</span>
      </div>

      <FilterBar filters={filters} onChange={onFiltersChange} isDefault={isDefault} years={availableYears} />
      <p className="scope-label" aria-live="polite"><strong>Scope</strong> {formatScope(filters)}
        <span> · historical readings, not current 2026 conditions</span></p>

      <GhatGallery sites={analysis.sites} scoped={scoped} selectedSiteId={selected?.site.id ?? null} onSelectSite={openSite} />

      <div className="summary-band">
        <div><span>Ghats listed</span><strong>{analysis.sites.length}<small>all Bhopal ghats</small></strong></div>
        <div><span>Ranked on numeric evidence</span><strong>{ranked.length}<small>of {analysis.sites.length} ghats</small></strong></div>
        <div><span>Testing needed</span><strong>{scoped ? testingNeeded.length + incompleteRanked.length : '—'}<small>incomplete or no evidence</small></strong></div>
      </div>

      {!scoped && <div className="scope-empty" role="status"><AlertTriangle size={16} aria-hidden="true" />
        No period selected. Choose at least one year, festival and phase; priorities are unavailable.</div>}

      {scoped && (testingNeeded.length > 0 || incompleteRanked.length > 0) && (
        <section className="testing-needed" aria-label="Testing needed summary">
          <FlaskConical size={18} aria-hidden="true" />
          <div>
            <h3>Testing needed before 20 October 2026</h3>
            {testingNeeded.length > 0 && <p><strong>Insufficient evidence, no rank:</strong>{' '}
              {testingNeeded.map((item, index) => <span key={item.site.id}>{index > 0 && ', '}
                <button type="button" className="inline-link" onClick={() => onSelectSite(item.site.id)}>{item.site.name}</button>
              </span>)}</p>}
            {incompleteRanked.length > 0 && <p><strong>Ranked with gaps:</strong>{' '}
              {incompleteRanked.map((item) => `${item.site.name} (${item.coverage.numericBenchmarkSlots}/${item.coverage.expectedBenchmarkSlots} numeric)`).join(', ')}</p>}
          </div>
        </section>
      )}

      {scoped && <AnalyticsPanel analysis={analysis} onSelectSite={openSite} />}

      <div className="dashboard-grid">
        <section className="priority-section" aria-label="Ghat priority list">
          <div className="subsection-heading"><h3>Observed concern ordering</h3><span>{analysis.sites.length} ghats</span></div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Ghat priorities table">
            <table className="priority-table">
              <caption className="visually-hidden">Ghats ordered by observed concern for {formatScope(filters)}. Unranked ghats follow and need testing.</caption>
              <thead><tr><th scope="col">Rank</th><th scope="col">Ghat</th><th scope="col">Breaches</th><th scope="col">Coverage</th></tr></thead>
              <tbody>{analysis.sites.map((item) => (
                <PriorityRow key={item.site.id} item={item} scoped={scoped}
                  selected={selected?.site.id === item.site.id} onSelect={onSelectSite} />
              ))}</tbody>
            </table>
          </div>
          <p className="table-note">Order: any DO = 0 first, then share of numeric DO/BOD/pH readings breaching Class B,
            then lowest DO, highest BOD. A team heuristic over unequal samples, not an official CPCB ranking.</p>
        </section>
        {selected && <GhatDetail site={selected} readings={analysis.readings} filters={filters} />}
      </div>

      <div className="limitations-band"><AlertTriangle size={17} aria-hidden="true" />
        <div>
          <p>Historical report evidence only; not a forecast, safety finding or immersion permission. Units are assumed.
            Total coliform was not measured, so full Class B compliance cannot be assessed. Missing data does not mean clean water.</p>
          {analysis.warnings.length > 0 && <details>
            <summary>Analysis notes ({analysis.warnings.length})</summary>
            <ul>{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </details>}
        </div>
      </div>
    </section>
  );
}

function FilterBar({ filters, onChange, isDefault, years }: { filters: Filters; onChange: (filters: Filters) => void; isDefault: boolean; years: number[] }) {
  return (
    <div className="filter-bar">
      <SlidersHorizontal size={17} className="filter-icon" aria-hidden="true" />
      <fieldset><legend>Year</legend>{years.map((year) => (
        <label key={year}><input type="checkbox" checked={filters.years.includes(year)}
          onChange={() => onChange({ ...filters, years: toggleValue(filters.years, year, years) })} />{year}</label>
      ))}</fieldset>
      <fieldset><legend>Festival</legend>{FESTIVALS.map((festival) => (
        <label key={festival}><input type="checkbox" checked={filters.festivals.includes(festival)}
          onChange={() => onChange({ ...filters, festivals: toggleValue(filters.festivals, festival, FESTIVALS) })} />{festival}</label>
      ))}</fieldset>
      <fieldset><legend>Phase</legend>{PHASES.map((phase) => (
        <label key={phase}><input type="checkbox" checked={filters.phases.includes(phase)}
          onChange={() => onChange({ ...filters, phases: toggleValue(filters.phases, phase, PHASES) })} />{PHASE_LABELS[phase]}</label>
      ))}</fieldset>
      <button type="button" className="command-button reset-button" disabled={isDefault} onClick={() => onChange(DEFAULT_FILTERS)}>
        <RotateCcw size={14} aria-hidden="true" />Reset
      </button>
    </div>
  );
}

function PriorityRow({ item, scoped, selected, onSelect }: {
  item: SiteAnalysis; scoped: boolean; selected: boolean; onSelect: (siteId: string) => void;
}) {
  const status = statusLabel(item, scoped);
  const { coverage } = item;
  const rowClass = [selected && 'selected-row', item.rank === null && 'unranked-row'].filter(Boolean).join(' ');
  return (
    <tr className={rowClass || undefined}>
      <td><span className="rank-number">{item.rank ?? '—'}</span></td>
      <td><button className="site-button" type="button" onClick={() => onSelect(item.site.id)} aria-pressed={selected}>
        <span><strong>{item.site.name}</strong><small>{item.site.waterBody}</small>
          <span className={`status-label ${status.tone}`}>{status.text}</span>
          {item.site.confidence === 'medium' && <span className="status-label unknown">Site identity to verify</span>}
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button></td>
      <td className="numeric-cell">{item.benchmarkNumericCount
        ? <>{item.benchmarkBreachCount}/{item.benchmarkNumericCount}<small>{Math.round((item.breachFraction ?? 0) * 100)}% of numeric</small></>
        : <>Unknown<small>no numeric</small></>}</td>
      <td className="numeric-cell">{coverage.numericBenchmarkSlots}/{coverage.expectedBenchmarkSlots}
        <small>numeric slots</small></td>
    </tr>
  );
}
