# Courier — Postman Agent Knowledge

> Training file for Courier (Senior Postman Collection Specialist).
> Edit this file to customize Courier's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Collection Hygiene Rules (CRITICAL)
- **No hardcoded base URLs, tokens, or IDs** — every environment-specific value is a
  `{{variable}}` resolved from an environment file, never pasted into a request URL,
  header, or body
- **Every request needs at least a status-code `pm.test()`** — a request with zero test
  blocks is unverified, not tested
- **Auth lives at the collection or folder level** — set it once and let requests inherit
  (`"auth": {"type": "inherit"}`); only override for the login request itself and
  deliberate auth-negative requests
- **Environments are separate files, one per environment** — never bake a QA base URL or
  staging token into the collection JSON itself
- **Secrets never get a committed real value** — environment files ship with empty
  placeholders (`"type": "secret"`, `"value": ""`); real values come from Newman
  `--env-var`, a CI secret, or a local `.env` wrapper script

### Structure Rules
- Folders map 1:1 to API resources; a flat list of loose requests is not acceptable
- One request per distinct method + path + scenario — do not overload one request's test
  script to cover multiple response shapes; use a data file (see Data-Driven note) instead
- Name requests `<Verb> <thing>` (e.g. `Create User`, `Get Orders — No Token (expect 401)`)
  so the collection is scannable without opening every request

## Learnings

<!-- Add learnings from past collection-building sessions -->

## Postman Collection v2.1 Structure

A collection JSON has four top-level building blocks:
```json
{
  "info": { "name": "My API Collection", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  "item": [
    { "name": "Users", "item": [
      { "name": "Create User",
        "request": {
          "method": "POST",
          "header": [{ "key": "Content-Type", "value": "application/json" }],
          "body": { "mode": "raw", "raw": "{\"email\":\"{{email}}\"}" },
          "url": { "raw": "{{base_url}}/api/users", "host": ["{{base_url}}"], "path": ["api", "users"] }
        },
        "event": [
          { "listen": "prerequest", "script": { "exec": ["// pre-request script"] } },
          { "listen": "test", "script": { "exec": ["pm.test('status 201', () => pm.response.to.have.status(201));"] } }
        ]
      }
    ]}
  ],
  "auth": { "type": "bearer", "bearer": [{ "key": "token", "value": "{{auth_token}}" }] },
  "variable": [{ "key": "api_version", "value": "v1" }]
}
```

- **`info`** — collection name, description, schema version (always v2.1.0 for new work)
- **`item`** — an array of requests OR folders (a folder's own `item` is an array of
  requests — nesting is how sub-folders work)
- **`request`** — method, header array, body (`raw`/`urlencoded`/`formdata`/`graphql`), and
  `url` (raw string plus parsed host/path/query for the Postman UI)
- **`event`** — `listen: "prerequest"` or `listen: "test"`, each with a `script.exec` array
  of JS lines (pre-request runs before the call; test runs after the response arrives)
- **`auth`** at collection/folder/request level — `bearer`, `apikey`, `basic`, `oauth2`,
  `noauth`, or `{"type": "inherit"}` to fall through to the parent scope
- **`variable`** — collection-scoped variables, lowest-priority override above environment

## Common pm.* Assertion Snippets
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Status is one of 200/201", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));
pm.test("Response time < 500ms", () => pm.expect(pm.response.responseTime).to.be.below(500));
pm.test("Body has email field", () => {                        // body / JSON-path value
  const body = pm.response.json();
  pm.expect(body).to.have.property("email");
  pm.expect(body.email).to.eql(pm.environment.get("expected_email"));
});
const schema = { type: "object", required: ["id", "email"],    // JSON schema validation
  properties: { id: { type: "number" }, email: { type: "string" } } };
pm.test("Response matches schema", () => pm.response.to.have.jsonSchema(schema));
pm.test("Content-Type is JSON", () =>                          // header presence
  pm.response.to.have.header("Content-Type", "application/json; charset=utf-8"));
pm.test("Save created user id", () => {                        // chain value to next request
  pm.environment.set("created_user_id", pm.response.json().id);
});
pm.test("Unauthenticated request is rejected", () => pm.response.to.have.status(401));
pm.test("Error body has no stack trace", () => {                // negative-path assertion
  pm.expect(JSON.stringify(pm.response.json())).to.not.include("at Object.");
});
```

## Environment & Variable Scoping

Postman resolves `{{variable}}` using this precedence, **highest wins** (narrowest scope overrides broadest):

| Scope | Set where | Lifetime | Typical use |
|-------|-----------|----------|-------------|
| **Local** | `pm.variables.set()` in a script | Current request/script run only | Throwaway computed values |
| **Data** | Data file (CSV/JSON) passed via `-d` | Current iteration only | Per-row request variants |
| **Environment** | Environment JSON (`{env}.postman_environment.json`) | Until switched/edited | `base_url`, `auth_token`, per-env IDs |
| **Collection** | `variable` array in the collection JSON | Until collection edited | Stable cross-env values (`api_version`) |
| **Global** | Global variables in the Postman app | Until cleared | Cross-collection scratch values — avoid for CI (not portable via Newman without `--globals`) |

Rule of thumb: put anything environment-specific in the **environment** file, anything
CI-portable and stable in **collection** variables, and never rely on **global** variables
for anything Newman needs to run headlessly (globals require an extra `--globals` file).

## Newman CLI Usage
```bash
npx newman run collection.json -e environment.json                       # basic run
npx newman run collection.json -e environment.json -d data/users.csv \   # data-driven + HTML report
  --reporters cli,html --reporter-html-export newman-report.html
npx newman run collection.json -e environment.json \                     # inject secret at run time
  --env-var "auth_token=$CI_AUTH_TOKEN"
npx newman run collection.json -e environment.json \                     # one folder, capped iterations/timeout
  --folder "Users" --iteration-count 3 --timeout-request 10000
```

Install: `npm install -g newman newman-reporter-html` (or as a dev dependency, invoke via
`npx`). Newman requires Node.js and runs the exact same collection/environment JSON as the
desktop app, so what passes locally passes in CI. Newman exits non-zero on any failed
assertion — `newman run ...` alone is a sufficient CI gate.

## Data-Driven Testing Note

For requests that exercise multiple valid/invalid payloads (e.g., every required field missing,
or bulk-creating N users), do not duplicate the request — externalize into a CSV/JSON file:

```csv
email,firstName,expectedStatus
valid@example.com,Jane,201
,Jane,400
not-an-email,Jane,400
```

Reference columns in the request body via `{{email}}`/`{{firstName}}`; read the expected
outcome per row in the test script so one request definition validates every row:

```javascript
pm.test("Status matches expected for this row", () => {
  pm.response.to.have.status(Number(pm.iterationData.get("expectedStatus")));
});
```

Run with `-d data/users.csv` (Newman auto-detects CSV vs JSON by extension) — CSV rows or
JSON array elements each become one iteration.
