# Designer — Test Design Agent Knowledge

> Training file for Designer (Senior Test Design Techniques Specialist).
> Edit this file to customize Designer's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Technique Selection Rules (CRITICAL)
- **Never pick a technique without citing the feature trait that justifies it** — use the Technique Selection Matrix below and record the evidence source (requirement ID, scenario ID, or code reference) next to every selection
- **Apply the technique's mechanical procedure, never eyeball cases and label them afterward** — a case set not derived by procedure can't be verified for completeness
- **Layer BVA on top of EP, never instead of it** — EP proves the classes behave correctly; BVA proves the class edges are drawn in the right place
- **Report black-box and white-box coverage separately** — never merge statement/branch percentages into scenario/requirement coverage numbers

### Coverage Optimization Rules
- **A gap without a listed missing item is not a finding** — name the specific partition, boundary point, rule, transition, or pair missing
- **Redundant cases get a keep/drop recommendation**, not just a note — always name which case to keep (usually the one with clearest traceability)
- **Do not write full step-by-step test cases** — deliverable is technique + minimal case description + coverage item proved; step expansion is test-case-agent's job

## Learnings

<!-- Add learnings from past test design sessions -->

## Equivalence Partitioning (EP)

**Derivation:** Partition the input domain into classes where the system should behave identically for every value in the class. One case per VALID class (combine valid classes where meaningful); one SEPARATE case per INVALID class — never combine invalid classes, a failure in one masks the others.

**Worked example:** Age field, valid 18-65. Classes: EC1 <18 (invalid), EC2 18-65 (valid), EC3 >65 (invalid), EC4 non-numeric (invalid). Cases: 30 (EC2), 10 (EC1), 90 (EC3), "abc" (EC4) — four cases, three of them separate invalid classes.

**Common mistakes:** combining invalid classes into one test (masks failures); forgetting the non-numeric/format invalid class; not re-deriving partitions when a requirement's valid range changes.

## Boundary Value Analysis (BVA)

**Derivation:** For every ordered input (numeric range, length, date, count), test the boundary and its neighbor on each side: min-1, min, min+1, max-1, max, max+1 (or the 4-value variant min, min+1, max-1, max when out-of-range is already an EP case).

**Worked example:** Password length 8-20 -> boundary points 7, 8, 9, 19, 20, 21.

**Common mistakes:** testing only the exact boundary without its neighbor (misses off-by-one defects); forgetting non-numeric boundaries (month-end, leap-year Feb 29, empty-string as length-0); applying BVA to unordered/categorical fields.

## Decision Table Testing (DT)

**Derivation:** List every condition (row) driving an outcome, enumerate all combinations as columns (rules), assign the resulting action, then COLLAPSE rules that share an identical action where one condition is a "don't care" into one rule.

**Worked example:** Discount = f(User Type[Regular/Premium], Cart Value[<$100/>=$100], Coupon[Yes/No]) -> 2x2x2 = 8 raw rules, collapsing don't-care conditions to ~5-6 effective rules covering every distinct outcome.

**Common mistakes:** missing a condition combination (drops a business rule silently); collapsing rules that coincidentally share test data instead of the same outcome; forgetting the default/else rule.

## State Transition Testing (ST)

**Derivation:** Model the entity as states + valid transitions. Derive one case per valid transition (0-switch coverage), one case per attempted INVALID transition (must be rejected), and coverage of any state with no valid exit. Add n-switch (multi-step sequence) coverage for higher-risk entities.

**Worked example:** Order: New->Paid->Shipped->Delivered, New->Cancelled, Paid->Cancelled. Valid-transition cases: 5. Invalid-attempt cases: Delivered->Paid, Shipped->Cancelled (if disallowed) = 2. Total 7 cases for 0-switch + invalid coverage.

**Common mistakes:** testing only the happy-path chain and skipping invalid branches; not verifying a rejected transition leaves the entity in its ORIGINAL state; missing n-switch coverage where a multi-step sequence, not a single transition, is the risk.

## Pairwise / All-Pairs Testing (PW)

**Derivation:** For 3+ independently combinable parameters, the full cross-product explodes. Generate a reduced set (tool-generated: PICT, allpairspy, or equivalent) where every PAIR of values appears together at least once; seed business-critical "must-test" combinations explicitly before letting the tool fill the rest.

**Worked example:** Browser{Chrome,Firefox,Safari} x OS{Win,Mac,Linux} x Role{Admin,User} -> exhaustive 18 combinations, pairwise reduces to ~9 while covering every Browser-OS, Browser-Role, and OS-Role pair.

**Common mistakes:** hand-rolling pairwise for 4+ parameters (error-prone); treating pairwise as sufficient when a known 3-way interaction defect exists; not seeding required combinations before generating the reduced set.

## Error Guessing (EG)

**Derivation:** Unstructured, experience-based, layered ON TOP of the formal techniques, never a replacement. Checklist to apply to every relevant field: null, empty string, whitespace-only, leading/trailing whitespace, leading zeros, max-length+1, unexpected negatives, integer overflow, rapid double-submit, concurrent edits, timezone/DST edges, Unicode/emoji, SQL/HTML/script meta-characters. Pull additional entries from `outputs/bug-report-agent/` when available.

**Common mistakes:** stopping after the "obvious" nulls/empties; treating EG as a substitute for EP/BVA/DT instead of a supplement; not recording WHY each guess was chosen (undefendable in a coverage review, impossible to dedupe).

## White-Box Coverage (Statement / Branch / Path)

**Statement coverage** = executed statements / total executable statements. Weakest criterion — 100% can still miss an unexercised FALSE branch of a decision.

**Branch (Decision) coverage** = executed branch outcomes / total branch outcomes — covers statement coverage AND every true/false outcome of every decision. Preferred minimum for critical modules.

**Condition coverage** — each boolean sub-condition in a compound decision (`if (a && b)`) evaluated both True and False at least once; supplements branch coverage on complex booleans, especially with short-circuit evaluation.

**Path coverage** = distinct feasible paths exercised / total feasible paths. Grows as 2^n for n independent decisions — scope to high-risk logic only; use McCabe cyclomatic complexity (edges - nodes + 2) to bound the minimum independent paths for basis path testing rather than full enumeration.

**Typical targets:** Statement >=80% overall; Branch >=70-80% on critical modules (auth, payment, permission checks); Path testing reserved for small, high-risk functions.

**Common mistakes:** reporting statement coverage as if it were branch coverage; not accounting for short-circuit operators when counting branch outcomes; chasing path coverage on a large function instead of reducing its complexity first.

## Technique Selection Matrix (Feature Trait -> Technique)

| Feature Trait | Recommended Technique | Why |
|----------------|------------------------|-----|
| Single input field, valid/invalid classes | EP | Classes partition behavior; one case per class suffices |
| Numeric/length/date range | BVA (+EP) | Defects cluster at boundaries, not class interiors |
| Multiple conditions drive one outcome | Decision Table | Enumerates rule combinations, catches missed interactions |
| Entity with defined states/workflow | State Transition | Catches invalid transitions a state machine allows by omission |
| 3+ independently combinable parameters | Pairwise | Avoids combinatorial explosion, catches most interaction defects |
| End-to-end user journey across features | Use Case | Validates the flow as experienced, not just individual units |
| Known bug-prone area / historical defects | Error Guessing | Targets patterns formal techniques structurally miss |
| Structured-format input (email, phone, JSON) | Syntax Testing | Validates grammar/format rules directly against the spec |
| Critical calculation/decision logic in code | White-Box (Branch/Path) | Ensures code paths, not just requirements, are exercised |

## Coverage Criteria Reference

| Criterion | Definition | Typical Target |
|-----------|------------|-----------------|
| Statement coverage | executed statements / total executable statements | >=80% overall |
| Branch/Decision coverage | executed branch outcomes / total branch outcomes | >=70-80% on critical modules |
| Condition coverage | each boolean sub-condition True/False at least once | supplement on complex compound decisions |
| Path coverage | distinct feasible paths exercised / total feasible paths | high-risk functions only, bounded by complexity |
| Requirement/scenario coverage (black-box) | scenarios with >=1 passing case / total scenarios | 100% for Critical/High risk scenarios |
