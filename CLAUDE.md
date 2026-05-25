# <ProjectName>

<One-line framing — e.g. "Game prototype. Godot 4." or "CLI tool. Rust." or "Web app. SvelteKit + Postgres.">

## Vault context

Design, decisions, journal, inspirations live in the PKDB vault, not this repo. The code session has read/write access via `.claude/settings.json`'s `additionalDirectories`.

- **Project MoC:** `~/Vaults/pkdb/projects/<project-slug>/<project-slug>.md` — pitch, status, decision log, journal entries.
- **Area MoC:** `~/Vaults/pkdb/areas/<area>/<area>.md` — broader notes for the discipline this project lives under.
- **Vault conventions:** `~/Vaults/pkdb/CLAUDE.md` — PARA layout, MoC pattern, frontmatter shapes. Read if you need to file something *back* into the vault from this session.

Source of truth for code = this repo. Source of truth for thinking = the vault. The two are bridged by paths, not by `@import`.


## Beads workflow

This project uses [beads](https://github.com/steveyegge/beads) as persistent
storage and as a message queue between the orchestrator (the main conversation)
and subagent workers. Skills live at `.claude/skills/beads-*/`.

- **Session start**: invoke `beads-session-start` (read-only) before any code
  work. Pulls `origin/main`, summarizes ready/blocked state, offers to promote
  a ready feature.
- **After writing-plans**: invoke `beads-mirror-plan <plan-path>` to mirror the
  plan into beads. The plan file gains a `<!-- BEADS -->` annotation block;
  do not hand-edit it.
- **Plan parallelism**: when `superpowers:writing-plans` produces a plan whose
  tasks can run in parallel (independent units, fan-out work), put
  `**Plan mode:** parallel` near the top and declare cross-task edges with
  `**Depends on:** Task N` annotations. Default is sequential.
- **During execution**: when a task commits, also `bd close <task-issue>`
  (mirror writes the bd ID into the plan's BD block — read it from there).
  Re-running `beads-mirror-plan` auto-closes the epic (and transitively the
  feature) once every child task is closed or cancelled — no need to do that
  manually.
- **Capturing future work**: invoke `beads-followup` whenever a deferred item,
  question, or new feature surfaces. Trigger phrases: "remind me to", "we
  should also", "follow up on", "park this for later".
- **Subagent blocking**: a subagent that needs a human decision writes
  `bd comment <issue> "BLOCKED: <question>"` and returns a structured
  `{status: "blocked", issue, question}` message. The orchestrator surfaces
  the question via `AskUserQuestion`, writes the answer back as another
  `bd comment`, and re-dispatches the subagent.
- **Session end**: ensure all work is committed; `git push origin main` —
  the pre-push hook auto-syncs dolt state. Handled naturally by
  `superpowers:finishing-a-development-branch`.

## Stack

*Fill in as you bootstrap — engine/runtime version, language(s), test/lint approach, build commands, anything a fresh session needs to know to be useful.*

## Conventions

### Other patterns

*Fill in as more emerge.*


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
