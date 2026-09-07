# Endurer — Soak Test Agent Knowledge

> Training file for Endurer (Senior Soak & Endurance Testing Specialist).
> Edit this file to customize Endurer's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Scope Discipline (CRITICAL)
- **Soak is about duration, not peak** — never let a soak plan drift into measuring
  maximum throughput or breaking points; that is load/stress testing's job
- **Constant load, not ramping** — a soak run holds one sustained load level for the
  full duration; ramping/cycling mid-run belongs to spike testing, not soak
- **A soak shorter than the guide minimum is not a soak test** — say so explicitly
  rather than silently accepting a compressed schedule
- **Every "leak" claim needs a GC-adjusted trend** — a single high-memory snapshot is
  not evidence; require the Leak-Confirmation Procedure before the word "leak" appears
  in any report

### Threshold & Duration Rules
- Never invent soak duration, sustained load %, sampling interval, or trend thresholds
  — pull them from `project-context.md`, `outputs/load-test-agent/`,
  `outputs/performance-test-agent/`, or ask the user
- Every monitored metric needs both a "flat/healthy" band and a "concerning trend"
  definition — a metric with only an alarm threshold and no healthy baseline cannot
  distinguish noise from drift

## Learnings

<!-- Add learnings from past soak testing sessions -->

## Soak Duration & Load-Level Guide

Minimum soak duration by release risk tier (extend, never shorten, when prior incidents
involved slow resource growth):

| Risk Tier | Minimum Duration | Sustained Load | Rationale |
|-----------|-------------------|-----------------|-----------|
| Low (minor feature, no new resource lifecycle) | 8–12 hours | 40–50% of peak throughput | Catches fast leaks (per-request handle leaks, unbounded per-call caches) |
| Medium (new integration, new connection pool, new background job) | 24 hours | 50–60% of peak throughput | Covers at least 2 full log-rotation / cache-eviction cycles |
| High (new persistent connection type, new caching layer, DB schema change under load) | 48–72 hours | 60–70% of peak throughput | Surfaces slow leaks that only accumulate past a day (thread pools, connection pools sized generously) |
| Critical (release gate for a system with prior memory/leak incidents, or long-lived session/socket architecture) | 7 days (168 hours) | Realistic production-mirrored load, not peak | Matches real deploy cadence between restarts; catches leaks with multi-day accumulation slopes |

Rules of thumb:
- Load level for soak is **moderate, sustained**, not peak — peak load for days is a
  stress/reliability test, not a soak test, and will produce false failure modes
  unrelated to slow degradation
- If the system restarts/redeploys more frequently than the guide's minimum duration
  in production, the soak duration can match the real restart interval instead — note
  this override explicitly with the reason
- Weekend/holiday traffic dips should not be used as the soak window unless the goal is
  specifically to test low-load idle degradation (e.g. idle connection reaping)

## Slow-Degradation Failure Catalog

Each failure mode, the metric that detects it, and its typical root cause:

| Failure Mode | Detection Metric | Early Warning Signal | Typical Root Cause |
|--------------|--------------------|------------------------|----------------------|
| **Memory leak** | Post-GC heap used (managed runtimes) or RSS/working set (native) sampled at fixed intervals | Post-GC baseline rises linearly hour over hour instead of returning to a flat band | Listeners/callbacks never unregistered, unbounded in-memory collections (maps/lists keyed by request/session), retained closures over large objects |
| **Connection/file-handle leak** | Open file descriptor count (`lsof`/`/proc/<pid>/fd`), active DB connection pool count vs. pool max, open socket count | FD/connection count rises monotonically with request volume and never returns to baseline after load subsides | Connections/streams opened without a `finally`/`using`/`defer` close, exceptions skipping cleanup paths, pool exhaustion under retry storms |
| **Disk/log growth** | Disk free % on the log/data volume, log directory size growth rate (MB/hour) | Free space declines monotonically with no recovery from log rotation, or rotation is configured but not firing | Missing or misconfigured log rotation, verbose logging left on for a new code path, temp files not cleaned up, growing local cache-on-disk |
| **Thread accumulation** | Live thread count, thread pool queue depth, thread pool active-vs-idle ratio | Thread count climbs without plateauing even though request rate is flat | Threads spawned per-request without pooling, thread pool tasks that block indefinitely (deadlock/starvation), executor services never shut down on error paths |
| **Cache/DB bloat** | Cache memory footprint and eviction rate, DB table/index size growth rate, query latency trend (p50/p95) over the soak window | Cache eviction rate stays near zero while footprint grows (nothing is being evicted), OR query latency creeps upward as table/index size grows with no corresponding cleanup job | Missing/misconfigured TTL or eviction policy, unbounded cache keyed by unique per-request values, missing archival/purge job for append-only tables, index bloat from high-churn tables without periodic maintenance |

For every mode marked "applies" in a soak plan, both the metric AND the sampling cadence
must be specified — "monitor memory" is not a detection plan.

## Monitoring Cadence & Trend-Threshold Guide

Sampling interval balances signal clarity against data volume — too frequent adds noise,
too sparse hides the trend:

| Metric Class | Recommended Interval | Flat/Healthy Pattern | Concerning Trend Pattern |
|--------------|------------------------|-------------------------|------------------------------|
| Heap/RSS (post-GC) | Every 10–15 min | Oscillates within a fixed band (e.g. +/- 2–3%) after an initial 1–2 hour warm-up | Sustained rise > 5% per hour across 3+ consecutive sampling windows, with post-GC floor also rising |
| Open FDs / pool connections | Every 10–15 min | Tracks request concurrency, returns to baseline when load is flat | Monotonic increase with no plateau after 4+ hours of flat load |
| Disk free % / log growth rate | Every 30 min | Sawtooth pattern matching log rotation, or flat if rotation is disabled by design | Monotonic decline with no rotation-driven recovery |
| Thread count / pool queue depth | Every 15 min | Flat once warm, proportional to concurrency, queue depth returns to 0 between bursts | Thread count climbs independent of load; queue depth never drains to 0 |
| Cache footprint / eviction rate | Every 30 min | Footprint plateaus at a configured max with steady eviction once full | Footprint grows past configured max with near-zero eviction |
| Latency (p50/p95/p99) | Every 5–15 min (or per-request aggregated) | Flat within the SLA band across the whole soak window | Gradual creep upward correlated with another rising metric (heap, DB size, cache footprint) |

Guidance on reading trends:
- Ignore the first 1–2 hours as warm-up (JIT warm-up, cache fill, connection pool
  fill) — baseline the "flat/healthy" band from data AFTER warm-up, not from time zero
- A single sampling window outside the healthy band is noise; require 3+ consecutive
  windows trending the same direction before flagging a concerning trend
- Correlate metrics — a rising heap AND rising latency AND rising GC frequency together
  is a much stronger leak signal than heap alone

## Leak-Confirmation Procedure (GC-Adjusted Heap Trend)

Use this procedure before any report calls a rising-memory observation a confirmed leak:

1. **Force a full GC before every sample**, not just at the end of the run — this
   removes short-lived garbage from the reading and leaves only what the runtime
   believes is still reachable (the true "floor").
2. **Record the post-GC floor at fixed intervals** (per the Monitoring Cadence guide)
   for the full soak duration, discarding the warm-up window.
3. **Plot post-GC floor vs. time** and fit a trend line (simple linear regression is
   sufficient). A slope statistically indistinguishable from zero (oscillating around a
   constant mean) is healthy. A consistently positive slope across the full window,
   surviving multiple forced GCs, is a leak signature.
4. **Cross-check with object/allocation counts** where the runtime supports it (heap
   dumps, allocation profilers) — confirm which object type or collection is growing
   in retained count, not just aggregate bytes, before attributing root cause.
5. **Rule out expected steady-state growth** — some services legitimately grow to a
   plateau (warm caches, connection pool fill) and then flatten; a leak keeps climbing
   past the point where legitimate growth should have plateaued (compare against the
   Monitoring Cadence guide's expected warm-up window).
6. **Confirm with a restart-and-repeat check** where feasible: restart the service,
   re-run a shorter soak window at the same load, and verify the same slope re-emerges
   — a reproducible slope under matched conditions is strong confirmation; a slope that
   does not reproduce points to environmental noise instead.
7. **Only after steps 1–6** does the finding get reported as a confirmed leak, with the
   growing object/resource type, the measured slope (e.g. "+4.2%/hour post-GC"), and
   the soak window it was observed over.

This same GC-adjusted (or restart-adjusted) approach applies with minor substitution to
non-heap resources: for FD/connection leaks, substitute "force GC" with "force pool
idle-connection reaping" before sampling; for thread accumulation, sample after any
configured idle-thread timeout has had time to fire.
