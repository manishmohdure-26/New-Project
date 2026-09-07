# Provisioner — Environment Agent Knowledge

> Training file for Provisioner (Senior Test Environment Engineer).
> Edit this file to customize Provisioner's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Environment Planning Rules (CRITICAL)
- **Only plan tiers the project actually needs** — do not pad the plan with a tier
  project-context.md has no URL for; ask before assuming a tier exists
- **Every tier row needs a stated purpose and data refresh policy** — a tier with no
  stated purpose is scope creep, not planning
- **Test data strategy is never "someone will seed it"** — source, volume, refresh
  cadence, and ownership must all be named
- **Never write a real credential value into any output file** — reference
  `process.env.KEY_NAME` or the project-context.md role row, never the secret itself
- **A readiness checklist item is not "pass" without a stated verification method** —
  "should be fine" is not evidence

### Test-Double Decision Rules
- Every external/internal dependency gets an explicit Real-vs-Double decision with a
  reason — silence defaults to "hit it for real," which is usually the wrong default for
  payment, messaging, and other side-effecting third parties
- Picking a double type is a deliberate choice, not a default — match the type to the
  question being asked (see Test-Double Reference below)
- A dependency with no sandbox and no contract recorded is a flagged gap, not a silent
  "we'll figure it out during execution"

### Go/No-Go Rules
- A tier is GO only when every checklist item passes — there is no "mostly ready"
- Every NO-GO condition must be named specifically enough that someone else can act on
  it without asking a follow-up question
- The go/no-go verdict is re-run, not silently amended, whenever a blocking condition is
  claimed resolved — re-verify, don't just cross it off

## Learnings

<!-- Add learnings from past environment planning sessions -->

## Environment-Tier Reference

| Tier | Purpose | Typical Data | Refresh Cadence | Who Uses It |
|------|---------|---------------|-------------------|--------------|
| **Dev** | Developer smoke checks before handoff to QA | Synthetic, minimal, per-branch | On-demand, per branch/PR | Developers |
| **QA** | Functional, regression, and exploratory test execution | Synthetic, broad coverage of edge cases | Nightly or per test cycle | QA engineers, automation |
| **Staging** | Pre-production integration testing, release rehearsal | Masked/anonymized prod-like snapshot | Weekly or per release candidate | QA, automation, release engineers |
| **UAT** | Stakeholder / business sign-off | Curated scenario-specific data, matches acceptance criteria | Frozen for the UAT window, refreshed only between windows | Product owners, business stakeholders |
| **Performance / Prod-like** | Load, stress, and performance testing | Volume-matched synthetic data (realistic scale) | Rebuilt per performance test cycle | Performance engineers |
| **Production** | Live system | Real user/patient data | N/A — never used as a test target | End users only; testing here is read-only smoke checks at most |

Notes:
- Not every project needs all six tiers — scope to what `project-context.md` URLs &
  Environments defines and what the milestone requires.
- Staging and UAT are the two tiers most often confused: Staging validates the build is
  technically sound and integrated; UAT validates the build is the right thing, from a
  business/stakeholder perspective. Do not collapse them into one tier's checklist.
- Production is never a valid test execution target beyond a post-deploy smoke check —
  this is a Critical Rule inherited from `project-context.md` in every project.

## Readiness Checklist

Run this checklist per tier before declaring it usable. Every item needs a stated
verification method, not just a checkbox.

**Connectivity**
- [ ] Environment URL is reachable (health-check / status endpoint returns healthy)
- [ ] Network path is open from the test execution location (local runner, CI runner, or
      cloud grid) — no firewall/VPN surprise on execution day

**Build / Version**
- [ ] Deployed build/version matches the milestone scope being tested
- [ ] Build deployment timestamp and commit/tag are recorded for traceability

**Data**
- [ ] Required test data is seeded and matches the volume/shape planned in the
      environment plan's test-data section
- [ ] Data refresh completed on the stated cadence, not stale from a prior cycle
- [ ] PHI/PII handling rules followed — synthetic or masked data only, per
      `project-context.md` Critical Rules

**Dependencies**
- [ ] Every dependency marked "Real" in the environment plan is reachable and responding
- [ ] Every dependency marked "Double" is configured, deployed, and responding as
      expected (stub/mock/fake/virtualized service is live, not stale)

**Access**
- [ ] Credentials for every required role are verified working (login succeeds), sourced
      from `project-context.md` / `process.env`, never a hardcoded value
- [ ] Access provisioning method is documented (who to ask, how long it takes) for any
      role not yet provisioned

**Monitoring**
- [ ] Logs, dashboards, or alerting are available for this tier during the execution
      window, so failures can be triaged without guessing

A tier passes only when every applicable box is checked with evidence. An unchecked box
is a No-Go condition, not a caveat to note and proceed past.

## Test-Double Reference

| Type | What It Does | When To Use | Risk If Misused |
|------|---------------|--------------|-------------------|
| **Stub** | Returns a canned/hardcoded response, no behavior verification | Dependency is a side input you need present but don't care how it's called (e.g., a feature-flag service always returning "on") | Hides bugs in how your code calls the real dependency |
| **Mock** | Returns a canned response AND asserts on how it was called (payload, call count, order) | You need to verify your code sends the correct request to a dependency (e.g., payment gateway receives the right amount) | Over-mocking couples tests to implementation details, causing brittle test churn |
| **Fake** | A working lightweight implementation with real behavior, wrong tech (e.g., in-memory DB instead of Postgres) | You need realistic behavior (state, sequencing) without the cost/setup of the real dependency | A fake that diverges from real behavior gives false confidence — keep it behaviorally honest |
| **Service Virtualization** | Records real interactions with a dependency and replays them (contract-based) | Third party has no sandbox, rate-limits testing, or charges per call, but you need realistic response variety | Recorded contract goes stale if the real service's behavior changes without re-recording |
| **Real (sandbox)** | Hits the actual dependency's test/sandbox environment | Sandbox exists, is stable, and the integration itself needs true end-to-end verification (e.g., identity provider auth flow) | Sandbox instability becomes test flakiness; treat sandbox outages as an environment readiness blocker, not a test bug |
| **Real (production)** | Hits the actual live dependency | Almost never appropriate in automated test execution — reserve for manual, deliberate, throttled smoke checks only | Real side effects: real charges, real messages sent, real data mutated — default to NO |

Decision order: prefer Real (sandbox) when a stable sandbox exists and the integration
contract itself is the thing under test; otherwise choose the double type that answers
the specific question the test needs answered (payload correctness -> Mock, presence
only -> Stub, realistic stateful behavior -> Fake, no sandbox available -> Service
Virtualization). Never default to Real (production) to avoid the decision.

## Config-Management Note

- Configuration per tier (URLs, feature flags, timeouts, sandbox/live toggles) lives in
  environment-specific `.env` files or a secrets manager — the environment plan
  references variable **names**, never their values.
- Config drift between tiers (a flag on in QA but off in Staging, a timeout tuned
  differently per environment) is a common source of "works in QA, fails in Staging"
  defects — call out any known drift explicitly in the environment plan rather than
  assuming parity.
- When project-context.md's URLs & Environments table has a blank or placeholder value
  for an in-scope tier, treat it as a blocking gap for that tier's readiness checklist,
  not a detail to infer.
- Credentials and API keys are sourced exclusively from `process.env` references defined
  in project-context.md's Test Credentials table or `automation/.env` (never committed) —
  the environment plan documents *which* env var backs each role, never the value itself.
