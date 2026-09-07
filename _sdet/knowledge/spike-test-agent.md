# Spiker — Spike Testing Agent Knowledge

> Training file for Spiker (Senior Spike Testing Specialist).
> Edit this file to customize Spiker's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Spike Profile Rules (CRITICAL)
- **Every profile has exactly four phases**: baseline, surge (time-to-peak), hold,
  drop (time-to-baseline) — a profile missing any phase is incomplete
- **Surge and drop must be abrupt**, on the order of seconds, not minutes — if the
  transition takes as long as the hold phase, it is a stress ramp, not a spike
- **Peak multiplier is always relative** (e.g., "5x baseline RPS"), never an invented
  absolute number disconnected from a measured baseline
- **Never invent baseline RPS, SLO thresholds, or autoscaling policy** — pull them from
  `outputs/load-test-agent/`, `outputs/performance-test-agent/`, `project-context.md`,
  or ask the user

### Survive vs. Recover Rule (CRITICAL)
- "Survived" and "recovered" are two independent pass/fail dimensions — never collapse
  them into a single verdict
  - **Survive** = the system stayed within its error-rate/latency budget WHILE the
    spike was happening (surge + hold)
  - **Recover** = the system returned to baseline metrics, sustained, within the target
    time-to-stabilize AFTER the drop
- A system can survive without recovering cleanly (e.g., it queued everything and is
  still draining the backlog 10 minutes later) — report both dimensions explicitly

### Discipline Boundary Rule
- Spike ≠ Load ≠ Stress ≠ Soak — do not blur these:
  - **Load** — sustained traffic AT a defined steady peak, ramped up normally, held for
    the test duration (owned by load-test-agent)
  - **Stress** — traffic increased gradually and continuously until the system breaks,
    to find the breakpoint (owned by stress-test-agent)
  - **Soak** — moderate/steady traffic sustained for a LONG duration (hours+) to surface
    memory leaks, connection exhaustion, and slow degradation (owned by soak-test-agent)
  - **Spike** — near-instant jump from baseline to a multiple of peak, held briefly,
    dropped abruptly, to test elasticity and recovery (owned by Spiker)
- Spiker designs the profile and criteria only — execution is handed off to
  load/stress tooling; Spiker never claims to have run the generator itself

## Learnings

<!-- Add learnings from past spike testing sessions -->

## Spike Profile Design Guide

A spike profile is a traffic-vs-time curve with four phases:

```
Traffic
  |                    ____________
  |                   /            \
  |                  /              \
  |                 /                \
  |________________/                  \________________
  |<-- baseline -->|<-surge->|<-hold->|<-drop->|<-baseline->
       (steady)     (abrupt)  (sustained) (abrupt)  (recovery window)
```

| Phase | What it tests | Typical duration | Guidance |
|-------|----------------|-------------------|----------|
| Baseline | Establishes the steady-state reference (error rate, p95/p99 latency, resource utilization) that "recovered" is measured against | 3-10 min | Must run long enough for metrics to stabilize before the surge starts |
| Surge (time-to-peak) | The shock itself — how the system reacts to demand appearing almost instantly | 5-30 sec | The defining trait of a spike test; longer ramps turn this into a stress test |
| Hold | Sustained load at peak — separates "handled the initial shock" from "can sustain the new level" | 2-15 min, scenario-dependent | Flash sales hold longer than a viral traffic burst; pick duration from the scenario, not a default |
| Drop (time-to-baseline) | Tests scale-in and graceful drain — a system that scales out but never scales back in is a cost/ops risk, not just a performance one | 5-30 sec | Equally abrupt as the surge; watch for over-eager scale-in that then can't handle residual traffic |

**Multiplier selection:** state peak as `Nx baseline RPS` sourced from
`outputs/load-test-agent/` (measured baseline) or the user's stated worst-case
multiplier. Common ranges: flash sale 5-20x, viral event 3-10x, batch job trigger
2-8x (internal, often more predictable), retry storm 2-5x (amplified by client retry
logic, not real new users).

## Elasticity & Autoscaling Behaviors to Observe

During the surge and hold phases, capture these signals — each indicates a specific
elasticity failure mode if it breaches its expected bound:

| Behavior | Signal to capture | Where observed | Failure indicator |
|----------|--------------------|-----------------|--------------------|
| Scale-out lag | Time from traffic threshold breach to new capacity serving traffic | Autoscaler event log (HPA events, ASG scaling activities, serverless concurrency metrics) | Lag exceeds the surge duration — capacity arrives after the spike has already passed |
| Cold starts | Latency spike isolated to newly provisioned instances/functions | APM trace breakdown, per-instance latency | Cold-start penalty pushes p99 latency past SLO during the surge window |
| Queue buildup | Queue depth / backlog size over time | Message queue metrics, connection queue, request queue | Queue depth does not plateau — grows unbounded during the hold phase |
| Connection pool exhaustion | Pool utilization %, connection wait time | DB/HTTP connection pool metrics | Pool hits 100% and requests start blocking or erroring on acquire |
| Circuit breaker trips | Breaker state transitions (closed → open) | Service mesh / resilience library logs | Breakers open and stay open past the hold phase instead of half-opening to probe recovery |
| Rate limiting / throttling | 429 response rate, throttle counter | Gateway/API metrics | Legitimate traffic throttled indiscriminately alongside abusive traffic, or throttling absent entirely (no backpressure) |

Scale-out lag and cold starts during the surge window are **expected behavior**, not
automatic failures — flag them as observed data points and grade them against the
stated SLO, not against a zero-tolerance bar.

## Recovery Metrics

Recovery is measured strictly AFTER the drop phase begins:

- **Time-to-stabilize** — elapsed time from the drop until error rate, p95/p99 latency,
  AND queue depth have ALL returned to baseline and stayed there for a sustained
  observation window (e.g., 5 consecutive minutes of baseline-level readings). A single
  good sample immediately after the drop is not recovery — transient dips are common.
- **Dropped / failed requests** — total count of requests that errored, timed out, or
  were rejected (429/503) during the surge + hold window. Report as a raw count and as
  a percentage of total requests attempted in that window.
- **Error-rate decay curve** — the shape of the return to baseline (instant step-down
  vs. slow linear decay vs. plateaued-then-dropped) reveals whether recovery was driven
  by scale-in, cache warm-up, or backlog drain — capture the curve, not just the
  endpoint value.
- **Over-provisioning drift** — capacity level some time after recovery vs. baseline
  capacity; excessive lingering over-capacity after drop indicates scale-in policy is
  too conservative (cost risk) while premature scale-in indicates it is too aggressive
  (stability risk during residual traffic tail).

## Scenario Catalog

| Scenario | Trigger | Typical multiplier | Typical hold | Notes |
|----------|---------|----------------------|----------------|-------|
| Flash sale / release drop | Scheduled marketing event, ticket/product drop at a known time | 5-20x baseline | 5-15 min | Predictable timing — test that pre-warming/scheduled scale-out (if configured) actually triggers before T-0, not reactively after |
| Viral event | Unplanned traffic surge (social share, press mention, outage elsewhere driving traffic here) | 3-10x baseline | 10-30 min, often longer tail | Unpredictable timing means no pre-warming — this is the truest test of reactive autoscaling |
| Batch job trigger | Internal system-generated spike (cron job, ETL completion, webhook fan-out, cache invalidation storm) | 2-8x baseline | 2-10 min | Often self-inflicted and more predictable than external scenarios; test whether internal jobs have their own rate limiting/backoff |
| Retry storm | Client or dependency retries compounding a transient outage into an amplified spike | 2-5x baseline (amplified, not organic new users) | Until retries back off or circuit breakers open | Distinct from other scenarios: the "extra" traffic is the system's own clients retrying, so client-side backoff/jitter behavior is part of what's under test, not just server elasticity |

## Pass/Fail Criteria Reference

**Survive (during surge + hold):**
- Error rate stays under the defined threshold for the entire surge/hold window (not
  just on average — check for spikes within the window)
- p95/p99 latency stays under the defined threshold for the entire surge/hold window
- No unhandled 5xx cascade or sustained circuit-breaker-open state beyond the defined
  tolerance

**Recover (after drop):**
- Error rate, latency, and queue depth all return to baseline, sustained for the
  observation window, within the target time-to-stabilize
- Dropped/failed request count during the spike stays within the agreed budget
  (spike tests are not zero-error tests — some loss during the shock is often
  acceptable; the threshold must be explicit, not assumed to be zero)
- Scale-in occurs without destabilizing residual traffic (no secondary error spike
  caused by capacity being removed too early)

All thresholds are sourced from `project-context.md`, `outputs/performance-test-agent/`
(existing SLOs), or the user — never assumed or invented.
