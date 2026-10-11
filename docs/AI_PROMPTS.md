# Prompts For Codex, Claude Code, Antigravity Or Another Coding Agent

Give each agent the shared prompt plus its member prompt. Run each in a separate
clone on the assigned branch. AI products differ; these prompts assume the tool
can read repository files, edit code and run terminal checks. If using chat-only
AI, the member applies and verifies suggested changes themselves.

## Shared Prompt: Everyone

```text
We are five people building Track 2, Visarjan Ghat Watch, in four hours.
Read README.md, docs/PROJECT_PLAN.md, docs/CONTRACTS.md and the supplied
public/assets/track-2/PROBLEM-STATEMENT.md and data/DATA_DICTIONARY.md.

Implement only my assigned ownership area. Use the shared TypeScript types
and named exports exactly. Do not scaffold another app or edit another owner's
files. Member 1 owns package.json, lockfiles, App.tsx, shared types and global CSS;
request contract/dependency changes instead of making them yourself.

Use original local assets. Rank historical evidence, not current safety or
immersion permission. Never fabricate data, source pages, coordinates, health
effects or limits. Missing is unknown, BDL/ND are censored, numeric DO=0 is real.
Class B DO/BOD/pH comparisons do not establish full Class B compliance because
coliform readings are absent. Use a CSV library, not comma string splitting.

Work against the fixture until dependencies land, then verify against real data.
Keep the module usable at each merge checkpoint. Run appropriate checks. Finish
with owned files changed, checks run, remaining limitations and integration needs.
Commit only owned files to my feature branch; push to origin and open a PR when
the assigned owner authorizes that in this session. Do not merge or force-push main.
If shared files are missing, request Member 1's baseline rather than recreating them.
```

## Member 1: Bootstrap And Integration

```text
You are Member 1. Own root config/package/lockfiles, src/App.tsx, src/main.tsx,
src/shared/, src/styles/global.css, deployment config, README and LICENSE.

Within 20 minutes create one Vite React TypeScript app with Papa Parse, Recharts,
lucide-react and Vitest. Copy the agreed contract into src/shared/types.ts.
Provide a visibly synthetic seven-site fixture matching Analysis, with cases for
zero DO, breach, censored, missing, ambiguous site and no numeric readings.
Provide compilable empty named feature exports as bootstrap stubs; after baseline,
dashboard and brief files belong to their respective members. Keep demo fixture
clearly labelled and remove it from the final production flow.

Create the shell, filter state (default year 2025, both festivals, all phases),
selected-site state, loading/error/retry states and a SourceLink component taking
a SourceRef. Commit and share the baseline so everyone branches from it.
Integrate loadTrackData() and analyze(data, filters), then Dashboard and BriefPanel
through the shared props. All sections must consume one shared analysis.

Deploy a baseline early to an available static host, with local PDF assets served.
Merge reviewed modules data -> risk -> dashboard -> brief by minute 120. Run the
production build, logic tests and officer workflow; verify the final deployed SHA.
Update README with <=5 actual run steps, team names and honest limitations.
Do not build unrelated features. No credentials in files or commits.
```

## Member 2: Data And Provenance

```text
You are Member 2. Own src/data/, data tests and docs/DATA_VALIDATION.md.
Implement named loadTrackData(): Promise<TrackData> using Papa Parse.
Read the primary Bhopal CSV and criteria CSV from public/assets/track-2/data/.
The 2025 sample is only for testing; never append it to the primary dataset.

Map exactly seven site IDs per CONTRACTS.md, preserve every original row and
printed field, generate stable row IDs, normalize numeric/missing/BDL/ND flags,
attach correct year-based local PDF filenames and CSV source_page.
Validate numbers/pages/unknown sites and report parsing issues explicitly.
Normalize BOD criterion label, retain Class B coliform criterion, use null for
missing bounds. Never infer a detection limit or make BDL numeric.

Confirm 1,524 rows, seven sites, 453 rows from 2025, DO numeric=116/below5=42,
BOD numeric=112/above3=100 and four numeric DO=0 readings across the full file.
Add meaningful tests for quoted CSV fields, missing, censored and numeric zero.
Document source pack SHA, assumed units, absent site tables and ambiguous mapping.
Supply the working module for the minute 60-75 merge. Do not implement ranking/UI.
```

## Member 3: Risk Logic And Coverage

```text
You are Member 3. Own src/domain/, domain tests and docs/METHODOLOGY.md.
Implement named analyze(data: TrackData, filters: Filters): Analysis as pure logic
except for generatedAt metadata. Read the agreed ranking in PROJECT_PLAN.md.

Filter readings; retain all seven sites. Evaluate numeric DO/BOD/pH against the
loaded Class B criteria using inclusive boundaries. Censored/absent/missing are
unknown; other parameters have no_criterion. Do not imply full Class B compliance.

Rank assessable sites: any DO=0 first, then benchmark breach fraction descending,
then minimum DO ascending, maximum BOD descending, stable site ID. Missing tie
metrics follow numeric metrics. No numeric benchmarks means rank=null and testing
needed. Produce structured reasons referencing actual reading IDs.

Compute per-parameter min/max/counts, matched phase/year comparisons via readings,
and expected benchmark slot coverage from selected year/festival/phase combinations
for DO/BOD/pH. Identify absent site tables. Flag duplicates/conflicts and count a
unique slot once as agreed. Include site ambiguity and evidence limitations.

Test boundary limits, zero versus missing, BDL/ND, no data, entire missing Durga
2025 tables, filter changes, coverage denominator, duplicates and deterministic
tie-breaking. Document the heuristic and unequal-sampling limitations. Integrate
against Member 2's real data by minute 75. Do not build UI or generate AI scores.
```

## Member 4: Dashboard And Ghat Details

```text
You are Member 4. Own src/features/dashboard/ including scoped CSS.
Implement named Dashboard using the exact DashboardProps. Use the supplied
Analysis fixture first; do not fetch CSVs or recompute ranking in the UI.

Build a compact officer workspace: year/festival/phase filters, scope label,
ranked seven-ghat table, testing-needed summary, selected ghat detail with metric
comparisons, coverage, reasons and report links. Use clear labels and accessible
controls, restrained operational styling and stable responsive layout.

Show breach numerator/denominator, source years, assumed units, ambiguous site
warning and missing coliform limitation. No rank=null site should appear safe.
Display BDL/ND distinctly and missing charts as gaps. For trends, separate series
by year/festival rather than averaging unrelated readings. Only compare matching
festival/phase values. Use shared SourceLink for report-page drilldown.

One useful DO/BOD phase chart is sufficient; finish the full workflow before more
charts. Avoid maps without verified coordinates. Verify narrow and desktop widths,
filter changes, selection, empty scope and source links. Ready to merge by minute
110; final screens use real analysis by minute 120. Do not edit App or global CSS.
```

## Member 5: Brief, Evidence QA And Demo

```text
You are Member 5. Own src/features/brief/, docs/QA_CHECKLIST.md and docs/DEMO_SCRIPT.md.
Implement named buildBrief(analysis: Analysis, language: Language): Brief and
BriefPanel using BriefPanelProps. Use reviewed English and Hindi templates that
consume the same rank/reason/evidence data as the dashboard.

Brief includes selected historical scope, up to three observed-priority ghats,
their values and CPCB comparisons, source report/pages, testing-needed sites,
suggested fresh sampling/cleanup/aeration review and site identity verification.
Include historical-data, assumed-unit, missing-coliform and no-immersion-permission
limitations. For zero observations say what was measured, not that it is current.
Never invent a health effect, detection limit or absent source measurement.

Provide a language selector, UTF-8 text download and browser print with usable
Devanagari font fallback. Preserve given site names. A fluent teammate reviews
Hindi; AI translation alone is not final evidence of quality.

Spot-check zero DO, BOD exceedance and an ambiguous/missing case against bundled
original PDFs. Record row IDs, report names, pages, printed values, reviewer and
pass/discrepancy. Verify PDF viewer page numbering before demo. Build the UI by
minute 110, finish checks by minute 165, and prepare a <=2-minute recording plus
six-minute pitch. Document results rather than claiming checks not performed.
```

## Integration Rescue Prompt

Use only when two modules disagree; both owners should see the request.

```text
Read docs/CONTRACTS.md and inspect the failing import/build or behavior.
Explain the concrete mismatch, then fix only my module to the existing contract.
Do not redesign the architecture, change data semantics, rewrite another owner's
module or add dependencies. Re-run the smallest relevant check and the build.
Report any shared-contract change needed to Member 1 with an exact proposed diff.
```
