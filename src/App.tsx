import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BookOpen, ClipboardList, FileText, LoaderCircle, RotateCcw, Waves } from 'lucide-react';
import { loadTrackData } from './data/loadTrackData';
import { analyze } from './domain/analyze';
import { Dashboard } from './features/dashboard/Dashboard';
import { BriefPanel } from './features/brief/BriefPanel';
import { DEFAULT_FILTERS } from './shared/defaults';
import { createFixtureAnalysis, fixtureTrackData, FIXTURE_WARNING } from './shared/fixture';
import { ASSET_BASE, reportUrl, SOURCE_DOCUMENTS } from './shared/sources';
import type { Filters, TrackData } from './shared/types';

type View = 'workspace' | 'brief' | 'sources';
const dataMode = import.meta.env.VITE_DATA_MODE ?? 'fixture';
const isFixture = dataMode === 'fixture';
const navigation = [
  { id: 'workspace', label: 'Ghat priorities', icon: ClipboardList },
  { id: 'brief', label: 'Officer brief', icon: FileText },
  { id: 'sources', label: 'Source library', icon: BookOpen },
] as const;

export function App() {
  const [view, setView] = useState<View>('workspace');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>('bairagarh');
  const [data, setData] = useState<TrackData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError(null);
    const request = dataMode === 'fixture' ? Promise.resolve(fixtureTrackData)
      : dataMode === 'real' ? loadTrackData()
      : Promise.reject(new Error('VITE_DATA_MODE must be fixture or real.'));
    request.then((result) => { if (!cancelled) setData(result); })
      .catch((error: unknown) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load water-quality data.'); });
    return () => { cancelled = true; };
  }, [attempt]);

  const result = useMemo(() => {
    if (!data) return { analysis: null, error: null };
    try {
      return { analysis: isFixture ? createFixtureAnalysis(filters) : analyze(data, filters), error: null };
    } catch (error) {
      return { analysis: null, error: error instanceof Error ? error.message : 'Unable to analyze the selected period.' };
    }
  }, [data, filters]);
  const error = loadError ?? result.error;

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true"><Waves size={26} strokeWidth={1.7} /></div>
        <div className="brand"><h1>Visarjan Ghat Watch</h1><p>Bhopal · Historical water-quality evidence</p></div>
        <span className="header-tag">Track 02</span>
      </header>

      <div className="context-band">
        <span>Bhopal Municipal Corporation</span>
        <span>Planning context <strong>20 Oct 2026</strong></span>
      </div>

      <nav className="app-nav" aria-label="Workspace">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={view === id ? 'nav-button active' : 'nav-button'}
            aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
            <Icon size={17} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>

      {isFixture && <div className="fixture-banner" role="status"><AlertTriangle size={17} aria-hidden="true" />
        <strong>Synthetic preview</strong><span>{FIXTURE_WARNING}</span>
      </div>}

      <main id="main-content" className="main-content">
        {view === 'sources' ? <SourceLibrary /> : error ? (
          <section className="app-state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" /><h2>Data unavailable</h2><p>{error}</p>
            <button className="command-button" type="button" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCcw size={16} aria-hidden="true" />Retry
            </button>
          </section>
        ) : !result.analysis ? (
          <section className="app-state" role="status"><LoaderCircle className="loading-icon" size={25} aria-hidden="true" />
            <h2>Loading evidence</h2>
          </section>
        ) : view === 'workspace' ? (
          <Dashboard analysis={result.analysis} filters={filters} selectedSiteId={selectedSiteId}
            onFiltersChange={setFilters} onSelectSite={setSelectedSiteId} />
        ) : <BriefPanel analysis={result.analysis} />}
      </main>

      <footer className="app-footer">
        <span><Waves size={15} aria-hidden="true" />Visarjan Ghat Watch</span>
        <span>2023–2025 reports · Public data · No live monitoring</span>
      </footer>
    </div>
  );
}

function SourceLibrary() {
  return (
    <section className="source-library">
      <div className="section-heading"><div><p className="eyebrow">Evidence archive</p><h2>Original Track 2 sources</h2></div>
        <span className="small-label">6 reports · 4 datasets</span>
      </div>
      <p className="library-note">Original MPPCB reports and supplied datasets. Source units are assumed; the readings are historical.</p>
      <div className="source-list">
        {SOURCE_DOCUMENTS.map((document) => <a key={document.id} className="document-row"
          href={reportUrl(document.file)} target="_blank" rel="noopener noreferrer">
          <FileText size={21} aria-hidden="true" /><span><strong>{document.title}</strong><small>{document.year} · PDF</small></span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>)}
      </div>
      <h3 className="library-subheading">Structured datasets</h3>
      <div className="dataset-list">
        {['bhopal_ghats_2023_2025.csv', 'sample_bhopal_2025.csv', 'cpcb_water_quality_criteria.csv', 'mp_immersion_sites_2023_2025.csv'].map((file) => (
          <a key={file} href={`${ASSET_BASE}data/${file}`} download><FileText size={15} aria-hidden="true" />{file}<ArrowUpRight size={14} aria-hidden="true" /></a>
        ))}
      </div>
    </section>
  );
}
