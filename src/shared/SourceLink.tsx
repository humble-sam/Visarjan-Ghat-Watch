import { ExternalLink } from 'lucide-react';
import type { SourceRef } from './types';

export function sourceHref(source: SourceRef): string | null {
  if (!Number.isInteger(source.page) || source.page < 1 || !source.pdfUrl) return null;
  // Only bundled reports may be used as evidence links.
  if (!source.pdfUrl.startsWith(`${import.meta.env.BASE_URL}assets/track-2/resources/`)) return null;
  return `${source.pdfUrl.split('#')[0]}#page=${source.page}`;
}

export function SourceLink({ source }: { source: SourceRef }) {
  const href = sourceHref(source);
  if (!href) return <span className="muted">No report citation</span>;

  return (
    <a className="source-link" href={href} target="_blank" rel="noopener noreferrer"
      aria-label={`Open ${source.documentId}, PDF page ${source.page}`}>
      Page {source.page}<ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}
