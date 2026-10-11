import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, BookOpen, ClipboardList, FileText, LoaderCircle, RotateCcw, UploadCloud, Waves,
} from 'lucide-react';
import { loadTrackData } from './data/loadTrackData';
import { deleteUpload, listUploads, saveUpload } from './data/uploadStore';
import { availableYears, mergeTrackData, parseUploadCsv, type StoredUpload } from './data/uploads';
import { analyze } from './domain/analyze';
import { Dashboard } from './features/dashboard/Dashboard';
import { BriefPanel } from './features/brief/BriefPanel';
import { AssistantPanel } from './features/assistant/AssistantPanel';
import { buildAssistantContext } from './features/assistant/context';
import { UploadPanel, type SavedUploadSummary } from './features/uploads/UploadPanel';
import { DEFAULT_FILTERS } from './shared/defaults';
import { createFixtureAnalysis, fixtureTrackData, FIXTURE_WARNING } from './shared/fixture';
import { BhopalHero } from './shared/illustrations/BhopalHero';
import { ASSET_BASE, reportUrl, SOURCE_DOCUMENTS } from './shared/sources';
import type { Filters, TrackData } from './shared/types';

type View = 'workspace' | 'brief' | 'uploads' | 'sources';
// Release default is the original data. The synthetic fixture is opt-in for UI work only.
const dataMode = import.meta.env.VITE_DATA_MODE || 'real';
const isFixture = dataMode === 'fixture';
const navigation = [
  { id: 'workspace', label: 'Ghat priorities', icon: ClipboardList },
  { id: 'brief', label: 'Officer brief', icon: FileText },
  { id: 'uploads', label: 'Add reports', icon: UploadCloud },
  { id: 'sources', label: 'Source library', icon: BookOpen },
] as const;

export function App() {
  const [view, setView] = useState<View>('workspace');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [baseData, setBaseData] = useState<TrackData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [uploads, setUploads] = useState<StoredUpload[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBaseData(null);
    setLoadError(null);
    const request = dataMode === 'fixture' ? Promise.resolve(fixtureTrackData)
      : dataMode === 'real' ? loadTrackData()
      : Promise.reject(new Error('VITE_DATA_MODE must be fixture or real.'));
    request.then((result) => { if (!cancelled) setBaseData(result); })
      .catch((error: unknown) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load water-quality data.'); });
    return () => { cancelled = true; };
  }, [attempt]);

  // Officer uploads are stored in this browser and are not mixed into the synthetic fixture.
  useEffect(() => {
    if (isFixture) return;
    listUploads().then(setUploads).catch((error: unknown) =>
      setStorageError(error instanceof Error ? error.message : 'Unable to read saved reports.'));
  }, []);

  // One object URL per attached PDF, revoked when the upload list changes.
  const [pdfUrls, setPdfUrls] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    const urls = new Map(uploads.flatMap((upload) =>
      upload.pdf ? [[upload.id, URL.createObjectURL(upload.pdf)] as const] : []));
    setPdfUrls(urls);
    return () => { for (const url of urls.values()) URL.revokeObjectURL(url); };
  }, [uploads]);

  const savedUploads = useMemo<SavedUploadSummary[]>(() => {
    if (!baseData) return [];
    const result: SavedUploadSummary[] = [];
    for (const upload of uploads) {
      const knownSites = [...baseData.sites, ...result.flatMap((item) => item.parsed.newSites)];
      result.push({ upload, parsed: parseUploadCsv(upload.csvText, { uploadId: upload.id, knownSites, pdfUrl: pdfUrls.get(upload.id) ?? null }) });
    }
    return result;
  }, [baseData, uploads, pdfUrls]);

  const data = useMemo(() => baseData && mergeTrackData(baseData,
    savedUploads.map(({ upload, parsed }) => ({ fileName: upload.fileName, parsed }))), [baseData, savedUploads]);
  const years = useMemo(() => {
    const found = data ? availableYears(data) : [];
    return found.length ? found : [2023, 2024, 2025];
  }, [data]);

  const result = useMemo(() => {
    if (!data) return { analysis: null, error: null };
    try {
      return { analysis: isFixture ? createFixtureAnalysis(filters) : analyze(data, filters), error: null };
    } catch (error) {
      return { analysis: null, error: error instanceof Error ? error.message : 'Unable to analyze the selected period.' };
    }
  }, [data, filters]);
  const error = loadError ?? result.error;

  const addUpload = useCallback(async (upload: StoredUpload) => {
    await saveUpload(upload);
    setUploads((current) => [...current, upload]);
    setStorageError(null);
  }, []);
  const removeUpload = useCallback(async (id: string) => {
    await deleteUpload(id);
    setUploads((current) => current.filter((upload) => upload.id !== id));
  }, []);

  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="hero">
        <BhopalHero className="hero-art" />
        <div className="hero-overlay">
          <div className="hero-brand">
            <span className="brand-mark" aria-hidden="true"><Waves size={28} strokeWidth={1.8} /></span>
            <span className="header-tag">Track 02 · Bhopal Municipal Corporation</span>
          </div>
          <h1>Visarjan Ghat Watch</h1>
          <p className="hero-tagline">City of Lakes · Historical water-quality evidence for Bhopal’s immersion ghats</p>
          <div className="hero-facts">
            <span><strong>{data?.sites.length ?? 7}</strong> ghats</span>
            <span><strong>{firstYear}–{lastYear}</strong> MPPCB reports</span>
            <span>Plan before <strong>20 Oct 2026</strong></span>
          </div>
        </div>
      </header>

      <nav className="app-nav" aria-label="Workspace">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={view === id ? 'nav-button active' : 'nav-button'}
            aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
            <Icon size={19} aria-hidden="true" />{label}
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
        ) : !result.analysis || !data ? (
          <section className="app-state" role="status"><LoaderCircle className="loading-icon" size={25} aria-hidden="true" />
            <h2>Loading evidence</h2>
          </section>
        ) : view === 'workspace' ? (
          <Dashboard analysis={result.analysis} filters={filters} selectedSiteId={selectedSiteId}
            onFiltersChange={setFilters} onSelectSite={setSelectedSiteId} availableYears={years} />
        ) : view === 'uploads' ? (
          isFixture ? <section className="app-state"><h2>Uploads are disabled in the synthetic preview</h2></section>
            : <UploadPanel knownSites={data.sites} existingReadings={data.readings} saved={savedUploads}
              storageError={storageError} onAdd={addUpload} onRemove={removeUpload} />
        ) : <BriefPanel analysis={result.analysis} />}
      </main>

      <footer className="app-footer">
        <span><Waves size={16} aria-hidden="true" />Visarjan Ghat Watch · Team Nova</span>
        <span>{firstYear}–{lastYear} reports · Public data · No live monitoring · Illustrations are artistic, not photographs</span>
      </footer>
      {!isFixture && <AssistantPanel getContext={() => buildAssistantContext({
        analysis: result.analysis, filters, selectedSiteId, view,
        uploadedReports: uploads.map((upload) => upload.fileName),
      })} />}
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
