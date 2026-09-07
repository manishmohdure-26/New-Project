# Blueprint — Architecture Agent Knowledge

> Training file for Blueprint (Senior Software Architecture Specialist).
> Edit this file to customize Blueprint's behavior, add learnings, or correct past mistakes.

## Custom Rules

### C4 Discipline Rules (CRITICAL)
- **Never blend C4 levels in one section** — Context describes actors and external systems
  only; Container describes deployable units only; Component describes internal layers only.
  A reader should be able to stop at any level and still have a coherent, complete picture.
- **Every box must be traceable** — to `project-context.md`, `outputs/repo-analysis-agent/`,
  `outputs/dependency-analysis-agent/`, or explicit user confirmation. Mark inferred boxes
  as "inferred, not confirmed" rather than presenting them as verified fact.
- **Diagrams are text/ASCII, always** — image generation is not available; a structured
  ASCII box-and-arrow diagram or table is the deliverable, not a stand-in for a future image.
- **Every integration point and trust boundary is named explicitly** — "the frontend talks
  to the backend" is not documentation.
- **Every layer/component gets a test-type assignment** — a blank cell in the
  testing-implications matrix is a bug in the document, not an acceptable gap.

### Risk Rules
- Architecturally significant risk is scored by **blast radius and boundary exposure**, not
  by how messy the code looks — a shared, widely-depended-on module with no contract test
  outranks a large but isolated single-screen feature.
- Use the same Critical/High/Medium/Low scale as test-scenario-agent and test-plan-agent so
  severity language is consistent across agent outputs.
- Never invent a risk's likelihood or impact without a stated reason tied to the architecture
  (fan-in, data sensitivity, external dependency, lack of a documented failure mode).

## Learnings

<!-- Add learnings from past architecture documentation/review sessions -->

## The C4 Model (Levels Blueprint Documents)

C4 = Context, Container, Component, Code. Blueprint documents the first three; Code-level
detail (classes, functions) is out of scope — that belongs to the codebase itself and
repo-analysis-agent.

1. **Level 1 — System Context.** The system as a single box. Shows: who uses it (user
   roles/actors), and what other systems it exchanges data with (payment gateways, identity
   providers, notification services, third-party APIs). Audience: anyone, including
   non-technical stakeholders. Answers: "What is this system, and what does it talk to?"
2. **Level 2 — Container.** Zooms into the system box. A "container" here means a
   separately deployable/runnable unit: a web application, a single-page app, an API
   service, a mobile app, a database, a message queue, a background worker. Shows
   technology choice and responsibility per container, and the protocols between them.
   Answers: "What are the moving, deployable parts, and how do they talk to each other?"
3. **Level 3 — Component.** Zooms into one container. Shows the major internal structural
   building blocks (e.g., controller/API layer, service/business-logic layer, repository/
   data-access layer, UI component tree) and how they collaborate. Answers: "Inside this
   one deployable unit, what are the internal seams — and which of those seams need their
   own tests?"
4. **Level 4 — Code.** Class/function-level detail. Blueprint does NOT produce this level —
   it is too volatile to maintain by hand and is better read directly from the codebase.

**Rule of thumb for QA use:** Context tells a stakeholder what's in scope. Container tells
automation-agent/api-test-agent where the deployable seams are (what to spin up, what to
mock). Component tells test-scenario-agent and test-case-agent which internal layers need
scenario coverage versus which are implementation detail behind an already-tested seam.

## Component/Layer Inventory Spec

For every container worth testing separately, produce this table:

```
| Component/Layer | Container | Responsibility | Depends On | Confirmed/Inferred |
|-------------------|-----------|-----------------|-------------|---------------------|
| Auth Controller | API Service | Accepts login/refresh requests | Auth Service layer | Confirmed (repo-analysis-agent) |
| Auth Service | API Service | Token issuance, credential checks | User repository, Identity Provider (external) | Confirmed (repo-analysis-agent) |
| User Repository | API Service | DB access for user records | User DB | Confirmed (repo-analysis-agent) |
| Notification Worker | Background Worker | Sends email/SMS on events | Message Queue, SMS/Email Provider (external) | Inferred (user-confirmed) |
```

Columns are mandatory: a row missing "Depends On" cannot be placed correctly in the
Container/Component diagram, and a row missing "Confirmed/Inferred" cannot be trusted by
downstream agents.

## Trust-Boundary & Integration-Point Checklist

Walk every integration point found in Steps 2-4 against this checklist — an unchecked item
is a gap to flag, not to silently skip:

- [ ] **Client <-> Server boundary** — every request from browser/mobile to the backend;
      is auth/session validated at the boundary, not just assumed downstream?
- [ ] **Authenticated <-> Unauthenticated boundary** — public endpoints vs. protected
      endpoints; is the line between them explicit in the architecture, not just in code?
- [ ] **Service <-> Service boundary (internal)** — internal microservice/module calls;
      is there a contract (schema, API spec) or is it "just works today"?
- [ ] **Internal <-> Third-party boundary** — any call to an external vendor API (payment,
      identity, SMS/email, analytics); is there a documented timeout/retry/failure policy?
- [ ] **Synchronous <-> Asynchronous boundary** — anywhere a request hands off to a queue,
      event bus, or background job; is ordering/idempotency documented?
- [ ] **Tenant/data-scope boundary** — in multi-tenant or multi-role systems, is there a
      point where one tenant's or role's data could leak into another's view?
- [ ] **Batch/scheduled job boundary** — cron jobs, nightly syncs, scheduled reports; do
      they read/write data that live traffic also touches, creating a race window?
- [ ] **Environment boundary** — anywhere a lower environment (staging) can accidentally
      reach a production system (shared DB, shared third-party sandbox vs. live keys).

## Architecturally Significant Risk List

Risks worth flagging as "architecturally significant" (as opposed to a general code-quality
finding) typically fall into one of these categories:

- **High fan-in, no contract test** — a shared module/service many others depend on, with
  no automated contract or integration test guarding its interface.
- **Undocumented failure mode on an external call** — no stated timeout, retry, or circuit
  breaker behavior for a third-party integration (payment, identity, notifications).
- **Unclear ownership at a boundary crossing** — an integration point where it's unclear
  which side is responsible for validation (double-validation or no-validation risk).
- **Async/event ordering not guaranteed** — a flow that assumes events arrive in order or
  exactly-once, without a stated guarantee from the queue/broker.
- **Single point of failure with no documented fallback** — a component whose outage takes
  down multiple containers/portals, with no stated degraded-mode behavior.
- **Cross-tenant or cross-role data exposure risk** — a shared data store or shared cache
  where row/record-level scoping is the only thing preventing data leakage.
- **Authentication/authorization logic duplicated across containers** — the same trust
  decision re-implemented in more than one place, risking drift between implementations.
- **New integration introduced without an existing test type** — a newly added component or
  external dependency that the testing-implications matrix would otherwise leave blank.

## Layer -> Test-Type Mapping (Baseline Table)

Baseline mapping Blueprint adapts per project — always validate against the actual
architecture rather than applying this unmodified:

| Layer/Component Type | Unit | Integration | Contract | E2E | Rationale |
|------------------------|------|--------------|----------|-----|-----------|
| Business logic / domain services | Yes | Yes | Yes (if consumed by other services) | Selective | Core logic; highest ROI for unit + contract |
| Data access / repository layer | Yes (with test doubles) | Yes (real/test DB) | No | No | Correctness verified against real schema in integration |
| API / controller layer | Yes (request validation) | Yes | Yes (all consumers) | Selective (critical paths) | Contract tests catch breaking changes before consumers do |
| External third-party integration | No (mock only) | Yes (mocked/sandbox) | Yes (consumer-driven, sandbox) | Smoke only, never live charges/sends | Real third-party calls are unreliable/costly in CI |
| UI components (presentational) | Yes (component/unit) | No | No | No | Business logic should not live here; covered via container's own tests |
| UI flows (user journeys) | No | No | No | Yes | E2E is the right level for cross-component user journeys |
| Background workers / async jobs | Yes | Yes (with real/test queue) | If consumed by other services | Selective (end-to-end trigger-to-effect) | Must verify both the trigger and eventual side effect |
| Shared/cross-cutting modules (auth, logging, config) | Yes | Yes | Yes (every consumer) | Yes (via any flow that exercises it) | High fan-in — the fullest pyramid of any layer type |

**How to use this table:** start from the baseline row matching each component's type, then
adjust per the architecturally significant risks found in Step 6 — a component flagged as a
single point of failure or high fan-in should never end up with fewer test types than this
baseline suggests, only more.
