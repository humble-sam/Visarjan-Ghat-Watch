# Shared Integration Contract

Member 1 materializes these types in `src/shared/types.ts` during bootstrap.
Changes go through Member 1 and are announced to all members. This document is
the planning contract, not implemented application code.

## File Boundaries And Exports

```text
src/shared/types.ts                    M1: types below
src/shared/fixture.ts                  M1: valid synthetic seven-site fixture
src/shared/SourceLink.tsx              M1: local PDF link; never fabricates pages
src/data/loadTrackData.ts              M2: loadTrackData(): Promise<TrackData>
src/domain/analyze.ts                  M3: analyze(data, filters): Analysis
src/features/dashboard/Dashboard.tsx   M4: Dashboard(props: DashboardProps)
src/features/brief/buildBrief.ts       M5: buildBrief(analysis, language): Brief
src/features/brief/BriefPanel.tsx       M5: BriefPanel(props: BriefPanelProps)
src/App.tsx                            M1: data loading, filters, selectedSiteId
```

Use named exports. Feature components do not independently fetch or recalculate
rankings. `App` calls `analyze` once per filter change and passes its result to
both components. Brief content consumes the same `Analysis` as the dashboard.

## Types

```ts
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
  generatedAt: string; // ISO timestamp, not a sample date
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
```

`Analysis.readings` is filtered evidence. The dashboard may group those readings
for charts; it must not recalculate breach status or ranking. Multi-year phase
charts use distinct year/festival series, never average unrelated observations.
Year comparisons require multiple selected years with a matching festival/phase.

## Invariants

- Each source row is preserved. IDs can use primary CSV row number, e.g. `bpl-000001`.
- Site IDs are fixed below; never use array index or invent coordinates.
- CSV parser handles quoted commas; no `split(',')` parsing.
- Empty numeric cells become `null`, never `0`, NaN or a passing status.
- Preserve raw flags. `*`, `**`, `not sampled`, `_`, `-` mean `not_sampled`;
  BDL/ND mean censored. Unrecognized empty data means `unknown` with a warning.
- An invalid nonempty numeric field yields `unknown`, not a silently dropped row.
- Criteria normalize `BOD (5 days 20C)` to `BOD`. Keep missing coliform criterion
  visible in limitations; it has no readings and is excluded from rank arithmetic.
- Duplicate numeric slots: retain source rows, warn and select the first source
  row deterministically for ranking/coverage. Conflicting values require QA.
- Coverage uses unique `(site, year, festival, phase, parameter)` slots for DO,
  BOD and pH. The six coverage categories sum to expected benchmark slots.
- An empty filter selection gives a no-scope state and `rank=null` for every site.
- Sites with numeric benchmark readings receive sequential ranks; unassessable
  sites receive `null`. No readout calls a no-breach result "safe".
- Reasons carry evidence IDs, not AI-generated facts. Missing/ambiguity reasons
  can have empty evidence lists plus coverage/site warnings.
- Brief numbers and reasons come from analysis. Never calculate different ranks
  in a template or call an LLM to infer unsupported conclusions.

## Site IDs

| ID | Exact source-pack name |
|---|---|
| `bairagarh` | Bairagarh (Sant Hirdaram) kund |
| `khatlapura` | Khatlapura ghat |
| `prempura` | Prempura ghat |
| `kamla-park` | Rani Kamlapati ghat / Kamla Park kund |
| `hathaikheda` | Hathaikheda dam / kund |
| `malikhedi` | Malikhedi kund |
| `shahpura` | Shahpura lake ghat |

## Evidence URLs

Use `/assets/track-2/resources/` (or `import.meta.env.BASE_URL` for a deployment
under a path). Link to `${pdfUrl}#page=${source.page}`. URL-encode filenames.

| Reading year | PDF filename |
|---|---|
| 2023 | `Idol_immer._Report_23_CPCB.pdf` |
| 2024 | `Ganesh_and_Durga_visarjan_report-2024.pdf` |
| 2025 | `Ganesh_and_Durga_visarjan_report-2025.pdf` |

Use the CSV source_page, not a made-up page or citation. Member 5 verifies whether
PDF viewer page and printed page numbering align for demonstrated readings. If
not, document a verified mapping; never silently adjust every page by an assumption.

## Brief Contents

Both languages use identical evidence and include:

1. Historical period and selected filters; planning context before 20 October 2026.
2. Up to three observed-priority sites, their readings/limits and report pages.
3. A separate testing-needed list for absent or incomplete evidence.
4. Suggested fresh sampling, aeration/cleanup review and site-name verification.
5. Historical-data, assumed-unit, missing-coliform and no-permission limitations.

Use reviewed static Hindi labels/templates. Embed site names as supplied rather
than inventing translations of place names. UTF-8 `.txt` export and browser
print are required; clipboard copy is optional and must handle permission errors.
