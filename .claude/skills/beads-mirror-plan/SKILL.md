---
name: beads-mirror-plan
description: Round-trip a superpowers plan file with beads issues. Run after superpowers:writing-plans produces a plan, and any time you edit task structure mid-execution. Idempotent — safe to re-run. Auto-closes the epic (and transitively the feature) when all child tasks are done.
---

# beads-mirror-plan

Bidirectional sync between a plan markdown file and beads issues. The plan is the source of truth for task descriptions, titles, and dependencies; beads is the source of truth for status. Run as a subagent to keep raw bd output out of the main conversation.

## When to use

- Immediately after `superpowers:writing-plans` produces a new plan file.
- After editing the plan to add, remove, or reorder tasks during execution.
- After a batch of `bd close` calls, to refresh the plan's checkbox state and possibly auto-close the parent epic.

## How to use

**Input**: a path to a plan file in `docs/superpowers/plans/`.

Spawn a subagent. Subagent does the steps below and returns a structured summary.

## Subagent steps

1. **Read the plan file**. Look for the `<!-- BEADS -->` annotation block at the top (always present; written by promotion in `beads-session-start`).

2. **Parse the BD block** to extract:
   - `feature: bd-N` (optional — only present when promoted from a backlog feature)
   - `epic: bd-M` (always present after promotion)
   - `scoping_task: bd-P` (present until the first mirror absorbs implementation tasks)
   - `tasks:` list (may be empty on first mirror)

3. **Parse the `**Plan mode:**` header**. Default to `sequential` if missing or set to anything other than `parallel`.

4. **Parse `### Task N: <title>` headers** in the plan body. For each, also scan the task body for a `**Depends on:** Task X | bd-Y` line (optional; comma-separated for multiple deps).

5. **Decide the branch**:

   - **First-mirror branch**: BD block has `epic` set, `tasks:` list is empty, `scoping_task` is set.
   - **Re-mirror branch**: BD block has `epic` set and `tasks:` is non-empty.

6. **First-mirror branch** — for each plan task in order:

   ```bash
   TASK_ID=$(bd create -t task --parent "$EPIC_ID" --title "$TASK_TITLE" --body "$TASK_BODY" --json | jq -r '.id')
   ```

   After all tasks created, add dependency edges:

   - `sequential` mode: `bd dep add <task[i+1]> <task[i]>` for each adjacent pair.
   - `parallel` mode: only add edges declared by `**Depends on:**`.
     - Resolve `Task N` references against the new bd IDs (Task index in plan order).
     - Resolve `bd-Y` references directly.
     - `bd dep add <dependent> <dependency>` for each edge.

   Then close the scoping task:

   ```bash
   bd close "$SCOPING_ID" --reason "Implementation tasks created from plan"
   ```

7. **Re-mirror branch** — reconcile diffs:

   For each plan task header:
   - If it has a corresponding bd ID in the BD block → check whether the title changed; if so, `bd update <id> --title "<new title>"`.
   - If it has no corresponding bd ID (new task) → `bd create -t task --parent <EPIC>` and append to BD block.

   For each bd ID in the BD block that has no corresponding plan task header → `bd update <id> --status cancelled --reason "Removed from plan"`.

   For each `**Depends on:**` annotation:
   - Compare to current `bd dep` edges.
   - Add missing edges with `bd dep add <dependent> <dependency>`.
   - Remove stale edges with `bd dep rm <dependent> <dependency>`.

   For each plan checkbox:
   - Read current bd status; rewrite checkbox accordingly. `closed` or `cancelled` → `- [x]`; `in_progress` → `- [~]` (or leave as `- [ ]` if your markdown convention prefers); `open` → `- [ ]`.

8. **Auto-close the epic if all children are done**:

   ```bash
   OPEN_CHILDREN=$(bd list --parent "$EPIC_ID" --status open --json | jq 'length')
   IN_PROGRESS_CHILDREN=$(bd list --parent "$EPIC_ID" --status in_progress --json | jq 'length')
   if [ "$OPEN_CHILDREN" -eq 0 ] && [ "$IN_PROGRESS_CHILDREN" -eq 0 ]; then
       bd close "$EPIC_ID" --reason "All child tasks closed"
       EPIC_AUTOCLOSED=true
       # The epic blocks the parent feature, so closing the epic transitively
       # makes the feature ready-to-close. Whether to auto-close the feature is
       # a project policy: for v1, do close it.
       if [ -n "$FEATURE_ID" ]; then
           bd close "$FEATURE_ID" --reason "Implementation epic closed"
       fi
   fi
   ```

9. **Rewrite the BD block** in the plan file with the current state (full task list with bd IDs, current scoping_task status note).

10. **Return a structured summary**:

    ```json
    {
      "status": "ok",
      "branch": "first-mirror" | "re-mirror",
      "tasks_created": N,
      "tasks_updated": N,
      "tasks_cancelled": N,
      "edges_added": N,
      "edges_removed": N,
      "epic_autoclosed": true | false,
      "feature_autoclosed": true | false,
      "plan_path": "<path>"
    }
    ```

## BD block format reference

Always at the top of the plan, after the title and before any other content:

```markdown
<!-- BEADS — generated by beads-mirror-plan; do not hand-edit
feature: bd-7
epic:    bd-15
scoping_task: bd-16   (auto-closed when mirror absorbs new tasks)
tasks:
  - bd-17  Task 0: Add SharedFoodEffect resource
  - bd-18  Task 1: Card "Drought"
  - bd-19  Task 2: Card "Famine"          (depends on bd-17)
-->
```

## Source-of-truth rules

| Concern | Source of truth |
|---|---|
| Task description, steps, code blocks | Plan file (markdown body) |
| Task title | Plan file (mirror syncs to beads) |
| Task status (open / in_progress / closed) | Beads (BD block annotations regenerate) |
| Dependencies | Plan file annotations (mirror writes to beads) |
| Subagent comments / blocking questions | Beads (`bd comment`) |

## Constraints

- **Idempotent.** Re-running on an already-mirrored plan must be safe.
- **Never destroys issues.** Tasks removed from plans are `cancelled`, not deleted.
- **Always run as a subagent.** Returns a structured summary, not raw bd output.
