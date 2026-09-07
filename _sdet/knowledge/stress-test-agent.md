# Crusher — Stress Test Agent Knowledge

> Training file for Crusher (Senior Stress Testing Specialist).
> Edit this file to customize Crusher's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Stress vs. Load vs. Spike vs. Soak (CRITICAL)
- **Load testing** proves the system handles expected peak — it stops AT peak. Crusher's
  job starts where load testing stops.
- **Stress testing** (Crusher) increments load PAST expected peak in steps until the
  system breaks, to find the breakpoint and observe how it fails and recovers.
- **Spike testing** is a sudden, near-instant surge to an extreme level (not a gradual
  ramp) — it tests reaction to abruptness, not the location of the breakpoint.
- **Soak testing** holds a sustained normal-to-moderate load for an extended duration
  (hours) to find slow leaks (memory, connections, disk) — it is about time, not load
  magnitude.
- Never blend these profiles into one run. If `outputs/load-test-agent/` shows a spike or
  soak profile, reference it but do not reuse its ramp shape for a stress test.

### Breakpoint Discovery Rules
- Always ramp in steps from a known baseline — never jump straight to an arbitrary high
  load, which produces an unusable single data point instead of a curve.
- Every step must hold long enough to reach steady state (typically 3-5 minutes) before
  the next increment — a step that is too short measures transient behavior, not
  sustained capacity.
- Stop the ramp immediately (do not wait for the next scheduled step) if: the system
  becomes fully unresponsive, data integrity is at risk, or the pre-agreed safety ceiling
  is reached.

## Learnings

<!-- Add learnings from past stress testing sessions -->

## Breakpoint-Discovery Procedure (Step-Load Ramp)

1. **Establish baseline.** Confirm current expected peak (concurrency or RPS) from
   `outputs/load-test-agent/` or the user. Run one step at 100% of this peak first to
   confirm the system behaves as expected before stressing it further.
2. **Choose increment size.** 20-25% of baseline per step is typical — small enough to
   locate the knee precisely, large enough that the ramp doesn't take excessive time.
   Tighten to 10% increments once early steps suggest the knee is close, to pinpoint it.
3. **Choose hold duration.** 3-5 minutes per step for most web/API systems — long enough
   for connection pools, caches, and autoscaling (if disabled during the test) to reach
   steady state, short enough to keep the full ramp practical.
4. **Instrument every step identically.** Capture throughput, error rate, p50/p95/p99
   latency, CPU, memory, thread pool queue depth, and connection pool utilization at
   every step — inconsistent instrumentation makes step-to-step comparison invalid.
5. **Ramp until one of three outcomes:**
   - The **knee** appears (throughput growth flattens while load keeps increasing) —
     continue a few more steps past it to confirm it's not noise, then find the breakpoint.
   - The **breakpoint** is crossed (a hard threshold fails: error rate, timeout rate, or
     availability SLA) — stop the ramp, this step is the breakpoint.
   - The **safety ceiling** is reached with no breakpoint found — stop, document "no
     breakpoint found below N," this is a valid result, not a failed test.
6. **Reduce load to baseline** immediately after the ramp ends (whether by breakpoint or
   ceiling) and hold to measure recovery (see Recovery Criteria below).

## Knee / Saturation Concept

The throughput-vs-load curve typically has three regions:
- **Linear region**: throughput increases roughly proportionally with load — the system
  has headroom.
- **Knee (saturation point)**: throughput growth flattens even as load keeps increasing —
  the system is at or near its resource limit. This is the most useful capacity number to
  report, often more actionable than the eventual breakpoint, because it is the point
  past which added load buys nothing but risk.
- **Breakpoint (degradation region)**: past the knee, throughput may plateau, then
  decline, while latency and error rate climb sharply — the system is now shedding or
  failing requests, not just slowing down.

Call the knee from the data: the first step where throughput gain over the previous step
drops below a defined threshold (e.g., <5%) while error rate or latency simultaneously
rises above its baseline-plus-tolerance band. A single metric moving is not the knee — it
must be throughput flattening AND cost (errors/latency) rising together.

## Failure-Mode Taxonomy

Classify every observed breakpoint failure into one of these categories — "it crashed" is
not a classification:

- **Resource exhaustion (CPU/disk/network)**: CPU pegged at 100% with rising queue
  depth, disk I/O saturated, or network bandwidth/socket limits hit. Symptom: latency
  rises smoothly, throughput plateaus, no hard errors until CPU-starved processes start
  timing out.
- **Thread pool exhaustion**: application/web-server thread pool fully occupied, new
  requests queue then time out. Symptom: sudden latency cliff once the pool fills, often
  paired with a specific "pool exhausted" / "no threads available" log signature.
- **Connection pool exhaustion**: database or downstream-service connection pool maxed
  out; new requests block waiting for a connection, then time out. Symptom: DB-bound
  endpoints fail first while non-DB endpoints keep working — a useful diagnostic signal.
- **Out-of-memory (OOM)**: heap/RSS grows past available memory; GC pauses lengthen
  before an eventual OOM kill or crash. Symptom: latency becomes erratic (long GC pauses)
  before the hard failure, memory graph shows a climbing trend across ramp steps rather
  than a step-correlated jump.
- **Cascading failure**: one component's saturation (e.g., DB connection pool) causes
  timeouts that pile up in an upstream caller (e.g., API layer thread pool), which then
  also saturates — the failure spreads beyond the originally stressed component. Symptom:
  a second, seemingly unrelated component fails shortly after the first; the failure
  order in the timeline reveals the causal chain.

## Bottleneck-Diagnosis Guide

Use step metrics to narrow the failing layer before naming a root cause:

| Symptom pattern | Likely layer | Next check |
|---|---|---|
| CPU near 100% on app servers, DB CPU low | Application/compute | Profile hot code paths, check for inefficient serialization or synchronous blocking calls |
| DB CPU/IO high, app CPU moderate | Database | Check slow query log, missing indexes, lock contention/deadlocks |
| App CPU/DB both moderate, latency still climbs | Network/infra | Check bandwidth, socket limits, load balancer queue depth, DNS resolution time |
| Errors concentrated on endpoints calling one downstream service | Connection pool to that service | Check pool size vs. concurrency, downstream service's own capacity |
| Errors spread evenly across unrelated endpoints after one component saturates | Cascading failure | Trace the failure timeline; find the first component to saturate, treat that as root cause |
| Latency degrades gradually across the whole ramp, memory climbs monotonically | Memory leak / OOM risk | Correlate memory graph with ramp step, not just with time; consider pairing with a soak test to confirm leak vs. legitimate cache growth |

## Graceful Degradation & Recovery Criteria

**Graceful degradation** (evaluate at and past the breakpoint):
- [ ] The system rejects/queues excess requests predictably (e.g., HTTP 429/503 with
  Retry-After, circuit breaker trips) rather than hanging or crashing
- [ ] Core/critical functionality (if the system has priority tiers) continues to work
  while non-critical functionality sheds load first
- [ ] No data corruption or partial writes occur under stress — verify with a data
  integrity check after the ramp, not just an uptime check
- [ ] Error responses are meaningful (not raw stack traces or connection resets) so
  clients can react appropriately

**Recovery** (evaluate after load is reduced back to baseline):
- [ ] Error rate returns to baseline within the agreed recovery window (source the
  window from project-context.md or the user — do not invent one; a common starting
  point is 2-5x the step hold duration)
- [ ] Latency (p95/p99) returns to baseline within the same window
- [ ] No manual intervention (restart, cache flush, failover) was required to recover —
  if one was required, document it explicitly; that itself is a finding, not a pass
- [ ] Resource metrics (memory, connection pool, thread pool) return to pre-stress
  levels — a resource that stays elevated after load drops indicates a leak, not a
  transient spike, and warrants a soak-test follow-up
