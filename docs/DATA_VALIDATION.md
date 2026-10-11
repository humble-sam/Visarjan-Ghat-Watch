# Data Validation and Provenance Report

**Track 2: Visarjan Ghat Watch (Bhopal Impact Lab 2026)**  
**Author / Module Owner:** Member 2 (`feat/data`)  
**Scope:** `src/data/loadTrackData.ts`, `src/data/loadTrackData.test.ts`, and `docs/DATA_VALIDATION.md`

---

## 1. Executive Summary

This document verifies the automated parsing, data cleaning, flag normalization, and provenance tracking for the historical water-quality dataset covering seven idol immersion sites in Bhopal from 2023 to 2025.

All checks specified in the project contract (`docs/CONTRACTS.md`) and Member 2 requirements (`docs/AI_PROMPTS.md`) have been verified programmatically and validated via automated unit and integration tests.

### Key Validation Outcomes

| Metric / Check | Expected Target | Parsed & Verified Result | Status |
|---|---|---|---|
| Primary Bhopal rows ingested | 1,524 | 1,524 | Verified |
| Unique sites mapped | Exactly 7 | Exactly 7 | Verified |
| 2025 readings count | 453 | 453 | Verified |
| 2024 readings count | 546 | 546 | Verified |
| 2023 readings count | 525 | 525 | Verified |
| Numeric DO readings | 116 | 116 | Verified |
| Numeric DO readings < 5.0 mg/L | 42 | 42 | Verified |
| Numeric BOD readings | 112 | 112 | Verified |
| Numeric BOD readings > 3.0 mg/L | 100 | 100 | Verified |
| Numeric DO = 0.0 readings | 4 | 4 | Verified |
| Censored BDL readings | 174 | 174 | Verified |
| Missing / un-sampled readings (`not sampled`, `*`, `**`) | 61 | 61 | Verified |
| Pinned Source Pack SHA | `6b96823f27aaab18ce2f07dfc71a3732011bd4ab` | `6b96823f27aaab18ce2f07dfc71a3732011bd4ab` | Verified |

---

## 2. Source Pack Provenance

- **Upstream Repository:** `https://github.com/Vishal4742/bhopal-impact-lab-2026-problem-statements`
- **Pinned Commit Hash:** `6b96823f27aaab18ce2f07dfc71a3732011bd4ab`
- **Local Datasets Used:**
  - `public/assets/track-2/data/bhopal_ghats_2023_2025.csv`: Primary dataset containing all 1,524 historical measurements across 2023, 2024, and 2025 for Bhopal ghats.
  - `public/assets/track-2/data/cpcb_water_quality_criteria.csv`: CPCB official water quality criteria classes A–E.
- **Testing-Only Datasets:**
  - `public/assets/track-2/data/sample_bhopal_2025.csv` (453 rows): Used only for testing/inspection; **never appended** or duplicated in the primary dataset.
- **Excluded Datasets:**
  - `public/assets/track-2/data/mp_immersion_sites_2023_2025.csv`: Statewide dataset (21,600 rows) is outside the 7-ghat Bhopal officer workflow scope.

---

## 3. The Seven Canonical Bhopal Sites

Per `docs/CONTRACTS.md`, exactly seven site IDs are mapped deterministically. Every original printed name from the source PDF reports resolves to one canonical ID:

| Site ID | Canonical Name | Water Body | Confidence | Notes & Warnings |
|---|---|---|---|---|
| `bairagarh` | Bairagarh (Sant Hirdaram) kund | Upper Lake | `high` | No Durga 2025 immersion table published in source report. |
| `khatlapura` | Khatlapura ghat | Lower Lake | `high` | Continuous 3-year record (Ganesh & Durga). |
| `prempura` | Prempura ghat | Upper Lake | `high` | Continuous 3-year record (Ganesh & Durga). |
| `kamla-park` | Rani Kamlapati ghat / Kamla Park kund | Lower Lake | `medium` | **Site Mapping Ambiguity**: Ganesh tables designate "Kamla Park kund", whereas Durga tables designate "Lower Lake ghat". May combine two physical locations. |
| `hathaikheda` | Hathaikheda dam / kund | Hathaikheda dam | `high` | Continuous 3-year record (Ganesh & Durga). |
| `malikhedi` | Malikhedi kund | Kund | `high` | No Durga 2025 immersion table published in source report. |
| `shahpura` | Shahpura lake ghat | Shahpura Lake | `high` | Continuous 3-year record (Ganesh & Durga). |

---

## 4. Normalization Rules & Data Semantics

### 4.1 Row IDs
- Stable, sequential IDs are generated matching `bpl-000001` through `bpl-001524` using 1-based index with zero-padding to 6 digits.

### 4.2 Numeric vs. Missing vs. Censored Values
- **Numeric values (`status: 'numeric'`):**
  - Converted via `Number(val)`. Valid numbers are preserved as floats/integers.
  - **Numeric zero (`0.0` or `0`):** Is a real, physical reading (anoxic condition). It is preserved as `value: 0`, `status: 'numeric'`, and never converted to null, missing, or passing.
- **Censored values (`status: 'bdl'` | `'nd'`):**
  - `flag === 'BDL'` or `value_as_printed === 'BDL'`: Stored as `value: null`, `status: 'bdl'`, `rawFlag: 'BDL'`.
  - `flag === 'ND'` or `value_as_printed === 'ND'`: Stored as `value: null`, `status: 'nd'`, `rawFlag: 'ND'`.
  - **Detection limits are never invented or inferred**, and BDL is never replaced with `0` or half detection limit.
- **Missing / un-sampled values (`status: 'not_sampled'`):**
  - Raw markers `not sampled`, `*`, `**`, `_`, `-` are mapped to `value: null`, `status: 'not_sampled'`.
  - Original raw flags are preserved in `rawFlag` and `valueAsPrinted`.
- **Corrupt / Unknown values (`status: 'unknown'`):**
  - Any non-empty string that cannot be parsed as a number and does not match a recognized flag produces `value: null`, `status: 'unknown'`, and emits an explicit parsing warning without dropping the row.

### 4.3 Zero Dissolved Oxygen (DO = 0.0) Readings

Across all 1,524 readings in the primary dataset, exactly **four** readings report a measured numeric Dissolved Oxygen of `0.0 mg/l`. All four events occurred at **Bairagarh (Sant Hirdaram) kund**:

1. **Row `bpl-000030`**: 2023, Ganesh, `after` phase, value `0.0 mg/l`, PDF page `26` (`Idol_immer._Report_23_CPCB.pdf`)
2. **Row `bpl-000498`**: 2023, Durga, `pre` phase, value `0.0 mg/l`, PDF page `60` (`Idol_immer._Report_23_CPCB.pdf`)
3. **Row `bpl-000511`**: 2023, Durga, `during` phase, value `0.0 mg/l`, PDF page `60` (`Idol_immer._Report_23_CPCB.pdf`)
4. **Row `bpl-001096`**: 2025, Ganesh, `during` phase, value `0.0 mg/l`, PDF page `28` (`Ganesh_and_Durga_visarjan_report-2025.pdf`)

---

## 5. CPCB Class B Criteria Normalization

CPCB Water Quality Criteria for **Class B (Outdoor Bathing - Organised)** are loaded from `cpcb_water_quality_criteria.csv` and normalized as follows:

1. **Parameter Name Normalization:**
   - Raw parameter `BOD (5 days 20C)` is normalized to `BOD` to match the parameter name used across all immersion data tables.
2. **Missing Boundary Handling:**
   - Single-sided limits use `null` for the unconstrained bound:
     - `Dissolved oxygen`: `type: 'min'`, `min: 5.0`, `max: null`, `unit: 'mg/l'`
     - `BOD`: `type: 'max'`, `min: null`, `max: 3.0`, `unit: 'mg/l'`
     - `Total coliform`: `type: 'max'`, `min: null`, `max: 500.0`, `unit: 'MPN/100 ml'`
     - `pH`: `type: 'range'`, `min: 6.5`, `max: 8.5`, `unit: ''`
3. **Coliform Criterion Visibility & Limitation:**
   - The `Total coliform` criterion (500 MPN/100 ml) is retained in `TrackData.criteria`.
   - However, **none of the MPPCB immersion reports tested for Total Coliform or Fecal Coliform**.
   - As mandated by the contract, meeting Class B DO/BOD/pH benchmarks does **not** constitute proof of Class B bathing water safety due to absent microbiological data.

---

## 6. Report Linking & Local Asset Resolution

Readings link to bundled local reports in `public/assets/track-2/resources/` via `SourceRef`:

| Immersion Year | Document ID | Bundled PDF Filename |
|---|---|---|
| 2023 | `immersion-2023` | `Idol_immer._Report_23_CPCB.pdf` |
| 2024 | `immersion-2024` | `Ganesh_and_Durga_visarjan_report-2024.pdf` |
| 2025 | `immersion-2025` | `Ganesh_and_Durga_visarjan_report-2025.pdf` |

- Link URLs are constructed via `reportUrl(file)` respecting Vite's base path (`ASSET_BASE`).
- PDF pages are extracted directly from `source_page` as positive integers and validated.
- `siteAsPrinted` and `parameterAsPrinted` preserve exact original report strings (e.g. `Sant Hirdaram Visarjankund, Bairagarh, Bhopal`, `D.Oxygen`).

---

## 7. Known Data Caveats & Structural Limitations

1. **Assumed Units:** Original MPPCB tables print values without units. Standard units (`mg/l`, `µS/cm`, `NTU`) are assigned per the problem statement data dictionary; every reading is flagged with `unitsAssumed: true`.
2. **Missing Durga 2025 Tables:** Neither Bairagarh kund nor Malikhedi kund has an idol immersion water quality table in the 2025 report. These missing tables are structural gaps in the official publication.
3. **Site Mapping Ambiguity (`kamla-park`):** In 2023-2025 reports, Ganesh immersion tables describe the site as "Kamla Park kund", while Durga immersion tables describe it as "Lower Lake ghat". They may represent two separate immersion spots along the same waterfront.
4. **Historical vs. Current Conditions:** All data represents 2023–2025 monitoring and does not reflect current water conditions in 2026.
5. **No Full Class B Assessment:** Immersion reports omit microbiological tests (Total and Fecal Coliform); comparison against Class B is strictly limited to physicochemical parameters (DO, BOD, pH).

---

## 8. Verification and Test Suite

The test suite in `src/data/loadTrackData.test.ts` executes 15 distinct unit and integration checks verifying:
- Complete ingestion of 1,524 rows with all 7 sites
- Year row counts: 453 (2025), 546 (2024), 525 (2023)
- DO counts: 116 numeric, 42 below 5, exactly 4 zeros
- BOD counts: 112 numeric, 100 above 3
- Quoted CSV fields with internal commas
- Censored BDL and ND normalization to null
- Missing flags (`*`, `**`, `not sampled`, `_`, `-`) normalization to null
- Preservation of numeric zero as 0
- Robust handling of corrupt numeric inputs and unknown sites with explicit warnings

### Running the Checks

```sh
# Run data and project unit tests
npm test

# Run full project checks (TypeScript typecheck + production build + tests)
npm run check
```
