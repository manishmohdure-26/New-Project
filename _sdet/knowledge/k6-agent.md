# Surge — k6 Agent Knowledge

> Training file for Surge (Senior k6 Performance Engineer).
> Edit this file to customize Surge's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Threshold Rules (CRITICAL)
- **Every threshold must be able to fail the run** — if a threshold checks a metric the
  script can never breach in practice, rewrite or remove it
- **Never invent SLO numbers** — pull p(95)/p(99) targets and error-rate ceilings from
  the user or from `outputs/performance-test-agent/` verdict reports; ask if missing
- **`http_req_failed` is mandatory** on any script that calls real HTTP endpoints — a
  script with only latency thresholds can "pass" while every request 500s

### Executor Rules
- State the executor choice and the one-line reason in a comment above `options.scenarios`
- Never default to `ramping-vus` without confirming the test is concurrency-shaped —
  throughput-shaped SLOs need `constant-arrival-rate` or `ramping-arrival-rate`
- `preAllocatedVUs` for arrival-rate executors must have headroom above the expected
  concurrency, or k6 will throttle and silently under-deliver the target rate

### Data & Script Hygiene
- File-based test data loads through `SharedArray` in init context — loading it inside
  the default function re-parses the file per iteration and corrupts memory/timing
- No hardcoded base URLs or credentials — read via `__ENV.BASE_URL` /
  `__ENV.TEST_USER` etc., sourced from `project-context.md` or the CI environment
- `setup()` returns data consumed by the default function (e.g., an auth token) —
  never re-authenticate inside every iteration unless the SLO is explicitly about login

## Learnings

<!-- Add learnings from past k6 scripting sessions -->

## k6 Script Anatomy Reference

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend } from 'k6/metrics';

const users = new SharedArray('users', () => JSON.parse(open('./data/users.json'))); // 1. init: load once
const loginDuration = new Trend('login_duration');                                    //    define custom metrics

export const options = {
  scenarios: { /* see Executors table */ },      // 2. options: scenarios/executors
  thresholds: { /* see Thresholds & Checks */ }, //    + thresholds
};

export function setup() {                        // 3. runs once before VUs start
  const res = http.post(`${__ENV.BASE_URL}/auth/login`, { user: 'svc' });
  return { token: res.json('token') };            //    return value passed to default fn
}

export default function (data) {                  // 4. the iteration loop, per VU
  const res = http.get(`${__ENV.BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${data.token}` } });
  check(res, { 'status is 200': (r) => r.status === 200 });
  loginDuration.add(res.timings.duration);
  sleep(1); // think time
}

export function teardown(data) {                  // 5. runs once after all VUs finish
  http.post(`${__ENV.BASE_URL}/auth/logout`, { token: data.token });
}
```

**VUs vs iterations:** a VU is a persistent execution context that loops the default
function until the executor stops it; an iteration is one pass through that function.
VU count controls concurrency; iteration count/rate controls volume/throughput —
conflating the two produces a mis-scaled test.

## Executors & Scenarios Table

| Executor | Controls | Use When |
|----------|----------|----------|
| `ramping-vus` | VU count over `stages` (time-based ramp) | Modeling realistic concurrent-user growth/decline (smoke → load → soak) |
| `constant-vus` | Fixed VU count for a fixed `duration` | Simple steady-state soak, no ramp needed |
| `constant-arrival-rate` | Fixed iterations/sec regardless of response time | SLO is a throughput target independent of how many VUs it takes |
| `ramping-arrival-rate` | Iteration rate ramps over `stages` | Stress tests that need a growing throughput target |
| `per-vu-iterations` | Each VU runs exactly N iterations | Fixed, deterministic workload volume per VU |
| `shared-iterations` | A fixed total iteration count shared across VUs | Fixed total workload, don't care about per-VU split |

```javascript
scenarios: {
  ramp_to_peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [{ duration: '2m', target: 50 }, { duration: '5m', target: 50 }, { duration: '1m', target: 0 }],
    gracefulRampDown: '30s',
  },
  fixed_throughput: {
    executor: 'constant-arrival-rate',
    rate: 100, timeUnit: '1s', duration: '5m', preAllocatedVUs: 50, maxVUs: 100,
  },
}
```

## Thresholds & Checks Syntax

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],   // 95% under 500ms, 99% under 1s
  http_req_failed: ['rate<0.01'],                    // error rate under 1%
  'http_req_duration{scenario:fixed_throughput}': ['p(95)<300'], // per-scenario threshold
  login_duration: ['p(95)<800'],                     // custom Trend metric threshold
  checks: ['rate>0.99'],                              // 99%+ of checks must pass
}
```

- **`check()`** records pass/fail per assertion but does NOT fail the run by itself — only
  a threshold (built-in `checks` rate, or a custom Rate metric) can fail the run.
- Thresholds support `abortOnFail: true` to stop early on breach — use for smoke tests.

## Custom Metric Types

| Type | Purpose | Example |
|------|---------|---------|
| `Trend` | Tracks a distribution of values (durations, sizes) — exposes min/max/avg/percentiles | `new Trend('checkout_duration')` |
| `Counter` | Cumulative count of an event | `new Counter('cart_abandonments')` |
| `Rate` | Percentage of truthy values (pass/fail ratio) | `new Rate('login_success_rate')` |
| `Gauge` | Latest value only (point-in-time) | `new Gauge('active_sessions')` |

## SharedArray Data Pattern

```javascript
const testUsers = new SharedArray('test users', () => JSON.parse(open('./data/users.json'))); // once, init context
export default function () {
  const user = testUsers[__VU % testUsers.length]; // distribute across VUs
}
```

Loading data any other way (module-level `open()` without `SharedArray`, or `open()`
inside the default function) either duplicates data per-VU (memory blowup) or re-reads
the file per-iteration (I/O overhead skewing timing results).

## Load Profile / Stages Example

A realistic ramp for a mid-size workflow load test — state in the run guide which
segment each threshold is expected to be evaluated against:

```javascript
stages: [
  { duration: '1m', target: 10 },   // warm-up
  { duration: '3m', target: 50 },   // ramp to expected peak concurrency
  { duration: '10m', target: 50 },  // sustain at peak — SLOs matter most here
  { duration: '2m', target: 100 },  // stress spike beyond expected peak
  { duration: '3m', target: 0 },    // ramp-down: confirm graceful drain
],
```
