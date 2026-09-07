# Sentinel — Healthcare Compliance Agent Knowledge Base

> This file stores the compliance rule library for Sentinel: PHI patterns, framework rule sections,
> risk classification rubric, external tool config, and report templates.
> Updated as the agent gains experience across projects.

## Core Purpose
Sentinel audits applications for US healthcare compliance and security posture. It statically scans
frontend and backend repositories, traces PHI data flow, runs a Playwright runtime audit, and
optionally an OWASP ZAP active scan — then produces a single consolidated compliance report
mapping every finding to: HIPAA, HIPAA BAA, SOC 2, CCPA/CPRA, California healthcare (CMIA/CDCR),
FHIR security, OWASP API Top 10, and Infrastructure-as-Code.

Sentinel assumes **every application handles PHI** and audits accordingly.

## Frameworks Covered
| Framework | Focus |
|---|---|
| HIPAA | Privacy Rule, Security Rule, Breach Notification Rule |
| HIPAA BAA | Business Associate Agreement vendor detection |
| SOC 2 | Trust Service Criteria (Security, Availability, Confidentiality, Privacy, Processing Integrity) |
| CCPA / CPRA | California Consumer Privacy Act (data deletion, consent, opt-out) |
| California Healthcare | CMIA (Civil Code §56) + CDCR Operations Manual §54080 |
| FHIR Security | SMART on FHIR, OAuth2 scopes, resource-level authorization |
| OWASP API Top 10 (2023) | API1–API10 |
| Infrastructure | Public buckets, IAM wildcards, container CVEs, K8s misconfig |

## PHI Pattern Library

Sentinel uses these regex/keyword patterns to detect PHI in code, logs, URLs, storage,
network responses, and vendor integrations.

### Identifier patterns (regex)
| Pattern | Matches | Example |
|---|---|---|
| `\b\d{3}-\d{2}-\d{4}\b` | SSN | `123-45-6789` |
| `\bMRN[-_:\s]?\d{6,10}\b` | Medical Record Number | `MRN-12345678` |
| `\b\d{4}[-/]\d{2}[-/]\d{2}\b` | DOB (ISO-ish) | `1985-03-14` |
| `\b\d{2}[-/]\d{2}[-/]\d{4}\b` | DOB (US) | `03/14/1985` |
| `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z\|a-z]{2,}` | Email | `patient@example.com` |
| `\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b` | US phone | `+1 (555) 123-4567` |
| `\b\d{1,5}\s+[A-Za-z]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane)\b` | US street address | `123 Main Street` |

### PHI-named identifiers (case-insensitive substring match)
These are variable names / field names / JSON keys that almost always contain PHI:

```
patient, patientName, patient_name, firstName, lastName, dob, dateOfBirth, date_of_birth,
ssn, socialSecurity, mrn, medicalRecordNumber, diagnosis, diagnoses, icd10, cpt,
prescription, medication, medications, drug, drugs, allergy, allergies,
labResult, lab_result, vital, vitals, height, weight, bloodPressure, heartRate,
insurance, insuranceId, policyNumber, claimNumber, npi,
appointment, encounter, treatment, treatmentPlan, sessionNote, clinicalNote,
provider, providerId, therapist, clinician,
email, phone, mobile, address, street, city, zip, postalCode,
guardian, guardianName, emergencyContact,
notes, comments, narrative  # often contain PHI in clinical context
```

When Sentinel sees one of these names appearing in:
- `console.log` / `console.error` / `logger.info`/`debug`/`error` calls → Critical finding
- `localStorage.setItem` / `sessionStorage.setItem` / `document.cookie` → Critical finding
- URL query parameters in `fetch`/`axios`/`http.get` calls → Critical finding
- Analytics SDK calls (`gtag`, `mixpanel.track`, `segment.identify`, `hotjar`) → Critical finding (if vendor lacks BAA)
- Error response bodies → High finding
- Cached browser response → High finding

### When the agent should NOT flag PHI patterns
- Test fixtures inside `__tests__/`, `tests/`, `spec/`, `*.spec.ts`, `*.test.tsx` — assumed anonymized
- Files inside `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `target/`, `out/`
- Mock/fixture files explicitly named `mock-*`, `fixture-*`, `test-data-*`, `sample-*`

If unsure whether a file is test data, scan and report the finding but mark it `Severity: Low` with rationale "appears to be test data".

---

## Rule Section: HIPAA (Privacy + Security + Breach Notification Rules)

| Rule ID | Description | Detection Method | Severity | HIPAA Clause |
|---|---|---|---|---|
| HIPAA-001 | PHI in console.log / logger calls | LLM grep + Semgrep — search for any of the PHI-named identifiers above as an argument to `console.log`, `console.error`, `console.debug`, `logger.info`, `logger.debug`, `logger.error`, `log.info` | Critical | §164.502, §164.530(c) |
| HIPAA-002 | PHI in URL query strings | LLM scan API call sites for `fetch(`/`axios.get(`/`http.get(` with PHI-named keys in the URL path or query string | Critical | §164.312(e)(1) |
| HIPAA-003 | PHI in localStorage / sessionStorage | LLM scan for `localStorage.setItem(...)` / `sessionStorage.setItem(...)` whose value reference resolves to a PHI-named field | Critical | §164.312(a)(2)(iv) |
| HIPAA-004 | PHI in document.cookie | LLM scan for `document.cookie = ...` containing PHI | Critical | §164.312(a)(2)(iv) |
| HIPAA-005 | No encryption at rest on PHI fields | LLM scan JPA entities (Java `@Entity` classes) for fields with PHI names that have NO `@Encrypted`, `@ColumnTransformer`, `pgcrypto`, or column-level encryption annotation | Critical | §164.312(a)(2)(iv) |
| HIPAA-006 | HTTP (non-HTTPS) URLs in source | Semgrep rule `http-url-detection` + LLM grep for `http://` excluding `localhost`, `127.0.0.1`, test fixtures | Critical | §164.312(e)(1) |
| HIPAA-007 | Unauthenticated PHI endpoint | LLM scan Spring `@RestController` / NestJS `@Controller` / Express route handlers — list endpoints whose method has NO auth annotation (`@PreAuthorize`, `@Secured`, `@UseGuards(AuthGuard)`, `requireAuth` middleware) AND whose path or DTO references PHI fields | Critical | §164.312(a)(1) |
| HIPAA-008 | Missing RBAC on authenticated PHI endpoint | LLM scan for endpoints WITH auth but WITHOUT role check (`@PreAuthorize("hasRole(...)")` or `@RolesAllowed` or equivalent) | High | §164.312(a)(1), §164.308(a)(4) |
| HIPAA-009 | Missing audit log on PHI access | LLM scan controllers reading/writing PHI fields — flag any that do NOT call an audit logger (`AuditLogger.log(...)`, `auditService.record(...)`, or project equivalent) | High | §164.312(b) |
| HIPAA-010 | Insecure cookie flags | Runtime CP5 check — inspect login session cookie for missing `HttpOnly`, `Secure`, `SameSite` flags | High | §164.312(e)(2)(ii) |
| HIPAA-011 | Hardcoded secret / API key / password | Gitleaks + Semgrep — patterns: `api_key\s*=\s*["']`, `password\s*=\s*["']`, `secret\s*=\s*["']`, `bearer\s+[A-Za-z0-9\-_.]{20,}` | Critical | §164.308(a)(5) |
| HIPAA-012 | Verbose error messages exposing internals | LLM scan global exception handlers for stack traces leaking to response body (e.g., `e.getMessage()` returned as 500 body, `printStackTrace()` written to HTTP response) | Medium | §164.502(a) |
| HIPAA-013 | Missing session timeout | Runtime CP5 OPT-IN check — wait idle, attempt protected request, verify 401 returned | High | §164.312(a)(2)(iii) |
| HIPAA-014 | Wide-open CORS on PHI endpoint | Semgrep + LLM — `cors({ origin: "*" })`, `Access-Control-Allow-Origin: *` header in spring `WebMvcConfigurer`, `@CrossOrigin(origins = "*")` | High | §164.312(e)(1) |
| HIPAA-015 | Missing rate limit on auth or PHI endpoint | LLM scan for project's rate-limit library — flag auth/PHI endpoints not protected | Medium | §164.308(a)(1)(ii)(D) |
| HIPAA-016 | PHI in analytics / 3rd-party tracker | LLM scan — `gtag`, `mixpanel.track`, `segment.identify`, `hotjar`, `posthog` with PHI-named payload fields | Critical | §164.502 + BAA |
| HIPAA-017 | PHI in error response body | LLM scan exception handlers returning entity objects (which serialize PHI) instead of safe error DTOs | High | §164.502(a) |

## Rule Section: HIPAA BAA (Business Associate Agreement)

A BAA is required whenever a 3rd-party vendor handles PHI on behalf of the covered entity.
Sentinel detects vendor SDK imports and configuration, then cross-references against this list
to populate the BAA Risk Matrix in `outputs/compliance-agent/baa-matrix.md`.

### BAA-vendor reference table
| Vendor | npm/PyPI/Maven Patterns | Config/URL Patterns | PHI Access Default | BAA Required |
|---|---|---|---|---|
| Twilio | `twilio`, `@twilio/*` | `api.twilio.com`, `TWILIO_*` env vars | YES (SMS/voice content) | YES |
| SendGrid | `@sendgrid/mail`, `sendgrid-java` | `api.sendgrid.com`, `SENDGRID_*` | YES (email body) | YES |
| Mailgun | `mailgun`, `mailgun-java` | `api.mailgun.net` | YES (email body) | YES |
| Postmark | `postmark` | `api.postmarkapp.com` | YES (email body) | YES |
| AWS S3 | `aws-sdk`, `@aws-sdk/client-s3`, `software.amazon.awssdk:s3` | `s3.amazonaws.com`, `*.s3.*` | YES (documents) | YES |
| AWS SES | `@aws-sdk/client-ses`, `aws-java-sdk-ses` | `email.*.amazonaws.com` | YES (email body) | YES |
| AWS Lambda | `@aws-sdk/client-lambda` | `lambda.*.amazonaws.com` | YES (if PHI in event payload) | YES |
| AWS RDS / DynamoDB | `@aws-sdk/client-dynamodb`, `aws-java-sdk-rds` | `*.rds.amazonaws.com`, `dynamodb.*` | YES (if storing PHI) | YES |
| Azure Blob | `@azure/storage-blob`, `azure-storage-blob` | `*.blob.core.windows.net` | YES (documents) | YES |
| GCP Cloud Storage | `@google-cloud/storage` | `storage.googleapis.com` | YES (documents) | YES |
| Stripe | `stripe`, `@stripe/stripe-js`, `stripe-java` | `api.stripe.com`, `STRIPE_*` | Conditional — YES if PHI in `metadata`/`description`; NO if tokenization-only | Conditional |
| Square | `square` | `connect.squareup.com` | Conditional (same as Stripe) | Conditional |
| Keycloak | `keycloak-spring-boot-starter`, `keycloak-js` | `KEYCLOAK_*` | NO (identity only) | NO |
| Auth0 | `@auth0/auth0-react`, `com.auth0` | `*.auth0.com` | NO (identity only) | NO (typically) |
| OpenAI | `openai` | `api.openai.com`, `OPENAI_API_KEY` | YES (if PHI in prompts) | YES |
| Anthropic | `@anthropic-ai/sdk` | `api.anthropic.com`, `ANTHROPIC_API_KEY` | YES (if PHI in prompts) | YES |
| Google Analytics / gtag | `react-ga`, `gtag.js`, `firebase/analytics` | `googletagmanager.com`, `google-analytics.com` | YES if used on PHI pages | YES if applies |
| Mixpanel | `mixpanel-browser`, `mixpanel-java` | `api.mixpanel.com` | YES if used on PHI pages | YES if applies |
| Segment | `analytics-node`, `@segment/analytics-next` | `api.segment.io` | YES if used on PHI pages | YES if applies |
| Hotjar | `@hotjar/browser`, raw `<script src="hotjar">` | `static.hotjar.com` | YES (session recording) | YES (typically not signed) |
| Posthog | `posthog-js`, `posthog-java` | `app.posthog.com` | YES if used on PHI pages | YES if applies |
| Datadog | `dd-trace`, `datadog-java-agent` | `*.datadoghq.com` | YES if logs contain PHI | YES |
| New Relic | `newrelic` | `*.newrelic.com` | YES if logs contain PHI | YES |
| Sentry | `@sentry/react`, `io.sentry:sentry-spring` | `*.sentry.io` | YES if error context contains PHI | YES |
| LogRocket | `logrocket` | `*.lr-in.com` | YES (session replay) | YES |
| FullStory | `@fullstory/browser` | `*.fullstory.com` | YES (session replay) | YES |
| Intercom | `@intercom/messenger-js-sdk` | `api.intercom.io` | YES if patient names in chat | YES |

### How Sentinel decides "PHI Access"
- For storage vendors (S3, Azure Blob, GCS): default YES (assume PHI documents)
- For email/SMS vendors (SendGrid, Twilio, SES, Mailgun, Postmark): default YES (templates often render PHI)
- For payment vendors (Stripe, Square): inspect calls — if `metadata` or `description` fields receive PHI-named values, YES; otherwise NO
- For analytics/observability vendors: YES if used in any file that also references PHI-named fields
- For session-replay vendors (Hotjar, FullStory, LogRocket): always YES (full DOM capture)
- For LLM vendors (OpenAI, Anthropic): YES if prompts include PHI-named fields

### BAA matrix output schema
`outputs/compliance-agent/baa-matrix.md` table columns:
| Vendor | Detected In | PHI Access | BAA Required | BAA On File? | Risk |

`BAA On File?` is always `⚠️ Unknown — verify manually` for first-pass scans; this is a procurement/legal record that lives outside the codebase.
`Risk`:
- **Critical** — BAA required + storing PHI (S3, RDS, Azure Blob)
- **High** — BAA required + transmitting PHI (SendGrid, Twilio, Datadog)
- **Medium** — BAA required + conditional PHI exposure (Stripe metadata, analytics on PHI page)
- **Low** — BAA not required (Keycloak identity-only, Stripe tokenization-only)
- **Unknown** — vendor detected but not in the reference table

---

## Rule Section: SOC 2 (Trust Service Criteria)

| Rule ID | Description | Detection Method | Severity | SOC 2 TSC |
|---|---|---|---|---|
| SOC2-001 | Centralized logging configured | LLM scan for SLF4J/Logback config, Winston/Pino/Bunyan in FE | Medium | CC7.2 |
| SOC2-002 | Log retention configured | LLM scan log config for retention policy (Logback `MaxHistory`, CloudWatch retention) | Medium | CC7.2 |
| SOC2-003 | Rate limiting on auth + PHI endpoints | LLM scan for `bucket4j`, `@nestjs/throttler`, `express-rate-limit`, Spring `Resilience4j`, `RateLimiter` annotation | High | CC6.6 |
| SOC2-004 | Branch protection on `main` | Cannot detect from code — note in Missing Controls section | Medium | CC8.1 |
| SOC2-005 | Health check endpoints exist | LLM scan for `/health`, `/actuator/health`, Spring Boot Actuator config | Medium | A1.2 |
| SOC2-006 | Backup/DR config documented | Cannot detect from code — note in Missing Controls | Medium | A1.3 |
| SOC2-007 | Input validation library on endpoints | LLM scan for `@Valid`, `class-validator`, `joi`, `zod`, `pydantic`, `marshmallow` usage on every endpoint | High | CC6.7, PI1.4 |
| SOC2-008 | WAF / DDoS protection | Cannot detect from code — note in Missing Controls | Medium | CC6.6 |
| SOC2-009 | Vulnerability scanning evidence | Pass/fail based on whether Trivy ran successfully in CP3 | Low | CC7.1 |
| SOC2-010 | Privileged access change-management | LLM scan for `@PreAuthorize("hasRole('ADMIN')")` endpoints — note that elevated-access endpoints exist; flag if no audit log | High | CC6.3 |

## Rule Section: CCPA / CPRA + California Healthcare

| Rule ID | Description | Detection Method | Severity | Reference |
|---|---|---|---|---|
| CCPA-001 | Data-deletion API exists | LLM scan for `DELETE /users/{id}` or `DELETE /patients/{id}` (with cascade) or `/api/privacy/delete-account` | High | CCPA §1798.105 |
| CCPA-002 | Data-export API exists | LLM scan for `GET /users/{id}/export`, `/api/privacy/data-export`, or equivalent | High | CCPA §1798.110 |
| CCPA-003 | Consent tracking model exists | LLM scan for entity/table named `Consent`, `UserConsent`, `PrivacyConsent`, `consent_log` | Medium | CPRA §1798.121 |
| CCPA-004 | Cookie consent banner present | LLM scan FE for `CookieConsent`, `react-cookie-consent`, `@osano/cookieconsent`, or custom consent component on first page load | Medium | CCPA §1798.135 |
| CCPA-005 | Privacy notice page exists | LLM scan FE routes for `/privacy`, `/privacy-policy`, `/legal/privacy` | Medium | CCPA §1798.130 |
| CCPA-006 | Opt-out of sale mechanism | LLM scan for opt-out endpoint or "Do Not Sell My Info" link in footer | Medium | CCPA §1798.120 |
| CCPA-007 | CMIA — explicit patient authorization for disclosure | LLM scan for an authorization/release-of-information workflow (entity named `Authorization`, `RoiForm`, `ConsentToDisclose`) | High | California Civil Code §56 (CMIA) |
| CCPA-008 | CMIA — patient access to own records | LLM scan for "request my records" patient-facing endpoint | High | California Civil Code §56.10 |
| CCPA-009 | CDCR data-handling controls (HOPE-specific) | LLM scan `project-context.md` for CDCR references — if present, check for offender-ID handling, restricted user roles | High | CDCR Operations Manual §54080 |
| CCPA-010 | Minor consent (under 16) handling | LLM scan registration flows for age check + parental consent path | Medium | CPRA §1798.120(c) |

## Rule Section: FHIR Security

> Note: rules present, no-op for projects without FHIR endpoints. HOPE uses REST (not FHIR)
> today — these rules will activate when FHIR support is added.

| Rule ID | Description | Detection Method | Severity | Reference |
|---|---|---|---|---|
| FHIR-001 | SMART on FHIR authorization endpoint | LLM scan for `/auth/authorize?aud=...` query param pattern | High (if FHIR present) | SMART App Launch v2.0 |
| FHIR-002 | OAuth2 scopes on FHIR resources | LLM scan for scope strings matching `patient/*.read`, `patient/Observation.write`, `user/*.read`, `system/*.read` | High (if FHIR present) | SMART scopes |
| FHIR-003 | Resource-level authorization on `/Patient/{id}` | LLM scan FHIR controllers — verify each `/Patient/{id}` handler checks requester has access to that patient | Critical (if FHIR present) | FHIR Security |
| FHIR-004 | FHIR resource validation | LLM scan for `FhirValidator`, `hapi-fhir-validation` usage on inbound requests | Medium (if FHIR present) | FHIR Security |
| FHIR-005 | Bulk-data export protection | LLM scan for `/Patient/$export` endpoint — verify scope check + async job authorization | Critical (if FHIR present) | FHIR Bulk Data |
| FHIR-006 | Audit log on every FHIR resource access | LLM scan FHIR controllers for audit logging | High (if FHIR present) | HIPAA §164.312(b) + FHIR |

### How Sentinel detects whether FHIR applies
- Look for: HAPI-FHIR dependency in pom.xml (`ca.uhn.hapi.fhir:*`), `@RestController` paths matching `/fhir/*`, `/Patient`, `/Observation`, `/Encounter`, `/Bundle`
- If none found: record "FHIR Security: N/A — no FHIR endpoints detected" in the Scan Coverage section, skip FHIR rules
- If found: activate FHIR-001 through FHIR-006

---

## Rule Section: OWASP API Security Top 10 (2023)

| Rule ID | Description | Detection Method | Severity | OWASP |
|---|---|---|---|---|
| API-001 | BOLA — endpoint takes `{id}` without ownership check | LLM scan controllers — every endpoint with path parameter `{id}` (patient, appointment, document, etc.) must verify the authenticated principal owns or has explicit access to that resource | Critical | API1:2023 |
| API-002 | Broken authentication — predictable tokens, weak password, no MFA | LLM scan login/registration flows — flag bcrypt rounds <10, no password complexity check, no rate-limit on login | High | API2:2023 |
| API-003 | BFLA / Mass assignment — `@RequestBody` with no DTO whitelist | LLM scan for endpoints binding directly to entity classes (Spring `@RequestBody MyEntity entity`) instead of a DTO — flags fields like `isAdmin`, `role`, `permissions` that should not be settable by client | High | API3:2023 |
| API-004 | Unrestricted resource consumption — missing rate limit / pagination | LLM scan list endpoints — flag any returning unbounded collections or accepting unbounded query params (limit=*, no max page size) | High | API4:2023 |
| API-005 | Broken function-level auth — admin endpoints reachable as user | LLM scan + runtime ZAP — verify every admin-only endpoint actually checks role, not just authentication | Critical | API5:2023 |
| API-006 | Unrestricted access to sensitive business flows | LLM scan high-value flows (registration, password reset, bulk export) — flag missing CAPTCHA, no progressive throttling | High | API6:2023 |
| API-007 | SSRF — user-controlled URL passed to HTTP client | Semgrep rule + LLM — `RestTemplate.getForObject(userInput, ...)`, `fetch(userInput)`, `axios.get(userInput)` where userInput is unvalidated | High | API7:2023 |
| API-008 | Security misconfig — CORS `*`, debug mode on, default credentials | Semgrep + LLM — `CORS_ORIGIN=*`, `spring.profiles.active=dev` in prod config, default H2 console enabled, Swagger UI exposed on prod | High | API8:2023 |
| API-009 | Improper inventory — undocumented endpoints, ghost APIs, deprecated versions | LLM diff controllers vs OpenAPI/Swagger spec — list endpoints not in spec; list spec endpoints not in code | Medium | API9:2023 |
| API-010 | Unsafe consumption of APIs — no response validation, blindly trusting 3rd-party responses | LLM scan external HTTP clients — flag any whose response is passed directly to DB write or rendered to UI without validation | Medium | API10:2023 |

## Rule Section: Infrastructure (IaC)

Tools used: Checkov for IaC misconfig, Trivy for container/dependency CVEs.

| Rule ID | Description | Tool & Rule ID | Severity |
|---|---|---|---|
| IAC-001 | Public S3 bucket | Checkov CKV_AWS_20 | Critical |
| IAC-002 | S3 bucket without encryption | Checkov CKV_AWS_19 | High |
| IAC-003 | S3 bucket access logging disabled | Checkov CKV_AWS_18 | Medium |
| IAC-004 | IAM wildcard `*` permissions | Checkov CKV_AWS_1, CKV_AWS_40 | High |
| IAC-005 | IAM password policy weak | Checkov CKV_AWS_8, CKV_AWS_10–17 | Medium |
| IAC-006 | RDS encryption at rest disabled | Checkov CKV_AWS_16 | Critical |
| IAC-007 | RDS publicly accessible | Checkov CKV_AWS_17 | Critical |
| IAC-008 | Dockerfile runs as root | Checkov CKV_DOCKER_8 | High |
| IAC-009 | Dockerfile uses `latest` tag | Checkov CKV_DOCKER_7 | Low |
| IAC-010 | K8s pod without `runAsNonRoot` | Checkov CKV_K8S_22 | High |
| IAC-011 | K8s pod with `privileged: true` | Checkov CKV_K8S_16 | Critical |
| IAC-012 | K8s secret in plaintext env var | Checkov CKV_K8S_35 | Critical |
| IAC-013 | Security group allows 0.0.0.0/0 ingress | Checkov CKV_AWS_24, CKV_AWS_260 | Critical |
| IAC-014 | Container image has Critical/High CVE | Trivy `--severity CRITICAL,HIGH` | Maps to CVE severity |
| IAC-015 | npm dependency has Critical/High CVE | Trivy fs scan on `package-lock.json` / `yarn.lock` | Maps to CVE severity |
| IAC-016 | Maven dependency has Critical/High CVE | Trivy fs scan on `pom.xml` | Maps to CVE severity |

### When IaC scan finds nothing
If no `*.tf`, `Dockerfile`, `docker-compose.yml`, K8s manifest, or container image is present in either repo:
- Skip IaC checks
- Record in Scan Coverage section: "Infrastructure: N/A — no IaC files found in either repo"
- Per-Framework Status for Infrastructure: "N/A"
- This is the expected state for HOPE today (no IaC in repos as of 2026-05-22)

---

## Risk Classification Rubric

### Severity definitions
| Severity | Definition | Score Weight |
|---|---|---|
| **Critical** | PHI exposed in cleartext, unauthenticated PHI endpoint, no encryption at rest, hardcoded secret committed to git, public S3 bucket containing PHI, BAA-required vendor storing PHI without BAA, public RDS, K8s pod running privileged, security group open to 0.0.0.0/0 on PHI ports | −10 each |
| **High** | Missing RBAC on authenticated PHI endpoint, missing audit log on PHI access/write, insecure cookie flags, missing HSTS on PHI page, BOLA, mass assignment, BFLA, SSRF, missing rate limit on auth, missing input validation, missing data-export/deletion API, container with High CVE | −5 each |
| **Medium** | Weak CSP, missing rate limit on non-auth endpoint, verbose error messages, missing input validation on non-PHI endpoint, weak password policy, missing privacy notice, no consent tracking, missing cookie consent banner, container with Medium CVE | −2 each |
| **Low** | Missing Permissions-Policy header, analytics on non-PHI page, undocumented endpoint, Dockerfile uses `latest` tag, low-CVE dependency, missing health check endpoint | −0.5 each |

### Overall score formula
```
score = max(0, 100 - sum(severity_weights))
```
- Round to nearest integer
- Clamp to [0, 100]
- Example: 2 Critical + 7 High + 4 Medium + 1 Low = 100 - (20 + 35 + 8 + 0.5) = 36.5 → **37%**

### Per-framework status
For each framework (HIPAA, BAA, SOC 2, CCPA, California, FHIR, OWASP, Infrastructure):
- **Compliant** — 0 Critical + ≤2 High findings against that framework
- **Partial** — 1–2 Critical OR 3–10 High findings
- **Non-Compliant** — 3+ Critical OR 11+ High findings
- **N/A** — framework not applicable (FHIR for non-FHIR app, Infrastructure for no-IaC repo)

A single finding can map to multiple frameworks; per-framework counts are computed independently.

### Finding ID convention
- `C-001`, `C-002`, … for Critical findings (sequential, in detection order)
- `H-001`, `H-002`, … for High
- `M-001`, `M-002`, … for Medium
- `L-001`, `L-002`, … for Low

IDs are referenced in the Critical/High/Medium/Low report sections AND in the Code-Level Findings table AND in the Top Remediation Priorities list — same ID, three different views of the same finding.

---

## External Tool Configuration

### Semgrep
- **Install:** `pip install semgrep`
- **Rule packs to enable:**
  - `p/owasp-top-ten`
  - `p/javascript` (for FE)
  - `p/typescript` (for FE)
  - `p/java` (for BE)
  - `p/spring` (for BE)
  - `p/secrets`
- **Invocation:**
  ```powershell
  semgrep --config p/owasp-top-ten --config p/javascript --config p/typescript `
    --json --output outputs/compliance-agent/scan-evidence/semgrep-fe.json `
    --exclude node_modules --exclude dist --exclude build <FE_PATH>

  semgrep --config p/owasp-top-ten --config p/java --config p/spring `
    --json --output outputs/compliance-agent/scan-evidence/semgrep-be.json `
    --exclude target --exclude build <BE_PATH>
  ```
- **Parse:** JSON `results[]` → each result has `path`, `start.line`, `extra.message`, `check_id`, `extra.severity`

### Gitleaks
- **Install:** `winget install gitleaks` or `brew install gitleaks`
- **Invocation:**
  ```powershell
  gitleaks detect --source <FE_PATH> --report-format json `
    --report-path outputs/compliance-agent/scan-evidence/gitleaks-fe.json `
    --no-banner --exit-code 0

  gitleaks detect --source <BE_PATH> --report-format json `
    --report-path outputs/compliance-agent/scan-evidence/gitleaks-be.json `
    --no-banner --exit-code 0
  ```
- **Parse:** JSON array — each entry has `File`, `StartLine`, `Description`, `Match`, `RuleID`
- **Severity mapping:** every Gitleaks finding → Critical (HIPAA-011)

### Trivy
- **Install:** `winget install AquaSecurity.Trivy`
- **Invocation (filesystem CVE scan):**
  ```powershell
  trivy fs --severity HIGH,CRITICAL --format json `
    --output outputs/compliance-agent/scan-evidence/trivy-fe.json <FE_PATH>

  trivy fs --severity HIGH,CRITICAL --format json `
    --output outputs/compliance-agent/scan-evidence/trivy-be.json <BE_PATH>
  ```
- **Parse:** JSON `Results[].Vulnerabilities[]` — each has `PkgName`, `InstalledVersion`, `FixedVersion`, `Severity`, `Description`, `VulnerabilityID` (CVE)
- **Severity mapping:** Trivy `CRITICAL` → Critical, `HIGH` → High, `MEDIUM` → Medium, `LOW` → Low

### Checkov
- **Install:** `pip install checkov`
- **Invocation:**
  ```powershell
  checkov -d <FE_PATH> -o json `
    --output-file-path outputs/compliance-agent/scan-evidence/checkov-fe.json

  checkov -d <BE_PATH> -o json `
    --output-file-path outputs/compliance-agent/scan-evidence/checkov-be.json
  ```
  If no IaC files exist, Checkov outputs `{}` — Sentinel treats this as "no IaC found, skipping".
- **Parse:** JSON `results.failed_checks[]` — each has `check_id`, `file_path`, `file_line_range`, `resource`, `check_name`
- **Severity mapping:** see IAC-xxx table above (per-rule mapping)

### OWASP ZAP
- **Install:** Download from https://www.zaproxy.org/download/ — manual install required, no winget package
- **Daemon launch:**
  ```powershell
  & "C:\Program Files\OWASP\Zed Attack Proxy\zap.bat" -daemon -port 8090 -config api.disablekey=true
  ```
- **API invocation (Sentinel uses REST API to drive ZAP):**
  ```powershell
  # Spider with auth
  Invoke-RestMethod -Uri "http://localhost:8090/JSON/spider/action/scan/?url=<RUNTIME_URL>&recurse=true"

  # Wait for spider completion (poll spider status until 100)
  # Active scan
  Invoke-RestMethod -Uri "http://localhost:8090/JSON/ascan/action/scan/?url=<RUNTIME_URL>&recurse=true&scanPolicyName=API"

  # Export report
  Invoke-RestMethod -Uri "http://localhost:8090/OTHER/core/other/htmlreport/" `
    -OutFile outputs/compliance-agent/scan-evidence/zap-report.html
  ```
- **Parse:** XML/JSON via `Invoke-RestMethod -Uri "http://localhost:8090/JSON/core/view/alerts/"` → alerts array with `risk`, `name`, `url`, `description`, `cweid`
- **Severity mapping:** ZAP `High` → High, `Medium` → Medium, `Low` → Low, `Informational` → Low

### Tool authority order (for dedup)
When the same finding is detected by multiple tools at the same `file:line + rule`, keep the more authoritative tool's record:
1. Checkov (for IaC rules)
2. Trivy (for dependency CVEs)
3. Gitleaks (for secrets)
4. Semgrep (for static code patterns)
5. ZAP (for runtime API findings)
6. LLM (lowest — used only when no tool covers the rule)

---

## Report Templates

### Template 1: `compliance-report.md` (primary deliverable)

```markdown
# 🛡️ Healthcare Compliance Audit Report
**Generated:** YYYY-MM-DD HH:MM
**Application:** <from project-context.md>
**Auditor:** Sentinel (compliance-agent)
**Frontend Repo:** <FE_PATH>
**Backend Repo:** <BE_PATH>
**Runtime URL:** <RUNTIME_URL or "Not Audited">

## Overall Compliance Score: NN%

## Scan Coverage
| Phase | Tool | Status | Files/Routes Scanned |
|---|---|---|---|
| Frontend static | Semgrep + Gitleaks + LLM | ✅ / ⚠️ / ❌ | N |
| Backend static | Semgrep + Gitleaks + LLM | ✅ / ⚠️ / ❌ | N |
| Infrastructure | Checkov + Trivy | ✅ / ⚠️ Empty / ❌ | N IaC files |
| PHI data flow | LLM trace | ✅ | N PHI fields traced |
| Runtime audit | Playwright | ✅ / ⚠️ / ❌ | N checks |
| OWASP ZAP active scan | ZAP | ✅ / ⏭️ Skipped (user opt-out) / ❌ | — |

## Per-Framework Status
| Framework | Status | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| HIPAA | <status> | N | N | N | N |
| HIPAA BAA | <status> | N | N | N | N |
| SOC 2 | <status> | N | N | N | N |
| CCPA / CPRA | <status> | N | N | N | N |
| California (CMIA/CDCR) | <status> | N | N | N | N |
| FHIR Security | N/A — no FHIR endpoints / <status> | N | N | N | N |
| OWASP API Top 10 | <status> | N | N | N | N |
| Infrastructure | N/A — no IaC files / <status> | N | N | N | N |

## 🔴 Critical Risks (N)

### [C-001] <Finding title>
- **File:** `<path>:<line>`
- **Code:** `<exact code snippet from the source>`
- **Frameworks:** <comma-separated list of clause refs>
- **Healthcare impact:** <one or two sentences>
- **Fix:**
  ```<language>
  <copy-pasteable replacement code>
  ```

(repeat per Critical finding)

## ⚠️ High Risks (N)
(same structure as Critical)

## 🟡 Medium Risks (N)
(same structure)

## 🟢 Low Risks (N)
(same structure)

## 💻 Code-Level Findings
### Frontend
| ID | Severity | Issue | File | Line | Tool |
|---|---|---|---|---|---|

### Backend
| ID | Severity | Issue | File | Line | Tool |
|---|---|---|---|---|---|

### Infrastructure
| ID | Severity | Issue | File | Line | Tool |
|---|---|---|---|---|---|

## 🌐 Runtime Findings
| ID | Severity | Issue | Evidence |
|---|---|---|---|

## 🤝 BAA Risk Matrix
See [baa-matrix.md](./baa-matrix.md).

## 🩺 PHI Data Flow
See [phi-data-flow.md](./phi-data-flow.md).

## ❌ Missing Controls
- <list of controls that can't be detected from code but were flagged in Missing Controls — e.g., branch protection, backup config, WAF>

## ✅ Top Remediation Priorities (sorted by impact, lowest-effort-first within severity)
1. **[C-001]** <Title> — <effort estimate>
2. **[C-002]** <Title> — <effort estimate>
3. **[H-007]** <Title> — <effort estimate>

(top 10–15 items)

## 📊 Compliance Matrix (Auditor View)
| Control | HIPAA Ref | SOC 2 TSC | CCPA | OWASP | Status | Evidence |
|---|---|---|---|---|---|---|
<one row per regulated control, status = Pass/Fail/Partial>

## ⚠️ Scan Warnings
- <list of skipped files, missing tools, partial scans, errors — anything the reader should know>

## 🧪 Compliance Test Cases (for Strategist/Scriptor handoff)
### TC-COMP-001 — <Title>
- **Description:** <what it verifies>
- **Steps:**
  1. <step>
  2. <step>
- **Expected Result:** <expected>
- **Maps to:** <regulation refs>, [<finding-id>]
```

### Template 2: `compliance-report.json` (machine-readable)

```json
{
  "generated_at": "ISO-8601 timestamp",
  "application": "from project-context.md",
  "score": 0,
  "frameworks": {
    "hipaa":          { "status": "compliant|partial|non-compliant|n/a", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "hipaa_baa":      { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "soc2":           { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "ccpa":           { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "california":     { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "fhir":           { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "owasp_api":      { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 },
    "infrastructure": { "status": "...", "critical": 0, "high": 0, "medium": 0, "low": 0 }
  },
  "findings": [
    {
      "id": "C-001",
      "severity": "critical",
      "title": "PHI exposed in browser console",
      "file": "Frontend/src/components/PatientDashboard.tsx",
      "line": 120,
      "code": "console.log(patient)",
      "frameworks": ["hipaa-164.502", "soc2-cc6.1", "ccpa-1798.150"],
      "tool": "llm",
      "fix": "Remove the console.log or sanitize to log only ID: console.log('Patient loaded', { id: patient.id });",
      "healthcare_impact": "Unauthorized disclosure of PHI through browser DevTools; visible to anyone with screen access during a session."
    }
  ],
  "baa_matrix": [
    {
      "vendor": "SendGrid",
      "detected_in": ["Backend/src/main/java/.../EmailService.java:42"],
      "phi_access": "yes",
      "baa_required": "yes",
      "baa_on_file": "unknown",
      "risk": "high"
    }
  ],
  "phi_flows": [
    {
      "field": "ssn",
      "entry": "Frontend/src/components/PatientForm.tsx",
      "storage": "patients.ssn (encrypted)",
      "transit": "HTTPS",
      "exits_to": []
    }
  ],
  "scan_coverage": {
    "frontend_static": { "status": "ok", "files_scanned": 144, "tools": ["semgrep", "gitleaks", "llm"] },
    "backend_static":  { "status": "ok", "files_scanned": 115, "tools": ["semgrep", "gitleaks", "llm"] },
    "infrastructure":  { "status": "empty", "iac_files": 0, "tools": ["checkov", "trivy"] },
    "phi_data_flow":   { "status": "ok", "phi_fields_traced": 38 },
    "runtime_audit":   { "status": "ok", "checks_run": 12, "tool": "playwright" },
    "zap_active_scan": { "status": "skipped_user_optout", "tool": "zap" }
  },
  "warnings": [
    "Skipped 3 binary files (>5 MB)",
    "ZAP active scan skipped (user opt-out)"
  ]
}
```

### Template 3: `phi-data-flow.md`

```markdown
# 🩺 PHI Data Flow Map

## Flow Graph
\`\`\`mermaid
graph LR
  <FE_FORM>[<form name>] -->|<PHI fields>| <API_ENDPOINT>[POST /api/...]
  <API_ENDPOINT> --> <CONTROLLER>[<ControllerClass>]
  <CONTROLLER> --> <SERVICE>[<ServiceClass>]
  <SERVICE> --> <REPO>[(PostgreSQL schema.table)]
  <SERVICE> -->|<PHI fields>| <VENDOR>[<Vendor name>]
\`\`\`

## PHI Field Inventory
| PHI Field | Entry Point | Storage Location | In Transit | Exits To |
|---|---|---|---|---|
| <field> | <file:line> | <table.column + encryption status> | HTTPS / HTTP | <vendor or "—"> |

## Flows Exiting to Non-BAA'd Vendors
| Flow | PHI Field | Destination Vendor | BAA Status | Recommendation |
|---|---|---|---|---|
```

### Template 4: `baa-matrix.md`

```markdown
# 🤝 BAA Risk Matrix

## Detected 3rd-Party Vendors
| Vendor | Detected In | PHI Access | BAA Required | BAA On File? | Risk |
|---|---|---|---|---|---|
| <vendor> | <file:line> | <yes/no/conditional + reason> | <yes/no> | <⚠️ Unknown — verify manually> | <Critical/High/Medium/Low> |

## Unknown Vendors (not in reference table)
| Vendor | Detected In | Notes |
|---|---|---|

## Action Items
- <For each "BAA Required: yes" + "BAA On File: Unknown" — add a procurement action item>
```

---

## Custom Rules
- None yet — populated as patterns emerge across HOPE audits.

## Learnings
- None yet — populated from project experience.

## Anti-Patterns
- Guessing whether a vendor needs BAA without checking PHI access pattern
- Flagging test fixtures as PHI exposure (false positives waste auditor time)
- Reporting a finding without a file:line reference
- Suggesting "add proper validation" without showing the actual fix
- Treating low-CVE dependency findings the same as a public S3 bucket
- Skipping IaC scan silently when no IaC files found — must record "N/A — no IaC files" explicitly
