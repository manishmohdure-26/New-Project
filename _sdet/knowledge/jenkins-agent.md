# Butler — Jenkins Agent Knowledge

> Training file for Butler (Senior Jenkins Pipeline Specialist).
> Edit this file to customize Butler's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Pipeline Structure Rules (CRITICAL)
- **Declarative is the default** — only switch to scripted when a stated control-flow
  requirement (dynamic stage generation, non-linear retry/branch logic) cannot be
  expressed with declarative `when`/`matrix`/`parallel` blocks
- **Every pipeline has a `post` block** covering `success`, `failure`, `unstable`, and
  `always` — a pipeline that only reports on success hides failures from the team
- **Never hardcode a secret** — every credential is bound via `credentials()` or
  `withCredentials([...])`; never echoed, printed, or written to a log
- **Every stage with tool/version requirements pins its own `agent`** (label or Docker
  image) — do not rely on "whatever executor is free"
- **Shared-library references are version-pinned** (`@v1.2.0` or a named branch) — an
  unpinned `@Library('name') _` breaks silently when the library's default branch changes

### Reporting Rules
- Test results are published every run, pass or fail — `junit` for JUnit XML, plus an
  HTML report step (e.g., Playwright's HTML reporter) via `publishHTML`
- Failure artifacts (screenshots, videos, traces) are archived with `archiveArtifacts`
  scoped inside `post { failure { ... } }` — not unconditionally, to avoid storage bloat
- A red build with no published report is worse than one that fails loudly with evidence

## Learnings

<!-- Add learnings from past Jenkins pipeline authoring sessions -->

## Declarative vs Scripted Pipeline

| Aspect | Declarative | Scripted |
|--------|-------------|----------|
| Syntax | Structured: `pipeline { agent {} stages {} post {} }` | Free-form Groovy inside `node { }` |
| Learning curve | Lower — reads like config | Higher — full Groovy control flow |
| Validation | Linted by Jenkins before run (`Jenkinsfile Linter`) | Only fails at runtime |
| Control flow | `when`, `parallel`, `matrix` blocks | Native `if`/`for`/`try-catch`, arbitrary Groovy |
| Best for | Standard CI flows: checkout, test, report, deploy | Dynamic stage generation, complex conditional logic |
| Default choice | **Yes — use unless scripted is justified** | Escape hatch only |

## Jenkinsfile Anatomy Reference

```groovy
@Library('qa-shared-lib@v1.4.0') _            // pinned shared library, never unpinned

pipeline {
    agent { label 'linux-docker' }             // top-level default agent
    options { timestamps(); timeout(time: 30, unit: 'MINUTES'); disableConcurrentBuilds() }
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['staging', 'qa'], description: 'Target env')
        booleanParam(name: 'RUN_FULL_REGRESSION', defaultValue: false, description: 'Run full suite')
    }
    environment {
        NODE_ENV = 'test'
        PROVIDER_PASSWORD = credentials('provider-test-password')   // bound, never a literal
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install')  {
            agent { docker { image 'mcr.microsoft.com/playwright:v1.48.0-jammy' } }
            steps { sh 'npm ci' }
        }
        stage('Test') { steps { sh 'npm test' } }
    }
    post {
        always  { junit allowEmptyResults: true, testResults: 'automation/test-results/**/*.xml' }
        failure { archiveArtifacts artifacts: 'automation/test-results/**/*.{png,webm,zip}', allowEmptyArchive: true }
        success { echo 'Pipeline succeeded' }
        unstable{ echo 'Some tests failed — see JUnit report' }
        cleanup { cleanWs() }
    }
}
```

Section responsibilities: `agent` picks WHERE steps run (globally or per-stage);
`options` sets pipeline-wide behavior; `parameters` defines parameterized-build inputs;
`environment` sets env vars and binds credentials; `stages` is the actual work; `post` is
the unconditional reporting/cleanup layer that runs regardless of stage outcome.

## Parallel Stages Pattern

```groovy
stage('Cross-Browser E2E') {
    parallel {
        stage('Chromium') { steps { sh 'npx playwright test --project=chromium' } }
        stage('Firefox')  { steps { sh 'npx playwright test --project=firefox' } }
        stage('WebKit')   { steps { sh 'npx playwright test --project=webkit' } }
    }
}
```

For a larger axis set (e.g., 3 browsers x 2 shards), prefer declarative `matrix { axes {
axis { name 'BROWSER'; values 'chromium','firefox','webkit' } axis { name 'SHARD';
values '1','2' } } stages { stage('Run Shard') { steps { sh "npx playwright test
--project=${BROWSER} --shard=${SHARD}/2" } } } }` — it generates one stage instance per
axis combination instead of hand-writing each branch.

Rule: only parallelize stages that are truly independent — no shared workspace writes.
Each matrix/parallel branch writes to its own report directory
(`test-results/${BROWSER}-${SHARD}/`) to avoid overwrites.

## Credentials Binding Pattern

```groovy
// Scoped, per-stage binding — credentials only exist inside this block
stage('Login Smoke Test') {
    steps {
        withCredentials([
            usernamePassword(credentialsId: 'provider-test-account',
                usernameVariable: 'PROVIDER_EMAIL', passwordVariable: 'PROVIDER_PASSWORD'),
            string(credentialsId: 'jira-api-token', variable: 'JIRA_TOKEN')
        ]) {
            sh 'npm run test:smoke -- --grep @login'
        }
    }
}
```

- NEVER: `sh "curl -u admin:SuperSecret123 ..."` or `environment { PASS = 'literal' }`
- NEVER `echo $PROVIDER_PASSWORD` or `sh 'env'` inside a bound-credentials block — Jenkins
  only masks values it knows about, and `env` dumps can still leak indirectly
- Credential IDs are project-specific — read from `project-context.md` /
  `outputs/pipeline-agent/`, or ask the user; document every ID and its Jenkins credential
  type (Secret text / Username-Password / Secret file / SSH key) in `JENKINS-SETUP.md`

## JUnit / HTML Report-Publish Pattern

```groovy
post {
    always {
        junit testResults: 'automation/test-results/**/*.xml', allowEmptyResults: true
        publishHTML(target: [reportName: 'Playwright HTML Report', reportDir: 'automation/playwright-report',
            reportFiles: 'index.html', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
    }
    failure {
        archiveArtifacts artifacts: 'automation/test-results/**/*.{png,webm,zip}', allowEmptyArchive: true
    }
}
```

Requires the JUnit plugin (`junit` step) and HTML Publisher plugin (`publishHTML` step)
installed on the controller — list both in `JENKINS-SETUP.md`. Use
`allowEmptyResults`/`allowMissing: true` defensively so a stage abort before tests run
doesn't also fail the report-publish step and mask the real cause.

## Shared Library Note

A Jenkins shared library centralizes repeated pipeline logic (credential-bound npm
install, standard report-publish block, notification steps) into a separate Git repo
loaded via `@Library('name@version') _`. Structure: `vars/*.groovy` exposes callable
steps (e.g., `runPlaywrightSuite()`); `src/` holds supporting Groovy classes. Always pin
the version — never load the unpinned default, since a library update on `master` can
silently change every pipeline that uses it. If no shared library exists yet, keep logic
inline rather than inventing one; note in `JENKINS-SETUP.md` that it's a future
extraction candidate once duplicate logic appears across 2+ pipelines.
