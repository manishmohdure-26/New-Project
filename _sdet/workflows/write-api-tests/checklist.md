# Write API Tests — Quality Gate Checklist

**Workflow:** write-api-tests
**Agent:** Requester (API Test Agent)
**Purpose:** Verify that API tests are complete, stable, and follow best practices.

---

## Checkpoint 0: Framework Setup

- [ ] `automation/` directory structure verified and complete
- [ ] `automation/api/BaseApi.js` exists (foundation file)
- [ ] `automation/tests/api/` directory exists
- [ ] `playwright.config.js` has `api` project configured
- [ ] `package.json` has `test:api` script
- [ ] `.env` file has `API_BASE_URL` configured
- [ ] Session memory initialized with existing files

## Checkpoint 1: API Specification & Scale

- [ ] API spec source selected (Swagger, Postman, source code, or manual)
- [ ] API specification parsed and endpoints extracted
- [ ] Endpoints grouped by resource
- [ ] Auth requirements identified for each endpoint
- [ ] Scale selected (quick / standard / enterprise)

## Checkpoint 2: Endpoint Analysis

- [ ] Endpoint catalog built with method, path, auth, request/response schemas
- [ ] Resources identified and grouped
- [ ] CRUD resources identified (resources with full Create/Read/Update/Delete)
- [ ] Dependencies mapped (e.g., create before update)
- [ ] Test categories planned per endpoint (CRUD, validation, auth, error, query)

## Checkpoint 3: API Helper Classes

- [ ] BaseApi.js exists and is NOT recreated (foundation file — extend only)
- [ ] API helper class created for each resource (`automation/api/ResourceNameApi.js`)
- [ ] All helpers extend BaseApi
- [ ] `basePath` defined in each helper constructor
- [ ] One method per endpoint action
- [ ] JSDoc comments on all public methods
- [ ] No duplicated methods across helpers — common methods in BaseApi
- [ ] All code uses CommonJS (`require`/`module.exports`)

## Checkpoint 4: API Test Specs

- [ ] Test files follow `resource-name.api.spec.js` naming convention
- [ ] Test files saved to `automation/tests/api/`
- [ ] Tests use `test.describe` blocks to group by resource
- [ ] Tests use `beforeEach` for setup (API helper + auth)
- [ ] Test names follow `should [expected] when [condition]` pattern
- [ ] Each test is independent (no inter-test dependencies)
- [ ] Tests tagged with `@api` + `@smoke`, `@regression`, or `@critical`
- [ ] CRUD lifecycle tests present for CRUD resources
- [ ] Validation tests present (missing fields, invalid types, boundaries)
- [ ] Auth tests present (no token → 401, wrong role → 403)
- [ ] Error handling tests present (404, 409, invalid IDs)
- [ ] No inline API calls — all through API helper methods
- [ ] No hardcoded test data — all from fixtures/test-data.js
- [ ] No hardcoded auth tokens — uses loginAndGetToken() or process.env
- [ ] Clean up of created test data in afterEach/afterAll

## Checkpoint 5: Execution & Report

- [ ] All API tests pass (`npm run test:api`)
- [ ] Response schemas validated (not just status codes)
- [ ] All code uses CommonJS (require/module.exports)
- [ ] No duplicated methods across helpers or specs
- [ ] Coverage report saved to `outputs/api-test-agent/api-test-summary.md`
- [ ] Coverage gaps identified and documented
- [ ] Recommendations for follow-up noted
- [ ] Handoff to Bug Reporter suggested (if failures found)
- [ ] Handoff to Test Data Agent suggested (if specialized data needed)

---

**Gate Rule:** All checkpoint items must be checked before API tests are considered complete. If any test fails, investigate and fix before marking the checkpoint as done. Document any known limitations or untestable endpoints.
