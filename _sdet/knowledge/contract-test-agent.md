# Pactkeeper — Contract Test Agent Knowledge

> Training file for Pactkeeper (Senior Contract Testing Specialist).
> Edit this file to customize Pactkeeper's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Contract Boundary Rules (CRITICAL)
- **Consumer defines, provider verifies** — the consumer team (or Pactkeeper acting on its
  behalf) writes the interactions; the provider never authors expectations for a consumer
  whose code it doesn't run
- **One consumer, one provider, per pact file** — do not merge multiple provider services
  into a single pact; a consumer with three providers needs three pacts
- **Structural matchers by default** — assert type/regex/array-shape, not literal values,
  unless the literal is a genuine fixed business invariant (e.g., a required enum member)
- **Every data-dependent interaction needs a named provider state** — no state + a
  data-dependent response means verification passes against whatever data happens to
  exist, which is not a real contract guarantee
- **Never invent endpoint paths or schemas** — pull them from `outputs/api-analysis-agent/`
  or ask the user; a fabricated interaction tests nothing real

### Scope Rules
- Contract tests replace the SLOWEST, MOST BRITTLE integration tests first — prioritize
  high-value, high-change-frequency service boundaries, not every possible call
- Do not write full integration or E2E test suites (automation-agent's/api-test-agent's
  job) or test provider business logic beyond "does the response match the contract" —
  state the boundary explicitly in every output document

## Learnings

<!-- Add learnings from past contract testing sessions -->

## Consumer-Driven vs Provider-Driven Contract Testing

**Consumer-Driven Contracts (CDC)** — the default and recommended approach (Pact's model).
The CONSUMER writes the interactions describing what it needs; the pact file is generated
FROM the consumer's own test suite (tests run against a mock provider that records the
interaction); the PROVIDER then verifies its real implementation against every consumer's
pact. The contract reflects actual consumer needs rather than a provider team's guess, and
providers get an early "this consumer pact just failed" signal before a breaking change
reaches production.

**Provider-Driven Contracts (schema-first)** — the alternative. The PROVIDER publishes a
schema (OpenAPI/Swagger) consumers are expected to conform to. Works well for a shared
platform serving many unknown consumers (public API) where CDC's per-consumer pact model
doesn't scale. Weaker guarantee for internal integrations: a schema can be technically
satisfied while still breaking a specific consumer's actual usage (e.g., a field marked
optional in the schema that a consumer always requires).

**When to use which:** internal service-to-service integrations with known, enumerable
consumers → consumer-driven (Pact). Public/partner APIs with unbounded consumers →
provider-driven (OpenAPI + schema validation), api-analysis-agent's territory, not
Pactkeeper's.

## Pact File Structure

A pact file is a JSON document with four top-level sections:

```json
{
  "consumer": { "name": "OrderService" },
  "provider": { "name": "InventoryService" },
  "interactions": [{
    "description": "a request to reserve stock for an in-stock item",
    "providerState": "item SKU-1001 has 50 units in stock",
    "request": { "method": "POST", "path": "/inventory/reserve",
      "body": { "sku": "SKU-1001", "quantity": 2 } },
    "response": { "status": 200, "body": {
      "reservationId": "matching(type, 'a1b2c3')",
      "sku": "matching(type, 'SKU-1001')",
      "remainingStock": "matching(integer, 48)" } }
  }],
  "metadata": { "pactSpecification": { "version": "2.0.0" } }
}
```

- **`consumer.name` / `provider.name`** — the two service identities this pact governs
- **`interactions[]`** — one entry per request/response pair, each with a unique
  `description`, a `providerState` (omit only for state-independent calls like a health
  check), the `request` the consumer sends, and the `response` it expects — expressed with
  matchers rather than literal values wherever the exact value isn't a business invariant
- **`metadata.pactSpecification.version`** — the pact spec version, so both sides parse it
  consistently as the format evolves

## Matcher Reference

| Matcher | Asserts | Use when |
|---------|---------|----------|
| `matching(type, example)` | Field is present and same JSON type as example | Value can vary (IDs, names, counts) |
| `matching(regex, pattern, example)` | Field matches a regex | Format matters but exact value doesn't (emails, dates, IDs with a known shape) |
| `matching(term, pattern, example)` | Same as regex, phrased as an enum-style term match | Enum-like fields (status: active/inactive) |
| `eachLike(example, min)` | Field is an array where every element matches `example`'s shape | Lists of homogeneous objects (order items, results) |
| Literal value | Field equals exactly this value | Genuine fixed business invariant only (e.g., a specific error code the scenario requires) |

Default to type/regex/term/eachLike — mostly literal-value matchers make a pact brittle.

## Contract vs Integration vs E2E

| Layer | Verifies | Scope | Speed | Owned by |
|-------|----------|-------|-------|----------|
| **Contract** | The consumer's assumptions about ONE provider's request/response shape match reality | One consumer ↔ one provider, per interaction | Fast (no real network hop in the consumer test; provider verification runs in isolation) | Pactkeeper defines it; consumer + provider CI run it |
| **Integration** | A service's own code works correctly against a real or realistic dependency (DB, real provider instance, message queue) | One service + its direct dependencies | Medium | automation-agent / api-test-agent |
| **E2E** | A full user journey works across the whole deployed system | Multiple services, real environment, real UI/API entry point | Slow | automation-agent (Playwright) |

Contract tests do NOT replace integration or E2E tests — they catch a different failure
class (interface drift between independently-deployed services) faster and cheaper. A green
contract suite with a red E2E suite usually means the contract is missing an interaction
the real user journey exercises.

## Broker Workflow Reference

The canonical Pact broker cycle, in order:

1. **Consumer test run** — consumer's test suite runs against a mock provider, generating
   the pact file as a byproduct of the consumer's own tests passing
2. **Publish** — consumer CI publishes the pact file to the broker, tagged with the
   consumer's version (git SHA) and environment/branch tag (e.g., `dev`, `main`)
3. **Provider verification** — provider CI pulls all pacts tagged for its relevant
   consumers, runs its REAL code against each pact's recorded requests using registered
   provider-state handlers, and publishes verification RESULTS back to the broker
4. **can-i-deploy** — before either side deploys, CI runs `can-i-deploy --pacticipant
   [service] --version [sha] --to-environment [env]`; broker answers yes/no on whether
   every relevant contract has an up-to-date, successful verification for that pair
5. **Deploy** — only on yes; a "no" blocks the pipeline and names the broken pairing

**Versioning rule:** tag pact and verification publications with the actual application
version (git SHA or semver), never just a content hash of the pact file — the broker must
answer "is THIS version of THIS service compatible with THIS version of the other."

**On a broken contract:** the team that changed the interface is notified via the failed
verification; the change is fixed to match the contract or renegotiated with the consumer
(pact updated, re-published, re-verified) — never silently ignored to unblock a deploy.

## Worked Example: OrderService (consumer) ↔ InventoryService (provider)

**Interaction 1:** "a request to reserve stock for an in-stock item" — state:
`"item SKU-1001 has 50 units in stock"` — `POST /inventory/reserve {sku: "SKU-1001",
quantity: 2}` → `200 {reservationId: type, sku: type, remainingStock: integer}`

**Interaction 2:** "a request to reserve stock for an out-of-stock item" — state:
`"item SKU-2002 has 0 units in stock"` — `POST /inventory/reserve {sku: "SKU-2002",
quantity: 1}` → `409 {error: term(pattern "INSUFFICIENT_STOCK")}`

**Provider verification plan:** InventoryService's CI registers two state handlers
(`seedStock('SKU-1001', 50)`, `seedStock('SKU-2002', 0)`), pulls OrderService's pact from
the broker on every PR, and runs both interactions against its real `/inventory/reserve`
endpoint — a failure blocks the deploy until fixed or renegotiated with OrderService.

**can-i-deploy gate:** both pipelines run `can-i-deploy --pacticipant [service] --version
<sha> --to-environment production` — neither deploys without a passing answer.
