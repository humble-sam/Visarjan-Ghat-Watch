# Visarjan Ghat Watch

Track 2, Bhopal Impact Lab 2026. A five-person, four-hour build.

**User:** the Bhopal Municipal Corporation officer allocating water testing,
cleaning and aeration attention before Durga visarjan.

**Outcome:** inspect seven ghats ranked by historical water-quality evidence,
open the original report page, and export a short Hindi/English action brief.

## Project Documents

- [Four-hour build plan](docs/PROJECT_PLAN.md) and [integration contract](docs/CONTRACTS.md)
- [Data validation](docs/DATA_VALIDATION.md) and [ranking methodology](docs/METHODOLOGY.md)
- [Evidence QA checklist](docs/QA_CHECKLIST.md) and [demo script](docs/DEMO_SCRIPT.md)
- Original files in [public/assets/track-2](public/assets/track-2); [asset provenance](docs/ASSET_SOURCES.md)

## Run Locally

Prerequisite: Node.js 22.12+ (Node 24 recommended).

1. `git clone https://github.com/humble-sam/Visarjan-Ghat-Watch.git`
2. `cd Visarjan-Ghat-Watch`
3. `npm ci`
4. `npm run dev` and open the URL printed in the terminal (normally http://localhost:5173).

`npm run check` runs the TypeScript check, production build and unit tests.
`npm run build` produces `dist/`; `npm run preview` serves it locally.

## Current Status

Working end to end on the original Track 2 data:

- Loads all 1,524 Bhopal readings and Class B criteria from the bundled CSVs
  ([data validation](docs/DATA_VALIDATION.md)).
- Orders the seven ghats by observed concern for the selected years, festivals and
  phases; unassessable ghats stay listed as "testing needed"
  ([methodology](docs/METHODOLOGY.md)).
- Ghat detail with Class B comparisons, reasons linked to report pages, DO/BOD phase
  charts, a reading-state table, matching year comparisons and coverage.
- English/Hindi officer brief with UTF-8 text download, copy and print
  ([evidence QA](docs/QA_CHECKLIST.md), [demo script](docs/DEMO_SCRIPT.md)).

The app uses the original data by default. `VITE_DATA_MODE=fixture` switches to a
clearly labelled synthetic preview for UI work; exports are disabled in that mode.
A data load failure shows an error and retry; it never falls back to synthetic data.

Hosting: `npm run build` produces a static `dist/` including the PDFs. For a subpath
(e.g. GitHub Pages) build with `VITE_BASE_PATH=/Visarjan-Ghat-Watch/`.

## Team

**Team_Nova**

| Name | Institution |
|---|---|
| Samraddha Niranjan | IIIT Bhopal |
| Shivendra Tiwari | IIIT Bhopal |
| Shaurya Kumar | LNCT |
| Prashant Patel | OCT |
| Shanu Kushwaha | LNCT |

Work was split into five areas: bootstrap, shared contracts, integration and
deployment; CSV ingestion, criteria and provenance; risk ranking, comparisons and
coverage; officer dashboard, ghat details and charts; and the Hindi/English brief,
PDF spot-checks and demo.

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
