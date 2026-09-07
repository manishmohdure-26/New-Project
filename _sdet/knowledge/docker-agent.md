# Stevedore — Docker Agent Knowledge

> Training file for Stevedore (Senior Containerized Test Environment Engineer).
> Edit this file to customize Stevedore's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Container Reproducibility Rules (CRITICAL)
- **Pin every base image tag** — no `latest`, no floating major-only tags. A stack that
  silently rebuilds against a new base image is a flaky test waiting to happen.
- **Multi-stage builds when build deps differ from run deps** — builder stage installs
  compilers/dev packages; final stage copies only the built artifact.
- **Order Dockerfile layers for cache hits**: copy dependency manifests and install
  BEFORE copying source code, so source edits don't bust the install-cache layer.
- **Non-root by default** — `USER` a non-root account unless a specific tool requires
  root, and state the reason when it does.
- **`.dockerignore` is mandatory** — exclude `node_modules/`, `.env`, `.git/`,
  `test-results/`, `playwright-report/` from the build context.

### Compose Stack Rules
- **Every service gets a real healthcheck** — a process-running check is not readiness;
  Postgres checks `pg_isready`, not just "container started."
- **`depends_on` without `condition: service_healthy` is decorative** — it only waits for
  process start, not for the service to be ready to accept work.
- **One-shot jobs (migrations, seeding) use `condition: service_completed_successfully`**
  so the runner waits for seed data to exist, not just for the seed container to start.
- **Dedicated network per stack** — never `network_mode: host`; publish only the host
  ports a human needs for local debugging.

### Credential & Secret Rules
- **Never write a literal secret into a Dockerfile, compose file, or generated output** —
  reference `process.env.VAR_NAME` / `.env.test`; list only variable names (never values)
  in `.env.test.example`.
- **Read credential variable names from `project-context.md`'s Test Credentials
  structure** — never invent env var names that diverge from what automation already uses.

## Learnings

<!-- Add learnings from past containerization sessions -->

## Dockerfile Best-Practices Checklist

- [ ] Base image pinned to a specific version tag (`node:20.11-alpine`, not `node:latest`)
- [ ] Small base image (`alpine`/`slim`) unless a dependency requires the full image —
      state the reason if full image is used
- [ ] Multi-stage build used when the build stage needs tools the run stage doesn't
      (compilers, dev deps, browser install scripts)
- [ ] Dependency manifest copied and installed BEFORE application source, to maximize
      layer cache reuse across rebuilds
- [ ] Application runs as a non-root `USER`
- [ ] `.dockerignore` excludes `node_modules/`, `.git/`, `.env`, `test-results/`,
      `playwright-report/`, and local build output
- [ ] `WORKDIR` set explicitly rather than relying on the image default
- [ ] `HEALTHCHECK` present for any image that runs as a long-lived service (not required
      for one-shot test-runner images that exit after the suite completes)
- [ ] No secrets baked into image layers via `ENV`/`ARG` — inject at `docker run`/
      `docker compose` time via environment variables

## Docker Compose Test-Stack Pattern

Minimal shape for an integration/E2E test stack (database + seed + app + Playwright):

```yaml
services:
  db:
    image: postgres:16.2-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_PASSWORD: ${TEST_DB_PASSWORD}
    tmpfs: [/var/lib/postgresql/data]        # ephemeral — gone on stop
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d testdb"]
      interval: 5s
      retries: 10

  seed:
    build: { context: ., dockerfile: Dockerfile.seed }
    depends_on: { db: { condition: service_healthy } }
    restart: "no"                            # one-shot: migrate + fixtures, exit 0

  app:
    build: { context: ../.. }
    depends_on:
      db: { condition: service_healthy }
      seed: { condition: service_completed_successfully }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 5s
      retries: 10

  playwright:
    build: { context: ../.., dockerfile: outputs/docker-agent/Dockerfile.test-runner }
    depends_on: { app: { condition: service_healthy } }
    environment: { BASE_URL: "http://app:3000", CI: "true" }
    volumes:
      - ./test-results:/app/automation/test-results
      - ./playwright-report:/app/automation/playwright-report

networks:
  default: { name: test-stack-net }
```

## Wait-for-Dependency Strategy

Priority order for enforcing boot readiness (use the first one that applies):

1. **Native compose healthcheck + `depends_on: condition: service_healthy`** — prefer
   this always. Works for anything with a TCP port, HTTP endpoint, or CLI readiness probe
   (`pg_isready`, `redis-cli ping`, `curl -f http://.../health`).
2. **`condition: service_completed_successfully`** — for one-shot jobs (migrations,
   seeding) that must finish before dependents start.
3. **App-level retry/backoff on connect** — when the dependency has no healthcheck of its
   own (e.g., a mock with no `/health` route you don't control): retry with exponential
   backoff and a max timeout, failing loudly if it never becomes reachable.
4. **Entrypoint wait script (last resort)** — a small wait-for-it style script, only when
   neither 1 nor 2 applies and the app can't retry itself. Prefer fixing the healthcheck.

Never rely on `sleep N` alone — it produces flaky, timing-dependent boots that pass
locally and fail under CI load.

## Ephemeral Test Database Pattern

- **Storage**: `tmpfs` or an anonymous volume — never a named volume for a test-only DB,
  since named volumes survive `docker compose down` and leak state across runs.
- **Schema + fixtures**: a one-shot `seed` service running migrations + fixtures, or files
  mounted into the DB image's native init-script directory for simple cases.
- **Isolation between runs**: `docker compose down -v` between runs guarantees no
  cross-run data bleed — mandatory in the run guide, not optional cleanup.
- **Isolation between parallel suites**: use `docker compose -p <unique-project-name>` per
  run/CI-job so each gets its own network and containers instead of colliding on names.

## Playwright-in-Docker Note

- **Use the official Microsoft Playwright image**
  (`mcr.microsoft.com/playwright:v<version>-<os-tag>`) — ships Chromium/Firefox/WebKit and
  OS-level deps preinstalled, avoiding the most common failure mode (missing shared
  libraries for headless browser launch).
- **Pin the image tag to match `automation/package.json`'s `@playwright/test` version
  exactly** — a version skew produces failures that look like real bugs but aren't.
- **Run headless with `CI=true`** so Playwright uses CI-appropriate retry/reporter
  defaults automatically.
- **Bind-mount `test-results/` and `playwright-report/`** to the host so artifacts survive
  after the container exits.
- **Don't hand-roll browser installs in a custom base image** unless there's a strong
  reason — the official image's preinstalled pairing is tested by the Playwright team.
