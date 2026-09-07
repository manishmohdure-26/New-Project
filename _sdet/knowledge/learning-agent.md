# Mentor — Learning Agent Knowledge

> Training file for Mentor (Senior QA Enablement & Learning Specialist).
> Edit this file to customize Mentor's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Learning Material Rules (CRITICAL)
- **Every topic, kata, and quiz question maps to a named competency-matrix cell** (skill
  area x level) — a topic with no matrix cell is not a learning objective
- **Katas always have four sections**: Goal, Starting Point, Acceptance Criteria (`[ ]`
  boxes), Stretch Goal — a kata missing any of the four is incomplete
- **Quiz answer keys always include a one-line rationale**, not just the correct option —
  a quiz that only marks right/wrong does not teach
- **Never invent a learner's current skill level** — use self-assessment input or evidence
  from `outputs/`; mark unassessed cells "Unassessed," never guess a score
- **Never fabricate specific external URLs** — reference the project's real tech stack
  (from `project-context.md`) or well-known generic practice concepts by name only

### Level Rules
- Beginner, Intermediate, and Advanced are defined by demonstrable competencies, not time
  served — a graduation checklist, not a duration, moves a learner to the next tier
- Do not build Advanced material for a learner whose stated or assessed level is
  Foundation — check the target competency-matrix cell before designing the kata/quiz

## Learnings

<!-- Add learnings from past enablement sessions -->

## QA Competency Matrix

Levels (columns) x Skill Areas (rows). Each cell is a demonstrable competency, not a
vague label — use these descriptions when scoring a skills-gap assessment or setting a
kata's target level.

| Skill Area | Foundation | Practitioner | Advanced |
|---|---|---|---|
| **Manual Testing** | Executes written test cases; logs clear bug reports (repro steps, expected/actual, evidence) | Designs test cases from requirements using EP/BVA/decision tables; performs structured exploratory testing (charters) | Leads test design for ambiguous/high-risk features; mentors others on technique selection; owns test strategy for a module |
| **Automation** | Reads and runs existing Playwright specs; understands POM structure and locator priority | Writes new specs and page objects independently; uses fixtures, `waitForResponse`/auto-waiting correctly; debugs flaky tests | Designs the automation architecture (fixtures, tagging, CI integration); owns suite health, flake triage, and framework evolution |
| **API Testing** | Executes existing API tests; reads OpenAPI/Swagger specs; validates status codes and basic schema | Writes new API test suites (contract, functional); designs request/response validation and negative cases | Designs API test strategy across services; owns contract-test governance and cross-service integration coverage |
| **Performance** | Understands basic load-test terminology (throughput, latency, error rate); runs an existing k6/JMeter script | Designs and writes load/stress test scripts; interprets results against SLAs; identifies bottleneck symptoms | Designs performance test strategy (load/stress/spike/soak); correlates results with system architecture; drives capacity planning |
| **Security** | Understands OWASP Top 10 categories; runs an existing security checklist | Writes negative/boundary security test cases; performs authorized basic penetration checks with `/penetration-agent` guidance | Designs security test strategy; owns authZ/authN test coverage; leads authorized penetration engagements |
| **CI/CD** | Understands the pipeline stages tests run in; reads pipeline failure output | Adds/maintains test stages in CI config; triages pipeline-only failures (env, flake, real bug) | Owns pipeline test-stage architecture; designs quality gates and release criteria enforcement |

## Role-Based Learning Path Template

Every path has three tiers. Each tier lists Topics (mapped to a matrix cell), Resources,
and a Graduation Checklist (demonstrable, checkable).

```
### Beginner — targets Foundation across [skill area(s)]
Topics:
- [Topic] — targets [Skill Area]: Foundation
Resources:
- [Project's real doc/spec, e.g. project-context.md conventions section]
- [Well-known generic practice concept, e.g. "equivalence partitioning exercise"]
Graduation checklist (all must be demonstrable):
- [ ] Can execute an existing [automation-agent] Playwright spec and read its report
- [ ] Can write a bug report using the project's Bug ID convention (BUG-MODULE-NNN)

### Intermediate — targets Practitioner across [skill area(s)]
Topics: ...
Resources: ...
Graduation checklist: ...

### Advanced — targets Advanced across [skill area(s)]
Topics: ...
Resources: ...
Graduation checklist: ...
```

### Standard Track Sequences
- **Manual -> Automation:** Manual:Practitioner -> Automation:Foundation (POM, locators,
  auto-waiting) -> Automation:Practitioner (independent spec authoring)
- **Automation -> SDET:** Automation:Practitioner -> API Testing:Practitioner + CI/CD:
  Practitioner -> Automation:Advanced (framework/architecture ownership)
- **SDET -> Performance/Security:** Automation:Advanced -> Performance:Foundation or
  Security:Foundation -> Practitioner tier in the chosen specialization

## Kata Design Pattern

Every kata is a single, self-contained, gradeable exercise with exactly these sections:

```
### Kata: [Name]
Targets: [Skill Area]: [Level]

**Goal:** One sentence — what capability this kata proves the learner has.

**Starting Point:** The exact state the learner begins from (existing file/spec to
extend, a described scenario with no code, a broken test to fix). Never open-ended.

**Acceptance Criteria** (all must be true to pass — checkable, not aspirational):
- [ ] [Specific, verifiable condition]
- [ ] [Specific, verifiable condition]
- [ ] [Specific, verifiable condition]

**Stretch Goal** (optional — does not block passing the kata):
- [Harder variant that extends the same scenario, e.g. add a negative-path test,
  parameterize the data, add a CI stage]
```

Worked example — "Fix the Flaky Login Spec" (Automation: Practitioner): Goal = diagnose
and fix a flaky spec caused by a missing wait. Starting Point = a provided `login.spec.js`
that intermittently fails asserting page content before an API response resolves.
Acceptance Criteria = passes 10/10 consecutive runs, fix uses `waitForResponse`/auto-
waiting (NOT `waitForTimeout`), root cause documented in a one-line comment. Stretch =
add a negative-path test for invalid credentials.

## Knowledge-Check Quiz Format

```
### Quiz: [Topic] — [Level]
Targets: [Skill Area]: [Level]

Q1. [Multiple choice / scenario-based / short answer question]
    A) ... B) ... C) ... D) ...

Q2. [Next question] ...

### Answer Key
Q1: [Correct option] — Rationale: [one line explaining WHY, not just restating the answer]
Q2: [Correct option] — Rationale: ...
```

Question mix guideline per quiz (aim for 6-10 questions):
- 40% multiple choice (recall/recognition of concepts or conventions)
- 40% scenario-based (apply a technique to a described situation — e.g. "which design
  technique fits this input space?")
- 20% short answer (explain a decision, e.g. "why would auto-waiting fail here?")

## Skills-Gap Assessment Method

1. **Identify scope** — a named learner or a team, and the track/skill areas in question.
2. **Gather evidence** per competency-matrix cell, in priority order:
   - Self-assessment input from the learner (ask directly if not provided)
   - Evidence from `outputs/test-summary-agent/` or `outputs/execution-report-agent/`
     (e.g. recurring defect categories, low automation-coverage areas) if present
   - Evidence from `outputs/automation-agent/` (spec authorship patterns) if present
3. **Score each relevant cell**: `Not Started | Foundation | Practitioner | Advanced |
   Unassessed`. Use `Unassessed` when no evidence exists — never infer a score without
   evidence or a stated self-assessment.
4. **Identify the gap**: for the learner's stated target role, list cells where current
   score < target tier.
5. **Recommend the next Learning Path**: the lowest-scoring cells relevant to the track,
   fed directly into Step 3 (Build the Role-Based Learning Path) as the topic set.

```
### Skills-Gap Assessment: [Learner/Team]
Target role/track: [role]

| Skill Area | Current Level | Target Level | Gap | Evidence Source |
|---|---|---|---|---|
| Automation | Foundation | Practitioner | Yes | Self-assessment |
| API Testing | Unassessed | Practitioner | Unknown | none available |

Recommended next Learning Path: Automation Beginner->Intermediate tier
(see outputs/learning-agent/[path]/learning-path-*.md)
```
