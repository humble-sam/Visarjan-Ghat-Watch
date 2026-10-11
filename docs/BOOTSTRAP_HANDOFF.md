# Bootstrap Handoff

> Historical record of the baseline. The release default is now real data;
> see the README for current status.

## Baseline

The app uses one Vite/React/TypeScript project and one npm lockfile. Node 22.12+
is required; Node 24 is recommended. Papa Parse, Recharts, lucide-react and Vitest
are already installed. `npm run check` performs TypeScript validation, a production
build and unit tests. GitHub Actions runs it on pull requests and pushes to main.

By default the app uses **synthetic fixtures**, not the actual report measurements.
The actual CSV/PDF assets are served locally and available in Source library.
The fixture covers zero DO, breaches, no observed breach, ambiguous mapping,
BDL, ND, explicit missing, unknown, wholly absent site tables and empty scope.
It contains only 2025 sample scenarios; 2023/2024 selections have absent evidence.

Synthetic readings have `documentId=synthetic-fixture`, empty `pdfUrl`, `page=0`.
The shared SourceLink renders no citation for them. This is an intentional fixture
sentinel, not a valid source reference for real data. Brief exports are disabled.

## Owners Can Start Here

| Member | Replace or extend | Existing interface |
|---|---|---|
| 2 | `src/data/loadTrackData.ts` | `loadTrackData(): Promise<TrackData>` |
| 3 | `src/domain/analyze.ts` | `analyze(data, filters): Analysis` |
| 4 | `src/features/dashboard/` | `Dashboard(props: DashboardProps)` |
| 5 | `src/features/brief/` | `buildBrief(analysis, language): Brief`; `BriefPanel(props: BriefPanelProps)` |

Member 1 continues to own App, shared files, root config and the lockfile.
Feature-specific styles belong in the owning feature directory. Dashboard and
BriefPanel are starter components; members may replace their implementations
while preserving the names and shared props.

Use `src/shared/types.ts` as the exact agreed contract. Shared helpers include:

- `defaults.ts`: initial filters, phase labels, scope formatter.
- `fixture.ts`: `fixtureTrackData`, `createFixtureAnalysis(filters)`.
- `sources.ts`: base-aware local asset URLs, six original report filenames.
- `SourceLink.tsx`: `<SourceLink source={reading.source} />`.

SourceLink accepts local report URLs under the app's base path. Use
`reportUrl(filename)` when constructing references; never fabricate source pages.
Dashboard receives one Analysis from App and has no separate loader or ranking.
BriefPanel receives the exact same Analysis. Keep this integration boundary.

## Switch To Real Data

After Members 2 and 3 land and their checks pass, set `VITE_DATA_MODE=real` in
the local environment or hosting build environment and restart/rebuild the app.
The existing App already calls both module entry points and preserves error/retry
states. There is **no silent fallback** from failed real data to synthetic data.

For a local production build:

```sh
VITE_DATA_MODE=real npm run build
npm run preview
```

Member 1 must then change the release default from fixture to real, verify the
original-data counts, connect verified brief export, and ensure real-mode errors
remain visible. The bootstrap is not submission-ready in fixture mode.

## Static Hosting

`npm run build` produces `dist/`, including the bundled Track 2 assets. Serve this
directory on a static host. No backend, credentials or API keys are needed.
Local default preview: `http://localhost:4173`; dev: `http://localhost:5173`.

For hosting under a subpath (e.g. GitHub Pages), set `VITE_BASE_PATH` with both
leading and trailing slashes at build time. Every asset link uses Vite's base URL.

```sh
VITE_BASE_PATH=/Visarjan-Ghat-Watch/ npm run build
```

No hosting account is configured or published by the baseline. Member 1 chooses
the team's deployment target and verifies the original PDFs in the deployed build.

## Baseline Verification

Verified on 11 October 2026:

- `npm run check`: TypeScript validation, production build and eight tests pass.
- Browser checks: year changes, no-scope state, ghat selection, Hindi draft, disabled
  fixture export, shared brief scope and all six original PDF responses.
- Production layout checked at 1440px, 390px and 320px widths without page overflow;
  desktop/mobile screenshots inspected, including Devanagari rendering.
- Real mode displays a data-module error and working retry/source-library views;
  it does not fall back to synthetic data. No uncaught browser errors in these checks.

These checks verify the bootstrap, not the unimplemented real-data modules or
the numerical accuracy of original PDF tables.
