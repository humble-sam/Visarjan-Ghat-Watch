import { createRoot } from 'react-dom/client';
import type { Analysis } from '../../../shared/types';
import '../../../styles/global.css';
import { BriefPanel } from '../BriefPanel';
import { createBriefTestAnalysis } from './analysis';

// Development-only browser QA entry; it is never imported by the application.
export function mountBriefPreview(container: HTMLElement, analysis: Analysis = createBriefTestAnalysis()) {
  const root = createRoot(container);
  root.render(
    <div className="app">
      <p className="fixture-banner">Member 5 QA: source-checked sample, illustrative ranks. Not a production officer brief.</p>
      <main className="main-content"><BriefPanel analysis={analysis} /></main>
    </div>,
  );
  return root;
}
