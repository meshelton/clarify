---
name: beads-followup
description: Capture deferred work in beads without breaking flow. File a small followup (label-tagged task) or a new feature (with optional dependency edges) into the future-work graph. Triggered by phrases like "remind me to", "we should also", "follow up on", "park this for later".
---

# beads-followup

A low-friction way to capture deferred items mid-session — both small followups and session-sized features — without losing momentum on the current task.

## When to use

Trigger phrases or moments:

- User says "remind me to ...", "we should also ...", "follow up on ...", "park this for later", "TODO: ..."
- Orchestrator notices a deferred decision in conversation ("let's defer that to a future session")
- A task hits a problem worth tracking but not blocking on (e.g., "this works but the helper could be DRYer — file a polish followup")
- The user describes a piece of future work that's bigger than a fix but not yet ready to plan ("we'll eventually want a research shop side rail")

## How to use

**Input**: a free-text description of the item, optionally a hint of whether it's a `followup` (small) or `feature` (session-sized), and optionally dependency edges.

Spawn a subagent. Subagent does the steps below and returns the new bd ID.

## Subagent steps

1. **Disambiguate type if needed**. If the user (or orchestrator) didn't specify, ask one short question via `AskUserQuestion`:

   > "Is this a small followup, or a feature warranting its own session?"

   Default to `followup` if ambiguous.

2. **Capture title and body**:
   - Title: a one-line summary (≤ 80 chars).
   - Body: the original description, plus any context like "captured during work on bd-N" if the orchestrator can supply the in-progress task ID.

3. **For `followup`**:

   ```bash
   FOLLOWUP_ID=$(bd create -t task --label followup --title "$TITLE" --body "$BODY" --json | jq -r '.id')
   ```

   No automatic dependency edges. Followups are leaves by default.

4. **For `feature`**:

   ```bash
   FEATURE_ID=$(bd create -t feature --title "$TITLE" --body "$BODY" --json | jq -r '.id')
   ```

   If the user supplied dependency hints (e.g., `--blocks bd-X` or `--blocked-by bd-Y`):

   ```bash
   # "this feature blocks bd-X"
   bd dep add bd-X "$FEATURE_ID"

   # "this feature is blocked by bd-Y"
   bd dep add "$FEATURE_ID" bd-Y
   ```

5. **Return**:

   ```json
   {
     "status": "filed",
     "type": "followup" | "feature",
     "id": "<bd-ID>",
     "title": "<title>"
   }
   ```

   The orchestrator surfaces a one-line confirmation to the user: `"Filed bd-N: <title>"`.

## Constraints

- **Quick and quiet.** Should never derail the active task. If the disambiguation question would take more than one round-trip, default to `followup` and let the user re-classify later with `bd update <id> -t feature`.
- **Always run as a subagent.** Returns the new bd ID; orchestrator displays the one-line confirmation.
- **Don't auto-link to current work.** Followups stand on their own. If the user wants `bd-N blocks bd-M`, they say so explicitly.
