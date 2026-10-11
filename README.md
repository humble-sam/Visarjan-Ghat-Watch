# Visarjan Ghat Watch

Track 2, Bhopal Impact Lab 2026. A five-person, four-hour build.

**User:** the Bhopal Municipal Corporation officer allocating water testing,
cleaning and aeration attention before Durga visarjan.

**Outcome:** inspect seven ghats ranked by historical water-quality evidence,
open the original report page, and export a short Hindi/English action brief.

## Start Here

1. Read [the four-hour project plan](docs/PROJECT_PLAN.md).
2. Assign Members 1-5 and read [the integration contract](docs/CONTRACTS.md).
3. Give each member their [AI build prompt](docs/AI_PROMPTS.md).
4. Use the original files in [public/assets/track-2](public/assets/track-2).
5. Follow the merge checkpoints and acceptance checklist in the plan.

## Run Locally

Prerequisite: Node.js 22.12+ (Node 24 recommended).

1. `git clone https://github.com/humble-sam/Visarjan-Ghat-Watch.git`
2. `cd Visarjan-Ghat-Watch`
3. `npm ci`
4. `npm run dev` and open the URL printed in the terminal (normally http://localhost:5173).

`npm run check` runs the TypeScript check, production build and unit tests.
`npm run build` produces `dist/`; `npm run preview` serves it locally.

## Current Status

Working: app shell, shared TypeScript contracts, filter/selection state, a labelled
seven-ghat synthetic fixture, starter dashboard/details, English/Hindi draft views,
source library, original local assets, loading/error/retry states and CI checks.

Pending: real CSV ingestion (Member 2), production ranking (Member 3), full dashboard
and charts (Member 4), reviewed bilingual briefs/export (Member 5), and hosting.
Synthetic data is **not** MPPCB evidence; officer exports are disabled in this baseline.

Read [the bootstrap handoff](docs/BOOTSTRAP_HANDOFF.md) before starting feature work.
`VITE_DATA_MODE=real` activates the agreed data/analysis entry points once implemented.
Until then real mode fails explicitly; it never substitutes synthetic readings.

## Team

Team name: to be filled before submission.

| Member | Name | Ownership |
|---|---|---|
| 1 | To be assigned | Bootstrap, shared contracts, integration, deployment |
| 2 | To be assigned | CSV ingestion, criteria, provenance, data checks |
| 3 | To be assigned | Risk ranking, comparisons, coverage, tests |
| 4 | To be assigned | Officer dashboard, ghat details, charts |
| 5 | To be assigned | Hindi/English brief, PDF spot-checks, demo |

## Sources And Limits

The original Track 2 CSVs, reports, participant guide and problem statement are
bundled unchanged. See [asset provenance](docs/ASSET_SOURCES.md).
No additional data has been added.

Data covers 2023-2025, not current 2026 conditions. Missing readings are unknown;
BDL is not zero. Units are assumed by the source pack. Class B is a comparison
benchmark, not an immersion permit or a complete water-safety assessment.

The planned MVP uses public files only and has no live government-system connection.

Original problem statement:
https://github.com/Vishal4742/bhopal-impact-lab-2026-problem-statements/tree/main/track-2-visarjan-ghat-watch

Application code and documentation: MIT; see [LICENSE](LICENSE).
Bundled third-party assets retain their source terms; the MIT license does not
relicense those assets.
