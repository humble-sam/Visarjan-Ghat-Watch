# Four-Hour Build Plan

## 1. Agree On The Product

Build one officer workflow: **choose a period -> inspect seven ghats ranked by
observed water-quality concern -> inspect readings and report pages -> export
a Hindi/English brief suggesting testing and operational attention.**

Use historical evidence to prioritize fresh checks before 20 October 2026.
Do not present the tool as a forecast, immersion permission, or a statement that
a ghat is currently safe. The event guide supplies the deadline and context.

### Must Ship

- A ranked table of all seven Bhopal ghats, including those with no selected data.
- Filters for year, festival and phase; default 2025, both festivals, all phases.
- A visible scope label; changes to filters update ranking, details and brief.
- Plain-language reasons, DO/BOD/pH comparisons, and separate data coverage.
- Ghat detail showing before/during/after readings and available year comparisons.
- Source report and one-based PDF page for each cited reading.
- Missing, censored and numeric states rendered distinctly.
- A short English and Hindi brief, printable and downloadable as UTF-8 text.
- Public GitHub repo, MIT code license, <=5-step run instructions, limitations,
  team details, and a working hosted build or verified local demonstration.

### Time Permitting Only

- CSV export of the ranked table.
- Extra trend visualization after every core flow works.
- Two-minute recording, strongly recommended by the event guide.

### Outside This Four-Hour Scope

No login, backend database, chatbot, RAG, live sensors, live government access,
statewide analytics, custom PDF extraction, predictive ML or automatic health
advice. A map is optional only if verified coordinates and time remain; the pack
does not provide coordinates. The seven-ghat table is sufficient for the workflow.

## 2. Architecture Everyone Uses

Recommended stack: **Vite + React + TypeScript**, Papa Parse for CSV, Recharts for
charts, lucide-react for icons, Vitest for logic tests. Use ordinary CSS and one
lockfile. Member 1 chooses the final exact versions at bootstrap.

Everything runs in the browser using bundled local assets. No API keys or paid
runtime inference are required. AI tools write code; the shipped app uses
deterministic calculations and reviewed bilingual templates.

```text
public/assets/track-2/data/*.csv
           |
    data/loadTrackData.ts          Member 2
           |
    domain/analyze.ts              Member 3
           |
    App.tsx + shared state         Member 1
       /                 \
  features/dashboard     features/brief
       Member 4              Member 5
           |
  original local PDF #page=N links
```

See CONTRACTS.md before anyone generates code. Use its names and shapes exactly.

## 3. Five Owners

| Owner / branch | Owned files | Deliverable | Definition of done |
|---|---|---|---|
| Member 1 / `feat/integration` | Root config, package files, `src/App.tsx`, `src/main.tsx`, `src/shared/`, `src/styles/global.css`, deployment config, README, LICENSE | Running shell, shared types, fixture, filter state, evidence link component, integration, deployment | Others can run a stable baseline by minute 20; real app connected by minute 120; final build and hosted/local demo work |
| Member 2 / `feat/data` | `src/data/`, data tests, `docs/DATA_VALIDATION.md` | Parsed original data, normalized flags, Class B criteria, source manifest, stable reading IDs | All 1,524 Bhopal rows load without silently dropping rows; seven sites; source links resolve; BDL/missing preserved |
| Member 3 / `feat/risk` | `src/domain/`, domain tests, `docs/METHODOLOGY.md` | Pure ranking, ghat metrics, coverage, phase/year comparisons, reason evidence | Deterministic ranking; missing never passes; boundaries correct; every reason cites input readings |
| Member 4 / `feat/dashboard` | `src/features/dashboard/` | Filter toolbar, priority table, ghat selection, details, accessible charts | Works with shared fixture first, then real analysis; narrow-screen layout; no invented readings; all seven ghats visible |
| Member 5 / `feat/brief` | `src/features/brief/`, `docs/QA_CHECKLIST.md`, `docs/DEMO_SCRIPT.md` | Reviewed Hindi/English templates, export/print UI, PDF evidence checks, recording/pitch | Brief matches filters and ranking; source references and data gaps included; Hindi reviewed; demonstrated source-page checks recorded |

Member numbers are roles, not seniority. Assign Member 1 to the teammate most
comfortable with Git/deployment. Member 5 can pair with an AI coding tool for
the export component while spending substantial time on evidence and language.

**Only Member 1 edits shared types, package.json, lockfiles, App.tsx or global CSS.**
Others request dependency/contract changes in team chat. Keep component CSS inside
the owning feature directory. Every owner writes the checks for their risky logic.

## 4. The 240-Minute Schedule

Times are relative to team kickoff. The official submission deadline is **5:00 PM
IST on 11 October 2026**. Start no later than 1:00 PM to use a full four hours;
otherwise shorten feature work, preserving integration and submission time.

| Elapsed | Everyone's goal | Member 1 | Members 2-5 |
|---|---|---|---|
| 0-10 min | Read requirements, assign names, accept scope | Confirm repo access and deployment target | Inspect sample rows, criteria, and special cases together |
| 10-20 min | Freeze contracts and create usable baseline | Scaffold app; install dependencies; commit types, seven-site fixture and empty feature exports to main | Read contracts; prepare module tasks; branch after baseline lands |
| 20-60 min | First implementation | Shell, filter state, evidence links; deploy baseline | M2 parser; M3 ranking against fixture; M4 table/details against fixture; M5 bilingual templates and source checks |
| 60-75 min | First merge checkpoint | Review and merge M2, then M3 once dependencies pass | Push small working PRs; M4/M5 keep using fixture until real analysis is wired |
| 75-110 min | Complete modules | Wire real loader + analysis; resolve contract issues | M4 finish UI; M5 finish brief/exports; M2/M3 verify real-data edge cases |
| 110-120 min | Second merge checkpoint | Merge M4/M5; test complete workflow | Fix integration bugs together; every feature now uses real data |
| 120-165 min | Make it reliable | Build and deployment checks; state/error fixes | Evidence QA, logic tests, layout checks, Hindi review; improve reasons |
| 165-195 min | Rehearse officer workflow | Run clean-clone checks and production URL | Verify three source cases, brief output, print layout and current-data caveat |
| 195-215 min | Feature freeze | Merge only fixes; verify public repo and README | Record <=2-minute demo; finalize names, limitations and six-minute pitch |
| 215-240 min | Submit with buffer | Verify final SHA and deployed revision | Submit repo/recording through official form before 5:00 PM; retain local demo backup |

Check in every 30 minutes: state what runs, what is blocked, and the next merge.
Use the event's 4:00 PM recording reminder if it falls within your build window.
Member 1 must not wait until the last hour to integrate.

## 5. Assets Already Included

Use `public/assets/track-2/`, copied unchanged from source commit
`6b96823f27aaab18ce2f07dfc71a3732011bd4ab`.

| Asset | Use in solution | Owner |
|---|---|---|
| `data/bhopal_ghats_2023_2025.csv` | Primary source for ranking/details; 1,524 rows, seven ghats | M2 + M3 |
| `data/sample_bhopal_2025.csv` | Quick parser development/checks; 453 rows, already a subset of primary CSV | M2 |
| `data/cpcb_water_quality_criteria.csv` | Load Class B comparisons; map CSV BOD label to reading BOD | M2 + M3 |
| `data/mp_immersion_sites_2023_2025.csv` | Retain as provided; excluded from Bhopal MVP calculations | M2 documents exclusion |
| 2023, 2024, 2025 immersion PDFs in `resources/` | Evidence links and manual spot-checks | M1 + M5 |
| Three lake-quality PDFs in `resources/` | Source-library context; not joined into ghat rankings | M5 |
| Problem statement, dictionary, participant guide | Requirements, field semantics and final submission checks | Everyone |

Do not append the sample CSV to the primary CSV: that doubles the 2025 rows.
Do not mix lake station measurements or statewide sites into ghat rankings.
Do not spend the build window extracting PDFs; structured CSVs are supplied.

## 6. Ranking And Honesty Rules

Use Class B as a clearly labelled comparison benchmark:
DO >=5 mg/l; BOD <=3 mg/l; pH 6.5-8.5. Total coliform is also required by Class B
but is absent from the supplied immersion readings: **full Class B compliance
cannot be assessed**. There is no Class B limit here for COD, solids, turbidity
or the four measured metals. Show these values without invented pass/fail limits.

For the selected period, create an **observed concern ordering**, not a clinical
or predictive risk score:

1. Put sites with any numeric DO=0 first.
2. Then sort by the fraction of numeric DO/BOD/pH readings that breach the
   selected Class B comparisons, descending.
3. Break ties by lowest observed DO, then highest observed BOD, then stable site ID.
4. Sites with no numeric benchmark readings have `rank=null` and an explicit
   "Insufficient evidence - testing needed" state. Keep them visible after the
   numbered list and highlight them in a separate testing-needed summary.

Fractions describe available samples and can reflect unequal sampling. Always
show `breaches / numeric benchmark readings` alongside coverage. Missing tie-break
values sort after numeric values; missing data never gives a better factual label.
The methodology must state that this heuristic is a team decision, not an official
CPCB ranking. Do not invent high/medium/low thresholds in the MVP.

Coverage uses expected slots for the selected years x festivals x phases x three
benchmark parameters for each site. Track whole absent slots, explicit missing
rows and censored values separately. Duplicate slots are flagged; do not count
them twice. Compare unique numeric slots to expected slots, not CSV row totals.

Handle BDL/ND as censored, not zero and not missing. Without a reported detection
limit, do not numerically compare them or count them as passing. Preserve DO=0
as a real numeric reading. Never interpolate absent samples in charts.

Always show the 2025 Durga gaps at Bairagarh and Malikhedi when that scope is
selected. Preserve the medium-confidence Rani Kamlapati / Kamla Park mapping
warning, including in the brief; it may combine two locations.

Recommendations are operational suggestions for an officer to review: obtain fresh
DO/BOD/pH and appropriate additional testing, review aeration where DO was low,
review cleanup where BOD was high, and verify ambiguous site identity. Do not route
immersions to a ghat based on historical readings or make disease claims.

## 7. Git Collaboration

The planning branch includes the assets. Merge the planning PR before bootstrap.
All teammates then clone https://github.com/humble-sam/Visarjan-Ghat-Watch.
The repo is already public; the owner must grant the other four write access.

After Member 1's baseline lands, each member starts their assigned branch:

```sh
git switch main
git pull --ff-only
git switch -c feat/data
```

Replace `feat/data` with your assigned branch. Commit only your owned paths,
push early, and open a PR with what works, validation, and any contract request.
Member 1 integrates PRs in this order: **data -> risk -> dashboard -> brief**.
Use `git merge origin/main` on feature branches when incorporating integrated
work; resolve conflicts with the relevant owner. Never force-push main.

Module owners should import contracts and use fixtures; they do not scaffold
their own applications or generate alternative backends. Request missing pieces
instead of changing someone else's module.

## 8. Acceptance Checklist

- [ ] Whole dataset: 1,524 Bhopal rows, seven sites, 453 rows from 2025.
- [ ] Whole-dataset check: 116 numeric DO readings, 42 below 5; 112 numeric BOD
      readings, 100 above 3; four DO=0 readings. These are dataset-wide checks,
      not counts to hardcode into filtered screens.
- [ ] `5` DO, `3` BOD, `6.5` and `8.5` pH meet their respective comparisons.
- [ ] Numeric zero, BDL, ND, not sampled, `*`, `**`, and absent slots are distinct.
- [ ] Entirely absent Durga 2025 site tables show incomplete evidence, never clean.
- [ ] Filter changes update reasons, charts, coverage and brief consistently.
- [ ] Every ranked reason and brief number leads back to source reading IDs and PDFs.
- [ ] A zero-DO case, a BOD exceedance and an ambiguous/missing case checked
      against original PDF pages; record checks in `docs/QA_CHECKLIST.md`.
- [ ] Class B total-coliform gap and parameters without limits are visible.
- [ ] Chart gaps are gaps; selected-year comparisons use matching festival/phase.
- [ ] Hindi and English briefs match the same data; Hindi checked by a teammate.
- [ ] Downloaded Hindi text renders correctly; print-to-PDF handles Devanagari.
- [ ] Browser load/error/no-data states and mobile-width layout work.
- [ ] Fresh clone: install, run, build, tests pass; local PDFs available on deployment.
- [ ] README has actual team details, <=5 run steps, limitations and source links.
- [ ] Repo public, no secrets, code license present, deployed revision matches final code.
- [ ] Submission sent through official form before 5:00 PM IST; recording retained.

## 9. Cut Order If Behind

At minute 120, all modules must be connected. If not, stop visual polish and
pair on the missing contract. At minute 165, cut extra charts, maps and CSV export.
At minute 195, freeze features.

Keep table, explanations, missing-data handling, report links and both language
briefs. If print styling is slow, ship reliable UTF-8 text downloads plus browser
print. If deployment blocks progress for more than 15 minutes, preserve a tested
local run and screen recording; the public GitHub link remains required.

## 10. Demo Narrative

Six minutes: officer's decision (45s), supplied evidence (45s), ranking and filters
(90s), source-page drilldown and missing data (60s), bilingual action brief (60s),
limits and immediate next step of fresh testing (60s).

For the two-minute recording, show one full path: priority table -> ghat detail ->
source report page -> Hindi/English export. Choose the demonstration site after
running the analysis; do not assume a particular ghat wins every filter.

Official submission form is linked in the bundled Track 2 problem statement.
