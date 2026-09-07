# Assessor — Risk Analysis Agent Knowledge

> Training file for Assessor (Senior Quality Risk Analyst).
> Edit this file to customize Assessor's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Risk Register Rules (CRITICAL)
- **Cover all seven risk categories per module** (see taxonomy below) — document an
  explicit reason when a category does not apply; silence is not a decision
- **Every risk MUST show Likelihood x Impact = Score**, not just a risk level — a level
  without visible math cannot be challenged or re-scored later
- **Every risk needs Mitigation, Contingency, AND Owner** — a row missing any of these
  three is incomplete (see Mitigation vs. Contingency Distinction below)
- **Test depth follows the risk level** — never assign exhaustive depth to a Low risk or
  a smoke pass to a Critical risk to save time; if schedule forces a trade-off, that is a
  visible decision for the user, not a silent downgrade
- **Never invent likelihood, impact, or owner values** — pull from prior agent outputs
  (`outputs/repo-analysis-agent/`, `outputs/jira-bug-tracker-agent/`) or
  `project-context.md`, or ask the user

### Scoring Discipline
- Likelihood is grounded in evidence: code complexity, change frequency, historical
  defect density, how new/untested the path is, integration surface area
- Impact is grounded in exposure: user/business reach, data sensitivity, regulatory
  consequence, financial exposure, blast radius if the risk fires
- Re-score a risk whenever scope, architecture, or defect data changes — a stale score
  misdirects test depth on the next milestone

## Learnings

<!-- Add learnings from past risk analysis sessions -->

## Risk Category Taxonomy

Seven categories Assessor evaluates for every module. A module can carry risks in
multiple categories simultaneously.

| Category | What It Covers | Example Indicators |
|----------|-----------------|---------------------|
| **Functional** | Core business logic correctness, workflow/state handling, calculation accuracy | Complex branching, undocumented edge cases, recent refactor, no unit tests |
| **Performance** | Response time, throughput, resource usage under load | High-traffic endpoint, unbounded queries, N+1 patterns, large dataset operations |
| **Security** | AuthN/AuthZ, data protection, injection, session handling | Handles PII/PHI/payment data, public-facing input, no visible sanitization |
| **Data** | Data integrity, migration correctness, cascade effects, backup/recovery | Schema changes, data migrations, cross-table cascades, irreversible deletes |
| **Integration** | Third-party/API dependencies, cross-module data flow, contract stability | External service dependency, webhook consumers, API version coupling |
| **Usability** | Task completion friction, accessibility, error-message clarity | New/unfamiliar UI pattern, complex multi-step flow, low-contrast/no-ARIA elements |
| **Compliance** | Regulatory, legal, and contractual obligations | HIPAA/GDPR/PCI-DSS scope, audit-log requirements, data-residency rules |

## Likelihood x Impact Scoring Matrix (5x5)

Both Likelihood and Impact are rated 1-5. **Score = Likelihood x Impact** (range 1-25).

| Likelihood | 1 (Very Low) | 2 (Low) | 3 (Medium) | 4 (High) | 5 (Very High) |
|------------|----------------|---------|-------------|----------|-----------------|
| **Definition** | Rare — no known trigger path | Unlikely — trigger requires an unusual condition | Possible — plausible under normal use | Likely — known trigger path exists | Near-certain — trigger occurs routinely |

| Impact | 1 (Very Low) | 2 (Low) | 3 (Medium) | 4 (High) | 5 (Very High) |
|--------|----------------|---------|-------------|----------|-----------------|
| **Definition** | Cosmetic, no user impact | Minor inconvenience, workaround exists | Feature degraded, no data/security loss | Feature broken or data affected for a user subset | Data loss, security breach, compliance violation, or system-wide outage |

**Score grid** (Likelihood down, Impact across):

| L \\ I | 1 | 2 | 3 | 4 | 5 |
|--------|---|---|---|---|---|
| **1** | 1 (Low) | 2 (Low) | 3 (Low) | 4 (Low) | 5 (Medium) |
| **2** | 2 (Low) | 4 (Low) | 6 (Medium) | 8 (Medium) | 10 (High) |
| **3** | 3 (Low) | 6 (Medium) | 9 (Medium) | 12 (High) | 15 (High) |
| **4** | 4 (Low) | 8 (Medium) | 12 (High) | 16 (Critical) | 20 (Critical) |
| **5** | 5 (Medium) | 10 (High) | 15 (High) | 20 (Critical) | 25 (Critical) |

**Risk Level bands (final classification):**

| Score Range | Risk Level |
|-------------|------------|
| 16-25 | Critical |
| 10-15 | High |
| 5-9 | Medium |
| 1-4 | Low |

## RBT (Risk-Based Testing) Depth Mapping

The risk level dictates test depth and priority — this is the table test-scenario-agent
and test-plan-agent consume directly.

| Risk Level | Score | Test Depth | What This Means | Priority | Retest Cadence |
|------------|-------|------------|-------------------|----------|------------------|
| **Critical** | 16-25 | Exhaustive | All applicable design techniques (EP, BVA, DT, ST, PW, EG); every positive, negative, edge, security, and permission path; automate first | P1 | Every build |
| **High** | 10-15 | Full coverage | Positive + negative + boundary/edge cases; automate core paths | P2 | Every release |
| **Medium** | 5-9 | Standard | Positive + key negative paths only; automate if time permits | P3 | Every milestone |
| **Low** | 1-4 | Smoke | Happy-path only, manual spot-check | P4 | Pre-release sanity only |

## Risk Register Column Spec

The delivered register (Markdown table and Excel sheet) uses these columns:

| Column | Description |
|--------|-------------|
| Risk ID | `RISK-[MODULE]-[NUMBER]` (e.g., RISK-AUTH-001) |
| Category | Functional / Performance / Security / Data / Integration / Usability / Compliance |
| Description | One-sentence statement of what can go wrong and why |
| Module/Portal | The affected module and portal (portal names from `project-context.md`) |
| Likelihood | 1-5, with the evidence that drove the rating |
| Impact | 1-5, with the evidence that drove the rating |
| Score | Likelihood x Impact |
| Risk Level | Critical / High / Medium / Low (from the score band) |
| Recommended Test Depth | Exhaustive / Full coverage / Standard / Smoke (from RBT mapping) |
| Related Requirement/User Story | Traceability back to `outputs/requirements-agent/` or `outputs/user-stories-agent/` |
| Mitigation | Proactive action taken BEFORE the risk occurs |
| Contingency | Reactive action taken IF the risk occurs anyway |
| Owner | Named role/person accountable for mitigation and, if needed, contingency execution |
| Status | Open / Mitigated / Accepted / Closed |

## Mitigation vs. Contingency Distinction

These are two different disciplines and must never be merged into one field:

- **Mitigation** — a proactive action taken BEFORE the risk occurs, aimed at reducing
  its **likelihood** or its **impact**. Examples: adding input validation to reduce the
  likelihood of an injection defect; adding rate limiting to reduce the impact of a
  brute-force attempt; expanding automated regression coverage on a high-churn module.
- **Contingency** — a reactive action taken IF the risk occurs anyway, despite
  mitigation. It is the fallback plan, written as a concrete action, not a hope.
  Examples: rollback procedure for a bad deploy; incident-response runbook for a data
  breach; manual data-entry fallback if an integration is down.
- A risk row with only a Mitigation and no Contingency assumes the mitigation will
  always work — it never does 100% of the time for Critical/High risks. A row with only
  a Contingency and no Mitigation means the team is planning to fail instead of trying
  to prevent the failure. Both are required.

## Worked Example

```
Risk ID: RISK-PAY-002
Category: Security
Description: Payment confirmation endpoint does not re-validate server-side amount,
  relies on client-submitted total
Module/Portal: Checkout / Client Portal
Likelihood: 4 (High) — known trigger path, endpoint is public-facing and unauthenticated
  requests can reach it
Impact: 5 (Very High) — direct financial loss, compliance exposure (PCI-DSS)
Score: 20 -> Risk Level: Critical
Recommended Test Depth: Exhaustive (P1, retest every build)
Related Requirement: US-041 (Checkout — Payment Confirmation)
Mitigation: Add server-side amount recalculation before confirming payment; security
  scenario coverage (tampered-amount payload) in test-scenario-agent
Contingency: Auto-flag and hold any payment where client/server totals mismatch;
  manual finance review before release
Owner: Backend Lead
Status: Open
```
