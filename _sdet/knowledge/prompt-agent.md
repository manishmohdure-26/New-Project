# Promptsmith — Prompt Engineering Agent Knowledge

> Training file for Promptsmith (Senior Prompt Engineering Specialist).
> Edit this file to customize Promptsmith's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Prompt Structure Rules (CRITICAL)
- **One prompt, one job** — if a draft asks for two unrelated outcomes (e.g., "generate
  test cases AND assess module risk"), split it into two prompts
- **Every prompt states task, context, format, and guardrails explicitly** — missing any
  of these four means it's a fragment, not a draft
- **Never publish an unscored prompt** — every prompt runs through the Prompt Evaluation
  Rubric before it is handed over as final
- **Structured output prompts include the schema itself**, not a description of one —
  show the JSON shape or table columns, don't say "return structured data"
- **Few-shot examples are sourced from real project output** (`outputs/<agent>/`) when
  available — invented examples teach the wrong style

### Refinement Rules (when improving another SDET agent's prompt)
- Only touch clarity, structure, examples, and guardrails — never rewrite the target
  agent's domain logic, persona, or decision authority
- Present refinements as a proposed diff — never edit the target agent's YAML/knowledge
  files directly
- Preserve project-specific values already correctly sourced from `project-context.md` —
  do not replace them with hardcoded examples

## Learnings

<!-- Add learnings from past prompt engineering sessions -->

## Prompt Pattern Catalog

| Pattern | What | When to Use |
|---------|------|--------------|
| **Role / Persona** | Assign a specific role, expertise level, and stance before the task | Domain judgment calls needed (e.g., severity assessment) — narrows interpretation and sets tone |
| **Few-Shot** | 2-3 worked input → output pairs embedded in the prompt | Output must match a format/tone hard to describe in prose (bug phrasing, case granularity); use REAL examples from `outputs/` when available — never rely on a single example, it invites overfitting |
| **Chain-of-Thought (CoT)** | Instruct step-by-step reasoning with named intermediate steps before the final answer | Multi-step reasoning (root-cause triage, risk scoring, decision-table derivation); skip for simple lookups/formatting — adds latency with no quality gain |
| **Structured / JSON Output** | Explicit schema (JSON keys/types or table columns) the response must conform to | Output feeds another process (script, Jira API, test-data seed) — freeform prose is fine for human summaries only |
| **Delimiters** | Clear separators (`<tags>`, `---`, `###`) around instructions, pasted data, and examples | Any prompt mixing instructions with pasted data (logs, transcripts) — prevents the model confusing data for instructions |
| **Negative Constraints** | Explicit "do NOT" statements naming a specific, already-observed failure mode | A known failure mode exists (hallucinated data, invented fields, vague severity) — grounded constraints beat generic ones ("be accurate") |

**Worked examples:**
- Role: *"You are a senior SDET reviewing failed CI logs. Triage each failure as
  Environment \| Flaky \| Real Defect, and justify the call in one line."*
- CoT: *"First identify the layer (UI/API/DB). Then state the likely root cause. Then
  name one confirming check. Only then output the final verdict."*
- Structured output:
  ```json
  { "test_case_id": "TC-MODULE-NNN", "title": "string",
    "priority": "Critical|High|Medium|Low", "steps": ["..."], "expected_result": "string" }
  ```
- Delimiters: `Instructions: ...\n\n<log>\n{pasted log}\n</log>\n\nTask: triage the log above.`
- Negative constraint: *"Do NOT invent environment names — use only those listed in
  project-context.md."*

## Prompt-Quality Checklist

Before scoring or shipping any prompt, verify:
- [ ] **Task** — exactly one deliverable, stated in one sentence
- [ ] **Context** — role, relevant inputs, and project conventions are present (never
      assumed as "the model will know")
- [ ] **Format** — exact output shape specified (schema, table columns, or a worked
      example demonstrating it)
- [ ] **Guardrails** — negative constraints cover known failure modes; missing-input
      handling is defined ("ask, don't assume")
- [ ] **Examples** — at least one worked example for any non-trivial output shape,
      sourced from real project output where possible
- [ ] **Length discipline** — no redundant restatement of the same instruction; every
      sentence earns its place

## QA-Prompt Template Set

### Test-Case Generation
```
Role: Senior SDET writing test cases from approved test scenarios.
Context: <scenario text or outputs/test-scenario-agent/ reference>
Task: One test case per scenario, numbered steps, one expected result per step.
      ID format TC-<MODULE>-NNN.
Format: | ID | Title | Priority | Steps | Expected Result |
Guardrails: Do NOT invent data values — use [bracketed] placeholders if
project-context.md doesn't define them. Do NOT merge two scenarios into one case.
Example: <one real TC row from outputs/test-case-agent/ if available>
```

### Bug-Report Drafting
```
Role: QA engineer filing a precise, reproducible bug report.
Context: <observed behavior, steps taken, environment>
Task: Title, Steps to Reproduce, Expected vs Actual, Severity, Environment.
Format: Markdown matching _sdet/data/templates/ bug report template, if present.
Guardrails: Do NOT guess severity without stated impact reasoning. Do NOT include
credentials/PII in reproduction steps. If a step is missing, ask — don't infer it.
```

### Test-Data Synthesis
```
Role: Generating synthetic test data for [entity] against the schema below.
Context: <schema / field constraints>
Task: N records: valid boundary values, invalid values (per boundary-test-agent
equivalence classes), one null/missing-field case per required field.
Format: JSON array matching the schema exactly — field names and types must match.
Guardrails: Do NOT generate real-looking PII — use obviously synthetic values (e.g.,
"test.user+001@example.test"). Do NOT invent fields absent from the schema.
```

### Log / Failure Triage
```
Role: Senior SDET triaging a CI failure log.
Context: <failure log, delimited>
Task: Using chain-of-thought, classify as Environment | Flaky | Real Defect. State the
layer (UI/API/DB), likely root cause, one confirming check.
Format: Verdict first line, then a 3-line reasoning trail (Layer / Cause / Confirming check).
Guardrails: Do NOT classify "Flaky" without a specific reason (timing assertion, known
race condition) — unjustified "flaky" is not a diagnosis.
```

## Prompt Evaluation Rubric

Score each dimension 1-5 (5 = excellent). **Pass threshold: 20/25**, no dimension below 3.

| Dimension | 1 (Fail) | 3 (Adequate) | 5 (Excellent) |
|-----------|----------|--------------|----------------|
| Clarity | Multiple valid readings; overloaded task | One task, wording could tighten | Single unambiguous task, one reading only |
| Context Sufficiency | No role/inputs given | Role stated, some inputs missing | Role, inputs, project conventions all present |
| Format Specification | No output shape given | Format named, not fully specified | Exact schema/table shown, no guesswork |
| Guardrails | None present | Generic cautions only | Specific constraints tied to known failure modes |
| Example Quality | No example | Generic/invented example | Real, project-sourced worked example |

## Common Prompt Anti-Patterns

- **Ambiguity** — vague verbs ("handle," "process") with no defined output; name the
  exact deliverable and its shape
- **Overloading** — one prompt requesting multiple unrelated outcomes; split into
  separate prompts
- **Leading** — the prompt presupposes the answer ("confirm this is Critical") instead
  of asking the model to determine it; ask open and state the criteria
- **Format-optional** — describing output loosely ("a table would be nice") instead of
  specifying it; give the exact schema/columns
- **Missing-input blindness** — no instruction for absent required input, so the model
  fabricates it; add an explicit "ask, don't assume" guardrail
- **Example overfitting** — one example so specific the model copies its exact wording;
  use 2-3 varied examples
- **Instruction/data bleed** — pasted data with no delimiter, so the model treats data
  as instruction or vice versa; add explicit delimiters
