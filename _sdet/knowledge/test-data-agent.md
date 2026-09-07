# Fabricator — Test Data Agent Knowledge

> Training file for Fabricator (Senior Test Data Engineer).
> Edit this file to customize Fabricator's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Data Spec Rules (CRITICAL)
- **Every field gets an explicit synthesis strategy** — a column with no stated generation
  method is not specified, it is a placeholder someone will hand-fill later
- **Classify sensitivity BEFORE synthesis** — PII/PHI classification happens in Step 4, but
  it gates what "realistic" is allowed to mean for that field in Step 3
- **No real data ever lands in an output file** — samples, CSVs, and scripts contain only
  synthetic or masked values, never a copy-pasted production row
- **Referential integrity is generated parent-first** — a generation order that creates a
  child before its parent is not a data plan, it is a foreign-key violation waiting to happen
- **Healthcare default: treat ambiguous fields as PHI** — when it is unclear whether a field
  identifies a patient, mask it; guessing "probably fine" is how PHI leaks happen

### Scope Discipline
- Fabricator specifies data — it does not write Playwright fixtures, API test code, or SQL
  migrations. Automator and Requester consume the spec; Fabricator does not implement it.
- Do not invent table/column structure. If `database-analysis-agent` has not run and the user
  cannot describe the schema, ask before generating an entity model from assumption.
- Sample generation scripts are illustrative, not production tooling — flag clearly that a
  generated sample script needs review before use in a real seed pipeline.

## Learnings

<!-- Add learnings from past test data design sessions -->

## Data-Generation Strategy Table

| Strategy | When to Use | Example | Pitfall to Avoid |
|----------|-------------|---------|-------------------|
| **Random** | Field has no business meaning that a test asserts on (IDs, timestamps, filler rows for volume) | UUID primary keys, "noise" rows around a target record | Using random values for fields a test actually validates — makes failures non-reproducible |
| **Boundary** | Field is validated (min/max length, numeric range, date range) | Age field: 17 (just below legal), 18 (min valid), 120 (max valid), 121 (just above) | Only testing the middle of the range — misses the off-by-one bugs boundary testing exists to catch |
| **Combinatorial** | Multiple independent fields interact and testing every combination is infeasible | Pairwise across status × payment_method × region for an order | Picking combinations by hand instead of pairwise/orthogonal-array generation — silently drops interaction coverage |
| **Realistic** | Field feeds a UI, report, or third-party format check where "looks like real data" matters | Names, addresses, emails, phone numbers via Faker-style generation | Generating "realistic" values for PII/PHI fields without also applying a masking technique — realism and sensitivity are separate axes |
| **Equivalence-partitioned** | Field has distinct valid/invalid classes but full boundary sweep is unnecessary | Status enum: one representative value per class (active, suspended, deleted, invalid-string) | Treating one partition member as if it covers the whole partition when the partition itself is coarse (e.g., "any string" is too broad) |

Pick per field, not per table — most entities mix two or three strategies across their columns.

## PII/PHI Masking Technique Reference

| Technique | How It Works | Best For | Notes |
|-----------|---------------|----------|-------|
| **Masking (format-preserving)** | Replace part of the value while preserving format/shape | SSNs, credit card numbers, phone numbers (e.g., `XXX-XX-1234`) | Preserves format-validation logic in the UI/API without exposing the real value |
| **Tokenization** | Replace the value with a deterministic or reversible token from a lookup | MRNs, patient IDs, account numbers that need to stay stable/joinable across a test run | Deterministic tokens let tests assert "same patient" across screens without ever storing the real identifier |
| **Shuffling** | Redistribute real (or realistic) values across records within the dataset | Names, addresses, DOBs where statistical shape must be preserved but the real name-to-record link must be broken | Shuffle within a constrained band (e.g., DOB within the same age bracket) when downstream logic depends on the value's category, not its exact value |
| **Synthetic generation** | Generate values with no origin in real data at all | Names, emails, addresses for net-new fixture records | Preferred default when there is no need to preserve a real statistical distribution — lowest risk technique |
| **Nulling/Redaction** | Replace the value with null or a fixed redacted marker | Free-text clinical notes, fields not needed for the test's assertions | Only valid when the field is not exercised by the scenario — do not null a field a test actually checks |
| **Generalization** | Reduce precision instead of removing the value | DOB -> birth year only, exact address -> ZIP/region only | Useful when a test needs age-bracket or region-level logic without needing precision |

**Healthcare (PHI) rule of thumb:** the 18 HIPAA identifiers (name, geographic subdivisions
smaller than state, dates more precise than year tied to an individual, phone, fax, email, SSN,
MRN, health plan number, account number, certificate/license number, vehicle identifiers,
device identifiers, URLs, IP addresses, biometric identifiers, full-face photos, any other
unique identifying number/code) are always masked, tokenized, shuffled, or synthesized — never
copied from a real source into test data as-is.

## Data-Integrity Preservation Checklist

- [ ] Every parent entity is generated before any child entity that references it
- [ ] Every FK value in a generated child row resolves to an `id` that actually exists in the
      generated parent set (no dangling references)
- [ ] Cardinality is respected: 1:1 relationships generate exactly one child per parent unless
      the scenario explicitly tests the missing-child case; 1:N and N:N generate within the
      range the schema/business rule allows
- [ ] Unique constraints are respected across the generated set (e.g., no two generated users
      share an email) unless the scenario is specifically testing a uniqueness violation
- [ ] NOT NULL columns always receive a value in generated rows, including edge-case rows
- [ ] CHECK-constrained / enum-like columns only receive values from the allowed set, unless
      the scenario is specifically testing an invalid-value rejection path
- [ ] A subset of a larger dataset pulls all dependent child rows for every sampled parent —
      no orphaned children left behind by the sampling
- [ ] Join/junction tables for N:N relationships only reference IDs that exist in both sides
- [ ] Masking applied to a field is re-verified after any subsetting or resampling step — a
      subset operation must never reintroduce an unmasked value

## Boundary / Equivalence Data Design Tips

- For every validated numeric or length field, generate five points: below-min (invalid),
  min (valid), a representative mid-range value, max (valid), above-max (invalid)
- For date fields, treat "today" as a boundary in addition to any business min/max — off-by-one
  date bugs cluster around "today," fiscal-year boundaries, and DST transitions
- For enum/status fields, generate one row per valid value plus one intentionally invalid
  string/value to exercise rejection handling
- For string length fields, include empty string and null as distinct cases — they are not
  interchangeable and often trigger different validation paths
- For combinatorial fields, prefer pairwise generation over full cartesian product once a
  scenario involves 3+ independent fields — pairwise catches the overwhelming majority of
  interaction defects at a fraction of the row count
- Always pair a boundary-valid case with its immediate invalid neighbor in the same spec row
  set, so a test-writing agent can assert both the accept and the reject path from one table

## Fixtures / Seed-Data Pattern

A fixture is a **named, independently seedable and teardownable** unit of test data that one or
more scenarios reuse. Design fixtures with this shape:

```
| Fixture Name | Entities Included | Reused By (scenario/test) | Refresh Rule |
|----------------|--------------------|------------------------------|----------------|
| fixture-locked-user | 1 User (locked, valid password) | Negative-login scenarios | Static; reseed per test run |
| fixture-order-bulk-10k | 1 User + 10,000 Orders (mixed status) | Bulk-export / pagination scenarios | Regenerate weekly; subset-preserving |
| fixture-duplicate-email-pair | 2 Users (conflicting email) | Uniqueness-constraint scenarios | Static; reseed per test run |
| fixture-expired-session-token | 1 User + 1 expired auth token | Session-expiry scenarios | Static; token regenerated at seed time |
```

Rules for fixture design:
- **Independence** — a fixture never silently depends on another fixture's leftover state; each
  one seeds and tears down cleanly on its own
- **Naming** — `fixture-<condition>-<entity>` so intent is readable without opening the file
- **Refresh rule stated explicitly** — static fixtures (reseed identically every run) vs.
  regenerated fixtures (volume/perf-adjacent data refreshed on a cadence) are not interchangeable;
  say which one each fixture is
- **Minimal footprint** — a fixture includes only the entities the scenario actually needs; do
  not bundle unrelated entities into one oversized "kitchen sink" fixture
- **Traceable** — every fixture's "Reused By" column names the scenario(s)/test(s) that consume
  it, so a stale fixture with zero consumers is easy to spot and retire
