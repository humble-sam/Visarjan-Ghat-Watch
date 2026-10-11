# Methodology: Observed Concern Ordering

Owner: Member 3 (`src/domain/`). Entry point: `analyze(data, filters): Analysis`.

This ordering is a **team heuristic** for deciding where fresh testing and
operational attention should go first before 20 October 2026. It is **not** an
official CPCB or MPPCB ranking, not a forecast, not a health assessment, and
not permission or refusal to immerse at any ghat. A site without an observed
breach is never described as "safe".

## 1. Comparison benchmark

CPCB Class B (organised outdoor bathing) is used as a labelled comparison
benchmark, loaded from `cpcb_water_quality_criteria.csv`:

| Parameter | Class B comparison | Boundary rule |
|---|---|---|
| Dissolved oxygen (DO) | >= 5 mg/l | 5 meets; 4.99 breaches |
| BOD (5 days 20C) | <= 3 mg/l | 3 meets; 3.01 breaches |
| pH | 6.5 to 8.5 | 6.5 and 8.5 meet; 6.49 and 8.51 breach |

- Only Class B rows are used. `BOD (5 days 20C)` and printed labels such as
  `D.Oxygen` are normalised to the benchmark parameters.
- **Total coliform** is part of Class B but is not measured in the supplied
  immersion readings, so **full Class B compliance cannot be assessed**.
- COD, total/dissolved/suspended solids, turbidity, conductivity, chromium,
  lead, zinc and copper have no Class B limit. Their readings carry
  `comparison = 'no_criterion'` and never influence the ordering.

## 2. Reading states

| State | Example | Comparison | Counted as |
|---|---|---|---|
| Numeric | `4.2`, including `0.0` | `meets` / `breaches` | numeric slot |
| Censored | `BDL`, `ND` | `unknown` | censored slot |
| Explicit missing | `not sampled`, `*`, `**`, `_`, `-` | `unknown` | explicit-missing slot |
| Unknown | unrecognised or invalid value | `unknown` | unknown slot |
| Absent | no source row (e.g. no Durga 2025 table) | none | absent slot |

- DO = 0 is a real numeric reading, not missing.
- BDL/ND have no reported detection limit, so they are never compared numerically
  and never count as passing.
- A reading with `status = 'numeric'` but no finite value is treated as unknown.
- Missing data never gives a better result: it is not compared, it is reported
  as incomplete evidence, and missing tie-break values sort last.

## 3. Scope and coverage

The selected filters (years x festivals x phases) define the scope. For each site,
expected benchmark slots = `years x festivals x phases x 3` (DO, BOD, pH).

Each unique `(site, year, festival, phase, parameter)` slot falls into exactly one
coverage category: numeric, censored, explicit missing, unknown, or absent. The five
categories always sum to `expectedBenchmarkSlots`. Breach fractions use unique
numeric slots, not CSV row totals.

**Duplicates:** if a slot has more than one source row, all rows are kept in
`Analysis.readings`. The first source row is used for ranking and coverage, and
the site gets a warning. Conflicting duplicate values are flagged for QA.

**Empty scope:** if no year, festival or phase is selected, there are no readings,
expected slots are 0, every site has `rank = null`, and a no-scope warning is added.

## 4. Ordering

Among sites with at least one numeric benchmark reading in scope:

1. Sites with any numeric DO = 0 come first.
2. Then sites are sorted by breach fraction, highest first:
   `breaches / numeric benchmark readings` across DO, BOD and pH.
3. Ties are broken by lowest observed DO, then highest observed BOD, then site ID.
   A site with no value for a tie-break parameter sorts after sites with one.

These sites get ranks 1, 2, 3, and so on. Sites with no numeric benchmark reading get
`rank = null` ("Insufficient evidence - testing needed") and are listed after the
numbered sites in site-ID order. All seven ghats always appear.

No high/medium/low bands are defined. The ordering only says which site showed
more observed concern than another *in the selected historical samples*.

### Caveat: unequal sampling

Fractions describe the samples that exist. A site with few numeric readings can rank
high on a small sample. For example, with the default 2025 scope, Malikhedi
breaches 2 of 3 numeric readings while 6 of its 18 slots were not sampled and 9 are
absent. Always show `breaches / numeric` next to coverage. A high rank on thin
evidence calls for fresh testing, not a firm conclusion.

## 5. Reasons and evidence

Every `SiteAnalysis.reasons[]` entry is computed from input readings and lists their
`evidenceIds` (which link to the source PDF pages):

| Code | When | `observed` / `limit` | `count` / `total` |
|---|---|---|---|
| `zero_do` | any numeric DO = 0 | 0 / DO minimum | zero readings / numeric DO |
| `do_breach` | DO < 5 | lowest DO / 5 | breaches / numeric DO |
| `bod_breach` | BOD > 3 | highest BOD / 3 | breaches / numeric BOD |
| `ph_breach` | pH outside 6.5-8.5 | most extreme pH / bound it crossed | breaches / numeric pH |
| `incomplete_evidence` | numeric slots < expected | - | numeric / expected slots |
| `site_ambiguity` | site match confidence is medium | - | - |
| `no_observed_breach` | numeric readings exist, none breach | - | 0 / numeric |

`incomplete_evidence` lists the censored, missing and unknown rows it found.
Wholly absent slots have no row to cite, so they appear in coverage and in the site
warning instead (e.g. "No benchmark readings ... for Durga 2025. Evidence is
incomplete, not clean."). The Rani Kamlapati / Kamla Park site keeps its
medium-confidence warning: the source tables may describe two locations.

## 6. Phase and year comparisons

`src/domain/comparisons.ts` groups readings for detail views without
recalculating anything:

- `phaseSeries(analysis, siteId, 'DO' | 'BOD' | 'pH')`: one before/during/after
  series per selected year and festival. Censored, missing and absent points are
  gaps (`value = null`). Values are never averaged or interpolated.
- `yearComparisons(analysis, siteId, parameter)`: compares years only for a
  matching festival and phase. It needs two or more selected years and returns only
  slots where at least two years have numeric values.

## 7. Verification

`npm test` runs `src/domain/analyze.test.ts` and `src/domain/realData.test.ts`:

- Boundary values (5, 3, 6.5, 8.5) meet; just past them breaches.
- Censored, missing, unknown and absent slots stay distinct and never pass.
- Ordering rules, missing tie-break values sorted last, input-order independence,
  and an empty scope.
- Every reason's evidence IDs exist in the filtered readings.
- On the original CSV (via a test-only adapter): 1,524 rows and seven sites;
  116 numeric DO readings with 42 below 5; 112 numeric BOD readings with 100
  above 3; four DO = 0 readings; coverage sums; the 2025 Durga gaps at Bairagarh
  and Malikhedi.

## 8. Recommendations (for the brief)

The analysis supports operational suggestions for an officer to review:
obtain fresh DO/BOD/pH and other appropriate testing, review aeration where DO was low,
review cleanup where BOD was high, and verify site identity where it is ambiguous. It
does not route immersions to a ghat based on historical readings and makes no disease
or health claims.
