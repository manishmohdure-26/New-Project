# Advocate — Accessibility Testing Agent Knowledge

> Training file for Advocate (Senior Accessibility Testing Specialist).
> Edit this file to customize Advocate's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Coverage Rules (CRITICAL)
- **Never report an automated-scan-only result as "accessible"** — always state the
  automated-vs-manual split explicitly in the findings report
- **Every finding needs a WCAG success criterion AND a conformance level (A/AA/AAA)** —
  a finding without a cited criterion is an opinion, not a test result
- **Contrast findings must be measured ratios**, never a visual "looks fine" judgment
- **Keyboard and screen-reader testing are mandatory for any screen with interactive
  elements, dialogs, or custom widgets** — do not skip manual testing because the
  automated scan came back clean
- **Advocate does not issue a conformance certification** — that is wcag-agent's (Auditor's)
  role; Advocate reports test findings, severity, and coverage

### Severity Assignment Rules
- Severity = f(WCAG conformance level, real-world user impact) — never assigned by gut feel
- A Level A failure that blocks task completion is Critical regardless of how minor it
  looks in code (e.g., one missing `alt` on a submit-button icon can block a screen-reader
  user entirely)
- A Level AAA nicety is never higher than Medium severity

## Learnings

<!-- Add learnings from past accessibility testing sessions -->

## POUR Principles (WCAG Foundation)

All WCAG success criteria trace back to four principles — use these to classify any
finding that doesn't map cleanly to a specific criterion number:

1. **Perceivable** — info and UI must be presentable in ways users can perceive, not
   reliant on one sense. Covers: text alternatives, captions, adaptable structure,
   distinguishable content (contrast, color use, text spacing).
2. **Operable** — UI and navigation must be operable by any input method. Covers: full
   keyboard access, adequate time, no seizure-inducing content, navigable structure
   (headings, landmarks, focus order), input beyond touch/mouse.
3. **Understandable** — info and operation must be understandable. Covers: readable text,
   predictable behavior (no unexpected context changes), input assistance (labels, error
   identification/suggestion).
4. **Robust** — content must be reliably interpretable by a wide variety of user agents,
   including assistive tech. Covers: valid markup, correct name/role/value exposure for
   custom components (ARIA).

## Automated-vs-Manual Coverage Split

Automated tools (axe-core, Lighthouse, pa11y) catch roughly 30-40% of real-world WCAG
failures. Everything else requires a human tester. Use this table to scope Step 2 (tools)
vs. Steps 3-6 (manual).

| Automated tools CATCH | Requires MANUAL testing |
|---|---|
| Missing `alt`, missing form labels, missing `lang`/page title | Whether alt text/labels are *meaningful*, not just present |
| Color-contrast ratio below threshold (computed) | Whether color is the *only* signal for state/error |
| Invalid/duplicate ARIA attributes, invalid roles | Whether ARIA roles/states *behave correctly* at runtime |
| Empty links/buttons, missing accessible names | Focus order matching visual/logical reading order |
| Landmark/region presence, basic table headers | Keyboard traps, modal focus management, live-region announcements |
| Structural label-input association | Whether custom widgets (dropdowns, pickers, carousels) are keyboard-operable at all |

## Keyboard-Navigation Test Checklist

Run for every in-scope screen. Use Tab, Shift+Tab, Enter, Space, Arrow keys, Esc only —
no mouse.

- [ ] Every interactive element is reachable via Tab, in a logical order matching the
      visual/reading order
- [ ] The focused element has a clearly VISIBLE indicator at all times (never
      `outline: none` without a replacement)
- [ ] No keyboard trap — focus can move both into and out of every component (modals,
      menus, embedded widgets)
- [ ] All mouse functionality is also available via keyboard (dropdowns, drag-and-drop,
      date pickers, carousels, tooltips)
- [ ] Dialog open moves focus INTO it; close returns focus to the trigger; focus is
      trapped within the open dialog
- [ ] Skip-to-main-content link is present and functional as the first focusable element
- [ ] Custom widgets follow expected key conventions (Enter/Space activates, Arrow keys
      navigate menus/tabs/radio groups, Esc closes overlays)
- [ ] No element requires timing or double-activation a keyboard user cannot reproduce
- [ ] No unexpected context change purely on focus (e.g., auto-submit on field focus)

## Screen-Reader Test Procedure

Pick the tool available in the environment: **NVDA** (Windows, free) or **JAWS** (Windows,
licensed) with Chrome/Edge/Firefox, or **VoiceOver** (macOS/iOS, built-in) with Safari.
Turn off the monitor or close your eyes for critical-path screens to test by ear only.

1. **Landmarks pass** — navigate by landmark/region (NVDA: `D`, VoiceOver: rotor); confirm
   header, nav, main, footer are announced and non-redundant.
2. **Headings pass** — navigate by heading (NVDA/JAWS: `H`, VoiceOver: rotor); confirm
   levels form a logical outline (no skipped levels, no heading used for styling only).
3. **Reading order pass** — read top-to-bottom with continuous reading; confirm announced
   order matches visual layout.
4. **Interactive-element pass** — Tab through every control; confirm accessible name,
   role, and state (pressed/expanded/checked/disabled) are announced correctly.
5. **Form pass** — focus each field; confirm label, required status, format hints, and
   value are announced. Submit invalid data; confirm errors are announced, not silent.
6. **Dynamic-content pass** — trigger content that updates without reload (toast,
   validation, live count); confirm it announces via an ARIA live region
   (`aria-live="polite"`/`"assertive"`) without manual re-navigation.
7. **Image/media pass** — decorative images are silent (`alt=""`/`aria-hidden="true"`);
   informative images announce meaningful alt text, not filenames.

## Color-Contrast Ratio Reference (WCAG 2.2)

| Content type | AA minimum | AAA minimum |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 | 7:1 |
| Large text (>= 18pt / >= 14pt bold) | 3:1 | 4.5:1 |
| UI components & graphical objects (icons, input borders, focus indicators) | 3:1 | — (no AAA requirement) |
| Disabled/inactive controls | No requirement | No requirement |
| Placeholder text used as sole label | Treat as normal text — 4.5:1 | 7:1 |

Measurement notes: measure against the actual rendered background (not the design-file
swatch — gradients/overlays/images-behind-text change the effective ratio); test default
AND hover/focus/active states; never eyeball — use a contrast tool (DevTools, axe
DevTools, or a standalone calculator) and record the actual number.

## Common ARIA Mistakes

- **Redundant roles** — `role="button"` on a native `<button>`; native semantics already
  provide it, and the redundant role only invites drift.
- **Missing accessible name** — icon-only buttons/links with no `aria-label`,
  `aria-labelledby`, or visually-hidden text; screen reader announces "button", no purpose.
- **`aria-hidden="true"` on focusable content** — hides from the accessibility tree while
  leaving it keyboard-focusable, producing a silent "ghost" focus stop.
- **Overusing `aria-live="assertive"`** — interrupts current reading for non-urgent
  updates; reserve `assertive` for time-sensitive alerts, use `polite` otherwise.
- **Custom widgets missing required ARIA states** — a dropdown/combobox without
  `aria-expanded`, `aria-selected`, or `aria-activedescendant` is invisible to a screen
  reader even if it looks and works fine visually.
- **`role` without required parent/child structure** — e.g. `role="tab"` without a
  `role="tablist"` wrapper and paired `role="tabpanel"`.
- **Placeholder used as the only label** — placeholders vanish on input and aren't
  reliably announced as a persistent label; always pair with a real `<label>`.
- **Errors not linked via `aria-describedby`** — an error shown visually near a field but
  not programmatically associated is invisible to a screen-reader user tabbing through.
- **Conflicting explicit/implicit semantics** — e.g. `<button role="link">` sends
  contradictory signals to different assistive technologies.

## Forms & Error Accessibility Checklist

- [ ] Every input has a programmatically associated label (`<label for>`, `aria-label`, or
      `aria-labelledby`) — not placeholder-only
- [ ] Required fields are marked both visually AND via `aria-required="true"`/`required`
- [ ] Validation errors are identified in TEXT, not color alone, and linked via
      `aria-describedby`
- [ ] On submit failure, focus moves to the first invalid field OR an error summary
      linking to each field
- [ ] Error messages describe what's wrong AND how to fix it (e.g., "Enter a date in
      MM/DD/YYYY format", not just "Invalid input")
- [ ] Success/confirmation messages are announced via a live region if shown without a
      page navigation
