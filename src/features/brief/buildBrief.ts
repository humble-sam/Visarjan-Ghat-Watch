import { formatScope } from '../../shared/defaults';
import type { Analysis, Brief, Language } from '../../shared/types';

// Member 5 replaces this explicit placeholder with reviewed evidence-based templates.
export function buildBrief(analysis: Analysis, language: Language): Brief {
  const synthetic = analysis.warnings.some((warning) => warning.startsWith('Synthetic fixture'));
  const title = language === 'hi' ? 'अधिकारी संक्षिप्त विवरण — प्रारूप' : 'Officer brief — draft';
  const notice = language === 'hi'
    ? synthetic ? 'यह केवल काल्पनिक परीक्षण डेटा है। वास्तविक निर्णय के लिए उपयोग न करें।' : 'सत्यापित संक्षिप्त विवरण अभी उपलब्ध नहीं है।'
    : synthetic ? 'Synthetic test data only. Do not use for operational decisions.' : 'A verified officer brief is not available yet.';
  return {
    language, title,
    text: `${notice}\n\n${formatScope(analysis.filters)}\n\n${language === 'hi' ? 'सत्यापित साक्ष्य और समीक्षा की प्रतीक्षा है।' : 'Verified evidence and language review pending.'}`,
    evidenceIds: [],
  };
}
