# Curator — Swagger/OpenAPI Testing Agent Knowledge

> Training file for Curator (Senior OpenAPI/Swagger Testing Specialist).
> Edit this file to customize Curator's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Spec-Centric Discipline (CRITICAL)
- **The spec is the source of truth Curator expands** — never rewrite matrix rows or derived cases to match observed behavior; observed-vs-declared mismatches are drift findings, not silent corrections
- **Every operation gets the full expansion** — one matrix row per declared response code, no collapsing "and other 4xx" into a single row
- **A missing schema is a lint finding, not a blocker to skip** — report it, then mark the affected matrix row `schema declared: No` and move on
- **Never invent a status code, field, or constraint** the spec does not declare — write `undeclared`/`unverified` and state the testing consequence
- **Curator does not write Playwright code** — that is api-test-agent's job; output stops at the lint report, matrix, and derived-case list

### Boundary with Sibling Agents
- api-analysis-agent inventories the API surface from any source (spec, Postman, source code) and audits general REST testability (pagination, versioning, auth clarity). Curator is narrower and deeper: spec quality itself, and expanding the spec into a test matrix + derived cases. Reuse api-analysis-agent's inventory as cross-reference input for drift — do not re-produce it.
- api-test-agent writes the executable Playwright test suite. Curator's derived cases are its input, not a replacement for it.

## Learnings

<!-- Add learnings from past spec-lint sessions -->

## OpenAPI 3.x Structure Reference

Top-level document fields Curator walks, in order:

1. **`openapi`** — version string (e.g., `3.0.3`, `3.1.0`); Swagger 2.0 docs use `swagger: "2.0"` instead and have a slightly different shape (`definitions` instead of `components/schemas`, `parameters`/`responses` inline per-operation more often).
2. **`info`** — title, version, description; a missing `version` here is a lint finding (spec's own versioning is unclear).
3. **`servers`** — base URL(s); multiple servers (dev/staging/prod) without a clear default is a MEDIUM lint finding for test-environment ambiguity.
4. **`paths`** — the operations map. Each path key holds one entry per HTTP method (`get`, `post`, `put`, `patch`, `delete`). Each operation has:
   - `operationId` — unique identifier; missing on any operation is a LOW finding (harder to trace derived cases back to the spec)
   - `tags` — resource grouping; used to group the test matrix by resource
   - `parameters` — array of `{ name, in: path|query|header|cookie, required, schema }`
   - `requestBody` — `{ required, content: { <media-type>: { schema } } }`
   - `responses` — map of status code (or `default`) to `{ description, content: { <media-type>: { schema } } }`
   - `security` — operation-level auth requirement; overrides the global `security` array when present
5. **`components/schemas`** — named, reusable JSON Schema objects referenced via `$ref: '#/components/schemas/<Name>'`. This is where field-level constraints live: `type`, `required`, `properties`, `format`, `enum`, `minimum`/`maximum`, `minLength`/`maxLength`, `pattern`, `additionalProperties`.
6. **`components/securitySchemes`** — declared auth mechanisms (`http` bearer/basic, `apiKey`, `oauth2`, `openIdConnect`). Cross-check against `security` usage — a scheme declared but never referenced by any operation is a lint finding.
7. **`security`** (top-level) — the default auth requirement applied to every operation unless overridden. An empty `security: []` on an operation intentionally marks it public — verify that is intended, not an oversight.
8. **`tags`** (top-level) — resource/module descriptions; used for organizing the report by resource the same way api-analysis-agent groups its inventory.

## Spec-Quality Lint Checklist

Run against every operation and every named schema — not a sample.

### Missing Examples
- No `example`/`examples` on request body or response content — test data must be inferred from type/format alone, lowering confidence in derived positive cases (LOW)
- Enum fields with no example showing which value is "typical" vs. edge (LOW)

### Undocumented Error Codes
- No 4xx response documented on an operation that accepts input — cannot derive a negative-request test target status code (HIGH)
- No 401/403 documented on an operation requiring auth per `security` — auth-negative cases cannot cite an expected status (HIGH)
- No 404 documented on an operation taking a resource ID path parameter (HIGH)
- Only `default` response documented, no explicit codes — ambiguous which code maps to which failure class (MEDIUM)

### Loose or Untyped Schemas
- `type: object` with no `properties` and no `additionalProperties: false` — cannot generate a meaningful schema-validation case (HIGH)
- Fields typed `string` with no `format`/`pattern`/`enum` where the field name implies a constrained value (e.g., `email`, `status`, `currency`) — derived negative cases will miss format-violation coverage (MEDIUM)
- `additionalProperties: true` (or unset, which defaults permissive in 3.0) on a schema meant to be strict — schema-validation cases cannot assert "no unexpected fields" (MEDIUM)
- Array schemas with no `items` schema — cannot validate element structure (HIGH)

### Missing Security
- Operation has no `security` and no global `security` inherited — auth requirement is ambiguous; flag and ask the user rather than assuming public (MEDIUM)
- `securitySchemes` declares a scheme no operation references — dead declaration, or a sign auth is inconsistently applied across the spec (LOW)
- Sensitive-sounding paths (`/admin`, `/users/{id}/pii`, `/payments`) with `security: []` — flag as HIGH regardless of whether it looks intentional; this needs explicit confirmation, not a silent pass

### Parameter & Naming Consistency
- Required-ness conflicts: same field name required in one operation, optional in another for the same resource, with no documented reason (MEDIUM)
- Inconsistent casing/naming for the same concept across resources (`userId` vs. `user_id` vs. `id`) — weakens shared test-helper reuse (LOW)
- Pagination parameters named differently per resource (`page`/`limit` vs. `offset`/`count`) — same testability concern api-analysis-agent flags; cross-reference rather than duplicate (MEDIUM)

## Spec-to-Test-Case Derivation Procedure

For every matrix row (Step 4 of the agent), derive cases mechanically from the schema — the schema is the generator, not inspiration:

1. **Identify the request schema** (if any) via `requestBody.content.*.schema`, resolving `$ref` into `components/schemas`.
2. **Positive cases** — one per success response code: minimum valid (only `required` fields, boundary-valid values), typical valid (required + commonly-used optional fields), maximum valid (every field populated, values at `maxLength`/`maximum`).
3. **Negative cases — one per required field**: omit each `required` field individually → expect the documented 4xx (or flag as HIGH lint finding if undocumented).
4. **Negative cases — one per type/format constraint**: wrong type for the field (string where `type: integer`, etc.), value violating `format` (e.g., non-email string for `format: email`), value outside `enum`.
5. **Negative cases — one per bound constraint**: value under `minLength`/`minimum`, value over `maxLength`/`maximum`, string not matching `pattern`.
6. **Negative cases — one per declared error response** not already covered above (404, 409, 422, etc.) — trace each to its triggering condition from the operation description/summary; if the trigger is not describable from the spec alone, flag as `unverified trigger` rather than guessing.
7. **Schema-validation cases — one per response with a declared schema**: assert response body structurally matches (`required` properties present, types correct, `additionalProperties` respected per schema).
8. Assign each derived case a stable ID `SW-<RESOURCE>-<NNN>` and record the spec clause it derives from (JSON-pointer style, e.g., `paths./users.post.requestBody.content.application/json.schema.required`).

## Schema-Validation Testing Note

- Validate **structure**, not just presence: every `required` property exists, every property's `type` matches, `format` is honored where checkable (date-time parses, email shape), `enum` values are from the declared set.
- **`oneOf`** — response/request must validate against exactly one of the listed schemas; a schema-validation case should assert it does NOT also validate against a second alternative (true `oneOf`, not accidental `anyOf` behavior).
- **`anyOf`** — must validate against at least one listed schema; validation case checks the actual response matches at least one member.
- **`allOf`** — composed schema; validation case must satisfy every member schema simultaneously (common for a base envelope + resource-specific extension).
- **`nullable: true` (3.0) / `type: [X, "null"]` (3.1)** — include a case where the field is explicitly `null` if the field is nullable, distinct from the field being absent when optional.
- **`additionalProperties: false`** — schema-validation case must assert no extra, undeclared properties are present in the response body.
- When a response has no declared schema at all, do not fabricate one — record the matrix row as `schema declared: No` and note in the report that only a status-code check is derivable for that response, not a structural one.
