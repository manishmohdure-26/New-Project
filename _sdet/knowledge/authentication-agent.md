# Keymaster — Authentication & Authorization Testing Agent Knowledge

> Training file for Keymaster (Senior Authentication & Authorization Testing Specialist).
> Edit this file to customize Keymaster's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Credential Handling Rules (CRITICAL)
- **NEVER write a literal password, API key, or token anywhere in output** — reference the role name and `process.env` key from `project-context.md` Test Credentials table only
- **Never invent a role, permission, or account** — if Test Credentials/Portals sections are missing a role needed for a test, ask the user; do not fabricate one
- **Never invent thresholds** (lockout count, session timeout, password expiry) — pull from project-context.md/user input; if unknown, mark the row "assumed [value] — needs confirmation"

### Matrix & Escalation Rules
- Every RBAC/ABAC matrix cell requires an explicit Allow/Deny AND a "Verified At" layer (API or UI-only) — a UI-only cell is a flagged gap, not a pass
- Horizontal and vertical privilege escalation tests are always labeled separately — never merge them under one "access control" heading
- Every endpoint accepting a resource identifier is an IDOR candidate by default until a cross-user test proves otherwise

## Learnings

<!-- Add learnings from past authentication/authorization testing sessions -->

## Authentication Test Catalog

### Login / Logout
| Case | Expected Result |
|------|------------------|
| Valid credentials, active account | Login succeeds, session/token issued |
| Valid email, wrong password | Login rejected, generic error (no enumeration hint) |
| Unregistered email | Same generic error as wrong password (prevents user enumeration) |
| Disabled/deactivated account | Login rejected, account-status message, no session issued |
| Unverified email/account | Login blocked/restricted until verification, per product rule |
| Logout | Session/token immediately invalidated server-side, not just cleared client-side |
| Login while already authenticated | Re-auth handled per product rule (refresh vs. reject) |

### Password Policy
- Minimum length/complexity enforced server-side, not just in the UI form — submit a weak password directly to the API to confirm
- Password confirmation field must match; mismatch blocks submission
- Password reuse prevention (if policy defines a reuse window) enforced on change
- Password expiry (if applicable) forces reset at the configured interval; new password must differ from current
- Password field is masked in UI and never logged, echoed in API responses, or included in error messages

### MFA (Multi-Factor Authentication)
- Enrollment: user can enroll a factor (TOTP, SMS, email code) and it activates correctly
- Verification: correct code accepted, incorrect code rejected, expired code rejected
- Code reuse: a consumed one-time code cannot be reused (replay test); backup codes work once and are invalidated after use
- MFA bypass: primary-auth session cannot reach protected resources before MFA completes (partial-auth session must be scoped, not full access)
- MFA can be required per-role (e.g., Admin mandatory) — verify policy matches project-context.md if role-based MFA is configured

### Brute-Force / Lockout / Credential Stuffing
- Failed-attempt counter increments correctly per account (and optionally per IP)
- Account locks after the configured threshold; locked account rejects even a correct password until unlock condition is met
- Lockout duration/unlock mechanism (time-based, admin unlock, email unlock) matches policy
- Rate limiting or CAPTCHA triggers after repeated failures from the same source
- Credential-stuffing resistance: rapid attempts across many different usernames from one source are throttled, not just per-account lockout
- Successful login after lockout expiry resets the failed-attempt counter

### Account Lifecycle
- **Lockout:** verify both the lock trigger and the unlock path (self-service, time-based, or admin-assisted per project policy)
- **Recovery ("forgot password"):** reset link/token is single-use, time-bound, invalidated after use/reissue; recovery does not leak whether an email exists
- **Reset:** completing a reset invalidates all existing sessions for that account and the reset token itself
- **Deactivation:** deactivated accounts cannot authenticate; any active sessions are terminated at deactivation time, not left to expire naturally

## Session Management Test Checklist

1. **Fixation** — session identifier issued before login must NOT be reused after login; a new session ID/token is generated on successful authentication
2. **Timeout** — idle timeout and absolute timeout both enforced server-side; pull the N-minute/hour values from project-context.md or ask, never assume
3. **Concurrent sessions** — verify actual policy (unlimited, limited to N devices, or single-session-only) is enforced, not just documented
4. **Logout invalidation** — after logout, the prior session token/cookie is rejected on the next request (replay test); verify server-side rejection independently, not just that the client deleted the cookie
5. Session token transmitted securely (HTTPS only, `Secure`/`HttpOnly`/`SameSite` cookie flags where applicable) — flag as a finding if missing, do not fix it
6. Password change or MFA factor change invalidates other active sessions for that account

## Token / JWT Validation Checklist

- **Signature validation** — a token with a tampered payload but original signature is rejected; a token signed with an attacker-controlled key is rejected
- **`alg: none` rejection** — a token with `"alg": "none"` and no signature must be rejected outright
- **Algorithm confusion** — if the server expects RS256, a token forged as HS256 using the public key as the HMAC secret must be rejected
- **Expiry (`exp`) enforcement** — an expired token is rejected; clock-skew tolerance matches documented policy, not an arbitrary window
- **`iat`/`nbf` handling** — tokens used before their "not before" time are rejected
- **Issuer/audience (`iss`/`aud`) validation** — tokens issued for a different service/audience are rejected, not silently accepted
- **Claim tampering** — modifying the role/user-id claim without re-signing must be rejected (proves server verifies signature, not just decodes payload)
- **Refresh-token rotation** — refresh tokens rotate on use; a reused (replayed) refresh token is detected and the token family is revoked
- **Token storage/transmission** — token is not exposed in URLs/logs; sent via `Authorization` header or a properly-flagged cookie, not a query string

## OAuth2 / OIDC Flow Test Notes (when in scope per project-context.md)

- Authorization-code flow completes correctly for a legitimate client/redirect URI
- `state` parameter validated to prevent CSRF on the callback; PKCE (`code_verifier`/`code_challenge`) enforced for public clients
- Redirect URI validated against an allow-list, not accepted as any URI the client sends
- Authorization codes are single-use and short-lived; reuse is rejected
- Token scope is enforced — a token issued with limited scope cannot access endpoints requiring a broader scope
- ID token (OIDC) signature and claims (`iss`, `aud`, `exp`, `nonce`) validated the same way as any other JWT (see Token/JWT checklist above)

## RBAC/ABAC Matrix Method

1. **Enumerate roles** from `project-context.md` Test Credentials table (e.g., Provider, Clinical Staff, Admin, Patient) — do not invent roles not defined there.
2. **Enumerate resources/actions** from `outputs/api-analysis-agent/` (endpoint inventory) or, if unavailable, from the user/portal walkthrough — group by module.
3. **Build the matrix** with one row per role x resource x action combination:

   ```
   | Role | Resource | Action | Expected | Verified At | Notes |
   |------|----------|--------|----------|--------------|-------|
   | Patient | Own record | View | Allow | API | |
   | Patient | Other patient's record | View | Deny | API | IDOR candidate — see PE tests |
   | Clinical Staff | Patient record (assigned) | Edit | Allow | API | |
   | Clinical Staff | Billing/claims | View | Deny | UI-only | GAP: button hidden but endpoint untested |
   | Admin | All modules | Full | Allow | API | |
   ```

4. **For ABAC**, add an Attribute column (ownership, tenant/org, department, time-of-day) next to Role when access depends on more than role alone.
5. **Flag every "Verified At: UI-only" cell** as an open gap requiring an API-layer test — a UI-hidden button is not proof of server-side enforcement.
6. Cross-check against `outputs/architecture-agent/` trust boundaries — any resource crossing a trust boundary gets its own matrix rows, since a role check at one service does not guarantee the same check downstream.

## Privilege Escalation & IDOR Test Procedure

1. **Horizontal escalation** — authenticate as Role A, User 1. Attempt every action Role A is allowed to perform against a resource owned by Role A, User 2 (a peer). Expected: Deny on every cross-user access, even though the role matches.
2. **Vertical escalation** — authenticate as a lower-privileged role. Attempt higher-privileged endpoints/actions directly via API (bypassing the UI). Include direct API calls the UI never exposes and elevated role/permission fields in request bodies (mass-assignment style tampering).
3. **IDOR sweep** — for every endpoint accepting a resource identifier, pair it with a test that substitutes an ID belonging to a different user/tenant while authenticated as an unrelated account. Cover sequential/guessable IDs and UUIDs.
4. **Multi-tenant boundary check** (if applicable) — repeat every horizontal and IDOR test across tenant boundaries, not just across users within one tenant.
5. **Label every test explicitly**: `Horizontal`, `Vertical`, or `IDOR` — "access control tested" without this breakdown does not say which attack surface was covered.
6. Every failure found here is CRITICAL or HIGH severity by default (authorization-boundary data exposure/tampering) — flag it for the user to file via `/bug-report-agent`; do not downgrade severity without stakeholder sign-off.
