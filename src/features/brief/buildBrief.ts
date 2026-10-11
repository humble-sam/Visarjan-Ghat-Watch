import { reportUrl, SOURCE_DOCUMENTS } from '../../shared/sources';
import { isUploadedReportUrl } from '../../shared/SourceLink';
import type { Analysis, Brief, Criterion, EvaluatedReading, Filters, Language, Reason, SiteAnalysis } from '../../shared/types';

export interface BriefSection { title: string; lines: string[] }
export interface BriefCitation { number: number; reading: EvaluatedReading; report: string }
export interface BriefContent {
  title: string;
  scope: string;
  context: string;
  sections: BriefSection[];
  citations: BriefCitation[];
  synthetic: boolean;
  exportBlockReason: 'synthetic' | 'empty_scope' | 'untraceable' | null;
}

const reportPages: Record<number, number> = { 2023: 87, 2024: 118, 2025: 92 };
const phaseNames = {
  en: { pre: 'before', during: 'during', after: 'one week after' },
  hi: { pre: 'विसर्जन से पहले', during: 'विसर्जन के दौरान', after: 'एक सप्ताह बाद' },
} as const;
const festivalNames = { en: { Ganesh: 'Ganesh', Durga: 'Durga' }, hi: { Ganesh: 'गणेश', Durga: 'दुर्गा' } } as const;
const copy = {
  en: {
    title: 'Visarjan Ghat Watch - Officer action brief',
    context: 'Historical evidence for fresh-testing plans before 20 October 2026.',
    preview: 'SYNTHETIC PREVIEW: these are test values, not MPPCB measurements. Do not use for operational decisions.',
    period: 'Historical scope', none: 'No period selected',
    priorities: 'Observed priorities', noPriorities: 'No numeric benchmark evidence is available for a numbered priority.',
    unavailable: 'A traceable numerical reason is unavailable. Verify the analysis and report references.',
    noBreach: 'No DO/BOD/pH breach reported in the selected numeric evidence; current conditions remain unknown.',
    testing: 'Fresh testing needed', complete: 'No missing numeric benchmark slots reported in the selected scope; fresh testing is still needed for current conditions.',
    numeric: 'numeric slots', censored: 'BDL/ND', missing: 'not sampled', absent: 'absent', unknown: 'other unknown',
    identity: 'Site identity', ambiguity: 'The Rani Kamlapati / Kamla Park mapping may cover two locations. Verify the physical site before acting.',
    actions: 'Suggested officer actions',
    actionLines: [
      'Obtain fresh DO/BOD/pH readings and appropriate additional tests, including total coliform, before allocating resources.',
      'Review aeration at sites with historically low DO and cleanup at sites with high BOD. Confirm ambiguous site names.',
    ],
    limits: 'Limits of this brief',
    limitLines: [
      'Report readings describe historical conditions, not current 2026 water quality or a forecast. Units are assumed by the source pack.',
      'Class B is a comparison benchmark. Total coliform is absent, so full Class B compliance cannot be assessed.',
      'Missing is unknown. BDL/ND are not zero and are not counted as passing. No Class B limits are supplied for COD, solids, turbidity or the measured metals.',
      'This brief does not grant immersion permission or establish current safety or health effects.',
    ],
    notes: 'Analysis notes (as supplied)', references: 'Report references', page: 'PDF page',
    noScope: 'Select a year, festival and phase before preparing a brief.',
  },
  hi: {
    title: 'विसर्जन घाट वॉच - अधिकारी कार्य-सार',
    context: '20 अक्टूबर 2026 से पहले ताजा जांच की योजना हेतु ऐतिहासिक साक्ष्य।',
    preview: 'काल्पनिक पूर्वावलोकन: ये परीक्षण के मान हैं, MPPCB के माप नहीं। वास्तविक प्रशासनिक निर्णय के लिए उपयोग न करें।',
    period: 'ऐतिहासिक अवधि', none: 'कोई अवधि नहीं चुनी गई',
    priorities: 'देखे गए मापों पर आधारित प्राथमिकताएँ', noPriorities: 'क्रमांकित प्राथमिकता तय करने के लिए संख्यात्मक माप उपलब्ध नहीं हैं।',
    unavailable: 'संख्यात्मक कारण का स्रोत उपलब्ध नहीं है। विश्लेषण और रिपोर्ट संदर्भ की जांच करें।',
    noBreach: 'चुने गए संख्यात्मक मापों में DO/BOD/pH मानदंड का उल्लंघन नहीं बताया गया है; वर्तमान स्थिति अज्ञात है।',
    testing: 'ताजा जांच जरूरी', complete: 'चुनी गई अवधि में संख्यात्मक मापों की कोई कमी नहीं बताई गई है; वर्तमान स्थिति के लिए फिर भी ताजा जांच जरूरी है।',
    numeric: 'संख्यात्मक माप', censored: 'BDL/ND', missing: 'न लिए गए माप', absent: 'अनुपस्थित माप', unknown: 'अन्य अज्ञात',
    identity: 'स्थल की पहचान', ambiguity: 'Rani Kamlapati / Kamla Park का संयुक्त नाम दो स्थानों को दर्शा सकता है। कार्रवाई से पहले वास्तविक स्थल की पुष्टि करें।',
    actions: 'अधिकारी के लिए सुझाए गए कदम',
    actionLines: [
      'संसाधन आवंटन से पहले DO/BOD/pH और कुल कोलीफॉर्म सहित आवश्यक अतिरिक्त जांच के ताजा माप लें।',
      'जहाँ ऐतिहासिक DO कम था, वहाँ वातन की जरूरत की समीक्षा करें; जहाँ BOD अधिक था, वहाँ सफाई की समीक्षा करें। अस्पष्ट स्थल नामों की पुष्टि करें।',
    ],
    limits: 'इस कार्य-सार की सीमाएँ',
    limitLines: [
      'रिपोर्ट के माप ऐतिहासिक स्थिति दर्शाते हैं, 2026 की वर्तमान जल गुणवत्ता या पूर्वानुमान नहीं। स्रोत में इकाइयाँ मानकर दी गई हैं।',
      'वर्ग B केवल तुलना का मानदंड है। कुल कोलीफॉर्म के माप उपलब्ध नहीं हैं; पूर्ण वर्ग B अनुपालन तय नहीं किया जा सकता।',
      'गायब माप अज्ञात हैं। BDL/ND को शून्य या मानदंड पर खरा नहीं माना गया है। COD, ठोस पदार्थ, मटमैलापन और मापी गई धातुओं के लिए वर्ग B की सीमाएँ नहीं दी गई हैं।',
      'यह कार्य-सार विसर्जन की अनुमति, वर्तमान सुरक्षा या स्वास्थ्य प्रभाव का प्रमाण नहीं है।',
    ],
    notes: 'विश्लेषण नोट (मूल पाठ)', references: 'रिपोर्ट संदर्भ', page: 'PDF पृष्ठ',
    noScope: 'कार्य-सार तैयार करने से पहले वर्ष, त्योहार और चरण चुनें।',
  },
} as const;

export function briefScope(filters: Filters, language: Language): string {
  if (!hasScope(filters)) return copy[language].none;
  return `${[...filters.years].sort((a, b) => a - b).join(', ')} | ${filters.festivals.map((value) => festivalNames[language][value]).join(' + ')} | ${filters.phases.map((value) => phaseNames[language][value]).join(' / ')}`;
}

function hasScope(filters: Filters): boolean {
  return filters.years.length > 0 && filters.festivals.length > 0 && filters.phases.length > 0;
}

function isSynthetic(analysis: Analysis): boolean {
  return analysis.warnings.some((warning) => /synthetic|fixture/i.test(warning))
    || analysis.readings.some((row) => row.id.startsWith('fixture-') || row.source.documentId === 'synthetic-fixture');
}

function knownReport(row: EvaluatedReading): { file: string } | undefined {
  const bundled = SOURCE_DOCUMENTS.find((report) => report.id === `immersion-${row.year}`
    && row.source.pdfUrl === reportUrl(report.file)
    && Number.isInteger(row.source.page) && row.source.page > 0 && row.source.page <= reportPages[row.year]);
  if (bundled) return bundled;
  // Officer-uploaded report with an attached PDF on this device.
  if (row.source.documentId.startsWith('upload-') && isUploadedReportUrl(row.source.pdfUrl)
    && Number.isInteger(row.source.page) && row.source.page > 0) {
    return { file: `uploaded report ${row.source.documentId}` };
  }
  return undefined;
}

function usableCriterion(criterion: Criterion | null): criterion is Criterion {
  if (!criterion || criterion.class !== 'B') return false;
  if (criterion.type === 'min') return criterion.min !== null && Number.isFinite(criterion.min);
  if (criterion.type === 'max') return criterion.max !== null && Number.isFinite(criterion.max);
  return criterion.min !== null && criterion.max !== null && Number.isFinite(criterion.min)
    && Number.isFinite(criterion.max) && criterion.min <= criterion.max;
}

function matchesReason(row: EvaluatedReading, reason: Reason): boolean {
  if (row.status !== 'numeric' || row.value === null || !Number.isFinite(row.value) || !usableCriterion(row.criterion)) return false;
  if (row.criterion.parameter !== row.parameter) return false;
  if (reason.code === 'no_observed_breach') return ['Dissolved oxygen', 'BOD', 'pH'].includes(row.parameter) && row.comparison === 'meets';
  if (reason.code === 'zero_do') return row.parameter === 'Dissolved oxygen' && row.value === 0;
  const parameter = { do_breach: 'Dissolved oxygen', bod_breach: 'BOD', ph_breach: 'pH' };
  return reason.code in parameter && row.parameter === parameter[reason.code as keyof typeof parameter] && row.comparison === 'breaches';
}

function numericValue(row: EvaluatedReading): string {
  const printed = row.valueAsPrinted.trim();
  return printed && Number(printed) === row.value ? printed : String(row.value);
}

function comparisonText(row: EvaluatedReading, language: Language): string {
  const criterion = row.criterion!;
  const unit = criterion.unit ? ` ${criterion.unit}` : '';
  const limits = criterion.type === 'range' ? `${criterion.min}-${criterion.max}${unit}`
    : language === 'hi' ? `${criterion.type === 'min' ? 'कम-से-कम' : 'अधिकतम'} ${criterion.type === 'min' ? criterion.min : criterion.max}${unit}`
      : `${criterion.type === 'min' ? 'at least' : 'at most'} ${criterion.type === 'min' ? criterion.min : criterion.max}${unit}`;
  return `${language === 'hi' ? 'CPCB वर्ग B' : 'CPCB Class B'}: ${limits}`;
}

export function buildBriefContent(analysis: Analysis, language: Language): BriefContent {
  const words = copy[language];
  const synthetic = isSynthetic(analysis);
  const scopeSelected = hasScope(analysis.filters);
  const citations: BriefCitation[] = [];
  const sections: BriefSection[] = [];
  const readingById = new Map(analysis.readings.map((row) => [row.id, row]));
  let untraceable = false;

  if (synthetic) sections.push({ title: language === 'hi' ? 'पूर्वावलोकन' : 'Preview', lines: [words.preview] });
  const selected = scopeSelected ? analysis.sites.filter((item) => item.rank !== null)
    .sort((a, b) => a.rank! - b.rank!).slice(0, 3) : [];
  const priorityLines = selected.map((item) => {
    const lines: string[] = [];
    const representatives: EvaluatedReading[] = [];
    const codes = ['zero_do', 'do_breach', 'bod_breach', 'ph_breach', 'no_observed_breach'] as const;
    for (const code of codes) {
      const reason = item.reasons.find((value) => value.code === code);
      if (!reason) continue;
      const candidates = reason.evidenceIds.map((id) => readingById.get(id));
      const valid = candidates.filter((row): row is EvaluatedReading => !!row && row.siteId === item.site.id
        && analysis.filters.years.includes(row.year) && analysis.filters.festivals.includes(row.festival)
        && analysis.filters.phases.includes(row.phase) && matchesReason(row, reason) && (synthetic || !!knownReport(row)));
      if (!valid.length || valid.length !== candidates.length || (!synthetic && valid.some((row) => !knownReport(row)))) untraceable = true;
      if (code === 'no_observed_breach') {
        if (item.benchmarkBreachCount !== 0 || !valid.length) { untraceable = true; continue; }
        lines.push(words.noBreach);
      }
      const sorted = [...valid].sort((a, b) => code === 'do_breach' ? a.value! - b.value! : code === 'bod_breach' ? b.value! - a.value! : 0);
      const row = sorted[0];
      if (row && !representatives.some((value) => value.parameter === row.parameter)) representatives.push(row);
    }
    if (item.zeroDo && !representatives.some((row) => row.parameter === 'Dissolved oxygen' && row.value === 0)) untraceable = true;
    if (!representatives.length) { untraceable = true; lines.push(words.unavailable); }
    for (const row of representatives.slice(0, 2)) {
      const report = knownReport(row);
      let marker = '';
      if (!synthetic && report) {
        let reference = citations.find((entry) => entry.reading.id === row.id);
        if (!reference) { reference = { number: citations.length + 1, reading: row, report: report.file }; citations.push(reference); }
        marker = ` [${reference.number}]`;
      }
      const parameter = row.parameter === 'Dissolved oxygen' ? 'DO' : row.parameter;
      const unit = row.unit || row.criterion?.unit;
      lines.push(`${parameter} ${numericValue(row)}${unit ? ` ${unit}` : ''} (${comparisonText(row, language)}); ${row.year}, ${festivalNames[language][row.festival]}, ${phaseNames[language][row.phase]}${marker}.`);
    }
    return `${item.rank}. ${item.site.name}\n${lines.join('\n')}`;
  });
  sections.push({ title: words.priorities, lines: scopeSelected ? priorityLines.length ? priorityLines : [words.noPriorities] : [words.noScope] });

  if (scopeSelected) {
    const incomplete = analysis.sites.filter((item) => item.rank === null || item.coverage.numericBenchmarkSlots < item.coverage.expectedBenchmarkSlots);
    sections.push({ title: words.testing, lines: incomplete.length ? incomplete.map((item) => coverageLine(item, language)) : [words.complete] });
    if (analysis.sites.some((item) => item.site.confidence === 'medium' || item.reasons.some((reason) => reason.code === 'site_ambiguity'))) {
      sections.push({ title: words.identity, lines: [words.ambiguity] });
    }
    sections.push({ title: words.actions, lines: [...words.actionLines] });
  }
  sections.push({ title: words.limits, lines: [...words.limitLines] });
  const notes = [...new Set([...analysis.warnings.filter((warning) => !/synthetic|fixture/i.test(warning)),
    ...analysis.sites.flatMap((item) => item.warnings.map((warning) => `${item.site.name}: ${warning}`))])];
  if (notes.length) sections.push({ title: words.notes, lines: notes });
  if (citations.length) sections.push({ title: words.references, lines: citations.map((citation) => {
    const row = citation.reading;
    return `[${citation.number}] ${citation.report}, ${words.page} ${row.source.page}; ${row.year}, ${festivalNames[language][row.festival]}, ${phaseNames[language][row.phase]}.`;
  }) });

  return {
    title: words.title, scope: `${words.period}: ${briefScope(analysis.filters, language)}`, context: words.context,
    sections, citations, synthetic,
    exportBlockReason: synthetic ? 'synthetic' : !scopeSelected ? 'empty_scope' : untraceable ? 'untraceable' : null,
  };
}

function coverageLine(item: SiteAnalysis, language: Language): string {
  const c = item.coverage;
  const words = copy[language];
  return `${item.site.name}: ${words.numeric} ${c.numericBenchmarkSlots}/${c.expectedBenchmarkSlots}; ${words.censored} ${c.censoredBenchmarkSlots}; ${words.missing} ${c.explicitMissingBenchmarkSlots}; ${words.absent} ${c.absentBenchmarkSlots}; ${words.unknown} ${c.unknownBenchmarkSlots}.`;
}

export function buildBrief(analysis: Analysis, language: Language): Brief {
  const content = buildBriefContent(analysis, language);
  return {
    language, title: content.title,
    text: [content.title, content.scope, content.context, ...content.sections.map((section) => `${section.title}\n${section.lines.join('\n\n')}`)].join('\n\n'),
    evidenceIds: content.citations.map((citation) => citation.reading.id),
  };
}
