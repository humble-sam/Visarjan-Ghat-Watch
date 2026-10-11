# Member 5 Evidence And Brief QA

Checked 11 October 2026 by Codex. Source pack commit:
`6b96823f27aaab18ce2f07dfc71a3732011bd4ab`; original assets remain unchanged.
This is a spot-check, not independent verification of every PDF table.

## Original PDF Spot-Checks

Pages below are one-based PDF viewer pages, not printed footer numbers. The
2023, 2024 and 2025 reports contain 87, 118 and 92 PDF pages respectively.
The checked 2025 pages have textual footers, not conflicting numbered pages;
no offset is needed for these checks.

All rows below refer to `Ganesh_and_Durga_visarjan_report-2025.pdf`. CSV row
numbers count data rows, excluding the header. `bpl-NNNNNN` IDs are the proposed
contract IDs used in the brief tests; confirm the final loader's ID convention.

| Evidence | CSV row / test ID | PDF page | Printed observation | Result |
|---|---|---|---|---|
| Bairagarh / Sant Hirdaram, Ganesh during, DO | 1124 / bpl-001124 | 28 | 0 | Pass: numeric zero, not missing |
| Same site/scope, BOD | 1127 / bpl-001127 | 28 | 8 | Pass: above supplied Class B comparison of 3 |
| Same site, pre/after DO | 1123 / bpl-001123; 1125 / bpl-001125 | 28 | Empty cells; phase headers carry * and ** | Pass: not numeric zero |
| Khatlapura, Durga during, BOD | 1430 / bpl-001430 | 64 | 4.6 | Pass: above supplied comparison of 3 |
| Rani Kamlapati, Durga during, DO / BOD | 1391 / bpl-001391; 1394 / bpl-001394 | 64 | 2.4 / 8.8 | Pass: matches CSV |
| Hathaikheda, Durga during, chromium | 1370 / bpl-001370 | 64 | BDL | Pass: censored, not zero or a proven pass |
| Malikhedi, Ganesh pre/after DO | 1279 / bpl-001279; 1281 / bpl-001281 | 29 | Empty cells | Pass: missing evidence |
| Kamla naming ambiguity | 1202 / bpl-001202; 1391 / bpl-001391 | 29 / 64 | Ganesh: Rani kamlapati,kamla park,murti visarjan kund; Durga: Rani kamlapati (lower lake) | Pass: keep identity warning; cannot establish one physical site |

Codex visually inspected original pages 28, 29 and 64. Text extraction of the
Durga Bhopal section on pages 63-65 and the next regional boundary on 65-66
found no Bairagarh or Malikhedi table, consistent with their absent 2025 Durga
CSV rows. This is absence in this supplied section, not proof of no sampling
elsewhere. No current water-quality or health claim follows from these checks.

## Completed Feature Checks

- [x] English and Hindi consume the same upstream ranks, readings and evidence IDs.
- [x] Selected scope, numeric values, thresholds, report filenames and pages included.
- [x] Missing, censored, absent and unknown coverage remain distinct.
- [x] Historical-only, assumed-unit, missing-coliform and permission limitations included.
- [x] Synthetic previews, empty scope and invalid priority references block export.
- [x] Wrong report year, out-of-range page, cross-site and out-of-filter evidence tested.
- [x] Actual CSV independently checked against the source-checked test subset.
- [x] UTF-8 BOM downloads in both languages; clipboard success and failure tested.
- [x] Print button invokes print; both two-page QA PDFs visually inspected, including all references.
- [x] Desktop, 390px and 320px layouts checked; Hindi does not overflow horizontally.
- [x] Browser source links retain one-based page fragments; no uncaught page errors in tested flows.
- [x] User accepted current Hindi wording: "Keep the current Hindi wording".

Hindi acceptance is recorded without assuming the reviewer's fluency. A fluent
teammate should still sign off before official submission, as required by the plan.
Upstream analysis notes are preserved in their supplied language, not silently translated.

## Integration And Submission Gates

- [ ] Member 2 real-data loader and Member 3 analyzer replace the bootstrap stubs.
- [ ] Recheck brief versus final dashboard rank order, coverage and active filters.
- [ ] Open original report pages in the final deployment, including a mobile browser.
- [ ] Fluent Hindi reviewer name/sign-off recorded by the team.
- [ ] Final real-data demo recorded; six-minute pitch rehearsed with the team.
- [ ] Final hosted revision, public repository and official submission confirmed by Member 1.

The current main app is a synthetic fixture. The owned QA preview uses a small
source-checked subset with illustrative ranks and a prominent warning; it is not
the final officer brief or evidence that the production ranking is complete.
Local screenshots, text exports, QA PDFs and a short feature recording are under
gitignored `output/`. They are development checks, not submission artifacts.

Run `npm run check` for type checking, production build and all 20 tests.

