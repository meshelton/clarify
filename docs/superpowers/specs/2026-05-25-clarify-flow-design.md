# Clarify Flow — Design Spec

**Date:** 2026-05-25
**Status:** Draft for review

## Summary

A custom Obsidian plugin that implements David Allen's GTD **clarify** step as a focused, decision-tree-driven wizard. Users open it, walk through their inbox one item at a time, and answer 2–5 questions per item. Each commit moves the file and rewrites frontmatter so the item lands in the right bucket (project, area, reference, etc.) — leaving the inbox empty when the session is done.

The plugin is built on the existing TypeScript sample-plugin starter in this repo, runs on both desktop and mobile, and integrates with TaskNotes via filesystem operations only (no direct API coupling).

## Motivation

A capture flow already exists (TaskNotes-based, v1). Inbox items pile up, and processing them manually is friction-heavy. Capturing the GTD clarify logic in a flow-driven UI:

- Reinforces the methodology (every question maps to a step in the GTD decision tree)
- Makes mobile clarification fast (one-handed: question banner + tappable 2×2 grid)
- Makes desktop clarification fast (one-handed too: keyboard shortcuts on every step)
- Guarantees the inbox is fully emptied per session — every item lands in a project or area

## Decision Tree

The flow is the canonical GTD clarify tree, encoded as the wizard's state space. **9 terminal outcomes**:

```
Inbox item
├── Actionable?
│   ├── NO
│   │   ├── Trash
│   │   ├── Someday / Maybe
│   │   ├── Tickler              (resurface on a future date)
│   │   └── Reference            (auto-files to Resources/)
│   └── YES
│       ├── Multi-step  →  Project (defines outcome + first next action)
│       └── Single
│           ├── < 2 min  →  Do now
│           └── Defer
│               ├── Delegate          →  Waiting For (who + follow-up date)
│               └── Mine
│                   ├── Specific date →  Calendar
│                   └── As-soon-as    →  Next Actions (+ context, energy, time)
```

Decision depth ranges from **2 questions** (Trash) to **5 questions** (Next Action with full attribute set), plus a final **project / area binding** step on every action-type outcome.

The tree is locked. The plugin does not allow custom outcomes or branches — the value of the tool is its reinforcement of canonical GTD.

## UX

### Workspace view, not Modal

The wizard registers as an Obsidian `ItemView` and opens as a workspace leaf. On desktop it takes the active leaf or opens in the main area; on mobile it takes over the active leaf cleanly (modals on mobile Obsidian are awkward and don't survive navigation well).

### Shared layout on both surfaces

```
┌──────────────────────────────────┐
│  Counter ("3 of 12")  ·  close   │
│  ───── Progress bar ─────────    │
│  ┌──────────────────────────┐    │
│  │   Question banner        │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │   Item card              │    │
│  │   (the thing being       │    │
│  │   decided about)         │    │
│  │                          │    │
│  └──────────────────────────┘    │
│  ┌──── action affordances ──┐    │
│  │  buttons / keyboard hints│    │
│  └──────────────────────────┘    │
│  footer hints (desktop only)     │
└──────────────────────────────────┘
```

Reading order: progress → question → item → action.

### Desktop affordances

- Keyboard-driven: `Y`/`N` for binary, `1`–`4` for multi-option, `←` back, `Esc` exit, `?` help
- Binary questions show two large hit targets with key-hint badges
- Multi-option (4-way) shows a 2×2 grid of large hit targets with number-key shortcuts, icons, labels, one-line descriptions
- All keybindings remappable in plugin settings; defaults shipped

### Mobile affordances

- Binary questions: two large bottom buttons (No / Yes), thumb-reachable
- Multi-option: a 2×2 grid of icon tiles with short labels, every tile thumb-sized
- No on-screen gesture hints — interactions are implied
- Same icons and labels as desktop to build cross-device muscle memory

Surface detection via Obsidian's `Platform.isMobile`. One Preact component tree; CSS branches on `body.is-mobile`.

## Data Model

### Inbox source query

An item is "inbox" if **either**:

- It lives in the configured inbox folder (default e.g. `00 Inbox/`), **or**
- Its frontmatter `status` field equals the configured captured value (default `captured`)

Both predicates are independently configurable. The query is a union.

### Outcome write specs

Every outcome maps to a deterministic file operation. All folder paths, frontmatter field names, status values, and tag mappings are configurable; sensible defaults shipped.

| Outcome | File location | Frontmatter changes | Tags |
|---|---|---|---|
| 🗑️ Trash | deleted (or archived to `.trash/` — configurable) | — | — |
| 💭 Someday / Maybe | `Someday/` | `status` → `someday`, clear scheduled/due/priority, add `project` link | swap `task` → `someday` |
| 🔔 Tickler | `Tickler/` | `status` → `tickler`, `scheduled` → user-picked date, clear due/priority, add `project` link | swap `task` → `tickler` |
| 📚 Reference | `Resources/` | drop `status`, `priority`, `scheduled`, `due` | swap `task` → `reference` |
| 🎯 Project | `Projects/` (new note created) | `status` → `active`, `outcome` field (user-entered), `area` link | swap `task` → `project`; original captured item becomes first next action under it |
| ⚡ Do now | stays in place | `status` → `done`, `completedDate` → today, add `project` link | keep `task` |
| ⏳ Waiting For | `Waiting/` | `status` → `waiting`, `waitingFor` field (who), `scheduled` → follow-up date, add `project` link | keep `task`, add `waiting` |
| 📅 Calendar | stays in place | `status` → `scheduled`, `scheduled` → user-picked date, add `project` link | keep `task` |
| ✅ Next Actions | `Next/` (or stays in place — configurable) | `status` → `next`, `context`, `energy`, `time`, add `project` link | keep `task`, add context tag (e.g. `@home`) |

### Project / area binding

Every action-type outcome (everything except Trash, Reference) must end with a **project or area binding**:

- The binding is stored as a frontmatter link (default field `project`, configurable)
- The plugin scans `Projects/` and `Areas/` on session start to populate a picker
- A configured **"Misc" area** acts as a catchall for true one-offs (default name `Misc`)
- Binding mechanism: **frontmatter link only** (no folder placement under project). Tasks live in their outcome folders (`Next/`, `Waiting/`, etc.) and reference their parent project/area by link.

### Project outcome handling

When the user picks Project for an inbox item:

1. The wizard collects an **outcome statement** (the project's purpose)
2. The wizard collects a **first next action** (text)
3. A new project note is created at `Projects/<title>.md` with the outcome in frontmatter
4. The original captured item is converted into a Next Action task, with its `project` field linked to the newly-created project
5. The user then completes the standard Next Action flow (area binding, context/energy/time) for that first action

## Architecture

Three independent layers, separately testable:

```
┌─────────────────────────────────────────────────────────┐
│                  Preact UI Layer                        │
│   (Wizard view, screens, project picker, date picker)   │
└──────────────────────┬──────────────────────────────────┘
                       │ events / context
┌──────────────────────▼──────────────────────────────────┐
│                xstate State Machines                    │
│  ┌─ SessionMachine ───────────────────────────────────┐ │
│  │  Walks the inbox queue, invokes child per item     │ │
│  │  ┌─ ItemMachine ─────────────────────────────────┐ │ │
│  │  │  Decision tree traversal + outcome data       │ │ │
│  │  │  collection per inbox item                    │ │ │
│  │  └───────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ pure Outcome objects
┌──────────────────────▼──────────────────────────────────┐
│              Vault I/O Layer (Effect)                   │
│  - VaultService Layer (read/write via Obsidian Vault)   │
│  - MetadataService Layer (frontmatter via MetadataCache)│
│  - ProjectService Layer (scan + cache projects/areas)   │
│  - Programs: readInbox, applyOutcome, createProject     │
└─────────────────────────────────────────────────────────┘
```

**Why split this way:**

- State machines are framework-agnostic — unit-testable without DOM
- Vault I/O is Effect programs returning typed errors — testable via a `VaultService.Test` Layer with an in-memory map
- The Preact layer is dumb — receives state, dispatches events. No business logic

### Module layout

```
src/
├── main.ts                      // Plugin entry (registerView, settings tab, ribbon, command)
├── settings.ts                  // Settings schema, defaults, settings tab UI
├── platform.ts                  // isMobile, etc.
├── state/
│   ├── sessionMachine.ts        // Parent: walks the inbox queue
│   ├── itemMachine.ts           // Child: per-item decision tree
│   └── types.ts                 // Outcome union, Item shape, context types
├── vault/
│   ├── services/
│   │   ├── VaultService.ts      // Layer over Obsidian's Vault API
│   │   ├── MetadataService.ts   // Layer over MetadataCache for frontmatter
│   │   └── ProjectService.ts    // Layer that depends on VaultService for project/area registry
│   ├── programs/
│   │   ├── readInbox.ts
│   │   ├── applyOutcome.ts      // Dispatches by outcome type to specific writes
│   │   ├── createProject.ts
│   │   └── moveAndRewrite.ts    // Atomic move + frontmatter-edit primitive
│   ├── errors.ts                // Tagged error types
│   └── schema.ts                // Effect Schema definitions for Item, Outcome, Settings frontmatter
└── ui/
    ├── ClarifyView.tsx          // Obsidian ItemView host — mounts Preact tree
    ├── Wizard.tsx               // Top-level wizard, subscribes to sessionMachine
    ├── screens/
    │   ├── BinaryQuestion.tsx   // "Is it actionable?", "<2 min?", etc.
    │   ├── MultiOption.tsx      // 2×2 / number-key picker
    │   ├── ProjectPicker.tsx    // Searchable list of projects/areas + "create new"
    │   ├── DatePicker.tsx       // For Tickler / Calendar / Waiting-For follow-up
    │   ├── WaitingForInput.tsx  // Who are we waiting on?
    │   ├── NextActionAttrs.tsx  // Context / energy / time inputs
    │   ├── ProjectOutcome.tsx   // Outcome statement + first next action
    │   ├── SessionComplete.tsx  // End-of-inbox summary, errored items list
    │   └── EmptyInbox.tsx       // No items to clarify
    ├── components/
    │   ├── ItemCard.tsx
    │   ├── QuestionBanner.tsx
    │   ├── ProgressBar.tsx
    │   └── KeyHint.tsx
    └── hooks/
        ├── useMachine.ts        // @xstate/react binding wrapper
        ├── useKeybindings.ts    // Maps configured keys → events; disabled on mobile
        └── useSwipe.ts          // Touch handlers for mobile (binary screens only)
```

## State Machines

### SessionMachine — the queue walker

```
idle ──START_SESSION──→ loadingInbox
                            │
                ┌───────────┴───────────┐
                ▼ (queue empty)         ▼ (queue non-empty)
              empty                  clarifying
                                        │
                              spawns ItemMachine,
                              awaits ITEM_DONE
                                        │
                            ┌───────────┴───────────┐
                            ▼ SUBMITTED             ▼ EXIT
                       applying outcome          aborted (queue may be partial)
                            │
                ┌───────────┴────────────┐
                ▼ onDone                 ▼ onError
        more items? ──yes──→ clarifying  push error, advance to next
                  └──no──→ complete
```

**Context:** `{ queue, currentIndex, settings, errors: ItemError[] }`. Errors accumulate non-fatally so the session continues even if individual items fail to write.

**Snapshot semantics:** `queue` is set once at session start by `readInbox` and never re-scanned mid-session. New captures during a session appear in the *next* session, not this one — preserves the counter and a focused "process this batch" mental model.

### ItemMachine — the decision tree

Encoded as nested xstate states matching the locked tree:

```
assessing                                          // "Is it actionable?"
├── notActionable
│   ├── choosing                                   // 2×2 picker
│   ├── trash                              [submit]
│   ├── someday → bindingProjectOrArea     [submit]
│   ├── tickler → pickingDate → bindingProjectOrArea  [submit]
│   └── reference                          [submit] (auto-Resources)
└── actionable
    ├── complexity                                 // "Single or multi-step?"
    ├── project
    │   ├── definingOutcome
    │   ├── definingFirstAction
    │   └── bindingArea                    [submit]
    └── single
        ├── duration                               // "<2 min?"
        ├── doNow → bindingProjectOrArea   [submit]
        └── defer
            ├── ownership                          // "Mine or delegate?"
            ├── delegate
            │   ├── pickingWho
            │   ├── pickingFollowUpDate
            │   └── bindingProjectOrArea   [submit]
            └── mine
                ├── timing                         // "Date or as-soon-as?"
                ├── calendar
                │   ├── pickingDate
                │   └── bindingProjectOrArea  [submit]
                └── nextAction
                    ├── pickingContext
                    ├── pickingEnergy
                    ├── pickingTime
                    └── bindingProjectOrArea  [submit]
```

Every `[submit]` terminal raises a `SUBMITTED` event with the constructed `Outcome` payload up to SessionMachine.

**Events:** `YES` · `NO` · `PICK(outcome)` · `INPUT(field, value)` · `BACK` · `EXIT` · `SUBMIT`.

**Context:** `{ item: Item, draft: Partial<Outcome>, path: PathStep[] }`. `draft` accumulates field values as the user traverses. `path` is the back-navigation stack.

### Back navigation

xstate's built-in `history` states only navigate back to a parent's last visited child, which doesn't model "back one screen" cleanly. Custom approach:

- Every state-entry action pushes `{ stateValue, draftSnapshot }` onto `path`
- `BACK` event pops the top entry and `raise`s a `GOTO` event that transitions to the saved state and restores the draft snapshot

About 20 lines of machinery; keeps back navigation consistent and never desyncs from the visible draft.

## Data Flow

End-to-end for one item:

1. **Session start.** User invokes via command palette, ribbon icon, or both (configurable). Session begins.
2. **Inbox load.** SessionMachine `loadingInbox`: invokes `readInbox(settings)` (Effect program) via `fromPromise(() => Effect.runPromise(...))`. Returns `Item[]` snapshot.
3. **Per item.** SessionMachine spawns ItemMachine with the next `item` in context. ItemMachine enters `assessing`.
4. **User traversal.** Preact dispatches events into ItemMachine. Each transition snapshots state into `path`.
5. **Terminal reached.** ItemMachine builds an `Outcome` object from `draft` and emits `SUBMITTED` to parent.
6. **Apply.** SessionMachine invokes `applyOutcome(item, outcome, settings)` Effect program. On success: advance. On error: push to `errors[]`, advance anyway.
7. **End.** Queue exhausted → `complete` state. Summary screen shows total processed + any errored items with a link to open them in Obsidian for manual handling.

### `applyOutcome` shape

One Effect program, dispatching by outcome type:

```ts
const applyOutcome = (
  item: Item,
  outcome: Outcome,
  settings: ClarifySettings
): Effect.Effect<void, OutcomeWriteError, VaultService | MetadataService> => {
  switch (outcome.type) {
    case 'trash':      return trashItem(item, outcome, settings);
    case 'someday':    return moveAndRewrite(item, settings.outcomes.someday, { project: outcome.projectLink });
    case 'tickler':    return moveAndRewrite(item, settings.outcomes.tickler, { project: outcome.projectLink, scheduled: outcome.tickleDate });
    case 'reference':  return moveAndRewrite(item, settings.outcomes.reference, {});
    case 'project':    return createProjectAndLinkAction(item, outcome, settings);
    case 'doNow':      return markCompleted(item, outcome, settings);
    case 'waitingFor': return moveAndRewrite(item, settings.outcomes.waitingFor, { project: outcome.projectLink, waitingFor: outcome.who, scheduled: outcome.followUp });
    case 'calendar':   return moveAndRewrite(item, settings.outcomes.calendar, { project: outcome.projectLink, scheduled: outcome.date });
    case 'nextAction': return moveAndRewrite(item, settings.outcomes.nextAction, {
      project: outcome.projectLink,
      context: outcome.context,
      energy: outcome.energy,
      time: outcome.time,
    });
  }
};
```

`moveAndRewrite` is a well-ordered Effect: read frontmatter → compute new frontmatter (remove fields, add fields, swap tags) → write file to new location with new frontmatter → only on success, delete the original. Obsidian's filesystem isn't transactional, so true rollback isn't possible — but the order guarantees that if the write fails, the original file is untouched. The only failure mode that produces a bad state is a successful write followed by a failed delete, which leaves a duplicate; we surface that as an `OutcomeWriteError` in the session summary so the user can clean it up.

## Resumability

A direct consequence of per-item incremental commits:

- **Mid-session close** (e.g. wizard closed at item 5 of 12): items 1–4 are already applied and out of the inbox. Items 5–12 are still in the inbox, untouched. No special session-state persistence needed.
- **Next session**: a fresh `readInbox` returns the remaining items plus any new captures. User picks up naturally; counter reflects the new queue size.
- **Mid-item close**: the draft is discarded. The item is still in the inbox in its original state, gets re-clarified from scratch next session. Methodologically aligned — half-clarified state is ephemeral.
- **Errored item**: the file move/rewrite failed, so the item stays in the inbox. Surfaced in the session-end summary and naturally reappears next session.

## Settings

```ts
interface ClarifySettings {
  inbox: {
    folderPath: string | null;            // null disables folder check
    capturedStatusValue: string | null;   // null disables status check
    statusFieldName: string;              // default "status"
  };

  outcomes: {
    trash:      { folder: string | 'DELETE' };
    someday:    { folder: string; statusValue: string; tagsAdd: string[]; tagsRemove: string[] };
    tickler:    { folder: string; statusValue: string; tagsAdd: string[]; tagsRemove: string[] };
    reference:  { folder: string; tagsAdd: string[]; tagsRemove: string[]; fieldsRemove: string[] };
    project:    { folder: string; statusValue: string; tagsAdd: string[]; tagsRemove: string[]; outcomeField: string };
    doNow:      { statusValue: string; completedDateField: string };
    waitingFor: { folder: string; statusValue: string; tagsAdd: string[]; whoField: string; followUpField: string };
    calendar:   { statusValue: string; dateField: string };
    nextAction: { folder: string | null; statusValue: string; contextField: string; energyField: string; timeField: string };
  };

  projectsAndAreas: {
    projectsFolder: string;        // "Projects/"
    areasFolder: string;           // "Areas/"
    miscAreaName: string;          // "Misc"
    projectLinkField: string;      // "project"
  };

  keybindings: Record<EventName, KeyBinding>;  // every event remappable; defaults shipped
  launch: {
    showRibbonIcon: boolean;
    commandPaletteEnabled: boolean;
  };
}
```

Settings UI is a single tab under Obsidian's plugin settings, grouped by section (Inbox → Outcomes → Projects & Areas → Keybindings → Launch).

## Error Handling

**Tagged error types** (Effect's discriminated unions):

- `InboxReadError(cause)` — fatal at session start; user sees a "couldn't read inbox" screen with the reason
- `FrontmatterParseError(file, reason)` — non-fatal; item is skipped, surfaced in completion summary
- `OutcomeWriteError(item, outcome, cause)` — non-fatal; logged to `session.errors`, item stays in inbox, surfaced in completion summary
- `ProjectNotFoundError(name)` — non-fatal; user is prompted to pick again or create new

UI surfaces:

- **Session-start error**: full-screen error view with retry button
- **Per-item error**: silent during session, summarized at end with one-click open-in-Obsidian for each errored item
- **Validation errors** (e.g. user tries to submit a Tickler with no date): inline UI prevention; no Effect surfaced

No silent failures. Effect's typed error channel guarantees the UI must handle errors explicitly.

## Testing

Three layers, each tested independently:

1. **xstate machines** — pure transition tests. `createActor(itemMachine).start(); actor.send({ type: 'NO' }); expect(actor.getSnapshot().value).toMatchObject({ notActionable: 'choosing' });`. Cover every path through the tree (9 outcomes × the questions leading to them), plus `BACK` semantics and `EXIT`.

2. **Effect programs** — use Test Layers. `VaultService.Test` is an in-memory `Map<path, content>`. For each of the 9 outcomes, assert that `applyOutcome` produces the expected file moves and frontmatter mutations against the in-memory vault. Test error paths by injecting failures into the Test Layer.

3. **Integration** — full wizard against mocked Obsidian shell (Vault, MetadataCache stubbed). Verify a user typing through a decision tree produces the right file changes in the in-memory vault.

**Mobile manual testing** — no automation; UX validated on real iOS/Android Obsidian during build-out.

**Framework:** Vitest. The Obsidian sample template doesn't ship with tests; we'll add `vitest` and `@xstate/react` dev deps along with whatever Effect testing helpers are needed.

## Tech Stack Additions

To the existing sample-plugin starter:

- `preact` (+ `@preact/preset-vite` or esbuild equivalent for JSX)
- `xstate` and `@xstate/react`
- `effect` (the unified v2+ package)
- `vitest` (dev dep)

The existing esbuild config needs a small JSX/TSX update.

## Non-Goals

- **TaskNotes API coupling.** We talk to the vault directly via Obsidian's API, not via TaskNotes' plugin API. This trades a little duplication of frontmatter conventions for independence from TaskNotes release cadence.
- **Capture flow.** Already exists.
- **Weekly review / reflect / engage steps.** Out of scope; separate concerns.
- **Bulk operations** (multi-select items, batch classify). Clarify is methodologically intentional, one at a time.
- **AI / heuristic auto-classification.** Manual classification is the point.
- **Editing item text mid-clarify.** v1 reads item text as immutable. (Open question — may add in v2.)
- **External calendar integration.** Out of scope.
- **Multi-device conflict resolution.** If two devices clarify the same item simultaneously, last write wins. Acceptable risk for a personal tool.

## Open Questions

1. **Tickler resurfacing.** Tickler items have `status: tickler` and live in `Tickler/`. They don't appear in the inbox query as defined. For tickler items to actually resurface on their scheduled date, we'd need either (a) the inbox query to additionally include "tickler items with `scheduled <= today`", or (b) a separate "review tickler" command, or (c) a daily background job. **Recommendation:** punt to a follow-up feature. Document the gap clearly in plugin docs for v1.

2. **Mid-clarify item edit.** Sometimes a captured item's text is unclear and the user wants to fix it before deciding what it is. Should the wizard let the item card be tapped to edit the text inline? **Recommendation:** defer to v2; v1 is read-only on item text.

3. **Date picker UX.** Native `<input type="date">` is fast and works on both surfaces but limited. Custom calendar widget is more flexible but adds work. **Recommendation:** start with native, add quick presets (today, tomorrow, +1 week, +1 month) as buttons next to it.

4. **"Misc" area for Project outcome.** Does it make sense for a Project to be filed under "Misc"? Probably yes (a project is still a project even if it doesn't fit anywhere else), but worth confirming during implementation if it feels off.
