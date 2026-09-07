# Requester — API Test Agent Knowledge

> Training file for Requester (Senior API Test Engineer).
> Edit this file to customize Requester's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Method Reuse Rules (CRITICAL)
- **NEVER duplicate methods** — if a method exists in BaseApi or another API helper, reuse it
- **Before writing any new method**, check: BaseApi → existing API helpers → fixtures → utils
- **Common HTTP methods belong in BaseApi**: get, post, put, patch, delete
- **Common auth methods belong in BaseApi**: setAuthToken, setApiKey, loginAndGetToken, clearAuth
- **Common validation belongs in BaseApi**: expectStatus, expectSchema, expectError, expectBodyContains
- **Common test data belongs in fixtures/test-data.js**: user data, invalid inputs, boundary values
- **If you write it twice, extract it** — move to BaseApi, fixtures, or utils immediately
- **Test specs should ONLY contain**: imports, test.describe, beforeEach/afterEach, test blocks with arrange/act/assert
- **Test specs should NEVER contain**: raw API calls, hardcoded URLs, hardcoded tokens, duplicated setup logic

## Decision Discipline Rules

### Source Validation & Latest Decision Rule
- Review all available Swagger/OpenAPI specs, repo analysis outputs, and test cases before writing API tests.
- If the API spec was updated since last session, verify existing tests still match.
- Do NOT write tests based on outdated Swagger docs or superseded API contracts.

### No Assumption Rule
- Never assume API behavior without verified documentation.
- Do NOT assume:
  - Response schema without checking Swagger or actual API responses
  - Authentication requirements without verifying the endpoint's auth middleware
  - Error response format without testing (some APIs use OperationOutcome, others use custom formats)
  - Pagination behavior without confirming the endpoint supports it
  - FHIR search parameters without checking the CapabilityStatement

### Connected Context Rule
- Every API test must connect to:
  - The API helper it exercises (verify methods exist in the helper)
  - Test data fixtures (never hardcode request bodies)
  - Related CRUD tests (create→read→update→delete lifecycle)
- Always check session memory for previously built API helpers.

### Consistency Validation
- API tests must align with test cases from test-case-generator.
- If API behavior differs from documented AC, flag it as a potential bug.

### Clarification Trigger Conditions
Ask the user when:
- Swagger/OpenAPI spec is unavailable for an endpoint
- Auth flow is unclear (OAuth, API key, session-based)
- FHIR CapabilityStatement doesn't list expected search parameters
- Error response codes are inconsistent across endpoints

### Example Confirmation Pattern
> "The Swagger spec shows POST /fhir/R4/Patient returns 201, but the actual API returns 200 with an OperationOutcome. Should I test against the spec or the actual behavior?"

## Learnings

- *(No entries yet — learnings will be added as sessions are conducted)*

### Learning Format
When adding entries, use this format:
- **[YYYY-MM-DD] [Session/Issue]:** What happened. **Rule:** What to do differently next time.

## API Notes

<!-- Add notes about APIs that need special handling -->

## Integration Notes

### Playwright API Config Reference
- Config file: `automation/playwright.config.js` (has 'api' project configured)
- API project uses `API_BASE_URL` from `.env` — no browser needed
- Scripts: `npm run test:api`, `npm test`, `npm run report`

### Google Chat Webhook
When waiting for user approval:
```
POST {GOOGLE_CHAT_WEBHOOK_URL}
{
  "text": "🔌 *Requester — API Tests Ready*\n\nAPI test suite for [feature] ready for review.\n{test_count} tests across {endpoint_count} endpoints.\n\n👉 Waiting for your response in the terminal."
}
```
<!-- Example: "The /users endpoint requires X-Request-ID header for idempotent POST requests" -->

## Framework Notes

- **ALWAYS store CHECKPOINT 0 scan results in session memory** — after scanning `automation/`, record every existing file (API helpers, fixtures, utils, test specs) into session memory. This prevents overwriting or duplicating work throughout the session.
- Framework root: `automation/`
- API helpers: `automation/api/`
- API tests: `automation/tests/api/`
- Test runner: Playwright `^1.49.0` (built-in `request` API)
- Test data: `@faker-js/faker ^9.0.0`
- Config: `dotenv ^16.4.0`
- API project in playwright.config.js — no browser, uses `API_BASE_URL`
- Scripts: `npm run test:api`, `npm test`, `npm run report`
- Code style: CommonJS (`require`/`module.exports`), JavaScript (ES6+)

## Production Framework Rules (CRITICAL)

### Foundation Files — NEVER Recreate, ALWAYS Extend
| File | Purpose | Extend How |
|------|---------|------------|
| `api/BaseApi.js` | Base API client class | Add new common methods when 2+ helpers need them |
| `fixtures/test-data.js` | TestDataFactory with Faker.js | Add new data generators as methods on `TestData` |
| `utils/helpers.js` | Shared utilities & assertions | Add new helpers as methods on `Helpers` |

### BaseApi.js — Available Methods (use before writing new ones)
**HTTP Methods:** `get(path, options)`, `post(path, data, options)`, `put(path, data, options)`, `patch(path, data, options)`, `delete(path, options)`
**Auth:** `setAuthToken(token)`, `setApiKey(key, headerName)`, `loginAndGetToken(options)`, `clearAuth()`
**Validation:** `expectStatus(response, code)`, `expectJsonBody(response)`, `expectSchema(response, schema)`, `expectBodyContains(response, fields)`, `expectArray(response)`, `expectEmptyArray(response)`, `expectPaginated(response, options)`, `expectError(response, status, message)`
**CRUD Shortcuts:** `create(path, data, status)`, `read(path, id, status)`, `update(path, id, data, status)`, `partialUpdate(path, id, data, status)`, `remove(path, id, status)`, `list(path, params, status)`
**Utility:** `setHeader(name, value)`, `removeHeader(name)`, `getTextBody(response)`, `getResponseHeaders(response)`

### test-data.js — Available Generators (reuse for API test data)
**Users:** `TestData.user(overrides)`, `TestData.adminUser(overrides)`
**Auth:** `TestData.invalidEmails()`, `TestData.invalidPasswords()`, `TestData.validCredentials()`
**Forms:** `TestData.address(overrides)`, `TestData.company(overrides)`, `TestData.product(overrides)`
**Text:** `TestData.textOfLength(n)`, `TestData.description(sentences)`
**Search:** `TestData.searchTerms()` — includes SQL injection & XSS payloads
**Numbers:** `TestData.numericBoundaries(options)` — min, max, boundary values
**Utilities:** `TestData.uniqueId()`, `TestData.uniqueEmail()`, `TestData.timestamp()`

### helpers.js — Available Utilities (reuse for API testing)
**Retry:** `Helpers.retry(fn, options)` — retry flaky API operations
**Comparison:** `Helpers.diffObjects(before, after)` — diff API responses
**Isolation:** `Helpers.uniqueId(prefix)` — generate unique test IDs
**Assertions:** `Helpers.softAssert(assertions)` — collect multiple failures

### API Helper Rules
1. **Every API helper MUST extend BaseApi** — `class UsersApi extends BaseApi`
2. **Constructor pattern** — define `basePath` in constructor (e.g., `this.basePath = '/users'`)
3. **One file per resource** — `automation/api/ResourceNameApi.js` (PascalCase)
4. **One method per endpoint action** — descriptive names (e.g., `createUser`, `getUserById`)
5. **JSDoc** — document all public methods with `@param` and `@returns`
6. **NEVER duplicate BaseApi methods** — call `this.get()`, `this.post()`, etc.

### API Test Spec Rules
1. **File naming** — `automation/tests/api/resource-name.api.spec.js` (kebab-case)
2. **Structure** — `test.describe` → `beforeEach`/`afterEach` → `test` blocks only
3. **Test naming** — `should [expected behavior] when [condition]`
4. **Tags** — every test gets `@api` + (`@smoke` | `@regression` | `@critical`)
5. **Independence** — each test runs independently, no dependency on other tests
6. **No inline API calls** — all requests through API helper methods
7. **No hardcoded data** — import from `fixtures/test-data.js`
8. **No hardcoded tokens** — use `loginAndGetToken()` or `process.env`
9. **Clean up** — created test data cleaned in `afterEach` or `afterAll`
10. **Arrange-Act-Assert** — every test block follows AAA pattern

### Directory Structure
```
automation/
├── api/                          # API helper classes (PascalCase, extend BaseApi)
│   ├── BaseApi.js                # FOUNDATION — common HTTP & validation methods
│   └── [ResourceName]Api.js      # One file per resource
├── tests/
│   └── api/                      # API test specs (kebab-case.api.spec.js)
│       └── [resource].api.spec.js
├── fixtures/
│   └── test-data.js              # FOUNDATION — reuse for API test data
├── utils/
│   └── helpers.js                # FOUNDATION — reuse for API utilities
├── playwright.config.js          # PROTECTED — has 'api' project configured
└── package.json                  # PROTECTED — has 'test:api' script
```

## Anti-Patterns

- **Making raw API calls in test specs** — always use API helper methods
- **Hardcoding auth tokens** — use loginAndGetToken() or process.env
- **Testing only status codes** — always validate response schemas and body content
- **Testing only happy path** — every endpoint needs positive + negative + auth tests
- **Hardcoding API URLs** — use BaseApi.baseUrl from process.env.API_BASE_URL
- **Duplicating API helpers** — common methods belong in BaseApi
- **Creating utility functions inside test specs** — move to utils/helpers.js
- **Ignoring error responses** — test 400, 401, 403, 404, 409 explicitly
- **Skipping auth tests** — every protected endpoint must test unauthenticated access
- **Using ES modules (`import`/`export`)** — this is a CommonJS project
- **Committing `.env` files** — credentials must never be committed
- **Modifying protected files** — `playwright.config.js`, `package.json` are locked

## CalMHSA Domain Context

### FHIR REST API Testing Patterns
CalMHSA uses Medplum's FHIR R4 REST API. Test all standard FHIR operations:

**CRUD Operations per Resource**
```
POST   /fhir/R4/{ResourceType}           → Create (201 Created)
GET    /fhir/R4/{ResourceType}/{id}       → Read (200 OK)
PUT    /fhir/R4/{ResourceType}/{id}       → Update (200 OK)
DELETE /fhir/R4/{ResourceType}/{id}       → Delete (200 OK)
GET    /fhir/R4/{ResourceType}?{params}   → Search (200 OK, Bundle)
```

**Key FHIR Search Parameters to Test**
| Resource | Search Params | Example |
|----------|-------------|---------|
| Patient | family, given, birthdate, identifier | `GET /fhir/R4/Patient?family=Smith&given=John` |
| Encounter | patient, date, status | `GET /fhir/R4/Encounter?patient=Patient/123&status=finished` |
| Observation | patient, code, date, category | `GET /fhir/R4/Observation?patient=Patient/123&code=44249-1` |
| Condition | patient, code, clinical-status | `GET /fhir/R4/Condition?patient=Patient/123&code=35489007` |
| Appointment | patient, date, status | `GET /fhir/R4/Appointment?patient=Patient/123&status=booked` |
| Consent | patient, status, category | `GET /fhir/R4/Consent?patient=Patient/123&status=active` |

**US Core Profile Validation**
For each resource type, verify the response includes:
- `meta.profile` with correct US Core URL (e.g., `http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient`)
- All required fields per US Core profile
- Valid coding system URLs (SNOMED, LOINC, ICD-10-CM, RxNorm)

**Auth Flow Testing**
- Valid OAuth token → 200 OK with resource data
- Expired token → 401 Unauthorized
- Token with insufficient scope → 403 Forbidden
- No token → 401 Unauthorized
- Token for wrong patient → 403 Forbidden (patient-level access)

**Negative Test Patterns**
- Invalid FHIR resource body → 400 Bad Request with OperationOutcome
- Missing required fields → 400 with specific field error
- Invalid reference format → 400 (e.g., `patient: "123"` instead of `patient: "Patient/123"`)
- Non-existent resource → 404 Not Found
- Duplicate create → 409 Conflict (if enforced)

**SUD Data API Tests (42 CFR Part 2)**
- GET SUD Condition without consent → 403 or empty result (consent required)
- GET SUD Condition with active consent → 200 with data
- GET SUD Condition after consent revocation → 403 or empty result
- Bundle search excluding SUD data when no consent → verify SUD Conditions absent from results
- Export endpoint excluding SUD data when no consent → verify SUD data absent

**AuditEvent API Tests**
- After any PHI access, verify AuditEvent was created: `GET /fhir/R4/AuditEvent?date=gt{timestamp}&entity={resource_ref}`
- Verify AuditEvent cannot be deleted: `DELETE /fhir/R4/AuditEvent/{id}` → 403 or 405
- Verify AuditEvent cannot be updated: `PUT /fhir/R4/AuditEvent/{id}` → 403 or 405
