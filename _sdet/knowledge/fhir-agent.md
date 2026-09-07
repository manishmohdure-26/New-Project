# Interop — FHIR Agent Knowledge

> Training file for Interop (Senior FHIR Conformance Specialist).
> Edit this file to customize Interop's behavior, add learnings, or correct past mistakes.

## Custom Rules

### FHIR Conformance Rules (CRITICAL)
- **Always test against the named profile/StructureDefinition**, not just the base FHIR
  resource — a Patient that is valid base FHIR can still fail US Core Patient conformance
- **Classify every terminology finding by binding strength** (required/extensible/preferred/
  example) — a required-binding violation is CRITICAL; treating all binding mismatches as
  equal severity buries the ones that will actually break interoperability
- **Verify CapabilityStatement claims against observed behavior** — a declared search
  parameter or `_include` target that 400s or silently no-ops is a nonconformance, not a
  documentation nitpick
- **Never invent a FHIR base URL, version, profile, or sample resource** — read from
  `project-context.md` or `outputs/api-analysis-agent/`, or ask the user. Use synthetic/
  de-identified data only — never real PHI in any resource instance used for testing.

### Bundle & Transaction Rules
- Transaction bundles (`Bundle.type = transaction`) must be all-or-nothing — a partial
  commit on failure is both a conformance and a data-integrity defect. Batch bundles
  (`Bundle.type = batch`) process entries independently — one failing entry must not affect
  the others; verify per-entry results, not just the overall status.
- Searchset bundles must have an accurate `Bundle.total` and correct pagination links
  (`self`/`next`/`previous`) — a mismatched total is a common, easy-to-miss nonconformance.

### Auth Rules
- SMART-on-FHIR scope enforcement is a security boundary — a resource or field returned
  outside the granted scope is CRITICAL, not low-priority. An expired/revoked token must
  return 401, never be silently treated as anonymous access.
- If SMART-on-FHIR auth cannot be verified in the current environment, report it as an
  explicit untested gap — never mark it as passed by default.

## Learnings

<!-- Add learnings from past FHIR conformance testing sessions -->

## FHIR Resource Model Basics (R4 baseline)

- **Resource** — the atomic unit of FHIR exchange (`Patient`, `Observation`, `Encounter`,
  `Condition`, `MedicationRequest`, etc.). Every resource has `resourceType`, an `id`
  (server-assigned on create), and a `meta` block (versionId, lastUpdated, profile).
- **Profile / StructureDefinition** — a machine-readable constraint on a base resource that
  narrows cardinality, fixes value sets, and adds must-support flags for a use case (e.g.,
  US Core Patient profiles the base `Patient`); a resource can conform to the base spec and
  still fail a named profile.
- **Cardinality & Must Support** — every element has `min..max` (e.g., `0..1`, `1..*`); a
  `min=1` element absent from an instance is a structural nonconformance regardless of
  profile. Must-support is a profile-level flag: if source data exists it MUST be populated,
  and a consuming system MUST process it (not ignore/drop it) — check the specific profile
  in scope, not a generic rule.
- **Extensions** — FHIR's mechanism for data outside the base spec, identified by a
  canonical URL; unknown extensions must still round-trip (be preserved) even if unread.
- **References** — `Reference` elements point to other resources (e.g.,
  `Observation.subject` → `Patient`); confirm they resolve and, where a profile constrains
  the target type, point to an allowed resource type.
- **Invariants** — machine-checkable FHIRPath constraints (e.g., `obx-1: value or
  dataAbsentReason SHALL be present`); violating one is a structural conformance failure,
  distinct from a terminology or cardinality issue.

## RESTful Interaction Reference

| Level | Interaction | HTTP | Purpose |
|-------|-------------|------|---------|
| Instance | read | `GET [base]/[Resource]/[id]` | Retrieve current version of a specific resource |
| Instance | vread | `GET [base]/[Resource]/[id]/_history/[vid]` | Retrieve a specific historical version |
| Instance | update | `PUT [base]/[Resource]/[id]` | Replace a resource; creates a new version |
| Instance | patch | `PATCH [base]/[Resource]/[id]` | Partial update (JSON Patch / FHIRPath Patch) |
| Instance | delete | `DELETE [base]/[Resource]/[id]` | Remove a resource (server may soft-delete) |
| Type | create | `POST [base]/[Resource]` | Create a new resource; server assigns `id` |
| Type | search-type | `GET [base]/[Resource]?params` | Search within a resource type |
| System | capabilities | `GET [base]/metadata` | Retrieve the server's CapabilityStatement |
| System | batch/transaction | `POST [base]` with `Bundle.type = batch/transaction` | Multiple operations in one request |
| System | search-system | `GET [base]?params` | Cross-resource-type search (e.g., `_type=`) |
| Any level | history (`-instance`/`-type`/`-system`) | `GET .../_history` at the matching level | Version history scoped to one resource, a type, or the whole server |

**Search parameter conformance to test per resource:** standard modifiers (`:exact`,
`:contains`, `:missing`, `:not`); `_include`/`_revinclude` (pull in a referenced resource or
resources that reference the match, e.g. `Patient?_revinclude=Observation:subject`); chained
parameters (search on a referenced resource's field, e.g. `Patient?general-practitioner.name=`);
`_sort`/`_count`/pagination via `Bundle.link`; `_summary`/`_elements` (verify the server
actually trims the response, not just accepts the param).

## Validation Approach

1. **Structural validation** — resource is well-formed JSON/XML, `resourceType` correct,
   cardinality (`min..max`) satisfied, data types match the base spec.
2. **Profile validation** — validate against the named StructureDefinition (HL7 FHIR
   Validator or the server's own `$validate`): must-support elements populated when source
   data exists, profile-specific slicing/fixed values honored, invariants hold.
3. **Terminology binding validation** — check each coded element against its bound value set
   at the declared **binding strength**: `required` (MUST match, else CRITICAL), `extensible`
   (SHOULD match, deviation only with no suitable value-set match), `preferred` (SHOULD
   match, informational unless clearly wrong), `example` (illustrative only, never fail).
4. **Reference & bundle validation** — references resolve to an existing resource of an
   allowed type; bundles keep correct `fullUrl`/`Bundle.entry` structure and, for
   transactions, atomicity on failure.
5. **Behavioral validation** — exercise the live RESTful API against CapabilityStatement
   claims (Step 6 of the workflow) rather than relying on static documentation alone.

**Severity mapping for findings:**
| Finding | Default Severity |
|---------|-------------------|
| Required-binding terminology violation | CRITICAL |
| CapabilityStatement declares an interaction that fails when exercised | CRITICAL |
| Transaction bundle partially commits on failure | CRITICAL |
| Missing must-support element on a profile-conformant, populated instance | HIGH |
| Extensible-binding violation without justification | HIGH |
| Reference does not resolve or targets a disallowed resource type | HIGH |
| Pagination/`Bundle.total` mismatch | MEDIUM |
| Preferred-binding deviation | LOW |
| Example-binding non-membership | INFO |

## US Core / Capability Statement Conformance

- **CapabilityStatement (`/metadata`)** declares supported resource types, interactions,
  search parameters, `_include`/`_revinclude` targets, and `fhirVersion`. Treat every
  declared item as a testable claim — spot-check a representative sample, not just the
  ones convenient to test.
- **US Core** (or any named IG) layers additional requirements on base FHIR per resource:
  extra **must-support** elements; required **search parameters** (e.g., US Core Patient
  needs `_id`, `identifier`, `name`, `name+birthdate`); specific **terminology bindings**
  (e.g., US Core Observation Category) at defined strengths; and **"SHALL support"**
  requirements for at least one of a set of alternatives (`Observation.value[x]` OR
  `Observation.dataAbsentReason`).
- Audit each in-scope resource against: (1) required search parameters actually work,
  (2) must-support elements populate when source data has them, (3) terminology bindings
  match the profile's declared value sets/strengths, (4) IG-specific invariants hold.
- If no IG is named for a resource, record it as "base FHIR R4 only — no IG declared".

## SMART-on-FHIR Auth Note

- SMART-on-FHIR layers OAuth2 authorization on the FHIR REST API using **scopes** that
  encode resource type, access level, and compartment: `patient/Observation.read` (read
  Observations within the launched patient's compartment), `user/*.read` (access across
  types for the authenticated user), `system/Patient.read` (backend/client-credentials
  access, no user context).
- **Launch context** matters: an EHR/standalone-launch flow ties the token to a specific
  patient/encounter; a `patient/*.read`-scoped token must never return data outside that
  launched patient's compartment, even if the server holds broader data.
- **Minimum auth test set:** no token → 401; token missing required scope → 403 (resource
  withheld, not partially returned); valid token + correct scope → 200 with only in-scope
  data; expired/revoked token → 401 (never silently downgraded to anonymous access);
  cross-patient access with a patient-scoped token → blocked, not just client-side filtered.
- Treat scope enforcement as a security control — a resource returned outside the granted
  scope is a CRITICAL finding regardless of whether the client "would have used it
  correctly" anyway. If the environment has no SMART-on-FHIR layer, state that explicitly
  and document the actual auth model instead of forcing a SMART-specific plan onto it.
