# Showcase — UI Test & Demo Video Engineer · Knowledge

Accumulated learnings for UI testing and narrated demo videos. Load alongside `shared.md`.
Project-specific values (URLs, accounts, client names) live in `project-context.md` and `automation/.env` — never here.

## What this agent produces
- A **narrated demo video** of one module as one role: voice + captions + spotlight + demo cursor, 1920x1080 MP4.
- Optionally a **deep UI test**: every control operated and verdicted, HTML report + XLSX defect list.
- Every file numbered (`-demo-1`, `-demo-2` …). Nothing delivered is ever overwritten or deleted.

## Toolkit (automation/ui-demo/)
| File | Use |
|---|---|
| `lib.js` | `login()`, `narratedLogin()`, `OVERLAY`, `makeHelpers()` → `h.click / type / pick / hl / hlDrawer / closePanel / scroll`; inside a step also `h.at('word')` and `h.remaining()` |
| `tts.py` | One narration clip + its word timings (`<clip>.mp3.words.json`) — the engine fires actions on these words |
| `engine.js` | `node engine.js <plan> --dry-run` then `--skip-dry-run`; prints one JSON line with video path, duration, errors, review sheet |
| `inventory.js` | `--account KEY --role "Role" --path /route [--click "Button"] --slug s --name n` → JSON + screenshot |
| `plans/program-clinician.plan.js` | Reference plan — approved by the user (65 phrases, forms filled, discharge saved as draft) |

## Demo video rules — each one fixed a real complaint

### 1. One short phrase per action (the #1 rule)
A long sentence covering several actions made the screen finish everything in 2 seconds while the voice was still
describing it — the user called it "video fast, audio slow" (see also rule 10: timing inside the phrase). Measured: total video length matched the timeline exactly;
the lag was *inside* each step. Fix: one phrase = one action. `"We set the effective date to today,"` → click Today.
`"add a new team member,"` → click Add. `"Ben Torres,"` → pick him. Voice and screen cannot drift apart.

### 2. Navigate first, then narrate
Putting the click that opens a new page inside the phrase that describes that page left the old page on screen for the
whole sentence (the new page loaded late). Navigation goes in `then()` with an explicit `waitForURL` / `locator.waitFor`
for something on the destination; the next phrase starts only after it has rendered.

### 3. Clean slate at every step
Old spotlight boxes and hover effects lingered into the next step. The engine now, at every phrase: clears the
spotlight, hides the demo cursor, and parks the real mouse in the empty bottom-left corner. (Bottom-right was wrong —
that is exactly where dialog **Save** buttons sit, so parking there created the hover it was meant to remove.)

### 4. Pace
Cursor movement at 0.6 s felt slow → 0.18 s, then fades out after each click. Voice `+8%`, `-5%` felt too slow.
If the user says "slow", raise the rate before cutting content.

### 5. Intro is one sentence
"This demo shows how a <role> manages <thing> in <product>." Listing features before login was rejected.

### 6. Clear before typing
Some fields arrive pre-populated depending on the route (e.g. a practitioner field empty when opened from one screen,
pre-filled when opened from another). Typing appended → "NameName". `h.type` always clears first.

### 7. Never show broken things on camera
Skip and report as defects: buttons that do nothing when clicked (e.g. a Finalize that silently fails), forms whose
signed state looks broken, screens that pre-fill **another client's** identity (wrong-patient risk), menu items that lead
to "no access" dead ends. Say in the delivery message what was left out and why.

### 8. Dry run, then record, then look
A full recording is 5–8 minutes; a failed step discovered afterwards wastes all of it. `--dry-run` runs every step in
~1 minute. After recording, read `frames-N/contact-sheet.png` — frames are taken mid-action so a wrong screen or a
stale highlight is obvious. **The contact sheet only samples ~12 steps — also extract the end frame of EVERY step and
check each against its caption before delivering.** Video 1 of the Group demo was delivered on the sample alone and had
10 mistakes (wrong card highlighted, highlight on the wrong element, narration about a toast that had already gone).

### 10. Actions land on their spoken word
Even with one phrase per action the user still heard "video fast, audio slow". Measured: audio sync was only ~0.3 s off;
the real cause was every action firing 0.25 s into the phrase wherever its word was — the screen jumped to Home while
the voice was still saying "We choose the agency". Now the engine reads edge-tts word timings and starts `act` on the
first action verb (click, select, choose, open, pick, set, add, write, type, enter, check, mark, save…) or on the step's
`at: 'word'`. For two actions in one phrase, call `await h.at('Continue')` before the second one. Typing speed is
fitted into the time left in the phrase, so text never keeps typing after the voice stops. Sync itself is measured
with black flashes at the start and end of the recording (blackdetect), not estimated.

### 11. Clear the spotlight before a click that changes the page
A highlight survives navigation and lands on whatever sits at the same spot on the next screen (it lit up the wrong
agency card). The engine clears it before `then()`; inside an act that clicks Continue/Save mid-phrase, call
`await h.hl(null)` first.

### 12. Narrate only what is visibly happening
- Result phrases ("the system confirms…", "they are now marked present") must be backed by something on screen at that
  moment — highlight the new row or changed status; a toast may already be gone by the next phrase.
- Never operate a control on records it would wrongly change (checking in clients who are already Present/Left Early,
  writing a note on an already-Signed client). If the data isn't in the right state, point at the control instead.
- Typed text must match the context on screen (note text must fit the session topic).
- Keep each role's story to that role's work — the app said the program manager was "not assigned to this session"
  while the demo had them writing the group note.
- Say "this client" when only one is done, not "each client".

### 13. A stuck recording must stop itself
A frozen step once let a recording sit for 16 minutes. The engine now aborts when a step runs 45 s past its phrase
(or throws), saves `record-fail-stepN.png`, and closes the browser. Read the screenshot, fix, re-record.

### 9. Number everything, overwrite nothing
A version the user liked was once overwritten by a "better" one that turned out worse, and had to be regenerated.
The engine picks the next free number itself and refuses to overwrite; keep old versions for comparison.

## Exploration lessons — scans miss things; screenshots don't
- **Roles in a scrolling list.** A role picker showed 6 roles in view but had 10 — the list scrolled inside its card.
  Count radio inputs, don't read the visible text.
- **Menu items that aren't links.** A nav item rendered as a non-anchor was missed by an `a, button` scan.
- **Collapsed panels read as missing features.** `count > 0` but empty `innerText` = collapsed, not absent.
  inventory.js expands `[aria-expanded="false"]` sections (except when a panel was opened with `--click`).
- **Dropdowns are often `role="combobox"` buttons**, not `<select>` and not a button named "Select". The visible
  "Select" is a placeholder span. Use `getByRole('combobox')` / the label, then `getByRole('option', {name, exact})`.
- **Side drawers are often not `role="dialog"`.** `h.drawerRect()` finds a tall panel pinned to the right edge.
  Centred popups usually *are* dialogs with their own close button.
- **Escape does not close every drawer.** A drawer left open blocked every later click in one recording.
  Use `h.closePanel()` (the panel's own close button first).
- **Hidden duplicates of buttons** exist in responsive layouts → always `.filter({ visible: true })`.
- **Login: wait until you have left the login URL.** `networkidle` can fire before the redirect; checking the URL too
  early skipped the role screen entirely.
- **Git Bash on Windows rewrites `/route` arguments** into `C:/…/Git/route`. inventory.js undoes this; otherwise set
  `MSYS_NO_PATHCONV=1` or pass the route without the leading slash.

## Role awareness
- On role-selection apps, **any test account may pick any role**; access follows the role chosen for the session.
- Some roles skip the agency screen — detect it, don't assume it.
- A menu can offer an item the role cannot use (dead end) — that is a defect, report it.
- Access-denied pages that **name the missing capability** are good evidence for a role/access map.
- If `outputs/role-access-map/role-access-map.md` exists, use it to offer only valid roles for a module.

## No-backend verdicts (deep-test mode)
| Observation | Verdict |
|---|---|
| Behaves as specified | PASS |
| Wrong label / options / conditional / validation / truncation / layout, or spec mismatch | UI DEFECT |
| Request sent, server missing or failing; or save "succeeds" (toast) but data does not persist / list not updated | BLOCKED-BACKEND |
| Click does nothing and sends no request | NEEDS-CONFIRMATION (unwired button or missing backend — ask a dev) |
| Cannot be reached even after satisfying prerequisites | NOT-REACHABLE (state exactly why) |
A toast saying "updated" while the list does not change is BLOCKED-BACKEND, and worth one line in the report.

## Environment prerequisites
Node + Playwright (`automation/node_modules`), `ffmpeg`/`ffprobe` on PATH, Python with `edge-tts`
(`python -m pip install edge-tts`). Indian English voices: `en-IN-NeerjaNeural` (default), `en-IN-PrabhatNeural`,
`en-IN-NeerjaExpressiveNeural`. Narration text is sent to the online voice service — never put patient data in it.
Offline fallback: Windows System.Speech voices (robotic).

## Timing
Recording is real-time: video length ≈ recording time. Voice clips are cached by text+voice+rate, so re-recording
after small wording changes only regenerates the changed phrases. Never run two recordings at once.
