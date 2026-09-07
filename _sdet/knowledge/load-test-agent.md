# Hauler — Load Test Agent Knowledge

> Training file for Hauler (Senior Load Testing Specialist).
> Edit this file to customize Hauler's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Workload Model Rules (CRITICAL)
- **Every concurrency/throughput number MUST show its Little's Law derivation** — a bare
  number like "50 users" without `L = lambda x W` and the source of each input is a guess,
  not a workload model
- **Traffic inputs come from analytics, project-context.md, or the user** — never assume
  a peak-user count or requests/sec figure
- **State the test type explicitly** — LOAD (expected/forecast peak, sustained) is
  distinct from STRESS (find the breakpoint), SPIKE (sudden surge), and SOAK (multi-hour
  endurance); do not silently drift into one of the others
- **SLAs/SLOs are set before the run**, not chosen afterward to fit whatever number came
  back — that is result-shopping, not testing

### Load Profile Rules
- Every profile has three explicit phases: ramp-up, steady-state, ramp-down — each with a
  stated duration and rationale, never just "ramp up then run"
- Ramp-up must avoid a thundering-herd connection spike — step or linear ramp, not an
  instant jump to peak concurrency
- Steady-state duration must be long enough to observe cyclical effects (GC pauses,
  connection pool cycling, cache warm-up/expiry) — a 60-second steady-state proves nothing
- Ramp-down is not optional — it confirms resources release cleanly and no error spike
  occurs on teardown

### Monitoring Rules
- Both server-side AND client-side metrics are mandatory — client-side timing alone shows
  a symptom, not a cause
- Every monitored metric names an owner/source (APM dashboard, DB monitor, load-tool
  listener) so nobody discovers mid-run that nothing is capturing it

## Learnings

<!-- Add learnings from past load testing sessions -->

## Workload Modeling Procedure (Little's Law)

Little's Law: **L = lambda x W**

- **L** = average number of concurrent users/requests in the system (what you configure
  as thread count / virtual users in the load tool)
- **lambda** (arrival rate) = throughput — requests or transactions arriving per unit time
  (e.g., requests/sec)
- **W** = average time a request spends in the system = average response time + average
  user think-time between actions

**Procedure:**
1. Get peak throughput (lambda) from analytics (e.g., peak requests/sec from APM/CDN
   logs) or derive it from business volume: `daily peak-hour transactions / 3600`.
2. Get average time-in-system (W): average API/page response time (from
   `outputs/performance-test-agent/` prior runs if available) plus realistic user
   think-time (3-10s for a human-driven UI flow; near-0 for pure API load).
3. Compute `L = lambda x W`. This is the target concurrent virtual user count.
4. Cross-check: if only peak concurrent users is known (not throughput), invert the
   formula: `lambda = L / W` to get the implied throughput target instead.
5. Repeat per key transaction if transactions have very different W (e.g., a report
   export with W = 8s vs. a search with W = 0.3s need separate concurrency figures, then
   combine into the overall thread group / scenario mix).

**Worked example:** Peak throughput = 45 req/s (from CDN logs), avg response time =
900ms, avg think-time = 300ms -> W = 1.2s -> L = 45 x 1.2 = 54 concurrent virtual users.

## Load Profile Design Guide

| Phase | Purpose | Typical Duration | Design Rule |
|-------|---------|-------------------|-------------|
| Ramp-up | Bring load to target without a connection-pool/thundering-herd spike | 10-20% of total test time | Step load (e.g., +10% of L every 30-60s) or linear ramp; never instant-to-peak |
| Steady-state | Observe sustained behavior — the phase results are graded on | 60-70% of total test time | Long enough to span at least 2-3 GC cycles or cache TTL windows; minimum 10-15 min for most web apps |
| Ramp-down | Confirm clean resource release, no teardown error spike | 10-20% of total test time | Linear or step down to 0; watch for connection-close errors or queue drain failures |

**Step-load variant** (useful when the SLO is "find where it starts to degrade within
expected range"): increase L in fixed increments (e.g., 25%, 50%, 75%, 100% of target),
holding each step 3-5 minutes, to see where p95 first crosses the SLO — while remaining a
load test because you stop at expected peak, not at breakpoint (that is stress testing's
job).

## SLA / SLO Reference

| Metric | What it Measures | Typical Starting Point (confirm with user/NFR) |
|--------|-------------------|--------------------------------------------------|
| p50 (median) latency | Typical user experience | Informational — rarely the pass/fail gate |
| p95 latency | Experience for all but the worst 5% | Most common primary SLO gate |
| p99 latency | Tail latency — worst 1% | Set when tail experience is business-critical (checkout, payment) |
| Error rate | % of requests failing (5xx, timeout, connection refused) | < 1% is a common default; 0% for financial/critical transactions |
| Throughput | Sustained requests/transactions per second achieved | Must meet or exceed the Little's Law-derived target, not just "not crash" |
| Error budget | Allowed failure rate before the SLO is considered breached over a period | Derived from error rate SLO x traffic volume over the SLO window |

Never assume a percentile threshold — pull it from an NFR document, `project-context.md`,
or ask the user. Document the source next to every SLO row.

## Monitoring Checklist

**Server-side (explains WHY):**
- [ ] CPU utilization per app/service instance
- [ ] Memory utilization and GC pause frequency/duration (for GC'd runtimes)
- [ ] DB connection pool usage (active/idle/wait count) and slow-query log
- [ ] Queue/message broker depth (if async processing is in the transaction path)
- [ ] Thread pool / worker saturation on the app server
- [ ] Network I/O and open socket count
- [ ] Downstream/third-party dependency latency (isolate app latency from dependency latency)

**Client-side (explains WHAT the user experienced):**
- [ ] Response time percentiles (p50/p95/p99) per transaction
- [ ] Error rate and error type breakdown (timeout vs. 5xx vs. connection refused)
- [ ] Achieved throughput vs. target throughput over time
- [ ] Active thread/virtual-user count over time (confirms the profile executed as designed)
- [ ] Apdex or similar satisfaction score, if the project tracks one

## Results Interpretation Guide (Bottleneck Signatures)

| Symptom | Likely Bottleneck |
|---------|--------------------|
| Latency rises smoothly with load, error rate stays ~0 | Resource saturation approaching capacity (CPU/DB) — expected at high end of profile, concerning if it appears well below target L |
| Latency flat, then a sudden cliff (sharp error-rate spike) | A hard limit was hit — connection pool exhausted, thread pool exhausted, queue full |
| Errors cluster right after ramp-up starts, then subside | Thundering-herd / cold-start effect — connection pool or cache not warmed; consider a gentler ramp or pre-warm step |
| Throughput plateaus below target while latency climbs | Backend concurrency limit (DB connection pool, thread pool) capping effective throughput regardless of offered load |
| Client-side latency high but server-side CPU/DB metrics look idle | Bottleneck is likely network, load-generator capacity, or a downstream third-party dependency — not the app under test |
| Errors increase during ramp-down, not during steady-state | Resource cleanup/connection-close handling issue, not a capacity issue — investigate teardown code path |
| p95 within SLO but p99 far outside it | Long-tail issue — likely GC pauses, occasional slow query, or cache-miss path; check monitoring for periodic spikes, not sustained load |
| Results significantly worse than the previous baseline run at the same L | Regression introduced since baseline — compare against `outputs/performance-test-agent/` history, not the SLO alone, to catch degradation before it crosses the SLO line |
