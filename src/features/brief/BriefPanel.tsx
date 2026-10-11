import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Download, FileText, Printer } from 'lucide-react';
import { SourceLink } from '../../shared/SourceLink';
import { buildBrief, buildBriefContent } from './buildBrief';
import { downloadBrief } from './exportBrief';
import type { BriefPanelProps, Language } from '../../shared/types';
import './brief.css';

const labels = {
  en: {
    heading: 'Officer brief', eyebrow: 'Officer handoff', historical: 'Historical evidence', preview: 'Synthetic preview',
    download: 'Download text', print: 'Print brief', copy: 'Copy brief', references: 'Open report pages',
    synthetic: 'Synthetic preview only. Copy, download and print are unavailable for test values.',
    empty_scope: 'Select a year, festival and phase to prepare a brief.',
    untraceable: 'Report references need verification. Export is unavailable until the priority reasons are traceable.',
    downloaded: 'Text downloaded.', copied: 'Brief copied.',
    clipboardFailed: 'Clipboard is unavailable. Download the text instead.', failed: 'Export failed. Please try again.',
  },
  hi: {
    heading: 'अधिकारी कार्य-सार', eyebrow: 'अधिकारी के लिए', historical: 'ऐतिहासिक साक्ष्य', preview: 'काल्पनिक पूर्वावलोकन',
    download: 'टेक्स्ट डाउनलोड', print: 'कार्य-सार प्रिंट करें', copy: 'कार्य-सार कॉपी करें', references: 'रिपोर्ट के पृष्ठ खोलें',
    synthetic: 'यह केवल काल्पनिक पूर्वावलोकन है। परीक्षण के मानों को कॉपी, डाउनलोड या प्रिंट नहीं किया जा सकता।',
    empty_scope: 'कार्य-सार के लिए वर्ष, त्योहार और चरण चुनें।',
    untraceable: 'रिपोर्ट संदर्भ की पुष्टि जरूरी है। प्राथमिकता के कारणों के स्रोत मिलने तक निर्यात उपलब्ध नहीं है।',
    downloaded: 'टेक्स्ट डाउनलोड हो गया।', copied: 'कार्य-सार कॉपी हो गया।',
    clipboardFailed: 'क्लिपबोर्ड उपलब्ध नहीं है। टेक्स्ट डाउनलोड करें।', failed: 'निर्यात नहीं हो सका। फिर प्रयास करें।',
  },
} as const;

export function BriefPanel({ analysis }: BriefPanelProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [status, setStatus] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const content = buildBriefContent(analysis, language);
  const brief = buildBrief(analysis, language);
  const words = labels[language];
  const canExport = content.exportBlockReason === null;
  const exportNotice = content.exportBlockReason ? words[content.exportBlockReason] : null;

  useEffect(() => { setStatus(null); }, [analysis, language]);

  function handleDownload() {
    if (!canExport) return;
    try { downloadBrief(brief, analysis.filters); setStatus(words.downloaded); }
    catch { setStatus(words.failed); }
  }
  async function handleCopy() {
    if (!canExport || copying) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(brief.text); setStatus(words.copied); }
    catch { setStatus(words.clipboardFailed); }
    finally { setCopying(false); }
  }
  function handlePrint() {
    if (!canExport) return;
    try { window.print(); }
    catch { setStatus(words.failed); }
  }

  return (
    <section className="brief-section">
      <div className="section-heading"><div><p className="eyebrow">{words.eyebrow}</p><h2>{words.heading}</h2></div>
        <div className="language-control" role="group" aria-label="Brief language">
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
          <button type="button" aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>हिन्दी</button>
        </div>
      </div>
      <div className="brief-toolbar"><span><FileText size={15} aria-hidden="true" />{content.synthetic ? words.preview : words.historical}</span>
        <div>
          <button className="command-button" type="button" disabled={!canExport} title={exportNotice ?? words.download} onClick={handleDownload}>
            <Download size={16} aria-hidden="true" />{words.download}
          </button>
          <button className="icon-button" type="button" disabled={!canExport || copying} title={exportNotice ?? words.copy} aria-label={words.copy} onClick={handleCopy}><Copy size={17} aria-hidden="true" /></button>
          <button className="icon-button" type="button" disabled={!canExport} title={exportNotice ?? words.print} aria-label={words.print} onClick={handlePrint}><Printer size={17} aria-hidden="true" /></button>
        </div>
      </div>
      {exportNotice && <p className="brief-export-notice"><AlertTriangle size={16} aria-hidden="true" />{exportNotice}</p>}
      <p className="brief-action-status" role="status" aria-live="polite">{status}</p>
      <article className="brief-document" lang={language}>
        <p className="eyebrow">Visarjan Ghat Watch</p><h3>{content.title}</h3>
        <p className="brief-scope">{content.scope}</p><p className="brief-context">{content.context}</p>
        {content.sections.map((section) => <section className="brief-content-section" key={section.title}>
          <h4>{section.title}</h4>{section.lines.map((line, index) => <p key={index}>{line}</p>)}
        </section>)}
      </article>
      {content.citations.length > 0 && <section className="brief-reference-links" aria-label={words.references}>
        <h3>{words.references}</h3>
        {content.citations.map((citation) => <div key={citation.reading.id}>
          <span>[{citation.number}] {citation.reading.year} · {citation.reading.source.siteAsPrinted}</span>
          <SourceLink source={citation.reading.source} />
        </div>)}
      </section>}
    </section>
  );
}
