export type Language = 'en' | 'hi';
export type Festival = 'Ganesh' | 'Durga';
export type Phase = 'pre' | 'during' | 'after';
export type ReadingStatus = 'numeric' | 'bdl' | 'nd' | 'not_sampled' | 'unknown';
export type Comparison = 'meets' | 'breaches' | 'unknown' | 'no_criterion';

export interface Filters {
  years: number[];
  festivals: Festival[];
  phases: Phase[];
}
export interface Site {
  id: string;
  name: string;
  waterBody: string;
  confidence: 'high' | 'medium';
  warnings: string[];
}
export interface SourceRef {
  documentId: string;
  pdfUrl: string;
  page: number;
  siteAsPrinted: string;
}
export interface Reading {
  id: string;
  siteId: string;
  year: number;
  festival: Festival;
  phase: Phase;
  parameter: string;
  parameterAsPrinted: string;
  value: number | null;
  unit: string;
  unitsAssumed: true;
  status: ReadingStatus;
  rawFlag: string;
  valueAsPrinted: string;
  source: SourceRef;
}
export interface Criterion {
  parameter: string;
  class: 'B';
  type: 'min' | 'max' | 'range';
  min: number | null;
  max: number | null;
  unit: string;
}
export interface TrackData {
  sites: Site[];
  readings: Reading[];
  criteria: Criterion[];
  sourceCommit: string;
  warnings: string[];
}
export interface EvaluatedReading extends Reading {
  comparison: Comparison;
  criterion: Criterion | null;
}
export interface Metric {
  parameter: string;
  numericCount: number;
  breachCount: number;
  min: number | null;
  max: number | null;
  readings: EvaluatedReading[];
}
export interface Coverage {
  expectedBenchmarkSlots: number;
  numericBenchmarkSlots: number;
  censoredBenchmarkSlots: number;
  explicitMissingBenchmarkSlots: number;
  absentBenchmarkSlots: number;
  unknownBenchmarkSlots: number;
}
export interface Reason {
  code: 'zero_do' | 'do_breach' | 'bod_breach' | 'ph_breach'
    | 'incomplete_evidence' | 'site_ambiguity' | 'no_observed_breach';
  evidenceIds: string[];
  observed: number | null;
  limit: number | null;
  count: number | null;
  total: number | null;
}
export interface SiteAnalysis {
  site: Site;
  rank: number | null;
  zeroDo: boolean;
  benchmarkNumericCount: number;
  benchmarkBreachCount: number;
  breachFraction: number | null;
  metrics: Metric[];
  coverage: Coverage;
  reasons: Reason[];
  warnings: string[];
}
export interface Analysis {
  filters: Filters;
  comparisonClass: 'B';
  sites: SiteAnalysis[];
  readings: EvaluatedReading[];
  warnings: string[];
  generatedAt: string;
}
export interface Brief {
  language: Language;
  title: string;
  text: string;
  evidenceIds: string[];
}
export interface DashboardProps {
  analysis: Analysis;
  filters: Filters;
  selectedSiteId: string | null;
  onFiltersChange: (filters: Filters) => void;
  onSelectSite: (siteId: string) => void;
}
export interface BriefPanelProps {
  analysis: Analysis;
}
