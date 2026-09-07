# Write API Tests — Detailed Instructions

**Workflow:** write-api-tests
**Agent:** Requester (API Test Agent)
**Purpose:** Create Playwright API tests from Swagger/OpenAPI, Postman collections, backend source code, or manual endpoint descriptions.

---

## Step 0: Read the Framework [CHECKPOINT 0]

Before doing anything, scan the existing automation framework:

1. Read `automation/package.json` for dependencies and scripts
2. Read `automation/playwright.config.js` for the API project configuration
3. Read `automation/.env.example` for required environment variables
4. Scan `automation/api/` for existing API helper classes (BaseApi.js + resource helpers)
5. Scan `automation/tests/api/` for existing API test specs
6. Scan `automation/fixtures/` for existing test data (test-data.js)
7. Scan `automation/utils/` for existing helpers (helpers.js)

**Store everything found in session memory.** This prevents overwriting or duplicating work.

Announce: **CHECKPOINT 0 COMPLETE** — Framework scanned, N existing files found.

---

## Step 1: Obtain API Specification [CHECKPOINT 1]

### 1a. Ask the user for the API spec source

Present the 4 options:
1. **Swagger/OpenAPI** — JSON or YAML file, or hosted URL
2. **Postman Collection** — exported collection JSON file
3. **Source Code** — backend source code path
4. **Manual** — describe endpoints directly in chat

### 1b. Parse the specification

**From Swagger/OpenAPI:**
- Read the JSON/YAML file (support both formats)
- Extract all `paths` — each path + method = one endpoint
- Extract `components/schemas` — request/response data shapes
- Extract `securityDefinitions` or `components/securitySchemes` — auth requirements
- Extract `servers` — base URL
- Group endpoints by tags (tags map to API resources)
- Note required vs optional parameters

**From Postman Collection:**
- Read the collection JSON file
- Extract requests from folders and root level
- For each request: method, URL, headers, body, pre-request scripts, tests
- Map Postman `{{variables}}` to `process.env` equivalents
- Group by folder structure (each folder → one test describe block)
- Extract any Postman tests/assertions as starting points

**From Source Code:**
- Ask the user for the backend framework (Express, Django, Spring Boot, NestJS, FastAPI)
- Scan for route definitions:
  - **Express.js:** `router.get('/')`, `router.post('/')`, `app.use('/api', router)`
  - **Django REST:** `urlpatterns = [path('api/', ...)]`, `@api_view(['GET'])`
  - **Spring Boot:** `@GetMapping`, `@PostMapping`, `@RestController`, `@RequestMapping`
  - **NestJS:** `@Get()`, `@Post()`, `@Controller('resource')`
  - **FastAPI:** `@app.get('/api/...')`, `@app.post('/api/...')`
- Extract controller methods, parameter types, response types
- Identify middleware (auth guards, validators, rate limiters)
- Map DTOs/models to request/response schemas

**From Manual Input:**
- Ask the user to describe each endpoint one at a time:
  - Method + Path (e.g., `POST /api/users`)
  - Request headers (if any beyond standard)
  - Query parameters (if any)
  - Request body schema (field names, types, required/optional)
  - Expected response codes and body schemas
  - Auth requirement (none, user, admin)
- Build endpoint catalog from descriptions
- Confirm the catalog with the user before proceeding

### 1c. Choose scale depth

Ask: Quick (3-5 endpoints), Standard (8-15 endpoints), or Enterprise (full coverage)?

Announce: **CHECKPOINT 1 COMPLETE** — N endpoints discovered from [source], [scale] depth selected.

---

## Step 2: Analyze API Endpoints [CHECKPOINT 2]

Build a structured endpoint catalog. For each endpoint:

| Field | Details |
|-------|---------|
| Method | GET, POST, PUT, PATCH, DELETE |
| Path | Full path with parameters (e.g., `/users/:id`) |
| Auth | Required role or public |
| Request Body | Schema with required/optional fields |
| Response 2xx | Success response schema |
| Response 4xx | Error response schemas (400, 401, 403, 404, 409) |
| Dependencies | Other endpoints needed first (e.g., create before update) |

**Group by resource** — each group of related endpoints becomes one API helper class and one test spec.

**Identify CRUD resources** — resources with Create + Read + Update + Delete get lifecycle tests.

**Scale-aware behavior:**
- **quick:** Focus on top 3-5 critical endpoints, skip query/filter endpoints
- **standard:** Cover all resources, include pagination and filtering
- **enterprise:** Cover every endpoint including edge cases, rate limiting, and concurrent access

Announce: **CHECKPOINT 2 COMPLETE** — N endpoints across M resources cataloged.

---

## Step 3: Create API Helper Classes [CHECKPOINT 3]

### BaseApi.js — already exists as foundation
DO NOT recreate. It provides: `get`, `post`, `put`, `patch`, `delete`, `setAuthToken`, `loginAndGetToken`, `expectStatus`, `expectSchema`, `expectError`, `create`, `read`, `update`, `remove`, `list`.

### Create resource-specific API helpers

For each API resource, create a helper in `automation/api/`:

**File naming:** `ResourceNameApi.js` (PascalCase)

**Pattern:**
```javascript
const { BaseApi } = require('./BaseApi');

/**
 * UsersApi — API helper for /users endpoints.
 */
class UsersApi extends BaseApi {
  constructor(request) {
    super(request);
    this.basePath = '/users';
  }

  /** Create a new user. */
  async createUser(data) {
    return this.post(this.basePath, data);
  }

  /** Get a user by ID. */
  async getUserById(id) {
    return this.get(`${this.basePath}/${id}`);
  }

  /** Update a user. */
  async updateUser(id, data) {
    return this.put(`${this.basePath}/${id}`, data);
  }

  /** Delete a user. */
  async deleteUser(id) {
    return this.delete(`${this.basePath}/${id}`);
  }

  /** List users with optional filters. */
  async listUsers(params) {
    return this.get(this.basePath, { params });
  }
}

module.exports = { UsersApi };
```

**Rules:**
- Every helper extends BaseApi
- Define `basePath` in constructor
- One method per endpoint action
- JSDoc for all public methods
- CommonJS exports
- NEVER duplicate BaseApi methods

Announce: **CHECKPOINT 3 COMPLETE** — N API helper classes created.

---

## Step 4: Write API Test Specs [CHECKPOINT 4]

### File naming
`resource-name.api.spec.js` (kebab-case + `.api.spec.js`)

### Test order per resource

Write tests in this category order:

1. **CRUD Lifecycle** (`@api @smoke`) — Full create → read → update → delete flow
2. **Validation** (`@api @regression`) — Missing fields, invalid types, boundary values
3. **Auth** (`@api @critical`) — No token, invalid token, wrong role
4. **Error Handling** (`@api @regression`) — 404, 409, invalid IDs
5. **Query & Filtering** (`@api @regression`) — Pagination, sorting, search

### Rules
- All API calls through helper methods — NEVER inline
- All test data from TestData — NEVER hardcode
- All auth via loginAndGetToken() or process.env — NEVER hardcode tokens
- Each test independent — no inter-test dependencies
- Clean up created data in afterEach/afterAll
- Tag every test: `@api` + scope tag

### Scale-aware behavior
- **quick:** CRUD lifecycle + basic auth tests only (skip validation, query, error tests)
- **standard:** CRUD + validation + auth + error handling (skip deep query/filter tests)
- **enterprise:** All 5 categories for every resource + security payloads + concurrent tests

Announce: **CHECKPOINT 4 COMPLETE** — N test specs with M total tests written.

---

## Step 5: Run Tests & Generate Report [CHECKPOINT 5]

### Run tests
```bash
cd automation && npm run test:api
```

### Fix failures
If any tests fail, investigate and fix before proceeding.

### Generate coverage report
Save to `outputs/api-test-agent/api-test-summary.md` with:
- Overview (source, scale, totals)
- Resource coverage table
- Test category breakdown
- Status code coverage
- Coverage gaps
- Recommendations for follow-up

### Best practices checklist
- [ ] All tests use API helper methods (no inline API calls)
- [ ] All test data from TestData factory (no hardcoded data)
- [ ] All auth via process.env or loginAndGetToken() (no hardcoded tokens)
- [ ] Every endpoint has positive + negative + auth tests
- [ ] Response schemas validated (not just status codes)
- [ ] All code uses CommonJS (require/module.exports)
- [ ] Tests tagged with @api + @smoke/@regression/@critical
- [ ] No duplicated methods across API helpers — common methods in BaseApi
- [ ] Clean up created test data in afterEach/afterAll

Announce: **CHECKPOINT 5 COMPLETE** — All tests passing, coverage report saved.

---

**Gate Rule:** All checkpoint items must be verified before API tests are considered complete. Document any known limitations or untestable endpoints.
