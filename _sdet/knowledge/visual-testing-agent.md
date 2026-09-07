# Pixel — Visual Testing Agent Knowledge

> Training file for Pixel (Senior Visual Regression Testing Specialist).
> Edit this file to customize Pixel's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Target Selection Rules (CRITICAL)
- **Do not snapshot every route by default** — every target needs a stated Tier
  (Critical/High/Medium) and a Reason; a target list with no reasons is a guess, not
  a plan
- **Reused components (tables, modals, nav, form controls) get their own target
  entry** even if the parent page is also snapshotted — a component regression can
  hide inside an otherwise-unchanged page diff
- **Low-traffic, rarely-changed screens default to Medium tier or out of scope** —
  full cross-viewport/browser coverage on every screen is a maintenance cost, not a
  quality signal

### Comparison Configuration Rules
- **Every tier needs an explicit tolerance value** — "compare visually" without a
  `maxDiffPixelRatio`/`threshold`/`misMatchThreshold` is not a configuration
- **Never recommend 0% tolerance (pixel-perfect) as a default** — it turns every
  font-rendering or anti-aliasing difference into a false failure and erodes trust
  in the suite within weeks
- **Never recommend a tolerance loose enough to hide a real layout shift** — validate
  the chosen threshold against a deliberately broken build before locking it in

### Protected File Rules
- **Never edit `automation/playwright.config.js` or `automation/package.json`** —
  save proposed snapshot configuration under
  `outputs/visual-testing-agent/[scope]/proposed-config/`, clearly marked PROPOSED
- **Never edit `automation/explorer/` or `automation/config/qa-retest-config.json`**
  — those are protected framework files owned outside this agent

## Learnings

<!-- Add learnings from past visual regression testing sessions -->

## Visual-Target Selection Checklist

Apply against the repo-analysis-agent page/component inventory before finalizing:

- [ ] High-traffic entry points (login, home/dashboard, primary nav) — Critical tier
- [ ] Revenue/conversion-critical flows (checkout, payment, signup) — Critical tier
- [ ] Screens with complex layout (data tables, grids, dashboards with widgets) —
      High tier; layout regressions are the most common visual bug class
- [ ] Reusable components used on 3+ screens (buttons, modals, form fields, cards) —
      snapshot the component in isolation, not just the pages that use it
- [ ] Responsive breakpoints for any target that changes layout at mobile/tablet
      widths — treat each breakpoint as a distinct visual state
- [ ] Empty states, loading states, and error states — these are frequently skipped
      and frequently broken by unrelated CSS changes
- [ ] Themed/branded surfaces (light/dark mode, white-label variants) — each theme
      is a distinct baseline, not a variant of one
- [ ] Overlay surfaces (modals, tooltips, dropdowns, toasts) — z-index and
      positioning regressions rarely show up in a full-page diff alone
- [ ] Print/PDF or export views, if the app renders one — usually untested and easy
      to silently break
- [ ] Screens explicitly called out by design/product as brand-sensitive — pull
      these from project-context.md or ask, never assume

## Baseline Management & Approval Workflow

1. **Initial capture** — baselines are captured against a known-good, reviewed build
   (never against an in-progress feature branch) and stored under version control
   alongside the test code, or in the comparison tool's hosted baseline store
   (Percy/Applitools project).
2. **Update triggers (valid)** — an intentional UI/design change, an approved new
   component variant, or a deliberate content update (copy, imagery) that the
   product/design owner has signed off on.
3. **Update triggers (INVALID — never accept)** — a diff caused by flakiness
   (animation mid-frame, unmasked timestamp, font not loaded), a diff nobody has
   actually looked at, or "the tests were red so I updated the baseline" without a
   stated reason.
4. **Review evidence** — every diff review presents: baseline image, new image,
   and a highlighted diff/heatmap image side by side, plus the tolerance that was
   exceeded. A reviewer approving from the pass/fail badge alone is not a review.
5. **Approval authority** — a named role (e.g. QA Lead, Design owner, or the PR's
   required reviewer) is authorized to accept a new baseline; the person who wrote
   the change under test should not be the sole approver of its own baseline.
6. **Audit trail** — every accepted baseline update is recorded with a reason and a
   reference (PR link, Jira ticket, design ticket) so a later "why did this baseline
   change" question has an answer.
7. **Rejection path** — if a diff reveals a real regression, it is filed as a bug
   (bug-report-agent, if run separately) and the OLD baseline is kept until the
   regression is fixed and re-reviewed.

## Flaky Visual Diff Causes & Mitigations

| Cause | Symptom | Mitigation |
|-------|---------|------------|
| Web fonts not fully loaded | Text shifts width/position between runs | Wait for `document.fonts.ready` before capture; embed/preload fonts in the test environment |
| Anti-aliasing / sub-pixel rendering | Tiny per-pixel diffs at every text/shape edge, varies by OS/GPU | Use a perceptual comparison algorithm with a small non-zero tolerance; run baseline + comparison on the same OS/browser combo |
| CSS animations/transitions | Element captured mid-motion, inconsistent frame each run | Disable animations for the snapshot (`animations: 'disabled'` in Playwright, or inject `* { transition: none !important }`) |
| Dynamic timestamps/counters | Text changes every run | Mask the locator or freeze the clock (`page.clock`/date mocking) |
| Randomized or live data (ads, avatars, recommendations) | Content differs run to run | Mask the region, or stub the API response with a fixed fixture |
| OS-native scrollbars | Extra/missing scrollbar pixels between OS or headless configs | Hide scrollbars via injected CSS, or exclude the scrollable region from the diff |
| Cursor blink / focus rings | Caret or outline appears intermittently | Hide the caret (`caret: 'hide'` in Playwright), blur focus before capture |
| Lazy-loaded images below the fold | Placeholder captured instead of final image | Scroll target into view and wait for `networkidle` / image `load` event before capture |
| Loading spinners / skeleton screens | Spinner frame captured instead of settled UI | Wait for the loading indicator to detach before snapshotting |
| Locale/timezone-dependent text | Date/currency format differs by environment | Pin locale and timezone in the test environment config |
| Viewport/device pixel ratio mismatch | Blurry or misaligned diff at edges | Pin device pixel ratio (`deviceScaleFactor`) per baseline; never mix 1x and 2x baselines |

## Comparison-Algorithm Reference

- **Pixel-by-pixel (exact match)** — fastest, zero tolerance for any rendering
  difference; brittle across OS/GPU/font-hinting differences; only appropriate for
  generated/static assets (e.g. exported PDFs) rendered in a fully controlled
  environment.
- **Perceptual/structural diff (pixelmatch, ResembleJS, SSIM)** — tolerant of
  anti-aliasing and minor sub-pixel noise while still catching real layout/color
  shifts; the default choice for UI screens. Configure via a pixel-ratio threshold
  (e.g. `maxDiffPixelRatio: 0.01`–`0.03`) and a per-pixel color-distance threshold
  (e.g. `threshold: 0.2`–`0.3` on a 0–1 scale).
- **AI-based visual match (Applitools Visual AI)** — classifies diffs by match
  level: `Exact` (pixel-strict), `Strict` (layout+content, tolerant of
  anti-aliasing), `Content` (text/values may change, layout must match), `Layout`
  (only structural positions matter, content ignored). Pick the loosest level that
  still catches the regression class you care about for that target.
- **BackstopJS `misMatchThreshold`** — percentage of mismatched pixels allowed
  before a scenario fails (e.g. `0.1` = 0.1%); pair with `requireSameDimensions` and
  per-scenario `selectors`/`hideSelectors` for masking.
- **Threshold tuning rule** — set an initial tolerance, then intentionally break a
  layout in a test build and confirm the suite catches it at that tolerance before
  locking it in; too loose is discovered only when it's too late.

## Cross-Viewport & Cross-Browser Strategy

- **Viewport matrix (typical)** — mobile `375x667`, tablet `768x1024`, desktop
  `1440x900`, wide `1920x1080`. Assign the full set only to Critical-tier targets;
  High tier gets mobile + desktop; Medium tier gets desktop only.
- **Browser matrix** — Chromium, WebKit, Firefox render fonts and form controls
  differently; run the full browser matrix only where brand-sensitive rendering
  differences matter (Critical tier). A High/Medium tier target on Chromium alone
  is an acceptable cost trade-off.
- **Baselines are per (OS, browser, viewport, device-pixel-ratio) combination** — a
  Chromium/Linux/1440x900/1x baseline is not valid for WebKit/macOS or for a 2x
  device-pixel-ratio capture; mixing them produces a permanent false-diff.
  Playwright's Docker/CI-pinned browser binaries are the standard way to keep
  baseline rendering consistent across contributors' machines.
- **Cost control** — the full viewport x browser matrix multiplies baseline count
  and maintenance time; state the matrix per tier explicitly rather than applying
  one matrix to every target, and revisit the matrix if baseline-update volume
  becomes a bottleneck.
