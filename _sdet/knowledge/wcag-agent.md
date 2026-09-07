# Auditor — WCAG Agent Knowledge

> Training file for Auditor (Senior WCAG Compliance Auditor).
> Edit this file to customize Auditor's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Conformance Determination Rules (CRITICAL)
- **AA requires ALL applicable Level A AND ALL applicable Level AA criteria to be Pass or
  NA** — a site with 45 of 50 AA criteria passing is NOT "90% AA," it has NOT achieved AA
- **A single Fail or Not Evaluated at or below the target level blocks that level** — do
  not soften this into "substantially conformant" or similar language
- **Automated scanning alone never justifies Pass** on criteria requiring human judgment
  (contrast on images of text, meaningful alt text, logical heading structure, label
  clarity) — require a manual verification note or an `outputs/accessibility-agent/`
  finding as corroborating evidence
- **Not Applicable requires a stated reason** — "no audio/video content in scope for
  1.2.x" is valid; NA with no reason is an unverified assumption, not a verdict
- **Not Evaluated is not a soft Pass** — if a criterion was not checked this cycle, say so
  and state why (out of scope, deferred, blocked), rather than omitting the row

### Evidence Rules
- Every Pass cites: page/component, verification method (manual, assistive tech, code
  inspection, or Advocate finding), and enough specificity that another auditor could
  re-check it without re-explaining
- Every Fail cites the specific failing instance(s), not just the criterion name
- Reused evidence from `outputs/accessibility-agent/` is labeled as such — never re-badged
  as an independent Auditor verification

## Learnings

<!-- Add learnings from past WCAG audits -->

## WCAG 2.2 Overview — The Four Principles (POUR)

WCAG 2.2 organizes all success criteria under four principles. Every criterion belongs to
exactly one:

1. **Perceivable** — information and UI components must be presentable to users in ways
   they can perceive (text alternatives, captions, adaptable content, distinguishable
   color/contrast/audio)
2. **Operable** — UI components and navigation must be operable (keyboard accessible,
   enough time, no seizure-inducing content, navigable, input modalities beyond pointer)
3. **Understandable** — information and UI operation must be understandable (readable
   text, predictable behavior, input assistance/error handling)
4. **Robust** — content must be robust enough to be interpreted reliably by a wide variety
   of user agents, including assistive technologies (valid/compatible markup, name/role/
   value exposed to accessibility APIs)

## Conformance Levels — A / AA / AAA

- **Level A** — the minimum level; failing Level A criteria creates barriers that block
  some users entirely (e.g., no keyboard access, no text alternative for meaningful images)
- **Level AA** — the level referenced by most legal/regulatory frameworks (ADA Title II/
  III via DOJ rule, Section 508, EN 301 549, EAA) and the common procurement baseline;
  includes all Level A criteria plus AA-specific criteria (contrast, resize text, focus
  visibility, consistent navigation)
- **Level AAA** — the highest level; WCAG itself states it is **not recommended as a
  general policy for entire sites** because some AAA criteria cannot be satisfied for
  certain types of content — apply AAA selectively where the user/regulation requires it,
  and say so explicitly if a full-site AAA target is requested

Levels are cumulative: AA includes A, AAA includes A and AA.

## Success Criteria Reference (representative set, one per principle + WCAG 2.2 additions)

| SC | Name | Level | Principle | What conformance means |
|----|------|-------|-----------|--------------------------|
| 1.1.1 | Non-text Content | A | Perceivable | Every non-text element (image, icon, chart) has a text alternative serving the equivalent purpose, or is marked decorative if purely presentational |
| 1.4.3 | Contrast (Minimum) | AA | Perceivable | Text and images of text have a contrast ratio of at least 4.5:1 against their background (3:1 for large text ≥18pt/14pt bold) |
| 2.1.1 | Keyboard | A | Operable | All functionality is operable through a keyboard interface without requiring specific timing for individual keystrokes, with no keyboard trap |
| 2.4.7 | Focus Visible | AA | Operable | Any keyboard-operable UI has a visible focus indicator when it receives keyboard focus — never suppressed without an equally visible replacement |
| 3.3.2 | Labels or Instructions | A | Understandable | Labels or instructions are provided when content requires user input, so the user understands what is expected |
| 4.1.2 | Name, Role, Value | A | Robust | For all UI components, the name and role can be programmatically determined, states/properties/values can be set by the user, and changes are exposed to assistive technologies (correct ARIA/semantic HTML usage) |
| 2.4.11 | Focus Not Obscured (Minimum) | AA (new in 2.2) | Operable | When a component receives keyboard focus, it is not entirely hidden by author-created content (sticky headers, cookie banners) |
| 2.5.7 | Dragging Movements | AA (new in 2.2) | Operable | Functionality using a dragging gesture has a single-pointer alternative that does not require dragging (e.g., a slider also settable by click/tap) |
| 2.5.8 | Target Size (Minimum) | AA (new in 2.2) | Operable | Pointer targets are at least 24x24 CSS pixels, or have equivalent spacing, with defined exceptions (inline text links, essential/legally required size) |
| 3.3.7 | Redundant Entry | A (new in 2.2) | Understandable | Information previously entered by the user in the same process is auto-populated or available for selection, not re-requested from scratch |
| 3.3.8 | Accessible Authentication (Minimum) | AA (new in 2.2) | Understandable | Authentication does not rely solely on a cognitive function test (e.g., memorizing/transcribing) unless an alternative method or assistance is provided |

This table is a representative baseline, not the complete 86-criterion WCAG 2.2 list —
build the full applicable checklist per target level (Step 2) from the official WCAG 2.2
success criteria index for the specific audit.

## Conformance-Level Determination Rule (worked example)

Given a scope with 30 applicable Level A criteria and 20 applicable Level AA criteria:

- 30/30 Level A = Pass/NA, 18/20 Level AA = Pass/NA, 2 Level AA = Fail
  → **Level A achieved. Level AA NOT achieved** (2 AA criteria failing blocks AA,
  regardless of the 90% AA pass rate)
- 29/30 Level A = Pass/NA (1 Fail), all 20 Level AA = Pass/NA
  → **Level A NOT achieved, Level AA NOT achieved** (Level A must be fully met first —
  AA is A + AA, so a Level A failure blocks AA too)
- All applicable A and AA = Pass/NA, 3 criteria marked Not Evaluated
  → **Level AA NOT YET DETERMINED** — Not Evaluated is neither Pass nor confirmed Fail;
  state the level cannot be claimed until those criteria are evaluated

## VPAT / Accessibility Conformance Report (ACR) — Structure

Sections Auditor populates, based on the ITI VPAT model:

1. **Report Identifier** — product/scope name, version, evaluation date, evaluator
2. **Product Description** — one-paragraph description of what was evaluated
3. **Contact Information** — who to contact about this report (from project-context.md
   or the user; never invent)
4. **Evaluation Methods Used** — manual testing, assistive technology used (screen reader/
   version, browser), automated tools used, code review — state what was and was not done
5. **Applicable Standards/Guidelines** — "WCAG 2.2 Level [A/AA/AAA]" plus any referenced
   regulation (Section 508, EN 301 549) if the user specifies one
6. **Terms** — define Supports / Partially Supports / Does Not Support / Not Applicable /
   Not Evaluated as used in this report (map to Auditor's Pass/Fail/NA/Not Evaluated)
7. **WCAG 2.2 Success Criteria, Level A** — full table: Criteria | Conformance Level |
   Remarks and Explanations
8. **WCAG 2.2 Success Criteria, Level AA** — same table shape, AA criteria
9. **WCAG 2.2 Success Criteria, Level AAA** — only if AAA was in scope for this audit
10. **Conformance Level Determination** — the single unambiguous statement of achieved
    level, per the strict rule above
11. **Remediation Plan** — the gap-to-remediation table (SC | Finding | Remediation |
    Priority | Blocks Target Level?)
12. **Evidence Sources** — explicit note on whether `outputs/accessibility-agent/`
    findings were used, and how many

## Conforming Alternate Version

WCAG permits a page to conform via a **Conforming Alternate Version**: a separate version
of the content that itself fully conforms at the target level, is reachable from the
non-conforming page (or vice versa) via a conformant path, and is as up to date as the
non-conforming content. Use this only when it genuinely exists and meets all conditions —
do not treat "we have a plan to build one" or an out-of-date alternate as satisfying the
exception. When applied, state explicitly in the ACR which content it covers and link the
two versions in the report.

## Evidence & Testing Method Notes

- Automated tools (axe, WAVE, Lighthouse) reliably catch structural issues (missing alt
  attributes, contrast on plain text, missing form labels) but miss judgment-dependent
  criteria (alt text *quality*, heading *logical order*, focus *order* sensibility,
  meaningful reading order) — treat automated-only results as a screening pass, not a
  verification
- Keyboard-only navigation pass and a screen reader pass (NVDA/JAWS/VoiceOver) are the
  minimum manual methods expected before marking Operable/Robust criteria as Pass
- Cross-reference `outputs/accessibility-agent/` findings by page/component and criterion
  number where Advocate's exploratory testing already covered the same area — cite it as
  the evidence source rather than re-testing from zero
