# Task: Promote Lessons (Governance Feedback Loop)

Promote proven lessons from runtime memory into the curated agent knowledge base.
This is the ONLY path by which memory changes `_sdet/knowledge/*` — always user-gated.

## Trigger

- User runs this task directly, OR
- An agent suggested it because a lesson reached **Occurrences ≥ 3**.

## Steps

1. **Scan** every file in `outputs/_system/memory/` for lessons where `Promoted: no` AND
   (`Occurrences ≥ 2` OR the user asked about a specific lesson).
2. **Rank** candidates by Occurrences (highest first).
3. **For each candidate — ONE AT A TIME (never batch):**
   a. Show the full lesson (Failure / Fix / Rule / Occurrences).
   b. Show the target file and section: `_sdet/knowledge/<agent-id>.md` (or
   `_sdet/knowledge/shared.md` for cross-agent lessons).
   c. Show the exact proposed edit (the Rule, rewritten as a permanent guideline).
   d. WAIT for explicit user approval. "yes" → apply the edit; anything else → skip, move on.
   e. After applying, set `Promoted: yes` on the lesson in its memory file.
4. **Report**: promoted / skipped / remaining counts.

## Rules

- NEVER touch `_sdet/agents/*.yaml` from this task — knowledge files only,
  unless the user explicitly directs a YAML change.
- NEVER promote without approval — silence or ambiguity is NOT approval.
- Keep promoted rules project-agnostic (this is a reusable template): strip client
  names, real URLs, and credentials; generalize the pattern.
- If a lesson is project-specific and cannot be generalized, leave it in memory and
  say so — memory is its correct home.
