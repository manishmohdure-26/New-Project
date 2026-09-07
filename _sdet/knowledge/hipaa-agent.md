# Guardian — HIPAA Compliance Agent Knowledge

> Training file for Guardian (Senior HIPAA Compliance Specialist).
> Edit this file to customize Guardian's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Scope & Evidence Discipline (CRITICAL)
- Guardian audits **HIPAA only** — Privacy Rule, Security Rule, Breach Notification Rule. Do
  not add SOC 2, CCPA, FHIR, or OWASP findings; that is compliance-agent's (Sentinel's) job.
- Every finding cites the exact section (`§164.xxx`) — "HIPAA violation" with no citation is
  not a valid finding.
- Required (R) vs Addressable (A) must be labeled on every Security Rule specification
  examined — Addressable is not optional; it requires implementation OR a documented
  risk-based alternative decision.
- When architecture-agent or database-analysis-agent output does not answer a question, the
  status is `Unverified — requires manual review`, never an assumed `Compliant`.
- A Safe Harbor claim fails completely if even ONE of the 18 identifiers remains — there is
  no "mostly de-identified."
- An Expert Determination claim requires documented statistical/scientific analysis on file;
  absence of that documentation means `Unverified`, not `Compliant`.

## Learnings

<!-- Add learnings from past HIPAA audit sessions -->

## Security Rule Safeguards Reference (45 CFR §164.308/.310/.312)

| Category | Standard | Implementation Specification | R/A |
|----------|----------|------------------------------|-----|
| Administrative | Security Management Process §164.308(a)(1) | Risk Analysis | R |
| Administrative | Security Management Process | Risk Management | R |
| Administrative | Security Management Process | Sanction Policy | R |
| Administrative | Security Management Process | Information System Activity Review | R |
| Administrative | Assigned Security Responsibility §164.308(a)(2) | (standard only) | R |
| Administrative | Workforce Security §164.308(a)(3) | Authorization and/or Supervision | A |
| Administrative | Workforce Security | Workforce Clearance Procedure | A |
| Administrative | Workforce Security | Termination Procedures | A |
| Administrative | Information Access Mgmt §164.308(a)(4) | Isolating Clearinghouse Functions | R |
| Administrative | Information Access Mgmt | Access Authorization | A |
| Administrative | Information Access Mgmt | Access Establishment and Modification | A |
| Administrative | Security Awareness/Training §164.308(a)(5) | Security Reminders | A |
| Administrative | Security Awareness/Training | Protection from Malicious Software | A |
| Administrative | Security Awareness/Training | Log-in Monitoring | A |
| Administrative | Security Awareness/Training | Password Management | A |
| Administrative | Security Incident Procedures §164.308(a)(6) | Response and Reporting | R |
| Administrative | Contingency Plan §164.308(a)(7) | Data Backup Plan | R |
| Administrative | Contingency Plan | Disaster Recovery Plan | R |
| Administrative | Contingency Plan | Emergency Mode Operation Plan | R |
| Administrative | Contingency Plan | Testing and Revision Procedures | A |
| Administrative | Contingency Plan | Applications and Data Criticality Analysis | A |
| Administrative | Evaluation §164.308(a)(8) | (standard only) | R |
| Administrative | BA Contracts §164.308(b)(1) | Written Contract or Other Arrangement | R |
| Physical | Facility Access Controls §164.310(a)(1) | Contingency Operations | A |
| Physical | Facility Access Controls | Facility Security Plan | A |
| Physical | Facility Access Controls | Access Control and Validation Procedures | A |
| Physical | Facility Access Controls | Maintenance Records | A |
| Physical | Workstation Use §164.310(b) | (standard only) | R |
| Physical | Workstation Security §164.310(c) | (standard only) | R |
| Physical | Device and Media Controls §164.310(d)(1) | Disposal | R |
| Physical | Device and Media Controls | Media Re-use | R |
| Physical | Device and Media Controls | Accountability | A |
| Physical | Device and Media Controls | Data Backup and Storage | A |
| Technical | Access Control §164.312(a)(1) | Unique User Identification | R |
| Technical | Access Control | Emergency Access Procedure | R |
| Technical | Access Control | Automatic Logoff | A |
| Technical | Access Control | Encryption and Decryption | A |
| Technical | Audit Controls §164.312(b) | (standard only) | R |
| Technical | Integrity §164.312(c)(1) | Mechanism to Authenticate ePHI | A |
| Technical | Person or Entity Authentication §164.312(d) | (standard only) | R |
| Technical | Transmission Security §164.312(e)(1) | Integrity Controls | A |
| Technical | Transmission Security | Encryption | A |

## The 18 PHI Identifiers (Safe Harbor — §164.514(b)(2))

1. Names
2. Geographic subdivisions smaller than a state (zip: first 3 digits OK only if area >20,000 people)
3. All date elements except year tied to an individual (birth/admission/discharge/death dates); ages over 89
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers, including license plate numbers
13. Device identifiers and serial numbers
14. URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voiceprints, retinal scans)
17. Full-face photographs and comparable images
18. Any other unique identifying number, characteristic, or code

## De-Identification: Safe Harbor vs Expert Determination (§164.514)

- **Safe Harbor (§164.514(b)(2))** — remove ALL 18 identifiers above, AND the covered entity
  has no actual knowledge remaining info could re-identify an individual. Binary pass/fail:
  one leftover identifier (e.g. a URL or IP left in an export) fails the whole claim.
- **Expert Determination (§164.514(b)(1))** — a qualified statistician/expert applies
  generally accepted methods to conclude re-identification risk is "very small," and
  documents methods + results, retaining that documentation. No located documentation →
  `Unverified`, never assumed compliant.

## PHI-Handling Test Checklist

| Check | What to verify |
|-------|-----------------|
| Encryption at rest | PHI-bearing DB columns/fields encrypted (e.g. AES-256); backups and file storage encrypted |
| Encryption in transit | TLS 1.2+ end-to-end; HSTS present; no mixed-content (HTTP resource on HTTPS page) |
| Access controls | Unique user IDs (no shared logins); RBAC/least-privilege; MFA for admin/bulk-PHI access; auto session logoff |
| Audit logging | Every PHI create/read/update/delete logged with who/what/when; tamper-evident, retained (6 yrs); reviewed |
| Minimum necessary | Endpoints/roles return only needed PHI fields, not full records by default; field-level masking by role |
| Secure transmission | No PHI in URL query strings or plaintext logs; PHI sent via encrypted portal/email/SMS, not plain channels |

## Breach Notification Rule — Thresholds & Timelines (§164.400-414)

- **Breach:** impermissible use/disclosure of unsecured PHI compromising privacy/security, UNLESS a documented 4-factor risk assessment shows low probability of compromise: (1) nature/extent of PHI incl. re-identification likelihood, (2) who received it, (3) whether actually acquired/viewed, (4) extent risk was mitigated.
- **Exceptions:** unintentional good-faith workforce access within scope of authority; inadvertent disclosure between authorized persons at the same entity; recipient could not reasonably retain the PHI.
- **Individual notice:** without unreasonable delay, no later than **60 days** after discovery (written, mail or agreed email); substitute notice (website/media, 90 days) if contact info insufficient for 10+ individuals.
- **Media notice:** if breach affects **>500 residents** of one state, notify prominent local media within 60 days.
- **HHS/OCR notice:** **≥500 individuals** → notify HHS contemporaneously (within 60 days); **<500** → notify HHS annually, within 60 days of the calendar year's end.
- **Business Associate → Covered Entity:** notify without unreasonable delay, no later than **60 days** after discovery.

## Privacy Rule Quick Reference (§164.500-534)

- **Uses/disclosures:** permitted without authorization for Treatment, Payment, Healthcare
  Operations (TPO); anything else needs patient authorization or a specific regulatory permission.
- **Minimum necessary:** access/use/disclosure limited to what's reasonably necessary for the
  purpose (does not apply to treatment disclosures between providers).
- **Patient rights to verify:** access own records, request amendment, accounting of
  disclosures, request restrictions on use/disclosure, request confidential communications.
- **Notice of Privacy Practices (NPP):** must be provided/available, describing PHI use and patient rights.

## BAA Requirement Notes (§164.504(e))

- BAA required with any vendor that creates, receives, maintains, or transmits PHI on the
  covered entity's behalf: hosting/cloud, email/SMS gateways, analytics receiving PHI, payment
  processors touching PHI, backup/DR vendors, support-desk tooling with PHI access.
- Required BAA elements: permitted/required uses & disclosures, required safeguards, breach/
  security-incident reporting, subcontractor flow-down, return-or-destroy PHI at termination,
  records available to HHS.
- Confirmed PHI access + no confirmed BAA = a finding regardless of vendor size. Default
  BAA-on-file to "Unknown — verify with procurement/legal"; never assume Yes without evidence.
