import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SourceLink, sourceHref } from './SourceLink';
import { reportUrl } from './sources';
import type { SourceRef } from './types';

const source: SourceRef = {
  documentId: 'immersion-2023', pdfUrl: reportUrl('Idol_immer._Report_23_CPCB.pdf'),
  page: 26, siteAsPrinted: 'Khatlapura Visarjanghat, Bhopal',
};

describe('source references', () => {
  it('links to a one-based PDF page with a descriptive accessible label', () => {
    expect(sourceHref(source)).toBe(`${source.pdfUrl}#page=26`);
    const html = renderToStaticMarkup(<SourceLink source={source} />);
    expect(html).toContain('PDF page 26');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('rejects missing pages, synthetic refs and external executable URLs', () => {
    for (const page of [0, -1, 1.2, NaN]) expect(sourceHref({ ...source, page })).toBeNull();
    for (const pdfUrl of ['', 'javascript:alert(1)', 'https://example.com/report.pdf']) {
      expect(sourceHref({ ...source, pdfUrl })).toBeNull();
    }
    expect(renderToStaticMarkup(<SourceLink source={{ ...source, page: 0 }} />)).not.toContain('<a');
  });
});
