import type { Brief, Filters, Language } from '../../shared/types';

export function briefFilename(filters: Filters, language: Language): string {
  const scope = [[...filters.years].sort((a, b) => a - b).join('-'), filters.festivals.join('-'), filters.phases.join('-')];
  return `visarjan-ghat-brief-${language}-${scope.join('-').toLowerCase()}.txt`;
}

export function briefTextBlob(brief: Brief): Blob {
  // BOM preserves Devanagari when the text is opened in Windows desktop editors.
  return new Blob(['\uFEFF', brief.text], { type: 'text/plain;charset=utf-8' });
}

export function downloadBrief(brief: Brief, filters: Filters): void {
  const url = URL.createObjectURL(briefTextBlob(brief));
  const link = document.createElement('a');
  link.href = url;
  link.download = briefFilename(filters, brief.language);
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
