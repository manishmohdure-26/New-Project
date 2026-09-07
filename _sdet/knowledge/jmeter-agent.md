# Meter — JMeter Agent Knowledge

> Training file for Meter (Senior JMeter Performance Specialist).
> Edit this file to customize Meter's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Correlation & Parameterization Rules (CRITICAL)
- **Correlate before you parameterize** — a value returned by the application (session
  ID, CSRF token, view-state, generated record ID) is a correlation problem, not a
  parameterization problem. Parameterizing over a stale correlated value just produces a
  different flavor of broken test.
- **Every CSV Data Set Config path is absolute** — CLI working directory when JMeter runs
  is not guaranteed to be the plan's directory.
- **Sharing mode is always stated explicitly** — "All threads" (shared row pool, safer for
  unique-per-user data like usernames), "Current thread group" (each group gets its own
  pass), "Current thread" (each thread replays the same row set) change test behavior
  meaningfully; never leave it at whatever the default happened to be.

### Execution Rules (CRITICAL)
- **Real load never runs from the JMeter GUI.** GUI mode is for authoring and single-user
  debug only — it consumes far more memory/CPU than the CLI engine and skews results.
- **No rendering listener survives into a load run.** View Results Tree, View Results in
  Table, and Graph Results all buffer/render every sample in memory — they are debug-only
  and must be removed or disabled before any run above 1 user.
- **Delete stale `.jtl` files before re-running** — JMeter appends to an existing results
  file by default, which silently corrupts dashboard statistics (mixed runs).
- **Always generate the HTML Dashboard from `.jtl` after a run** — a run without a report
  is a run nobody downstream can act on.

## Learnings

<!-- Add learnings from past JMeter authoring/tuning sessions -->

## JMeter Element Reference

Elements Meter configures, grouped by GUI tree category:

| Category | Element | Purpose |
|----------|---------|---------|
| Thread Group | Thread Group | Base: users, ramp-up, loop count/duration |
| Thread Group | Ultimate Thread Group | Multi-stage ramp shapes (staircase, spike) |
| Thread Group | Concurrency Thread Group | Target concurrency over time, independent of loop count |
| Thread Group | Stepping Thread Group | Stepped ramp-up for stress testing |
| Sampler | HTTP Request | The core sampler — one per real HTTP call |
| Sampler | JSR223 Sampler | Custom Groovy logic when no built-in sampler fits |
| Controller | Transaction Controller | Groups samplers into one named business transaction for reporting |
| Controller | Loop / While / If Controller | Repeats or conditionally executes child samplers |
| Controller | Once Only Controller | Runs child samplers (e.g., login) once per thread, not per loop |
| Config | HTTP Request Defaults | Shared protocol/host/port for all samplers in scope |
| Config | HTTP Header Manager | Shared headers (Content-Type, Authorization) |
| Config | HTTP Cookie Manager | Session cookie handling — required for cookie-based auth apps |
| Config | HTTP Cache Manager | Simulates browser caching of static assets |
| Config | CSV Data Set Config | Feeds per-thread/per-iteration parameterized data from CSV |
| Timer | Constant Timer | Fixed delay between samplers (think time) |
| Timer | Uniform/Gaussian Random Timer | Randomized think time — more realistic than constant |
| Assertion | Response Assertion | Checks response text/status against expected content |
| Assertion | Duration Assertion | Fails a sample exceeding an SLA response-time threshold |
| Assertion | JSON/XPath Assertion | Validates structured API response content |
| Listener | View Results Tree/Table | Debug only — renders every sample; never in a load run |
| Listener | Simple Data Writer / `-l` flag | Writes raw results to `.jtl` for later dashboard generation |
| Extractor | Regular Expression Extractor | Correlates values out of HTML/text responses |
| Extractor | JSON Extractor | Correlates values out of JSON responses via JSONPath |
| Extractor | XPath Extractor | Correlates values out of XML responses |
| Extractor | Boundary Extractor | Correlates values via simple left/right text boundaries |

## Correlation How-To

1. Identify the value in a later request that differs from the raw recording each time
   the app is exercised (session token, CSRF/view-state, generated ID).
2. Add the matching extractor as a **child of the sampler whose response contains it**:
   - Regex: `name="csrf_token" value="([^"]+)"` — capture group 1, Reference Name `csrfTok`
   - JSON: JSONPath `$.data.sessionId` — Reference Name `sessionId`
   - XPath: `//user/@id` — Reference Name `userId`
3. Replace the hardcoded value in every downstream sampler with `${refName}`.
4. Set Match Number: `1` for the first/only match, `-1` + `${refName}_matchNr` loop for
   "use all matches," `0` for random.
5. Re-run in GUI debug mode (1 user, View Results Tree temporarily enabled) and confirm
   the extracted value populates and the downstream request succeeds — then remove the
   listener before the real run.

## Parameterization How-To (CSV Data Set Config)

1. Build a CSV with a header row matching intended variable names, one row per virtual
   user/iteration (e.g., `username,password,recordId`).
2. Add **CSV Data Set Config** at Thread Group or Test Plan scope:
   - Filename: absolute path (e.g., `C:\path\to\outputs\jmeter-agent\data\users.csv`)
   - Variable Names: `username,password,recordId` (blank = use header row)
   - Delimiter: `,` (or match the file)
   - Recycle on EOF: `True` for long soak runs that outlast the row count; `False` when
     each row must be used at most once (e.g., unique registration data)
   - Stop thread on EOF: `True` when running out of data should end that thread cleanly
   - Sharing mode: **All threads** for a shared pool with no duplicate rows across
     concurrent threads; **Current thread group** when each thread group needs its own
     full pass; **Current thread** when every thread should replay the same row set
3. Reference values downstream as `${username}`, `${password}`, `${recordId}`.

## Non-GUI CLI Execution + HTML Dashboard

```
# Delete stale results first — JMeter appends by default
rm -f results.jtl

# Run in non-GUI mode with a Dashboard generated at run end
jmeter -n -t "plan.jmx" -l "results.jtl" -e -o "dashboard-dir" \
  -Jusers=50 -Jrampup=60 -Jduration=600
```

- `-n` — non-GUI mode (required for any real load; GUI mode is authoring/debug only)
- `-t` — path to the .jmx test plan
- `-l` — path to the results file (`.jtl`); must not already exist or must be deleted first
- `-e -o` — generate the HTML Dashboard into the given (must-not-already-exist) directory
  at the end of the run
- `-J<name>=<value>` — overrides a JMeter Property referenced in the plan as
  `${__P(name,default)}`, so thread count/ramp-up/duration can be tuned per run without
  editing the .jmx

To regenerate a dashboard from an existing `.jtl` without re-running the test:
```
jmeter -g "results.jtl" -o "dashboard-dir"
```

## Distributed Testing Note

For load beyond a single injector's capacity:
1. Install the same JMeter version on all injector (client) and controller machines.
2. On each injector, start the JMeter server: `jmeter-server` (listens on RMI port 1099).
3. From the controller, run: `jmeter -n -t plan.jmx -R <injector1-ip>,<injector2-ip> -l results.jtl -e -o dashboard-dir`
4. Ensure firewall rules allow the RMI ports between controller and injectors, and that
   any CSV Data Set Config file exists at the same absolute path on every injector.
5. Aggregate results from `-R` runs land in one combined `.jtl` on the controller — no
   manual merge needed for the CLI-driven flow above.

## Common JMeter Pitfalls

- **Running a real load test from the GUI** — GUI mode's rendering/listener overhead
  skews response times and can OOM the JMeter process itself before the app is
  the bottleneck. Always use `-n` for real numbers.
- **Leaving View Results Tree/Table active during a load run** — each listener buffers
  every sample; at scale this consumes gigabytes of heap and throttles throughput
  artificially, making the *test tool* the bottleneck instead of the application.
- **Hardcoding a session token from one recording** — works for exactly one replay, then
  fails for every virtual user after the first; always correlate.
- **Re-running without deleting the previous `.jtl`** — JMeter appends, silently mixing two runs' data into one dashboard.
- **Parameterizing instead of correlating** — feeding a CSV of "valid session tokens"
  captured once is a workaround, not a fix; tokens expire and the fix breaks on the next
  environment refresh.
- **Ignoring HTTP Cookie/Cache Manager** — omitting the Cookie Manager on a
  cookie-session app makes every sampler look like a new unauthenticated user; omitting
  the Cache Manager makes every run re-fetch static assets a browser would have cached.
