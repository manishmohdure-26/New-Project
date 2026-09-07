# Steward — CCPA Agent Knowledge

> Training file for Steward (Senior Privacy Compliance Specialist).
> Edit this file to customize Steward's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Evidence Rules (CRITICAL)
- **A right is "Implemented" only with observable evidence** — an endpoint, a UI flow, or a
  documented internal process. A privacy-policy sentence describing the right is not evidence
  that the right is fulfillable.
- **Every sale/sharing conclusion must show the check was performed** — "no sale" is a finding
  that required inspecting vendor SDKs and disclosures, not a default assumption.
- **Never invent vendor names, data flows, or retention periods** — mark unconfirmed data as
  "Unverified — confirm with data owner" and continue; do not block the whole audit on one gap.
- **Every finding cites the operative CCPA/CPRA section** (Cal. Civ. Code §1798.xxx) — GDPR
  parallels may be noted for context but never substitute for the CCPA/CPRA citation.

### Scope Rules
- CCPA/CPRA applies based on California consumer residency and business thresholds (revenue,
  volume of CA consumer records, or revenue share from selling/sharing PI) — confirm
  applicability with the user in Step 1 rather than assuming it applies.
- Employee/B2B PI exemptions that existed under the original CCPA were phased out effective
  Jan 1, 2023 — treat employee/B2B PI as in-scope unless the user says otherwise.

## Learnings

<!-- Add learnings from past CCPA/CPRA audit sessions -->

## CCPA/CPRA Consumer Rights

The CPRA (effective Jan 1, 2023) amends and extends the original 2020 CCPA. Six core rights,
each with what implementation actually requires:

1. **Right to Know (§1798.100, §1798.110)** — categories/specific pieces of PI collected,
   sources, business purpose, and third-party disclosure categories, covering the prior 12
   months. Requires an intake channel, a verification step, and a response process.
2. **Right to Delete (§1798.105)** — deletion of PI collected from the consumer, cascaded to
   service providers/contractors, subject to statutory exceptions (transaction completion,
   security, legal compliance). Requires an endpoint/process that reaches beyond the primary DB.
3. **Right to Correct (§1798.106)** — CPRA-added. Correction of inaccurate PI with "commercially
   reasonable efforts" to verify and apply the fix, including at service providers.
4. **Right to Opt-Out of Sale/Sharing (§1798.120)** — a clear, conspicuous "Do Not Sell or Share
   My Personal Information" link (or "Your Privacy Choices"), honored without requiring account
   creation, and honored via Global Privacy Control (GPC) as a valid opt-out signal.
5. **Right to Limit Use of Sensitive PI (§1798.121)** — CPRA-added. A separate "Limit the Use of
   My Sensitive Personal Information" link, distinct from the sale/sharing opt-out, required
   whenever sensitive PI is used for secondary purposes.
6. **Right to Non-Discrimination (§1798.125)** — no denial of goods/services, price change, or
   quality reduction for exercising a right. Financial incentives allowed only if reasonably
   tied to data value, opt-in, and easily revocable. Requires a behavioral check, not a policy
   read: does exercising a right actually change price, quality, or access?

Two more to check when relevant: **Data Portability** (part of Right to Know — response must be
portable/readily usable) and **Minors' opt-in** (no sale/sharing of PI for consumers known to be
under 16 without affirmative opt-in; parent/guardian opt-in required under 13).

## Verifiable Consumer Request (VCR) Workflow

1. **Intake** — at least two methods (web form + toll-free number, or web form + email is
   typical). Request logged with a receipt timestamp — the statutory clock starts here.
2. **Verification** — proportional to sensitivity: Right to Know (categories)/Delete need a
   reasonable degree of certainty (2-3 matching data points); Right to Know (specific
   pieces)/Correct need a reasonably high degree of certainty (2-3 points + signed declaration
   or equivalent). Existing account authentication may suffice for account holders. A new
   account must NEVER be required solely to submit a request or opt out of sale/sharing.
3. **Authorized agent support** — a consumer may designate an agent; the business may require
   proof of authorization and may still verify the consumer directly.
4. **Response timeline (§1798.130(a)(2))** — confirm receipt within **10 business days**.
   Substantively respond within **45 calendar days** of receipt. One **45-calendar-day
   extension** is allowed when reasonably necessary, PROVIDED the consumer is notified of the
   extension and reason **within the initial 45-day period** — a silent/late extension notice is
   a violation, not a grace period.
5. **Denial handling** — a denial (in whole or part) requires an explanation of the basis, not a
   bare refusal.
6. **No fee**, unless the request is "manifestly unfounded or excessive" — the business bears
   the burden of demonstrating why a fee or refusal applies.
7. **Minimum two free Right-to-Know requests** per consumer per 12-month period.

Audit evidence to look for: a ticketing/logging system with receipt timestamps, verification
logic keyed to request type, an SLA/timeline tracker, and template denial/extension notices.
Absence of any of these is a finding, not an assumption of compliance.

## Data Inventory & Mapping Method

Seed from `outputs/database-analysis-agent/` (schema/PII fields) and
`outputs/architecture-agent/` (vendor integrations) when available, then confirm against source:

| Column | What it captures |
|--------|-------------------|
| PI Category | One of the 11 CCPA statutory categories (see below) |
| Examples | Concrete fields observed (email, IP, purchase history, geolocation, biometric) |
| Source | Where collected (signup form, checkout, device/browser, third party) |
| Purpose | The specific business/commercial purpose |
| Retention | How long kept and the basis for that period |
| Disclosed To | Categories of third parties (service providers, contractors, third parties) |

**CCPA statutory PI categories (§1798.140(v)):** Identifiers; Customer records (Cal. Civ. Code
§1798.80(e)); Protected classification characteristics; Commercial information; Biometric
information; Internet/network activity; Geolocation; Sensory data (audio/visual);
Professional/employment information; Non-public education information; Inferences/profiles.

A category without all five columns filled cannot support a Right to Know response — treat
incomplete rows as "not yet mapped," never as done.

## Sale vs. Sharing vs. Service Provider Disclosure

- **Sale (§1798.140(ad))** — disclosure for **monetary or other valuable consideration**.
  "Other valuable consideration" is broad — reciprocal data access counts even with no cash.
- **Sharing (§1798.140(ah))** — CPRA-added, closes the "we don't sell data" loophole. Disclosure
  for **cross-context behavioral advertising**, whether or not for consideration. An
  analytics/ad SDK building cross-site ad profiles is "sharing" even with no sale.
- **Service Provider/Contractor disclosure (§1798.140(ag), (j))** — NOT a sale/share when the
  recipient is contractually restricted to processing PI solely on the business's behalf under a
  written contract meeting CCPA's required terms (no further disclosure, no independent use,
  deletion/return on request). No qualifying contract → defaults to sale or share.
- **Practical test per third-party integration found:**
  1. Written contract with CCPA service-provider restrictions, no independent vendor use? →
     Service Provider disclosure, no opt-out required (still record in data inventory).
  2. No qualifying contract, or vendor uses data for its own purposes (ad targeting, profiling,
     cross-context tracking)? → Sale or Share → opt-out link required, vendor listed in the
     "Do Not Sell or Share" mechanism.
  3. Pixels, tags, and SDKs (ad networks, cross-site analytics, social widgets) are the most
     commonly missed "sharing" relationships — check explicitly, not just data-broker contracts.

## Sensitive Personal Information Handling

Sensitive PI (§1798.140(ae)): SSN/driver's license/passport/financial account + access
credential; precise geolocation; race/ethnicity/religion/union membership; contents of
mail/email/text not directed to the business; genetic data; biometric identification data;
health information; sex life or sexual orientation data.

- Collecting sensitive PI triggers the separate **Right to Limit Use** — required whenever
  sensitive PI is used/disclosed beyond providing the requested goods/services (§1798.121(a)).
- Sensitive PI used ONLY to deliver the requested service does not need the Limit Use link for
  THAT use — any secondary use (analytics, ad targeting, profiling) does.
- Audit action: cross-reference sensitive PI rows in the data inventory against actual usage; if
  any feed analytics/marketing/ad systems, the Limit Use link is required — its absence is a
  finding.

## Required Disclosures Checklist

| Disclosure | Trigger | What it must contain |
|-------------|---------|------------------------|
| Privacy Policy | Always | PI categories (12 mo), sources, purposes, third-party disclosure categories, retention criteria, full CCPA/CPRA rights list + how to exercise, contact method, effective/last-updated dates |
| Notice at Collection | At/before each collection point | PI categories to be collected, purposes, sold/shared status, retention, link to full policy — required at EVERY distinct collection surface |
| "Do Not Sell or Share My PI" link | If the business sells or shares PI | Clear, conspicuous, footer/homepage, functioning opt-out without account creation |
| "Limit the Use of My Sensitive PI" link | If sensitive PI used beyond permitted purposes | Separate from the sale/sharing link, functioning limit mechanism |
| Global Privacy Control (GPC) honor | Wherever an opt-out link is required | GPC signal treated as a valid opt-out-of-sale/sharing request automatically, no manual toggle needed |
| Financial incentive disclosure | Loyalty/rewards program tied to data | Terms, value calculation, opt-in/revocation method |
| Authorized agent process disclosure | Always, alongside the rights list | How a consumer designates an authorized agent |

A "Not Found" result at even one collection point (e.g., an unlinked lead-gen form) is a
finding — check every distinct collection surface, not just the primary signup flow.
