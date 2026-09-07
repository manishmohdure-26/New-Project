# Inspector — Spec-Conformance Auditor · Knowledge

Accumulated learnings and custom rules for the spec-conformance audit workflow. Load alongside `shared.md`.

## What this agent produces
A client-style spec-conformance report: a numbered requirement matrix (from the curated wiki), a live
PASS/FAIL/PARTIAL/NOT-REACHABLE walk of the app, and a self-contained HTML dashboard with severity-ranked,
expandable FAIL findings (verbatim spec quote + click-by-click steps + expected + observed + screenshot).

## Sourcing rule (hard)
- Requirements come from the **curated wiki only** (`project-docs/SharedByClient/curated-wiki/`). Never
  MOMs, transcripts, SRS, or Jira. See [[ac-agent-curated-wiki-only]] — same sourcing discipline as Definer.
- One row = one testable assertion. Preserve exact vocabularies and full option lists/counts; cite the § section.

## Live-walk mechanics (CalMHSA)
- **App login pattern:** `<name>+<role>@thinkitive.com` with a shared password `Password@123`. Confirmed roles:
  `shubham.dixit+crisis@thinkitive.com` (Crisis → lands on `/provider/crisis`), `tushar.bhadane+receptionist@thinkitive.com`
  (Receptionist → bounced from crisis routes to `/provider/home`). App creds are NOT in `.env` by default (only Jira keys);
  add `BASE_URL` / `<ROLE>_USER_EMAIL` / `<ROLE>_USER_PASSWORD` there (git-ignored). See [[crisis-audit-and-test-creds]].
- The Playwright MCP browser is a **single shared instance** → run per-screen subagents **sequentially**, not in parallel.
  They inherit the logged-in session, so log in once.
- The MCP browser **blocks `file://` URLs** — you can't screenshot a local report through it. Open reports another way.

## Exercise every control — never judge by looking (most common false-FAIL cause)
The #1 source of bogus FAIL / NOT-REACHABLE / half-credit PARTIAL verdicts is verdicting a screen from a
single static snapshot instead of **operating** its controls. A form only shows its true behavior once you
drive it. Before verdicting ANY requirement on a screen:
1. Snapshot (`mcp__playwright__browser_snapshot`) and enumerate every interactive control: radio groups
   (every Yes/No), dropdowns/selects, checkboxes, toggles/switches, date pickers, accordions, tabs.
2. **Radios / Yes-No** — click *each* option (Yes, then No, then others). Re-snapshot after each; note what
   renders/hides. Conditional fields (Interpreter Type, reason text, sub-questions) appear only on a specific
   value — you must select it to see them. Use `mcp__playwright__browser_click`.
3. **Dropdowns / selects** — open every one, read the FULL option list verbatim, compare the complete set +
   order to the spec vocabulary (one missing/extra/reordered option = FAIL). Where the spec ties a cascade to
   a choice, pick each relevant option and watch dependent dropdowns/fields react. Use `browser_select_option`.
4. **Checkboxes / toggles / accordions** — flip each on/off, expand every section, re-snapshot for revealed fields.
5. Assign the verdict ONLY after the control has been operated. A field that appears only after the right
   selection is PRESENT (PASS/FAIL/PARTIAL on merits), **not** NOT-REACHABLE — and revisit earlier verdicts if
   exercising a control changed what's on screen.
Selecting/toggling/expanding are non-destructive inspection actions — safe to do freely; just don't submit/save
unless it's an authorized disposable record. This rule is why FAIL and NR counts were inflated: the fields were
there, just behind an unclicked Yes/No or an unopened dropdown.

## Collapsed panels read as absent features (false-FAIL, happened twice)
Before recording ANY control as missing, check whether it sits inside a collapsed container.
On the CalMHSA Crisis Log the right sidebar **Actions panel is collapsed by default**
(`aria-expanded="false"`) — correctly, per spec, for direct contacts. A headless capture reads the
collapsed panel, sees no buttons, and it is tempting to conclude the actions do not exist.

That produced a false FAIL (CL-88 "no Change Record Type action renders") plus four wrong
NOT-REACHABLE rows. Expanding the panel revealed seven working actions: Add Staff Member,
Crisis Contact Follow-up, Start Safety Plan, Engage Mobile Crisis Team, Notify Treatment Team,
Change Record Type, Check Bed Availability. It also revealed that the Safety Plan and the
Follow-Up Task screen are reachable straight from the Crisis Log — not gated behind dispatch at
all, which had been the framing of an entire earlier audit.

**Procedure:** enumerate `[aria-expanded="false"]` on every screen and expand each one before
capturing. `querySelectorAll('button')` filtered by `offsetParent !== null` silently omits
everything inside a collapsed region — the element is in the DOM with a non-empty count but
`innerText` is empty, so a `.count()` check passes while the text check fails. Treat
"count > 0 but no text" as *collapsed*, never as *absent*.

Corollary: a user screenshot showing a control you reported as missing is almost always right.
Re-verify against the live build before defending the finding.

## The NOT-REACHABLE trap (most important lesson)
"NOT-REACHABLE" is usually wrong. Fields and steps are often gated on prior input:
- A **conditional field** only renders after you pick the correct value in an earlier field (e.g. Interpreter Type appears
  only when Interpreter Used = Yes; Contact Source list depends on Contact Type).
- A **wizard step** unlocks only after the previous step is completed/signed (e.g. MCER Encounter/Follow-Up steps are locked
  until Dispatch is completed).
- A **live search** needs real seeded data typed in (the client index IS populated — type a real queue name to trigger it).
Always re-walk every NR item by satisfying the prerequisite chain before trusting it. In the crisis audit this flipped
**4 of 5** NR verdicts: CL-17 & WF-06 → PASS, and WF-07 & SP-11 → newly-surfaced FAILs (including a partial-save data-loss).

## Non-destructive policy
- Default: inspect only — open dropdowns, toggle conditionals, open (not submit) modals, type to reveal fields.
- Exception (requires user authorization): create/advance a **clearly-labelled disposable** record ("ZZ QATEST Disposable")
  and drive it through sign/complete gates to unlock later steps. Never mutate real records; never fire real external
  notifications ("Notify Treatment Team" etc.).

## Evidence & findings format (match the client report)
Each FAIL card: header `ID · descriptive title · FAIL·Sev · defect label · ▸`; body =
📖 verbatim spec quote (§ section) · 🖱 click-by-click steps · ✅ what you should see (to pass) · 👁 Observed · 📷 screenshot.
`findings-detail.json` schema keys: id, title, area, source_doc, label, severity, spec_section, spec_quote, steps[],
expected, observed, shots[]. `spec_quote` must be real text found in the source doc — never invented.

## Dashboard generator
A deterministic Python generator merges `reqs/*.md` + `verdicts/*.md` + `findings-detail.json` → self-contained HTML
(coverage tiles + bar, coverage-by-screen table, severity-ranked expandable findings with base64-embedded screenshots +
lightbox, filterable requirement table where each FAIL row jump-links to its finding). Reference implementation lives with
the crisis audit outputs; parse markdown table rows with `^\| (ID) \|`, split cells, and guard against embedded pipes.

## Report naming (hard rule)
The report must be named for the module actually under test — title, filename and every header chip.
Never inherit them from the run the generator was copied from.

Before rendering, set these at the top of the generator, next to BUILD/DATE, and never inline them in the markup:
`TITLE` · `SUBTITLE` · `ROLE` · `AREA` · output filename `<area>-report.html`.

- `TITLE` = `<Module> — Spec Conformance Audit` (e.g. `Crisis Module — Spec Conformance Audit`).
- `ROLE` = the account/role the walk actually used, read back from the walk scripts (`TEST_*_EMAIL`),
  not copied. Getting this wrong misrepresents what the walk could reach.
- Report only the auth gates the **recorded login trail** actually shows. A preference passed to the
  login helper (e.g. an agency) proves nothing — the helper skips a gate that is never presented.
  Log the trail, then state only what it contains. This exact over-claim shipped once: a chip read
  "Crisis worker @ Sacramento County BH" when the trail held a single `/auth/select-role` step and
  no agency screen ever appeared.
- Filename matches the output directory: `outputs/spec-conformance-agent/<area>/<area>-report.html`.

**Why this is a hard rule:** the generator is copied run to run. The header was once hardcoded in the
HTML body, so three delivered reports (crisis-deep, crisis-qatest, program-episode-management) all
shipped titled "Sequestration & Privacy" with a Clinical Supervisor role chip they never used. The
Area chip was correct in each, which is exactly why it went unnoticed. The user caught it, not the
agent. Self-check before delivering: grep the rendered HTML for the previous area's name and for any
role string, and confirm both belong to this run.

Also drop any coverage-by-screen row whose requirement count is zero (e.g. a findings-only UI layer) —
it renders a meaningless "0% pass" bar.

## Reference run
`outputs/crisis-audit/` — the CalMHSA Crisis Workflow Suite audit (112 REQs across 5 screens: Crisis Log, Crisis
Assessment, Safety Plan, MCER, Crisis Contact Follow-Up). Final: 78 PASS / 14 FAIL / 19 PARTIAL / 1 NOT-REACHABLE.
Note: the Crisis Assessment drawer is gated behind a destructive Complete-Dispatch action, so its clinical logic was
code-verified against the shipped JS module — flag such code-verified verdicts distinctly from live-UI verdicts.
