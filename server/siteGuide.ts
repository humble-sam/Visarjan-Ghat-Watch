// What the assistant knows about the website itself. Keep in step with the UI.
export const SITE_GUIDE = `Visarjan Ghat Watch is a browser app built for Track 2 of the Bhopal Impact Lab 2026 by Team_Nova. It reads the MPPCB idol-immersion water-quality reports for seven Bhopal ghats (2023, 2024, 2025) from structured CSVs bundled with the app, and links every reading to its original report PDF page.

Views (tabs under the header):
- Ghat priorities: the main workspace.
  - Filters: year checkboxes (2023, 2024, 2025, plus any years added from uploaded reports), festival (Ganesh, Durga), phase (Before, During, After), and Reset (back to 2025, both festivals, all phases). The scope line under the filters states the selected period.
  - Summary: ghats listed, ghats ranked on numeric evidence, ghats needing testing.
  - Testing needed box: ghats with no numeric DO/BOD/pH evidence (no rank) and ranked ghats with gaps.
  - Observed concern ordering table: all seven ghats. Rank, status, breaches as "breaches/numeric readings", and coverage as "numeric slots/expected slots". Click a ghat to open its details.
  - Analytics for the selected period: breaches by ghat and parameter, and a ghats-at-a-glance gallery.
  - Ghat detail panel: Class B comparisons (lowest DO, highest BOD, pH range), "Why this position" reasons with links to report pages and the source reading IDs, DO and BOD charts by phase (one line per year and festival; Durga lines are dashed; gaps are missing readings and are never joined up), a benchmark evidence table (numeric, BDL/ND, not sampled, unknown and absent cells look different), a year comparison when two or more years are selected, other measured parameters without Class B limits, evidence coverage, and suggestions for officer review.
- Officer brief: a short action brief in English or Hindi built from the same analysis. Buttons: Download text (UTF-8 .txt), Copy, Print. Export is disabled for the synthetic preview, an empty period, or untraceable references. It lists up to three priority ghats with values, limits and report pages, the testing-needed list, site-identity warning, suggested actions and limitations.
- Add reports: officers can add a newer immersion report as a CSV in the same column layout as the bundled data (a template is downloadable), optionally attaching the PDF. Added reports are stored only in this browser on this device and flow through the same analysis.
- Source library: the six original PDFs (2023, 2024, 2025 immersion reports and three lake-quality reports) and the four CSV datasets.

Ranking ("observed concern ordering", a team heuristic, not an official CPCB ranking): ghats with any DO = 0 first, then by the share of numeric DO/BOD/pH readings that breach Class B, then lowest DO, then highest BOD. Ghats with no numeric benchmark readings in the period have no rank and are marked testing needed.

Report pages: links open the bundled PDF at the one-based PDF viewer page.

Technical: Vite + React + TypeScript single-page app, Papa Parse for CSV, Recharts for charts, Vitest for tests. Everything except this assistant runs in the browser with no backend. The assistant runs as a small server function (Vercel) that calls the Claude API; the API key stays on the server. Run locally: npm ci, then npm run dev. npm run check runs type checks, the production build and tests.

Known data facts: the 2025 Durga section has no tables for Bairagarh kund or Malikhedi kund (absent, not clean). The Rani Kamlapati / Kamla Park entry combines differently printed Ganesh and Durga site names and may be two locations. Units are assumed by the source pack. Total coliform was not measured.`;
