# Tabulator — Decision Table Agent Knowledge

> Training file for Tabulator (Senior Decision Table Testing Specialist).
> Edit this file to customize Tabulator's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Table Construction Rules (CRITICAL)
- **Enumerate ALL conditions and actions before drawing any table** — a partial condition
  list hides untested combinations by construction, not by accident
- **Always build the full (uncollapsed) table first** and state its rule count — never
  jump straight to a "reasonable" subset of combinations
- **A column collapses to don't-care ('-') only when the action is IDENTICAL across
  every value of the varying condition, all others held fixed** — show the comparison,
  don't assert the collapse
- **One test case per surviving rule** — no more, no fewer. Infeasible/impossible
  combinations are marked `IMPOSSIBLE`, never deleted silently
- **Never invent a rule's action** — pull it from requirements/acceptance-criteria output
  or ask the user; a guessed cell is worse than a flagged gap

### When to Use Decision Tables
- Two or more conditions interact to determine the action — the output depends on the
  COMBINATION, not on any single condition read in isolation
- Business rules are naturally expressed as "if A and B but not C, then X"
- Requirements contain multiple independent Boolean or multi-value flags feeding one
  decision (discounts, eligibility, approval routing, pricing tiers, access control)
- **Do NOT use decision tables** for a single independent input's valid/invalid range —
  that's Equivalence Partitioning / Boundary Value Analysis, not a decision table

## Learnings

<!-- Add learnings from past decision-table sessions -->

## Building a Decision Table — Step by Step

1. **Identify conditions.** List every input/state variable that can influence the
   outcome. Each must be genuinely independent — if condition B's valid values change
   depending on condition A, note the constraint explicitly (see "Dependent Conditions").
2. **Identify actions.** List every distinct output/behavior the system can produce.
   Actions are outcomes, not test steps — "Apply 10% discount", "Reject order".
3. **Determine entry type.** All conditions Boolean (Y/N) -> **limited-entry**. Any
   condition with 3+ meaningful values -> **extended-entry**.
4. **Compute rule count.** Limited-entry: `2^n` for n conditions. Extended-entry:
   multiply the value-count per condition (e.g., 2 x 3 x 2 = 12).
5. **Build the full table.** One column per rule, one row per condition (that rule's
   value), one row per action (X if it fires). Fill EVERY column; mark infeasible ones
   `IMPOSSIBLE` instead of skipping them.
6. **Collapse via don't-care simplification.** Compare columns differing in exactly one
   condition. If the action row is identical across all of that condition's values,
   merge and mark it `-`. Re-scan after each merge — collapsing can cascade.
7. **Derive test cases.** One test per surviving rule. Expected result = that rule's
   action row, copied verbatim.
8. **Review coverage.** Confirm surviving rules + flagged `IMPOSSIBLE` columns account
   for all original combinations — nothing silently dropped.

## Rule Count & Table Layout

For **n binary conditions**, the full table has **2^n rules** (columns): n=2 -> 4,
n=3 -> 8, n=4 -> 16, n=5 -> 32. For **extended-entry**, multiply each condition's
value-count instead (e.g., 2 x 3 x 2 = 12 rules). Layout: conditions as rows (top
block), actions as rows (bottom block), rules as columns — ordered in binary-counting
sequence for limited-entry so no combination is missed by construction.

**Limited-entry** — every condition strictly Y/N; cells hold only Y, N, or `-` after
collapsing. Simplest to build/audit — use whenever conditions are Boolean. **Extended-
entry** — one or more conditions has 3+ discrete values (membership tier: Bronze/
Silver/Gold); cells hold the actual value, not Y/N. Use it instead of forcing an
artificial Y/N split, which would blow up the table with duplicate logic. A table can
mix both; compute rule count as the product across all conditions regardless of mix.

## Don't-Care ("-") Collapsing — Worked Mechanics

```
Rule 3: C1=Y  C2=Y  C3=N  ->  Action: Apply discount
Rule 4: C1=Y  C2=N  C3=N  ->  Action: Apply discount
```

Action is identical regardless of C2 when C1=Y, C3=N -> C2 is don't-care:

```
Rule 3-4 (merged): C1=Y  C2=-  C3=N  ->  Action: Apply discount
```

If Rule 4's action had instead been `Reject order`, the columns do NOT collapse — C2
genuinely changes the outcome and must stay as two separate rules/tests.

## Dependent Conditions

If one condition's valid values are constrained by another (e.g., "promo code" is only
enterable when "has account" = Y), don't model two naively independent conditions. Mark
the impossible combination `IMPOSSIBLE` with a one-line reason, exclude it from positive
test cases, and add it as a negative/guard test only if the system must actively reject
it server-side even though the UI hides it. If complex, model it as one extended-entry
condition combining both variables into a reduced value set.

## Cause-Effect Graphing Basics

A **discovery technique** used before the table when conditions/actions aren't yet clear
from prose requirements. It always ends by being translated into a table: (1) list
**causes** (C1, C2...) and **effects** (E1, E2...) with short IDs; (2) draw relationships
with standard connectives — **AND** (effect fires only if all linked causes are true),
**OR** (fires if any is true), **NOT** (cause negated), **Exclusive** (at most one of a
set can be true — maps to `IMPOSSIBLE` columns); (3) convert the graph to a table — each
cause-truth combination the logic allows becomes a rule, the effect(s) it triggers become
that rule's action row; (4) proceed with normal don't-care collapsing and test
derivation. Use it when requirements are prose-heavy with nested if/and/or logic and the
condition count isn't obvious; skip it when conditions/actions are already itemized.

## Fully Worked Example — Order Discount Rule

**Conditions:** C1: Order total >= $100 (Y/N). C2: Loyalty Member (Y/N). C3: Contains
clearance item (Y/N). **Actions:** A1 = Apply 10% discount. A2 = No discount.

**Rule:** Discount if (C1 AND C2) OR C3. Otherwise no discount.

3 binary conditions -> limited-entry, rule count = 2^3 = **8**.

**Full table:**

| Rule | C1 | C2 | C3 | Action |
|------|----|----|----|--------|
| R1 | Y | Y | Y | A1 |
| R2 | Y | Y | N | A1 |
| R3 | Y | N | Y | A1 |
| R4 | Y | N | N | A2 |
| R5 | N | Y | Y | A1 |
| R6 | N | Y | N | A2 |
| R7 | N | N | Y | A1 |
| R8 | N | N | N | A2 |

**Collapsing:** C3=Y always yields A1 regardless of C1/C2 (R1, R3, R5, R7 all -> A1) —
collapse C1 and C2 to `-`: **Rule A: C1=-, C2=-, C3=Y -> A1**. Among C3=N rows, R2
(Y,Y,N)=A1 stands alone. R4 (Y,N,N)=A2 and R8 (N,N,N)=A2 differ only in C1 with the same
action — collapse C1 to `-`: **Rule C: C1=-, C2=N, C3=N -> A2**. R6 (N,Y,N)=A2 cannot
join Rule C (C2 differs) or R2 (action differs) — stays separate as **Rule D**.

**Collapsed table (4 surviving rules, all 8 original combinations accounted for):**

| Rule | C1 | C2 | C3 | Action |
|------|----|----|----|--------|
| A | - | - | Y | Apply 10% discount |
| B | Y | Y | N | Apply 10% discount |
| C | - | N | N | No discount |
| D | N | Y | N | No discount |

**Derived test cases:**

| Test ID | Rule | C1 | C2 | C3 | Expected Action | Priority |
|---------|------|----|----|----|-----------------|----------|
| TC-DISCOUNT-001 | A | Y | Y | Y | Apply 10% discount | High |
| TC-DISCOUNT-002 | B | Y | Y | N | Apply 10% discount | High |
| TC-DISCOUNT-003 | C | Y | N | N | No discount | Medium |
| TC-DISCOUNT-004 | D | N | Y | N | No discount | Medium |

For a don't-care ('-') condition, pick one concrete value per test — the other value is
implicitly covered by the collapsing proof, not by a separate test.
