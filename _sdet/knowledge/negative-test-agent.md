# Contrarian — Negative Test Agent Knowledge

> Training file for Contrarian (Senior Negative Testing Specialist).
> Edit this file to customize Contrarian's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Negative Case Structure Rules (CRITICAL)
- **Every negative case needs an exact attack value** — "invalid input" or "bad data" is
  not a negative case, it is a placeholder that will produce an unrepeatable test
- **Every negative case needs a Source** — a positive Scenario ID or a Requirement ID,
  except explicit flow/state attacks, which cite the user story or flow name instead
- **Expected result is always the triad** — error signal, no data corruption, no
  information leak. A negative case missing any one of the three is incomplete
- **Never invent the expected status code or message** — pull from the requirement, the
  API contract, or `project-context.md`; if undefined, log it in Open Questions
- **Injection-shaped strings are validation tests, not exploitation** — Contrarian checks
  that the field rejects/escapes them; he does not attempt to actually compromise the
  system. Real exploitation is security-reviewer's domain, not Contrarian's

## Learnings

<!-- Add learnings from past negative testing sessions -->

## Error Condition Taxonomy

Every negative case is classified into exactly one of these categories:

1. **Invalid Format/Value** — data of the right type but the wrong shape (bad email
   syntax, non-ISO date, out-of-range enum value)
2. **Missing Required Field** — a mandatory input omitted entirely (single field, or the
   whole required set)
3. **Wrong Data Type** — string where a number is expected, array where an object is
   expected, malformed JSON/XML body
4. **Boundary-Breaking Value** — value at, just past, or far past a defined min/max,
   length, or count limit
5. **Duplicate/Concurrent Operation** — double-submit, two simultaneous requests
   creating the same resource, re-use of a one-time token or idempotency key
6. **Out-of-Order Operation** — a required prior step skipped, or a completed step
   replayed (pay before cart finalized, confirm before OTP verified)
7. **Interrupted Flow** — session/token expiry mid-flow, network drop between steps,
   refresh/back navigation mid-multistep-form, partial file upload
8. **Resource Exhaustion** — oversized payload/file, very long strings, rapid-fire
   repeated requests, large pagination/limit values, deeply nested structures
9. **Injection-Shaped Input (validation-only)** — SQL/NoSQL/command/XSS-shaped strings
   used to confirm the field rejects or safely escapes them, not to exploit
10. **Unauthorized/Cross-Context Access** — valid-shaped data submitted against a
    resource the actor should not be able to reach (out of Contrarian's normal scope
    unless the source scenario is explicitly a Permission scenario — otherwise defer to
    the Permission category owned upstream in test-scenario-agent)

## Per-Input-Type Negative Case Catalog

| Input Type | Negative Values to Try |
|------------|--------------------------|
| **String (general)** | empty string, whitespace-only, null, exceeds max length by 1, exceeds max length by 1000+, below min length, leading/trailing spaces, Unicode/emoji, HTML/script tags, SQL-shaped (`' OR '1'='1`), control characters (`\0`, `\n`, `\t` mid-value) |
| **Number** | negative when only positive allowed, zero when not allowed, non-numeric string, decimal where integer expected, leading zeros, scientific notation, overflow (beyond type max), empty, `NaN`/`Infinity` literal strings |
| **Date** | invalid calendar date (Feb 30), wrong format, far past (year 1000), far future (year 9999), non-date string, date equal to a boundary (today for a "future only" field), timezone-ambiguous value, empty |
| **Email** | missing `@`, missing domain, no TLD, consecutive dots, leading/trailing space, >254 chars, Unicode local part, valid-format but non-existent domain, SQL/script-shaped local part |
| **Phone** | too few/too many digits, letters mixed in, missing country code when required, symbols only, empty, valid format but unreachable number (if verified) |
| **File Upload** | wrong MIME type disguised with correct extension, zero-byte file, file exceeding max size, file exceeding max size by a large margin, executable/script file when only documents allowed, filename with path traversal (`../../etc/passwd`), filename with special characters, corrupted file header |
| **Enum/Dropdown** | value not in the allowed set, empty selection when required, case-mismatched valid value (if case-sensitive), value from a different but similar enum |
| **Boolean** | non-boolean string (`"yes"`, `"1"`, `"maybe"`), null when required, missing entirely |
| **Array/Multi-select** | empty array when at least one required, duplicate entries, exceeds max item count, array containing an invalid item mixed with valid ones, wrong item type inside array |
| **Currency/Money** | negative amount, zero when not allowed, more decimal places than currency supports, mismatched currency code, amount exceeding a defined transaction limit, non-numeric |
| **ID/Reference (FK)** | non-existent ID, ID belonging to a different tenant/owner, malformed ID format, ID of a soft-deleted/archived record, empty/null reference |
| **Password** | below min length, missing required character class, exceeds max length, common/breached password (if a blocklist is required), matches username/email, leading/trailing whitespace-only difference from a valid password |

## Error-Handling Verification Checklist

Run against every negative case before marking it complete:

- [ ] **Correct status code/UI error state** — matches the contract (e.g., 400/422 for
  validation, 401/403 for auth, 409 for conflict/duplicate, 413 for payload too large) —
  not a generic 500 or a silent 200
- [ ] **Correct, specific message** — field-level or flow-level, matching the defined
  copy/contract; not a generic "Something went wrong"
- [ ] **No stack trace or exception text** in the response body or rendered UI
- [ ] **No internal file path, server name, or framework version** disclosed
- [ ] **No raw SQL, query fragment, or ORM error** disclosed
- [ ] **No partial write** — a rejected create/update leaves no half-written record
- [ ] **No orphaned child record** — a rejected parent operation leaves no dangling
  child rows (e.g., failed order leaves no orphaned order-items)
- [ ] **No duplicate resource created** on a rejected duplicate/concurrent submission
- [ ] **System state unchanged** — a GET immediately after the rejected operation shows
  no side effect occurred
- [ ] **Idempotent retry is safe** — resubmitting the same rejected request does not
  produce a different, unexpected outcome
- [ ] **Rate/size limits enforce before processing**, not after partial processing has
  already begun

## Worked Example — Positive Case to Negative Set

**Source positive scenario:** `SC-AUTH-001` — "Verify that the user is able to register
with a valid email, a password meeting complexity rules, and a unique username."

**Negative set derived from it:**

| Negative Case ID | Field/Flow | Category | Attack Value | Expected Status/Message |
|-------------------|-----------|----------|---------------|---------------------------|
| NT-AUTH-001 | Email | Invalid Format | `"user@"` (no domain) | 400, "Enter a valid email address"; no record created |
| NT-AUTH-002 | Email | Missing Required Field | empty string | 400, "Email is required"; no record created |
| NT-AUTH-003 | Email | Injection-Shaped | `"'; DROP TABLE users;--"` | 400, rejected as invalid format; no DB error surfaced, table intact |
| NT-AUTH-004 | Username | Duplicate/Concurrent | already-registered username | 409, "Username already taken"; no duplicate row created |
| NT-AUTH-005 | Password | Boundary-Breaking Value | 7 chars (min is 8) | 400, "Password must be at least 8 characters" |
| NT-AUTH-006 | Password | Invalid Format | no uppercase/no digit (complexity rule) | 400, specific complexity message, not generic |
| NT-AUTH-007 | Whole form | Missing Required Field | submit with all fields empty | 400, all field-level errors returned together; no record created |
| NT-AUTH-008 | Registration flow | Duplicate/Concurrent | double-click submit with valid data | Exactly one account created; second request either no-ops or returns 409, never two accounts |
| NT-AUTH-009 | Registration flow | Interrupted Flow | network drops after request sent, before response received, user retries | Retry does not create a second account; original request either completed once or failed cleanly |

This is the minimum negative shadow for one positive scenario — a field with more rules
(e.g., a password with 5 complexity rules) yields proportionally more Boundary-Breaking
and Invalid Format rows, one per rule, not a single combined row.
