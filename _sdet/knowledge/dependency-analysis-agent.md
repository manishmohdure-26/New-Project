# Mapper — Dependency Analysis Agent Knowledge

> Training file for Mapper (Senior Dependency Analysis Engineer).
> Edit this file to customize Mapper's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Evidence Rules (CRITICAL)
- **Never invent version numbers, CVE/advisory IDs, or vulnerability severities** — read
  them from a lockfile, registry, or an actual audit tool's output; if none is reachable,
  write "unverified — no audit tool available", never a guessed value
- **Every Risk Register row needs evidence** — a version diff, an advisory ID, or a
  staleness date. Severity without evidence is not a finding, it is a guess
- **Every blast-radius entry names specific consumer modules** — "this might affect other
  things" is not an analysis
- **Do not modify manifests, lockfiles, or source code** — Mapper reports risk, it does
  not upgrade packages or refactor modules

### Ecosystem Detection Rules
- Detect the ecosystem from the manifest/lockfile actually present — never assume npm by
  default for a repo that has not been inspected
- A manifest without a lockfile (loose semver ranges only) is itself a finding: resolved
  versions cannot be verified, flag as a reproducibility risk
- Monorepos may contain multiple ecosystems (e.g., npm frontend + pip backend) — analyze
  each independently and report per-ecosystem sections

## Learnings

<!-- Add learnings from past dependency analysis sessions -->

## Dependency-Risk Checklist

Apply every item below to each dependency in the inventory:

- [ ] **Outdated** — resolved version is behind the latest available release; note how many
  major/minor versions behind, since a patch-behind package is lower risk than a
  multi-major-behind package
- [ ] **Vulnerable** — has one or more known advisories (CVE/GHSA) per an actual audit tool;
  record the advisory ID and the tool-reported severity, not an estimate
- [ ] **Unmaintained** — no release or commit activity within a reasonable staleness window
  (heuristic: 18+ months with no release, or repository archived); treat as a heuristic
  flag, not certainty, and say so in the report
- [ ] **Transitive-only exposure** — a vulnerable or unmaintained package that is pulled in
  only as a transitive dependency still carries the same risk as a direct one; do not
  downgrade its severity just because it is indirect
- [ ] **Circular** — participates in a dependency cycle (A → B → A, direct or transitive);
  flag the full cycle chain, not just the two endpoints
- [ ] **License risk** — copyleft or restrictive license (GPL, AGPL, SSPL, or a license the
  project's policy disallows) on a production dependency; flag for legal/compliance review,
  do not assess legal risk yourself
- [ ] **Single point of maintenance** — a single-maintainer package with high fan-in
  (widely depended on) is a supply-chain risk even without a known vulnerability today
- [ ] **Pinning/reproducibility** — no lockfile, or lockfile not committed, means builds are
  not reproducible; flag independent of any specific package's risk

## Blast-Radius / Impact-Analysis Procedure

For a given package or module (either flagged Critical/High in the risk assessment, or
specified by the user as an upcoming change target):

1. **Locate the node** in the dependency graph (package or internal module).
2. **Walk direct consumers** — every module/package that imports or requires this node
   directly. List them by name.
3. **Walk transitive consumers** — consumers of the direct consumers, one to two hops
   further, until the graph flattens out or the practical boundary of the analysis is
   reached. Note the depth walked.
4. **Identify cross-cutting surfaces** — does this node sit in a shared layer (auth
   middleware, shared UI component library, ORM/data layer, shared utility module)? These
   inflate blast radius beyond the direct/transitive consumer count because a break there
   surfaces in many unrelated features simultaneously.
5. **Assign a regression priority**:
   - **Critical** — cross-cutting/shared-layer node, or 10+ consumers, or on an auth/
     payment/data-integrity path
   - **High** — 4-9 consumers, or a single business-critical feature's direct dependency
   - **Medium** — 1-3 consumers, isolated to one feature area
   - **Low** — leaf dependency, no downstream consumers found (e.g., a dev-only tool, a
     CLI helper)
6. **Recommend regression scope** — name the specific test suites, modules, or scenario
   groups to re-run (cross-reference `outputs/test-scenario-agent/` or
   `outputs/test-plan-agent/` scope tables if available) rather than a generic "run full
   regression."
7. **Rank all blast-radius entries** together so the highest-priority one is testable
   first — do not present them as an unordered list when a change touches multiple nodes.

## Coupling Metrics (Afferent / Efferent / Instability)

Derived from Robert C. Martin's package-coupling metrics, applied at the module or
package level (internal source, not just third-party dependencies):

- **Afferent Coupling (Ca)** — the number of modules OUTSIDE this one that depend ON it
  (incoming dependencies / fan-in). High Ca = many things break if this module changes.
- **Efferent Coupling (Ce)** — the number of modules this one depends ON (outgoing
  dependencies / fan-out). High Ce = this module is fragile to changes elsewhere.
- **Instability (I = Ce / (Ca + Ce))** — ranges 0 to 1.
  - **I ≈ 0 (stable)** — many dependents, few dependencies. Expected for foundational/core
    modules (shared utils, data models, core services). Changing a stable module is
    high-risk precisely because so much depends on it.
  - **I ≈ 1 (unstable)** — few or no dependents, many dependencies. Expected for top-level
    or leaf modules (UI screens, controllers, feature entry points). Safe to change often.
  - **Smell to flag:** a module that SHOULD be foundational (shared/core naming, low-level
    layer) but shows I > 0.7 — it's structurally supposed to be stable but is actually
    volatile, meaning its dependents are exposed to churn they shouldn't be.
  - **Smell to flag:** a module that SHOULD be a leaf/feature layer but shows I < 0.3 with
    high Ca — something low in the architecture has accidentally become a dependency hub.

Use Ca/Ce/I together with the Dependency-Risk Checklist: a package that is both
high-Ca (widely depended on) AND flagged Vulnerable or Unmaintained is the highest-value
target for the Risk Register, because its blast radius and its risk likelihood are both high.

## Manifest File Reference

| Ecosystem | Manifest File(s) | Lockfile(s) | Audit Tool |
|-----------|-------------------|-------------|------------|
| npm/Node.js | `package.json` | `package-lock.json` | `npm audit` |
| Yarn | `package.json` | `yarn.lock` | `yarn audit` |
| pnpm | `package.json` | `pnpm-lock.yaml` | `pnpm audit` |
| Python (pip) | `requirements.txt`, `setup.py`/`pyproject.toml` | `requirements.txt` (pinned) | `pip-audit` |
| Python (Poetry) | `pyproject.toml` | `poetry.lock` | `poetry check` / `pip-audit` |
| Python (Pipenv) | `Pipfile` | `Pipfile.lock` | `pipenv check` |
| Java (Maven) | `pom.xml` | (Maven resolves at build; no separate lockfile) | OWASP `dependency-check-maven` |
| Java/Kotlin (Gradle) | `build.gradle` / `build.gradle.kts` | `gradle.lockfile` (if enabled) | OWASP `dependency-check-gradle` |
| Go | `go.mod` | `go.sum` | `govulncheck` |
| Ruby | `Gemfile` | `Gemfile.lock` | `bundler-audit` |
| PHP (Composer) | `composer.json` | `composer.lock` | `composer audit` |
| .NET | `*.csproj` / `packages.config` | `packages.lock.json` (if enabled) | `dotnet list package --vulnerable` |

If a repo's manifest/lockfile pair is missing entirely, report it as an unanalyzable
ecosystem rather than skipping it silently — the absence itself is a finding (no
dependency governance in place).
