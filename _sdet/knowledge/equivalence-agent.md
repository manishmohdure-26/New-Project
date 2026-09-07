# Partitioner — Equivalence Partitioning Agent Knowledge

> Training file for Partitioner (Senior Equivalence Partitioning Specialist).
> Edit this file to customize Partitioner's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Class Identification Rules (CRITICAL)
- **Class tables come before any case is written** — cases are derived FROM the
  table, never the other way around
- **A class is a set of values the system treats identically** — if two values in a
  proposed class could plausibly diverge in observable behavior, it is two classes
- **Valid and invalid classes are both mandatory** — a table with only valid rows is
  incomplete; every business rule implies at least one invalid class
- **One representative per class** — a second value from an already-covered class
  adds zero new coverage
- **Never invent a domain boundary** — an unstated min/max/format/enum is an open
  question to ask the user, not a value to assume

### Weak vs Strong Selection Rule
- Default to **weak ECT** unless a scenario or requirement states/implies inputs
  interact; escalate to **strong ECT** when a business rule references two or more
  inputs together (e.g., "applies when tier=Gold AND order>$500") or the feature is
  marked high-risk in `outputs/test-scenario-agent/`
- State the choice and the reason in the output document — never leave it implicit

## Learnings

<!-- Add learnings from past equivalence partitioning sessions -->

## What Is Equivalence Class Partitioning (ECP)

ECP is a black-box test design technique that divides an input domain into
**equivalence classes** — subsets of input values for which the system is expected
to behave the same way. One representative value is chosen per class, on the
assumption that if the representative passes/fails, every other value in that class
would too — turning an infinite/impractical input space into a small, finite test
set without meaningfully reducing defect-detection power, as long as classes are
drawn correctly.

**Two class categories, always both required:** **Valid** — inputs the system
should ACCEPT and process normally. **Invalid** — inputs the system should REJECT,
with a specific, distinguishable reason (out of range, wrong type, wrong format,
empty).

## How to Identify Classes

For each input, ask three questions in order: (1) **What is the declared domain?**
Type (numeric, string, date, enum), range (min/max), format (regex/pattern), and any
business rule constraint. (2) **Where does behavior change?** Every point where the
system's response changes (accept → reject, one calculation path → another) marks a
class boundary. (3) **What are all the distinct ways this input can be invalid?**
Each distinct invalid *reason* is its own class — a single invalid case can only
prove one failure reason, so "too low" and "wrong type" must stay separate classes.

**Splitting rule:** if documented behavior differs across sub-ranges of what looks
like one valid range (e.g., a tiered shipping-cost rule), split into one valid class
per behavior tier. **Merging rule:** if two proposed classes always produce
identical observable behavior, merge them — extra classes add cases, not coverage.

## Weak vs Strong Equivalence Class Testing

Both combine per-input classes into multi-input cases; they differ in how many
combinations they generate and what assumption they rely on.

### Weak ECT (Single-Fault Assumption)
Assumes a defect is caused by a SINGLE input being in a faulty class at a time —
borrowed from hardware fault analysis, reasonable when each input validates
independently and no requirement couples two inputs. **Construction:** pair one
class from each input, cycling so every class from every input appears in at least
one case; case count = MAX class count across inputs (valid cases) + one case per
invalid class tested individually against otherwise-valid values. **Unsafe when** a
requirement says "when X AND Y", "only if both", "combined total of", or implies any
interaction effect — that's invisible to weak ECT and is exactly what strong ECT is for.

### Strong ECT (Multiple-Fault / Combinatorial)
No single-fault assumption — tests the full Cartesian product of valid classes
across all inputs (every valid class of Input A paired with every valid class of
Input B). **Construction:** valid-class matrix size = product of valid class counts
per input. Invalid classes are still tested one at a time against otherwise-valid
values for every other input — NEVER combined with each other, since a case with
two invalid inputs can't tell you which one caused the rejection (true for either
technique). **Use when** inputs interact per a business rule, or the feature is
high-risk enough to justify the extra case volume.

**Rule of thumb:** weak ECT minimizes cases under an assumption that must be
justified; strong ECT maximizes valid-class interaction coverage at higher case
cost. Always state which one was used and why — an unstated choice is not
defensible during a coverage review.

## Representative Selection Rule

| Class Type | Selection Rule | Example |
|---|---|---|
| Valid, numeric range | Mid-point of the range | Age 18-65 → 40 |
| Invalid, below range | min - 1 (also a BVA point) | Age < 18 → 17 |
| Invalid, above range | max + 1 | Age > 65 → 66 |
| Valid, enumerated set | Typical member, or one per behavior-distinct member | Tier ∈ {Bronze, Silver, Gold} → 3 classes if each changes behavior |
| Invalid, wrong type | One value per distinct violation reason | "abc", blank, "-5.5" → separate classes if handled differently |
| Invalid, format violation | One malformed example per distinct pattern break | Email missing "@" vs missing domain → 2 classes if validated separately |

Document the rule used in the table so another engineer can reproduce it.

## Combining EP with Boundary Value Analysis (BVA)

EP and BVA are complementary, not redundant. EP asks "does this class of values
behave as expected, broadly?"; BVA asks "does the system fail exactly AT the edge
between two classes?" Defects cluster at boundaries far more often than mid-class,
so EP alone under-tests. Rule: (1) every range-boundary invalid-class representative
from Step 3 (min-1, max+1) IS already a BVA-style boundary point — cross-reference it
as shared coverage instead of a redundant case; (2) confirm the four canonical BVA
points exist somewhere in the combined case set — `min`, `min-1`, `max`, `max+1`
(see `test-scenario-agent` knowledge for the project's chosen convention); (3) if a
boundary point is missing, flag it for BVA follow-up rather than silently expanding
EP's own case set — EP's job is class coverage, not boundary precision.

## Worked Example

**Requirement:** "The discount-code field accepts a 6-character alphanumeric code.
Codes starting with 'VIP' apply a 20% discount to orders over $100; all other valid
codes apply a flat $10 discount regardless of order total." `code` and `order_total`
interact (the VIP rule is conditioned on both) → strong ECT, not weak.

**Step 2-3, class tables** — `code`: C1 Valid/VIP-prefixed (`VIP4X9`) · C2
Valid/non-VIP (`A1B2C3`) · C3 Invalid/too short (`A1B2C`, length-1) · C4
Invalid/too long (`A1B2C3D`, length+1) · C5 Invalid/non-alphanumeric (`A1B2C!`,
format violation). `order_total`: V1 Valid/at-or-above threshold (`$150`, > $100) ·
V2 Valid/below threshold (`$50`, <= $100) · V3 Invalid/negative (`-$1`).

**Step 4:** Strong ECT for `code` x `order_total` valid classes (VIP prefix AND
order threshold together change the outcome). Invalid classes (C3-C5, V3) tested
individually against an otherwise-valid partner — never combined with each other.

**Step 5: Derived minimal case set**

| Case ID | Code (Class) | Order Total (Class) | Expected Result |
|---|---|---|---|
| EP-01 | VIP4X9 (C1) | $150 (V1) | 20% VIP discount applied |
| EP-02 | VIP4X9 (C1) | $50 (V2) | Flat $10 discount (VIP threshold not met) |
| EP-03 | A1B2C3 (C2) | $150 (V1) | Flat $10 discount (non-VIP code) |
| EP-04 | A1B2C3 (C2) | $50 (V2) | Flat $10 discount |
| EP-05 | A1B2C (C3) | $50 (V2) | Rejected: code too short |
| EP-06 | A1B2C3D (C4) | $50 (V2) | Rejected: code too long |
| EP-07 | A1B2C! (C5) | $50 (V2) | Rejected: invalid characters |
| EP-08 | A1B2C3 (C2) | -$1 (V3) | Rejected: negative order total |

Eight cases cover all 5 code classes and all 3 order-total classes, valid classes
fully cross-combined (strong ECT), every invalid class tested once against a valid
partner. `$100.00`/`$100.01` (the VIP threshold boundary) are flagged for BVA
follow-up, since EP confirms class-level behavior but not exact boundary precision.
