import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Trash2, UploadCloud } from 'lucide-react';
import {
  overlappingSlots, parseUploadCsv, slugify, UPLOAD_COLUMNS, UPLOAD_TEMPLATE_CSV,
  type ParsedUpload, type StoredUpload,
} from '../../data/uploads';
import type { Reading, Site } from '../../shared/types';
import './uploads.css';

export interface SavedUploadSummary {
  upload: StoredUpload;
  parsed: ParsedUpload;
}

interface UploadPanelProps {
  knownSites: Site[];
  existingReadings: Reading[];
  saved: SavedUploadSummary[];
  storageError: string | null;
  onAdd: (upload: StoredUpload) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([UPLOAD_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'visarjan_report_template.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function UploadPanel({ knownSites, existingReadings, saved, storageError, onAdd, onRemove }: UploadPanelProps) {
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const preview = csv ? parseUploadCsv(csv.text, { uploadId: 'upload-preview', knownSites, pdfUrl: null }) : null;
  const overlaps = preview ? overlappingSlots(existingReadings, preview.readings) : 0;

  async function chooseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage(null);
    if (!file) { setCsv(null); return; }
    setCsv({ name: file.name, text: await file.text() });
  }

  async function add() {
    if (!csv || !preview?.readings.length) return;
    setBusy(true);
    try {
      await onAdd({
        id: `upload-${slugify(csv.name.replace(/\.csv$/i, '')).slice(0, 40)}-${Date.now().toString(36)}`,
        fileName: csv.name, uploadedAt: new Date().toISOString(), csvText: csv.text,
        ...(pdf ? { pdf, pdfName: pdf.name } : {}),
      });
      setMessage({ tone: 'ok', text: `Added ${preview.readings.length} readings from ${csv.name}. The new years now appear in the dashboard filters.` });
      setCsv(null);
      setPdf(null);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save the upload.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="upload-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Keep the evidence current</p><h2>Add new immersion reports</h2></div>
        <button type="button" className="command-button" onClick={downloadTemplate}><Download size={16} aria-hidden="true" />CSV template</button>
      </div>
      <p className="library-note">
        When MPPCB publishes a new Ganesh/Durga visarjan report (2026 onwards), enter its Bhopal tables in the template
        and upload them here. The readings join the same ranking, charts and brief. Attach the report PDF so each
        reading links to its page. Files stay in this browser only; nothing is uploaded to a server.
      </p>

      {storageError && <p className="upload-message error" role="alert"><AlertTriangle size={18} aria-hidden="true" />{storageError}</p>}

      <div className="upload-steps">
        <label className="drop-zone">
          <FileSpreadsheet size={30} aria-hidden="true" />
          <strong>1. Readings CSV</strong>
          <span>{csv ? csv.name : 'Choose a .csv file in the template layout'}</span>
          <input type="file" accept=".csv,text/csv" onChange={chooseCsv} />
        </label>
        <label className="drop-zone">
          <FileText size={30} aria-hidden="true" />
          <strong>2. Report PDF <em>(recommended)</em></strong>
          <span>{pdf ? pdf.name : 'Choose the original report so citations open the right page'}</span>
          <input type="file" accept="application/pdf,.pdf" onChange={(event) => setPdf(event.target.files?.[0] ?? null)} />
        </label>
      </div>

      {preview && (
        <div className="upload-preview" aria-live="polite">
          <h3>Check before adding</h3>
          <dl className="preview-stats">
            <div><dt>Rows in file</dt><dd>{preview.rowCount}</dd></div>
            <div><dt>Readings accepted</dt><dd>{preview.readings.length}</dd></div>
            <div><dt>Rows rejected</dt><dd className={preview.rejected.length ? 'bad' : ''}>{preview.rejected.length}</dd></div>
            <div><dt>Years</dt><dd>{preview.years.join(', ') || '—'}</dd></div>
            <div><dt>Festivals</dt><dd>{preview.festivals.join(', ') || '—'}</dd></div>
            <div><dt>Ghats</dt><dd>{preview.siteIds.length}</dd></div>
          </dl>
          {overlaps > 0 && <p className="upload-message warn"><AlertTriangle size={18} aria-hidden="true" />
            {overlaps} reading(s) repeat a ghat/period/parameter already loaded. The earlier row is kept for ranking; the duplicate is flagged.</p>}
          {preview.newSites.length > 0 && <p className="upload-message warn"><AlertTriangle size={18} aria-hidden="true" />
            New ghat name(s): {preview.newSites.map((site) => site.name).join(', ')}. They will be added with “verify site identity”. Use the standard names if these are existing ghats.</p>}
          {[...preview.rejected, ...preview.warnings].length > 0 && (
            <details className="preview-issues" open={preview.rejected.length > 0}>
              <summary>Issues found ({preview.rejected.length + preview.warnings.length})</summary>
              <ul>{[...preview.rejected, ...preview.warnings].slice(0, 25).map((issue) => <li key={issue}>{issue}</li>)}</ul>
            </details>
          )}
          <button type="button" className="primary-button" disabled={busy || !preview.readings.length} onClick={add}>
            <UploadCloud size={18} aria-hidden="true" />{busy ? 'Saving…' : `Add ${preview.readings.length} readings to the analysis`}
          </button>
        </div>
      )}

      {message && <p className={`upload-message ${message.tone === 'ok' ? 'ok' : 'error'}`} role="status">
        {message.tone === 'ok' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}{message.text}</p>}

      <h3 className="library-subheading">Reports added on this device</h3>
      {saved.length === 0 ? <p className="muted">None yet. The dashboard uses the bundled 2023–2025 MPPCB reports.</p> : (
        <ul className="saved-uploads">
          {saved.map(({ upload, parsed }) => (
            <li key={upload.id}>
              <FileSpreadsheet size={22} aria-hidden="true" />
              <span><strong>{upload.fileName}</strong>
                <small>{parsed.readings.length} readings · {parsed.years.join(', ')} · {parsed.festivals.join(' + ')}
                  {upload.pdfName ? ` · PDF: ${upload.pdfName}` : ' · no PDF attached'} · added {new Date(upload.uploadedAt).toLocaleDateString()}</small></span>
              <button type="button" className="command-button" onClick={() => onRemove(upload.id)}
                aria-label={`Remove ${upload.fileName}`}><Trash2 size={16} aria-hidden="true" />Remove</button>
            </li>
          ))}
        </ul>
      )}

      <details className="format-guide">
        <summary>CSV format reference</summary>
        <p>Same columns as the bundled <code>bhopal_ghats_2023_2025.csv</code>. Required: <code>year, festival, site, phase, parameter, value, flag, source_page</code>.</p>
        <ul>
          <li><strong>festival</strong>: Ganesh or Durga. <strong>phase</strong>: pre, during or after.</li>
          <li><strong>site</strong>: use the standard ghat names (e.g. “Prempura ghat”) so readings join existing history.</li>
          <li><strong>parameter</strong>: e.g. Dissolved oxygen, BOD, pH, COD, Lead. DO/BOD/pH are compared with Class B.</li>
          <li><strong>value</strong>: the number only. Leave empty and set <strong>flag</strong> to BDL, ND, not sampled, * or ** when the report shows no number. Never write 0 for a missing value.</li>
          <li><strong>source_page</strong>: the PDF page that prints the reading.</li>
        </ul>
        <p className="muted">Columns: {UPLOAD_COLUMNS.join(', ')}</p>
      </details>
    </section>
  );
}
