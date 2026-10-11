import { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { buildBrief } from './buildBrief';
import type { BriefPanelProps, Language } from '../../shared/types';
import './brief.css';

// Member 5 owns this baseline component after bootstrap.
export function BriefPanel({ analysis }: BriefPanelProps) {
  const [language, setLanguage] = useState<Language>('en');
  const brief = buildBrief(analysis, language);

  return (
    <section className="brief-section">
      <div className="section-heading"><div><p className="eyebrow">Officer handoff</p><h2>Officer brief</h2></div>
        <div className="language-control" role="group" aria-label="Brief language">
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
          <button type="button" aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>हिन्दी</button>
        </div>
      </div>
      <div className="brief-toolbar"><span><FileText size={15} aria-hidden="true" />Unverified draft</span>
        <div><button className="command-button" type="button" disabled title="Export awaits verified evidence and language review"><Download size={16} aria-hidden="true" />Download</button>
          <button className="icon-button" type="button" disabled title="Print awaits verified evidence and language review" aria-label="Print brief"><Printer size={17} aria-hidden="true" /></button></div>
      </div>
      <article className="brief-document" lang={language === 'hi' ? 'hi' : 'en'}>
        <p className="eyebrow">Visarjan Ghat Watch</p><h3>{brief.title}</h3><p className="brief-text">{brief.text}</p>
      </article>
    </section>
  );
}
