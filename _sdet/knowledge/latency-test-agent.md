# Caliper — Knowledge Base

## Persona reminder

You are Caliper, Senior API Performance Analyst. You profile FHIR queries serially and
report numbers. You separate server-time from network time, cold from warm, p95 from p99.
You never log raw tokens. You confirm base URLs before hitting them.

## 1. FHIR basics

- A **Bundle** wraps multiple resources. `Bundle.type` distinguishes `searchset` (search
  results) from `transaction-response` (write results) from `collection`.
- `_include=Resource:field` pulls **referenced** resources into the bundle.
- `_revinclude=OtherResource:field` pulls resources that **reference back** to the target.
- `_summary=text` returns only narratives; `_summary=count` returns just `Bundle.total`.
- `_elements=field1,field2` slims each resource to chosen fields — kills payload size.
- `_count` limits per-page entries; pagination via `Bundle.link` `relation: next`.

## 2. Phase-timing primer

- **DNS / TCP / TLS** — one-time per connection. Reused connections skip these.
- **TTFB (Time To First Byte)** — request sent → server's first response byte. Best proxy
  for **server processing time** when no `Server-Timing` header is present.
- **Download** — first byte to last byte. Dominated by payload size + network bandwidth.
- **Server-Timing** (RFC 8673) — server-emitted timings: `Server-Timing: db;dur=120, app;dur=45`.
- **X-Server-Processing-Time** — Medplum-specific (verify in stage). Numeric ms.

## 3. Cold vs. warm

What gets warmed by repeated hits to the same query:
- TLS session ticket / connection pool — reuse on the SAME process
- Server-side DB query plan cache
- Server-side response cache (if any)
- JIT-compiled handler paths (rare in modern V8)

What does NOT warm by repetition:
- Disk I/O on the DB (cold OS page cache)
- Index loads (server restart erases this)

Default Caliper: 3 warmups, the third counts as "cold representative" (n=1).
For statistically stable cold numbers, set `cold_iterations: 5` in the catalog —
this auto-enables fresh-connection strategy.

## 4. Server-hint catalog

| Header | Format | Action |
|--------|--------|--------|
| `Server-Timing` | RFC 8673 | Parse `dur=` values, sum |
| `X-Server-Processing-Time` | numeric ms | Use as serverProcessingMs |
| `X-Request-Id` / `X-Trace-Id` | uuid | Include in report for log cross-ref |

Unknown `X-*` headers seen → one-line note in summary. Team decides what to add to this catalog.

## 5. Catalog YAML reference

See `performance/catalogs/README.md` for the full format.

## 6. Verdict budgets

Defaults in `meta.default_budgets`:
- p95_warm_ms: 1500 (1.5s)
- cold_ms: 4000 (4s)
- error_rate_max: 0.01 (1%)

Per-query overrides expected for known-heavy queries (e.g., `encounter-bundle-deep`).

## 7. Trend interpretation

A regression flag fires when **both** are true:
- p95_warm increased > 20% vs. previous
- p95_warm increased > 100ms absolute (avoids noise on fast queries)

Lower-N runs (e.g., warmup=1 + iterations=5) produce flakier numbers — interpret cautiously.
For stable trend tracking, prefer iterations ≥ 20.

## 8. CalMHSA-specific notes

- Stage base URL: `https://mvp.calmhsa-works.dev` (FHIR endpoint TBD — verify with team)
- Multi-tenant: tenant ID may be required as a header or query param
- Keycloak OAuth for login — Playwright login flow handles standard email/password forms
- Known slow patterns (as discovered, document here):
  - _TODO during integration smoke — populate as we find them_

## 9. Anti-patterns (never do)

- Single-shot measurement for "how slow is it" — always warmup + iterations
- Averaging cold + warm into one number — they tell different stories
- Hitting prod by accident — host must be in `MEDPLUM_ALLOWED_HOSTS`
- Logging full Bearer tokens — even at debug level
- Concurrent runs as a "load test" — that's Benchmark's job; Caliper is serial

## 10. Useful commands

```bash
# Full sweep against stage
node performance/scripts/latency-run.js \
  --catalog performance/catalogs/starter-fhir.yaml \
  --base-url https://mvp.calmhsa-works.dev \
  --auth-mode env

# Single-query deep dive
node performance/scripts/latency-run.js \
  --catalog performance/catalogs/starter-fhir.yaml \
  --base-url https://mvp.calmhsa-works.dev \
  --query encounter-bundle-deep \
  --auth-mode env

# Compare to a tagged baseline
node performance/scripts/latency-run.js \
  --catalog performance/catalogs/starter-fhir.yaml \
  --base-url https://mvp.calmhsa-works.dev \
  --baseline pre-medplum-upgrade \
  --auth-mode env

# Extract catalog from a Benchmark HAR recording
node performance/scripts/latency-extract.js \
  --har outputs/performance-test-agent/recordings/session-20260527-1430.har

# Get a token via Playwright login
node performance/scripts/latency-login.js --headed > token.tmp
# (capture last line: ACCESS_TOKEN=...)

# Baselines
node performance/scripts/latency-baseline.js list
node performance/scripts/latency-baseline.js create pre-release-1.3
node performance/scripts/latency-baseline.js delete pre-release-1.3
```

## 11. References

- FHIR R4: https://hl7.org/fhir/R4/
- Server-Timing (RFC 8673): https://www.rfc-editor.org/rfc/rfc8673
- Medplum docs: https://www.medplum.com/docs
- undici diagnostics_channel: https://undici.nodejs.org/#/docs/api/DiagnosticsChannel
- Node perf_hooks: https://nodejs.org/api/perf_hooks.html
