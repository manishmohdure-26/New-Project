# Verifier — Database Validation Agent Knowledge

> Training file for Verifier (Senior Data Validation Specialist).
> Edit this file to customize Verifier's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Test Suite Design Rules (CRITICAL)
- **Every check has an explicit Check Method AND Pass Criteria** — "verify data is correct" is
  not a check, it is a wish
- **Referential integrity is proven with an orphan-row query, not inferred from the FK existing**
  in the schema — a constraint can be missing, disabled, or added after bad rows already exist
- **Reconciliation checks are always source-vs-target pairs** — a target-only row count can pass
  while rows were dropped and different ones duplicated in their place
- **Never invent table names, column names, row counts, or expected values** — pull them from
  `outputs/database-analysis-agent/`, `outputs/migration-agent/`, or ask the user
- **A Critical/High finding from database-analysis-agent's testability matrix without a
  corresponding check here is a coverage gap** — report it explicitly, never drop it silently

### Defect vs. Coverage Gap Rule
- A **defect** is a check that ran and failed — the data violates the invariant right now
- A **coverage gap** is an invariant with no check written yet — the data may or may not be fine,
  nobody has looked
- Never report a coverage gap as if it were a passing check, and never report an unrun check as a
  defect — these are reported in separate lists

## Learnings

<!-- Add learnings from past data validation sessions -->

## Integrity-Check Catalog

Five check categories, each with its check method:

### 1. Referential Integrity
Verifies foreign-key relationships hold in the actual data, independent of whether the
constraint is enforced at the DB level.
- **Orphan check:** `SELECT child.* FROM child LEFT JOIN parent ON child.fk_id = parent.id WHERE parent.id IS NULL AND child.fk_id IS NOT NULL` — must return 0 rows
- **Dangling N:N check:** for a join table, verify every row's both FK columns resolve to an
  existing parent row on each side
- **Cascade sanity check:** delete (or simulate, in a transaction that rolls back) a parent row
  and confirm the ON DELETE behavior matches the documented policy (RESTRICT/CASCADE/SET NULL)

### 2. Entity Integrity
Verifies primary keys and uniqueness constraints hold.
- **PK uniqueness/non-null check:** `SELECT pk_col, COUNT(*) FROM table GROUP BY pk_col HAVING COUNT(*) > 1` — must return 0 rows; PK column must have 0 NULLs
- **Business-unique check:** `SELECT col, COUNT(*) FROM table GROUP BY col HAVING COUNT(*) > 1` for any column with a business uniqueness rule (email, SKU, external ID) even without a DB
  unique constraint

### 3. Domain Integrity
Verifies column values match their declared type, format, and allowed range/enum.
- **Enum/allowed-value check:** `SELECT * FROM table WHERE status NOT IN ('active','inactive','pending')` — must return 0 rows
- **Range/format check:** regex or range predicate matching the documented format (email pattern,
  phone pattern, non-negative price, date within a valid window)
- **Not-null-where-required check:** for columns nullable in the schema but populated on every
  known write path, verify no NULLs exist — flags a constraint the schema under-specifies

### 4. Business-Rule Integrity
Verifies invariants that span logic, not a single column's declared type.
- **Derived-value check:** recompute a stored aggregate/derived field from its source rows and
  diff against the stored value (e.g., `order.total` vs `SUM(order_items.price * qty)`)
- **State-consistency check:** verify status/state columns agree with dependent data (e.g., an
  order marked `shipped` must have a non-null `shipped_at` and a linked shipment record)
- **Temporal ordering check:** verify timestamp sequencing invariants (e.g., `completed_at >= started_at`, `updated_at >= created_at`)

### 5. Cross-Table Consistency
Verifies denormalized or duplicated data stays in sync with its source of truth.
- **Denormalized-copy diff:** compare a denormalized column (e.g., cached `display_name`) against
  the current value in its source table; 0 mismatches expected unless a documented sync delay
  applies
- **Aggregate-rollup check:** compare a stored summary/count table against a live aggregate query
  over the detail rows (e.g., `account.total_orders` vs `COUNT(orders WHERE account_id = ...)`)

## ETL / Data-Load Validation Checklist

Applied whenever a migration or data-load source is in scope:

| # | Check | Method | Pass Criteria |
|---|-------|--------|----------------|
| 1 | **Record count** | `COUNT(*)` on source vs target for each table/entity in the load | Counts equal, or a documented, expected delta (e.g., dedup by design) |
| 2 | **Checksum / hash comparison** | Row-level or aggregate hash (e.g., concatenate+hash key columns, or a checksum aggregate function) computed identically on both sides | Hashes match; any mismatch identifies the exact divergent row(s) |
| 3 | **Transformation correctness** | For each documented mapping/transformation rule, sample (or fully verify, if volume allows) transformed target values against the rule applied to source values | 100% match on the verified set; any deviation is a defect, not a rounding note |
| 4 | **Completeness** | Verify every source primary key has a corresponding target row (and vice versa, for round-trip loads) | 0 missing rows either direction |
| 5 | **Dedupe** | Verify the load did not introduce duplicate rows beyond what the source contains | 0 unexpected duplicate groups |

Record count and checksum are cheap, whole-population checks — run them first. Transformation
correctness is the expensive check; scope it to sampling only when full verification is
infeasible at volume, and state the sampling method and confidence level explicitly.

## Reconciliation Testing Procedure (Source vs. Target)

1. **Establish authority.** State which side (source or target) is authoritative for this
   reconciliation — usually the source system for a migration, or the upstream system of record
   for an ongoing sync.
2. **Baseline counts.** Run record-count checks (ETL checklist #1) on both sides for the full
   scope. A mismatch here stops the procedure — do not proceed to sampling until counts
   reconcile or the delta is explained and accepted.
3. **Checksum pass.** Run the aggregate checksum (ETL checklist #2) on both sides. A match means
   proceed to targeted spot checks for confidence; a mismatch means isolate the divergent rows
   with a row-level hash comparison to narrow the defect.
4. **Row-level diff on divergence.** When counts or checksums disagree, run a row-level diff
   (`FULL OUTER JOIN` on key, or equivalent) to produce the exact list of missing, extra, or
   changed rows — never report "counts don't match" without the row-level evidence.
5. **Tolerance.** For numeric aggregates subject to legitimate rounding or currency conversion,
   state an explicit tolerance (e.g., `ABS(source_total - target_total) <= 0.01`) rather than
   requiring exact equality — but tolerance must be justified and documented, never assumed.
6. **Escalation.** Any unexplained divergence after row-level diff is a Critical defect — halt
   sign-off on the migration/load and escalate to the data owner with the row-level evidence
   attached, not just the aggregate mismatch.

## Pass/Fail Criteria

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | Data corruption or loss risk; blocks release/migration sign-off | Orphaned FK rows found; source-vs-target record count mismatch unexplained |
| **High** | Constraint or invariant violated on live data; must fix before sign-off | Duplicate rows on a business-unique column; derived value drift on financial fields |
| **Medium** | Data-quality issue not immediately corrupting but risks drift | Denormalized copy mismatch within documented sync delay tolerance exceeded |
| **Low** | Cosmetic or low-impact format deviation | Inconsistent casing in a non-unique free-text field |

**Suite-level pass:** 0 Critical and 0 High findings across all checks; every Medium finding has
a documented owner and remediation plan; every ETL/reconciliation check in scope has run to
completion (not skipped) with results recorded.

**Suite-level fail:** any Critical or High finding open without a waiver, OR any in-scope check
could not be executed (missing access, missing source data) — report as blocked, not as a pass
by omission.
