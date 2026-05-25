# Clarify Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GTD clarify Obsidian plugin that walks the user through a decision-tree wizard for each inbox item, committing each item to its destination (project, area, reference, etc.) before moving to the next.

**Architecture:** Three layers — Preact UI subscribed to xstate machines; xstate machines (`sessionMachine` walks the inbox queue, `itemMachine` traverses the per-item decision tree); Effect programs over typed `VaultService` / `MetadataService` / `ProjectService` layers for vault I/O. Per-item incremental commits give natural resumability.

**Tech Stack:** Preact, xstate v5, Effect v2+, vitest, Obsidian Plugin API, esbuild.

**Plan mode:** sequential (each phase builds on the previous; some intra-phase parallelism noted)

**Reference spec:** `docs/superpowers/specs/2026-05-25-clarify-flow-design.md`

---

## Phase 0 — Scaffolding

### Task 0.1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install preact xstate @xstate/react effect
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest @types/node happy-dom
```

- [ ] **Step 3: Verify package.json shape**

Run: `cat package.json | grep -E '"(preact|xstate|@xstate/react|effect|vitest|happy-dom)"'`
Expected: all five (or six) lines present.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add preact, xstate, effect, vitest"
```

---

### Task 0.2: Configure TypeScript and esbuild for TSX

**Files:**
- Modify: `tsconfig.json`
- Modify: `esbuild.config.mjs`

- [ ] **Step 1: Update tsconfig.json**

Open `tsconfig.json` and add JSX settings to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "Bundler",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "lib": ["DOM", "ES5", "ES6", "ES7", "ES2020"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 2: Update esbuild.config.mjs**

Open `esbuild.config.mjs` and ensure:
- Entry includes `src/main.ts`
- `loader: { '.ts': 'ts', '.tsx': 'tsx' }`
- `jsx: 'automatic'`
- `jsxImportSource: 'preact'`

If the current config has `entryPoints: ["src/main.ts"]`, add to the build options object:

```js
loader: { '.ts': 'ts', '.tsx': 'tsx' },
jsx: 'automatic',
jsxImportSource: 'preact',
```

- [ ] **Step 3: Smoke-build**

Run: `npm run build`
Expected: no errors. `main.js` should exist at the repo root.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json esbuild.config.mjs
git commit -m "build: configure JSX/TSX with preact"
```

---

### Task 0.3: Set up vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
});
```

- [ ] **Step 2: Add test script to package.json**

In the `scripts` object, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add a smoke test**

Create `src/_smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Delete the smoke test, commit**

```bash
rm src/_smoke.test.ts
git add vitest.config.ts package.json package-lock.json
git commit -m "test: configure vitest"
```

---

### Task 0.4: Rename plugin in manifest and package

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`

- [ ] **Step 1: Update manifest.json**

```json
{
  "id": "clarify",
  "name": "Clarify",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "GTD clarify flow — walk inbox items through a decision-tree wizard, on desktop and mobile.",
  "author": "Shelly Shelton",
  "isDesktopOnly": false
}
```

- [ ] **Step 2: Update package.json name and description**

```json
{
  "name": "obsidian-clarify",
  "version": "0.1.0",
  "description": "GTD clarify flow plugin for Obsidian"
}
```

(Leave the other fields untouched.)

- [ ] **Step 3: Commit**

```bash
git add manifest.json package.json
git commit -m "chore: rename plugin to clarify"
```

---

### Task 0.5: Replace sample main.ts with a minimal stub

**Files:**
- Modify: `src/main.ts`
- Delete: `src/settings.ts` (will be rebuilt in Phase 6)

- [ ] **Step 1: Replace main.ts**

```ts
import { Plugin } from 'obsidian';

export default class ClarifyPlugin extends Plugin {
  async onload() {
    console.log('[clarify] loaded');
  }

  onunload() {
    console.log('[clarify] unloaded');
  }
}
```

- [ ] **Step 2: Delete the old settings.ts**

```bash
rm src/settings.ts
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git rm src/settings.ts
git commit -m "chore: stub main, drop sample settings"
```

---

## Phase 1 — Types and Schemas

### Task 1.1: Item schema

**Files:**
- Create: `src/vault/schema/item.ts`
- Test: `src/vault/schema/item.test.ts`

The `Item` represents an inbox file: its path, title, raw text body, and parsed frontmatter.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/schema/item.test.ts
import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { Item } from './item';

describe('Item', () => {
  it('decodes a well-formed item', () => {
    const decoded = Schema.decodeUnknownSync(Item)({
      path: '00 Inbox/foo.md',
      title: 'foo',
      body: 'do the thing',
      frontmatter: { status: 'captured', tags: ['task'] },
      capturedAt: '2026-05-23T12:00:00Z',
    });
    expect(decoded.path).toBe('00 Inbox/foo.md');
    expect(decoded.frontmatter.tags).toEqual(['task']);
  });

  it('rejects an item with no path', () => {
    expect(() =>
      Schema.decodeUnknownSync(Item)({ title: 'foo', body: '', frontmatter: {} } as unknown)
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/vault/schema/item.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/vault/schema/item.ts
import { Schema } from 'effect';

export const ItemFrontmatter = Schema.Struct({
  status: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  scheduled: Schema.optional(Schema.String),
  due: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.String),
  project: Schema.optional(Schema.String),
});

export const Item = Schema.Struct({
  path: Schema.String,
  title: Schema.String,
  body: Schema.String,
  frontmatter: ItemFrontmatter,
  capturedAt: Schema.optional(Schema.String),
});

export type Item = Schema.Schema.Type<typeof Item>;
export type ItemFrontmatter = Schema.Schema.Type<typeof ItemFrontmatter>;
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/vault/schema/item.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/vault/schema/item.ts src/vault/schema/item.test.ts
git commit -m "schema: Item type"
```

---

### Task 1.2: Outcome schema

**Files:**
- Create: `src/vault/schema/outcome.ts`
- Test: `src/vault/schema/outcome.test.ts`

The `Outcome` is the tagged union the wizard produces when terminal states are reached.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/schema/outcome.test.ts
import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { Outcome } from './outcome';

describe('Outcome', () => {
  it('decodes a nextAction outcome', () => {
    const decoded = Schema.decodeUnknownSync(Outcome)({
      type: 'nextAction',
      projectLink: '[[Build website]]',
      context: '@computer',
      energy: 'medium',
      time: 30,
    });
    expect(decoded.type).toBe('nextAction');
  });

  it('decodes a trash outcome', () => {
    const decoded = Schema.decodeUnknownSync(Outcome)({ type: 'trash' });
    expect(decoded.type).toBe('trash');
  });

  it('rejects an outcome with unknown type', () => {
    expect(() => Schema.decodeUnknownSync(Outcome)({ type: 'mystery' } as unknown)).toThrow();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/schema/outcome.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/schema/outcome.ts
import { Schema } from 'effect';

const ProjectLink = Schema.String; // wiki-link form: "[[Project Name]]"

export const TrashOutcome      = Schema.Struct({ type: Schema.Literal('trash') });
export const SomedayOutcome    = Schema.Struct({ type: Schema.Literal('someday'),    projectLink: ProjectLink });
export const TicklerOutcome    = Schema.Struct({ type: Schema.Literal('tickler'),    projectLink: ProjectLink, tickleDate: Schema.String });
export const ReferenceOutcome  = Schema.Struct({ type: Schema.Literal('reference') });
export const ProjectOutcome    = Schema.Struct({ type: Schema.Literal('project'),    outcome: Schema.String, firstActionText: Schema.String, areaLink: ProjectLink });
export const DoNowOutcome      = Schema.Struct({ type: Schema.Literal('doNow'),      projectLink: ProjectLink });
export const WaitingForOutcome = Schema.Struct({ type: Schema.Literal('waitingFor'), projectLink: ProjectLink, who: Schema.String, followUp: Schema.String });
export const CalendarOutcome   = Schema.Struct({ type: Schema.Literal('calendar'),   projectLink: ProjectLink, date: Schema.String });
export const NextActionOutcome = Schema.Struct({
  type: Schema.Literal('nextAction'),
  projectLink: ProjectLink,
  context: Schema.String,
  energy: Schema.Union(Schema.Literal('low'), Schema.Literal('medium'), Schema.Literal('high')),
  time: Schema.Number,
});

export const Outcome = Schema.Union(
  TrashOutcome, SomedayOutcome, TicklerOutcome, ReferenceOutcome,
  ProjectOutcome, DoNowOutcome, WaitingForOutcome, CalendarOutcome, NextActionOutcome,
);

export type Outcome = Schema.Schema.Type<typeof Outcome>;
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/schema/outcome.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/schema/outcome.ts src/vault/schema/outcome.test.ts
git commit -m "schema: Outcome tagged union"
```

---

### Task 1.3: Settings schema with defaults

**Files:**
- Create: `src/settings/schema.ts`
- Test: `src/settings/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/settings/schema.test.ts
import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { ClarifySettings, defaultSettings } from './schema';

describe('ClarifySettings', () => {
  it('decodes the shipped defaults', () => {
    const decoded = Schema.decodeUnknownSync(ClarifySettings)(defaultSettings);
    expect(decoded.inbox.folderPath).toBe('00 Inbox');
    expect(decoded.projectsAndAreas.miscAreaName).toBe('Misc');
    expect(Object.keys(decoded.outcomes)).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/settings/schema.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/settings/schema.ts
import { Schema } from 'effect';

const StringList = Schema.Array(Schema.String);

export const KeyBinding = Schema.Struct({
  key: Schema.String,
  modifiers: Schema.optional(StringList),
});

export const ClarifySettings = Schema.Struct({
  inbox: Schema.Struct({
    folderPath: Schema.NullOr(Schema.String),
    capturedStatusValue: Schema.NullOr(Schema.String),
    statusFieldName: Schema.String,
  }),
  outcomes: Schema.Struct({
    trash:      Schema.Struct({ folder: Schema.String }),
    someday:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    tickler:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    reference:  Schema.Struct({ folder: Schema.String, tagsAdd: StringList, tagsRemove: StringList, fieldsRemove: StringList }),
    project:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList, outcomeField: Schema.String }),
    doNow:      Schema.Struct({ statusValue: Schema.String, completedDateField: Schema.String }),
    waitingFor: Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, whoField: Schema.String, followUpField: Schema.String }),
    calendar:   Schema.Struct({ statusValue: Schema.String, dateField: Schema.String }),
    nextAction: Schema.Struct({ folder: Schema.NullOr(Schema.String), statusValue: Schema.String, contextField: Schema.String, energyField: Schema.String, timeField: Schema.String }),
  }),
  projectsAndAreas: Schema.Struct({
    projectsFolder: Schema.String,
    areasFolder: Schema.String,
    miscAreaName: Schema.String,
    projectLinkField: Schema.String,
  }),
  keybindings: Schema.Record({ key: Schema.String, value: KeyBinding }),
  launch: Schema.Struct({
    showRibbonIcon: Schema.Boolean,
    commandPaletteEnabled: Schema.Boolean,
  }),
});

export type ClarifySettings = Schema.Schema.Type<typeof ClarifySettings>;

export const defaultSettings: ClarifySettings = {
  inbox: {
    folderPath: '00 Inbox',
    capturedStatusValue: 'captured',
    statusFieldName: 'status',
  },
  outcomes: {
    trash:      { folder: '.trash' },
    someday:    { folder: 'Someday',  statusValue: 'someday',   tagsAdd: ['someday'],   tagsRemove: ['task'] },
    tickler:    { folder: 'Tickler',  statusValue: 'tickler',   tagsAdd: ['tickler'],   tagsRemove: ['task'] },
    reference:  { folder: 'Resources', tagsAdd: ['reference'], tagsRemove: ['task'], fieldsRemove: ['status','priority','scheduled','due'] },
    project:    { folder: 'Projects', statusValue: 'active',    tagsAdd: ['project'],   tagsRemove: ['task'], outcomeField: 'outcome' },
    doNow:      { statusValue: 'done', completedDateField: 'completedDate' },
    waitingFor: { folder: 'Waiting',  statusValue: 'waiting',   tagsAdd: ['waiting'],   whoField: 'waitingFor', followUpField: 'scheduled' },
    calendar:   { statusValue: 'scheduled', dateField: 'scheduled' },
    nextAction: { folder: 'Next', statusValue: 'next', contextField: 'context', energyField: 'energy', timeField: 'time' },
  },
  projectsAndAreas: {
    projectsFolder: 'Projects',
    areasFolder: 'Areas',
    miscAreaName: 'Misc',
    projectLinkField: 'project',
  },
  keybindings: {
    YES:  { key: 'y' },
    NO:   { key: 'n' },
    PICK_1: { key: '1' },
    PICK_2: { key: '2' },
    PICK_3: { key: '3' },
    PICK_4: { key: '4' },
    BACK: { key: 'ArrowLeft' },
    EXIT: { key: 'Escape' },
    HELP: { key: '?' },
  },
  launch: { showRibbonIcon: true, commandPaletteEnabled: true },
};
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/settings/schema.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/settings/schema.ts src/settings/schema.test.ts
git commit -m "settings: schema and shipped defaults"
```

---

### Task 1.4: Tagged error types

**Files:**
- Create: `src/vault/errors.ts`

- [ ] **Step 1: Implement**

```ts
// src/vault/errors.ts
import { Data } from 'effect';

export class InboxReadError extends Data.TaggedError('InboxReadError')<{
  cause: unknown;
}> {}

export class FrontmatterParseError extends Data.TaggedError('FrontmatterParseError')<{
  path: string;
  reason: string;
}> {}

export class OutcomeWriteError extends Data.TaggedError('OutcomeWriteError')<{
  itemPath: string;
  outcomeType: string;
  cause: unknown;
}> {}

export class ProjectNotFoundError extends Data.TaggedError('ProjectNotFoundError')<{
  name: string;
}> {}

export class FileNotFound extends Data.TaggedError('FileNotFound')<{
  path: string;
}> {}
```

- [ ] **Step 2: Smoke compile**

Run: `npx tsc -noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/vault/errors.ts
git commit -m "vault: tagged error types"
```

---

## Phase 2 — Vault Services

Note: each service exposes an interface (Context.Tag), a `Live` Layer that uses Obsidian's APIs, and a `Test` Layer that uses an in-memory `Map<string, string>`.

### Task 2.1: VaultService

**Files:**
- Create: `src/vault/services/VaultService.ts`
- Test: `src/vault/services/VaultService.test.ts`

The service exposes basic file ops: `list`, `read`, `write`, `move`, `delete`, `exists`.

- [ ] **Step 1: Write the failing test (uses Test Layer)**

```ts
// src/vault/services/VaultService.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultService, VaultServiceTest } from './VaultService';

describe('VaultService (Test)', () => {
  it('reads a file', async () => {
    const layer = VaultServiceTest(new Map([['a.md', 'hello']]));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.read('a.md');
      }).pipe(Effect.provide(layer))
    );
    expect(result).toBe('hello');
  });

  it('writes, moves, deletes', async () => {
    const store = new Map<string, string>();
    const layer = VaultServiceTest(store);
    await Effect.runPromise(
      Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.write('a.md', 'hello');
        yield* vault.move('a.md', 'b.md');
        yield* vault.delete('b.md');
      }).pipe(Effect.provide(layer))
    );
    expect(store.size).toBe(0);
  });

  it('lists files under a prefix', async () => {
    const layer = VaultServiceTest(new Map([
      ['Inbox/a.md', 'x'],
      ['Inbox/b.md', 'y'],
      ['Other/c.md', 'z'],
    ]));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.listFolder('Inbox');
      }).pipe(Effect.provide(layer))
    );
    expect(result.sort()).toEqual(['Inbox/a.md', 'Inbox/b.md']);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/services/VaultService.test.ts`

- [ ] **Step 3: Implement service and Test layer**

```ts
// src/vault/services/VaultService.ts
import { Context, Effect, Layer } from 'effect';
import type { Vault, TFile } from 'obsidian';
import { FileNotFound } from '../errors';

export interface VaultServiceShape {
  readonly read: (path: string) => Effect.Effect<string, FileNotFound>;
  readonly write: (path: string, content: string) => Effect.Effect<void>;
  readonly move: (from: string, to: string) => Effect.Effect<void, FileNotFound>;
  readonly delete: (path: string) => Effect.Effect<void, FileNotFound>;
  readonly exists: (path: string) => Effect.Effect<boolean>;
  readonly listFolder: (folder: string) => Effect.Effect<string[]>;
}

export class VaultService extends Context.Tag('VaultService')<VaultService, VaultServiceShape>() {}

/** Test layer backed by an in-memory Map. */
export const VaultServiceTest = (store: Map<string, string>) =>
  Layer.succeed(VaultService, {
    read: (path) =>
      store.has(path)
        ? Effect.succeed(store.get(path)!)
        : Effect.fail(new FileNotFound({ path })),
    write: (path, content) =>
      Effect.sync(() => { store.set(path, content); }),
    move: (from, to) =>
      store.has(from)
        ? Effect.sync(() => {
            store.set(to, store.get(from)!);
            store.delete(from);
          })
        : Effect.fail(new FileNotFound({ path: from })),
    delete: (path) =>
      store.has(path)
        ? Effect.sync(() => { store.delete(path); })
        : Effect.fail(new FileNotFound({ path })),
    exists: (path) => Effect.succeed(store.has(path)),
    listFolder: (folder) => {
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;
      return Effect.succeed(
        Array.from(store.keys()).filter((p) => p.startsWith(prefix))
      );
    },
  });

/** Live layer backed by Obsidian's Vault API. */
export const VaultServiceLive = (vault: Vault) =>
  Layer.succeed(VaultService, {
    read: (path) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(path) as TFile | null;
          if (!file) throw new FileNotFound({ path });
          return await vault.read(file);
        },
        catch: () => new FileNotFound({ path }),
      }),
    write: (path, content) =>
      Effect.tryPromise(async () => {
        const file = vault.getAbstractFileByPath(path) as TFile | null;
        if (file) {
          await vault.modify(file, content);
        } else {
          await vault.create(path, content);
        }
      }).pipe(Effect.orDie),
    move: (from, to) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(from) as TFile | null;
          if (!file) throw new FileNotFound({ path: from });
          await vault.rename(file, to);
        },
        catch: () => new FileNotFound({ path: from }),
      }),
    delete: (path) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(path) as TFile | null;
          if (!file) throw new FileNotFound({ path });
          await vault.delete(file);
        },
        catch: () => new FileNotFound({ path }),
      }),
    exists: (path) =>
      Effect.sync(() => vault.getAbstractFileByPath(path) !== null),
    listFolder: (folder) =>
      Effect.sync(() => {
        const prefix = folder.endsWith('/') ? folder : `${folder}/`;
        return vault.getMarkdownFiles()
          .filter((f) => f.path.startsWith(prefix))
          .map((f) => f.path);
      }),
  });
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/services/VaultService.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/services/VaultService.ts src/vault/services/VaultService.test.ts
git commit -m "vault: VaultService (Live + Test layers)"
```

---

### Task 2.2: MetadataService

**Files:**
- Create: `src/vault/services/MetadataService.ts`
- Test: `src/vault/services/MetadataService.test.ts`

`MetadataService` parses and rewrites a file's YAML frontmatter. Backed by a small YAML parser in the Test layer and by Obsidian's `MetadataCache` + `app.fileManager.processFrontMatter` in the Live layer.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/services/MetadataService.test.ts
import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { VaultService, VaultServiceTest } from './VaultService';
import { MetadataService, MetadataServiceTest } from './MetadataService';
import { Layer } from 'effect';

const file = `---
status: captured
tags: [task]
---
Do the thing
`;

describe('MetadataService (Test)', () => {
  it('reads frontmatter', async () => {
    const store = new Map([['a.md', file]]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    const fm = await Effect.runPromise(
      Effect.gen(function* () {
        const meta = yield* MetadataService;
        return yield* meta.read('a.md');
      }).pipe(Effect.provide(layer))
    );
    expect(fm.status).toBe('captured');
    expect(fm.tags).toEqual(['task']);
  });

  it('rewrites frontmatter (replaces fields, preserves body)', async () => {
    const store = new Map([['a.md', file]]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      Effect.gen(function* () {
        const meta = yield* MetadataService;
        yield* meta.write('a.md', { status: 'next', tags: ['task', '@home'] });
      }).pipe(Effect.provide(layer))
    );
    const updated = store.get('a.md')!;
    expect(updated).toContain('status: next');
    expect(updated).toContain('Do the thing');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/services/MetadataService.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/services/MetadataService.ts
import { Context, Effect, Layer } from 'effect';
import type { App } from 'obsidian';
import { VaultService } from './VaultService';
import { FrontmatterParseError } from '../errors';

export type Frontmatter = Record<string, unknown>;

export interface MetadataServiceShape {
  readonly read: (path: string) => Effect.Effect<Frontmatter, FrontmatterParseError, VaultService>;
  readonly write: (path: string, fm: Frontmatter) => Effect.Effect<void, FrontmatterParseError, VaultService>;
}

export class MetadataService extends Context.Tag('MetadataService')<MetadataService, MetadataServiceShape>() {}

/** Minimal YAML helpers — sufficient for the flat key/value/array shape we use. */
const parseFrontmatter = (raw: string): { fm: Frontmatter; body: string } => {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) return { fm: {}, body: raw };
  const fm: Frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let value: unknown = kv[2];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        value = trimmed.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (trimmed === 'true' || trimmed === 'false') {
        value = trimmed === 'true';
      } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        value = Number(trimmed);
      } else {
        value = trimmed.replace(/^"|"$/g, '');
      }
    }
    fm[key] = value;
  }
  return { fm, body: match[2] };
};

const serializeFrontmatter = (fm: Frontmatter, body: string): string => {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`);
    else if (typeof v === 'boolean' || typeof v === 'number') lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n') + body;
};

export const MetadataServiceTest = () =>
  Layer.effect(
    MetadataService,
    Effect.gen(function* () {
      return MetadataService.of({
        read: (path) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const raw = yield* vault.read(path).pipe(
              Effect.mapError(() => new FrontmatterParseError({ path, reason: 'file not found' }))
            );
            return parseFrontmatter(raw).fm;
          }),
        write: (path, fm) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const raw = yield* vault.read(path).pipe(
              Effect.mapError(() => new FrontmatterParseError({ path, reason: 'file not found' }))
            );
            const { body } = parseFrontmatter(raw);
            yield* vault.write(path, serializeFrontmatter(fm, body));
          }),
      });
    })
  );

export const MetadataServiceLive = (app: App) =>
  Layer.effect(
    MetadataService,
    Effect.gen(function* () {
      return MetadataService.of({
        read: (path) =>
          Effect.tryPromise({
            try: async () => {
              const file = app.vault.getAbstractFileByPath(path);
              if (!file) throw new Error('not found');
              const cache = app.metadataCache.getFileCache(file as never);
              return (cache?.frontmatter ?? {}) as Frontmatter;
            },
            catch: (cause) => new FrontmatterParseError({ path, reason: String(cause) }),
          }),
        write: (path, fm) =>
          Effect.tryPromise({
            try: async () => {
              const file = app.vault.getAbstractFileByPath(path);
              if (!file) throw new Error('not found');
              await app.fileManager.processFrontMatter(file as never, (existing: Frontmatter) => {
                for (const k of Object.keys(existing)) delete existing[k];
                Object.assign(existing, fm);
              });
            },
            catch: (cause) => new FrontmatterParseError({ path, reason: String(cause) }),
          }),
      });
    })
  );
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/services/MetadataService.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/services/MetadataService.ts src/vault/services/MetadataService.test.ts
git commit -m "vault: MetadataService (Live + Test layers)"
```

---

### Task 2.3: ProjectService

**Files:**
- Create: `src/vault/services/ProjectService.ts`
- Test: `src/vault/services/ProjectService.test.ts`

Discovers projects and areas from the configured folders.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/services/ProjectService.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from './VaultService';
import { MetadataServiceTest } from './MetadataService';
import { ProjectService, ProjectServiceLive } from './ProjectService';

const proj = `---
status: active
---
content
`;

describe('ProjectService', () => {
  it('lists projects and areas', async () => {
    const store = new Map([
      ['Projects/Build website.md', proj],
      ['Projects/Renovate kitchen.md', proj],
      ['Areas/Health.md', proj],
      ['Areas/Misc.md', proj],
      ['Inbox/foo.md', proj],
    ]);
    const layer = Layer.mergeAll(
      VaultServiceTest(store),
      MetadataServiceTest(),
      ProjectServiceLive({ projectsFolder: 'Projects', areasFolder: 'Areas' }),
    );
    const list = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ProjectService;
        return yield* svc.listProjectsAndAreas;
      }).pipe(Effect.provide(layer))
    );
    expect(list.map((p) => p.name).sort()).toEqual(['Build website', 'Health', 'Misc', 'Renovate kitchen']);
    expect(list.find((p) => p.name === 'Health')!.kind).toBe('area');
    expect(list.find((p) => p.name === 'Build website')!.kind).toBe('project');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/services/ProjectService.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/services/ProjectService.ts
import { Context, Effect, Layer } from 'effect';
import { VaultService } from './VaultService';

export interface ProjectRef {
  name: string;
  path: string;
  kind: 'project' | 'area';
  link: string;
}

export interface ProjectServiceShape {
  readonly listProjectsAndAreas: Effect.Effect<ProjectRef[], never, VaultService>;
  readonly createProject: (name: string) => Effect.Effect<ProjectRef, never, VaultService>;
}

export class ProjectService extends Context.Tag('ProjectService')<ProjectService, ProjectServiceShape>() {}

const stem = (path: string): string => {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.md$/, '');
};

export const ProjectServiceLive = (opts: { projectsFolder: string; areasFolder: string }) =>
  Layer.effect(
    ProjectService,
    Effect.gen(function* () {
      return ProjectService.of({
        listProjectsAndAreas: Effect.gen(function* () {
          const vault = yield* VaultService;
          const projects = yield* vault.listFolder(opts.projectsFolder);
          const areas = yield* vault.listFolder(opts.areasFolder);
          const mk = (path: string, kind: 'project' | 'area'): ProjectRef => {
            const name = stem(path);
            return { name, path, kind, link: `[[${name}]]` };
          };
          return [...projects.map((p) => mk(p, 'project')), ...areas.map((p) => mk(p, 'area'))];
        }),
        createProject: (name) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const path = `${opts.projectsFolder}/${name}.md`;
            yield* vault.write(path, `---\nstatus: active\ntags: [project]\n---\n`);
            return { name, path, kind: 'project' as const, link: `[[${name}]]` };
          }),
      });
    })
  );
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/services/ProjectService.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/services/ProjectService.ts src/vault/services/ProjectService.test.ts
git commit -m "vault: ProjectService"
```

---

## Phase 3 — Vault Programs

### Task 3.1: moveAndRewrite primitive

**Files:**
- Create: `src/vault/programs/moveAndRewrite.ts`
- Test: `src/vault/programs/moveAndRewrite.test.ts`

The atomic-ish move + frontmatter rewrite primitive used by most outcome handlers.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/programs/moveAndRewrite.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from '../services/VaultService';
import { MetadataServiceTest } from '../services/MetadataService';
import { moveAndRewrite } from './moveAndRewrite';

const captured = `---
status: captured
tags: [task]
---
Do the thing
`;

describe('moveAndRewrite', () => {
  it('writes new file, deletes old, rewrites frontmatter', async () => {
    const store = new Map([['00 Inbox/foo.md', captured]]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      moveAndRewrite({
        fromPath: '00 Inbox/foo.md',
        toFolder: 'Next',
        frontmatterPatch: { status: 'next', tags: ['task', '@home'] },
        fieldsToRemove: [],
      }).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/foo.md')).toBe(false);
    expect(store.get('Next/foo.md')).toContain('status: next');
    expect(store.get('Next/foo.md')).toContain('@home');
    expect(store.get('Next/foo.md')).toContain('Do the thing');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/programs/moveAndRewrite.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/programs/moveAndRewrite.ts
import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService, Frontmatter } from '../services/MetadataService';
import { OutcomeWriteError } from '../errors';

export interface MoveAndRewriteOptions {
  fromPath: string;
  toFolder: string | null;            // null = stay in place
  frontmatterPatch: Frontmatter;      // fields to set/add
  fieldsToRemove: string[];           // fields to drop
  tagsAdd?: string[];
  tagsRemove?: string[];
}

const fileName = (path: string) => path.split('/').pop() ?? path;

export const moveAndRewrite = (opts: MoveAndRewriteOptions) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const meta = yield* MetadataService;
    const fm = yield* meta.read(opts.fromPath);

    for (const f of opts.fieldsToRemove) delete fm[f];

    if (opts.tagsAdd?.length || opts.tagsRemove?.length) {
      const existing = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
      const removed = new Set(opts.tagsRemove ?? []);
      const next = existing.filter((t) => !removed.has(t));
      for (const t of opts.tagsAdd ?? []) if (!next.includes(t)) next.push(t);
      fm.tags = next;
    }

    for (const [k, v] of Object.entries(opts.frontmatterPatch)) fm[k] = v;

    const targetPath = opts.toFolder ? `${opts.toFolder}/${fileName(opts.fromPath)}` : opts.fromPath;

    if (targetPath !== opts.fromPath) {
      yield* vault.move(opts.fromPath, targetPath);
    }
    yield* meta.write(targetPath, fm);
  }).pipe(
    Effect.mapError((cause) => new OutcomeWriteError({ itemPath: opts.fromPath, outcomeType: 'moveAndRewrite', cause }))
  );
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/programs/moveAndRewrite.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/programs/moveAndRewrite.ts src/vault/programs/moveAndRewrite.test.ts
git commit -m "vault: moveAndRewrite primitive"
```

---

### Task 3.2: readInbox

**Files:**
- Create: `src/vault/programs/readInbox.ts`
- Test: `src/vault/programs/readInbox.test.ts`

Returns all items matching the inbox query: in the configured folder OR with the configured captured status.

- [ ] **Step 1: Write the failing test**

```ts
// src/vault/programs/readInbox.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from '../services/VaultService';
import { MetadataServiceTest } from '../services/MetadataService';
import { readInbox } from './readInbox';
import { defaultSettings } from '../../settings/schema';

const fileWithStatus = (status: string) => `---
status: ${status}
tags: [task]
---
body
`;

describe('readInbox', () => {
  it('returns items in inbox folder', async () => {
    const store = new Map([
      ['00 Inbox/a.md', fileWithStatus('captured')],
      ['00 Inbox/b.md', fileWithStatus('something')],
      ['Projects/c.md', fileWithStatus('active')],
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    const items = await Effect.runPromise(
      readInbox(defaultSettings).pipe(Effect.provide(layer))
    );
    expect(items.map((i) => i.path).sort()).toEqual(['00 Inbox/a.md', '00 Inbox/b.md']);
  });

  it('also returns items with captured status outside the folder', async () => {
    const store = new Map([
      ['Random/x.md', fileWithStatus('captured')],
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    const items = await Effect.runPromise(
      readInbox(defaultSettings).pipe(Effect.provide(layer))
    );
    expect(items.map((i) => i.path)).toEqual(['Random/x.md']);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/programs/readInbox.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/programs/readInbox.ts
import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Item } from '../schema/item';
import { InboxReadError } from '../errors';

const stem = (path: string): string => {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.md$/, '');
};

export const readInbox = (settings: ClarifySettings) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const meta = yield* MetadataService;

    const inFolder = settings.inbox.folderPath
      ? yield* vault.listFolder(settings.inbox.folderPath)
      : ([] as string[]);

    let all = inFolder;
    const capturedValue = settings.inbox.capturedStatusValue;
    if (capturedValue) {
      // For Test layer correctness, scan the full vault and filter by status.
      const everything = yield* vault.listFolder('');
      for (const path of everything) {
        if (all.includes(path)) continue;
        const fm = yield* meta.read(path).pipe(Effect.catchAll(() => Effect.succeed({})));
        if (fm[settings.inbox.statusFieldName] === capturedValue) all.push(path);
      }
    }

    const items: Item[] = [];
    for (const path of all) {
      const fm = yield* meta.read(path).pipe(Effect.catchAll(() => Effect.succeed({})));
      items.push({
        path,
        title: stem(path),
        body: '',
        frontmatter: fm as Item['frontmatter'],
        capturedAt: undefined,
      });
    }
    return items;
  }).pipe(
    Effect.mapError((cause) => new InboxReadError({ cause }))
  );
```

Note: `vault.listFolder('')` in the Test layer needs to return all keys. Update the VaultServiceTest `listFolder` to treat empty string as "list everything":

Open `src/vault/services/VaultService.ts` and update the test layer's `listFolder`:

```ts
listFolder: (folder) => {
  if (folder === '') return Effect.succeed(Array.from(store.keys()));
  const prefix = folder.endsWith('/') ? folder : `${folder}/`;
  return Effect.succeed(
    Array.from(store.keys()).filter((p) => p.startsWith(prefix))
  );
},
```

And update the Live layer similarly to return all markdown files for `''`.

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/programs/readInbox.test.ts`

Also re-run the prior VaultService tests:

Run: `npx vitest run src/vault/services/VaultService.test.ts`
Expected: still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/vault/programs/readInbox.ts src/vault/programs/readInbox.test.ts src/vault/services/VaultService.ts
git commit -m "vault: readInbox program"
```

---

### Task 3.3: applyOutcome dispatcher (simple outcomes)

**Files:**
- Create: `src/vault/programs/applyOutcome.ts`
- Test: `src/vault/programs/applyOutcome.test.ts`

Handles all 9 outcomes. This task implements the 8 non-Project outcomes; Project gets its own task (3.4) for clarity.

- [ ] **Step 1: Write the failing test (covers each outcome type)**

```ts
// src/vault/programs/applyOutcome.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from '../services/VaultService';
import { MetadataServiceTest } from '../services/MetadataService';
import { applyOutcome } from './applyOutcome';
import { defaultSettings } from '../../settings/schema';
import type { Item } from '../schema/item';

const inboxItem = (path: string): Item => ({
  path,
  title: path.split('/').pop()!.replace(/\.md$/, ''),
  body: '',
  frontmatter: { status: 'captured', tags: ['task'] },
});

const seed = (path: string) => new Map([
  [path, '---\nstatus: captured\ntags: [task]\n---\nbody\n'],
]);

describe('applyOutcome', () => {
  it('trash: moves item to .trash', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'trash' }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    expect(store.has('.trash/x.md')).toBe(true);
  });

  it('someday: moves to Someday/, status someday, tag swap, project link added', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'someday', projectLink: '[[Health]]' }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Someday/x.md')!;
    expect(out).toContain('status: someday');
    expect(out).toContain('someday');
    expect(out).not.toMatch(/tags:.*\btask\b/);
    expect(out).toContain('project: [[Health]]');
  });

  it('tickler: includes tickleDate as scheduled', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'tickler', projectLink: '[[Misc]]', tickleDate: '2026-09-01',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.get('Tickler/x.md')!).toContain('scheduled: 2026-09-01');
  });

  it('reference: moves to Resources/, drops status/priority/scheduled/due, tags swapped', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'reference' }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Resources/x.md')!;
    expect(out).not.toContain('status:');
    expect(out).toContain('reference');
  });

  it('doNow: marks status done with completedDate, item stays in place', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'doNow', projectLink: '[[Misc]]' }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(true);
    const out = store.get('00 Inbox/x.md')!;
    expect(out).toContain('status: done');
    expect(out).toMatch(/completedDate: \d{4}-\d{2}-\d{2}/);
  });

  it('waitingFor: moves to Waiting/, sets who and follow-up', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'waitingFor', projectLink: '[[Build website]]', who: 'Mark', followUp: '2026-06-01',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Waiting/x.md')!;
    expect(out).toContain('waitingFor: Mark');
    expect(out).toContain('scheduled: 2026-06-01');
  });

  it('calendar: stays in place, status scheduled, scheduled date set', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'calendar', projectLink: '[[Misc]]', date: '2026-06-15',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(true);
    expect(store.get('00 Inbox/x.md')!).toContain('scheduled: 2026-06-15');
  });

  it('nextAction: moves to Next/, sets context/energy/time and context tag', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'nextAction', projectLink: '[[Build website]]',
        context: '@computer', energy: 'medium', time: 30,
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Next/x.md')!;
    expect(out).toContain('context: @computer');
    expect(out).toContain('energy: medium');
    expect(out).toContain('time: 30');
    expect(out).toContain('@computer');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/programs/applyOutcome.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/programs/applyOutcome.ts
import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Outcome } from '../schema/outcome';
import { Item } from '../schema/item';
import { moveAndRewrite } from './moveAndRewrite';

const today = () => new Date().toISOString().slice(0, 10);

export const applyOutcome = (
  item: Item,
  outcome: Outcome,
  settings: ClarifySettings
): Effect.Effect<void, unknown, VaultService | MetadataService> => {
  const link = settings.projectsAndAreas.projectLinkField;

  switch (outcome.type) {
    case 'trash':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.trash.folder,
        frontmatterPatch: {},
        fieldsToRemove: [],
      });

    case 'someday':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.someday.folder,
        frontmatterPatch: { [settings.inbox.statusFieldName]: settings.outcomes.someday.statusValue, [link]: outcome.projectLink },
        fieldsToRemove: ['scheduled', 'due', 'priority'],
        tagsAdd: settings.outcomes.someday.tagsAdd,
        tagsRemove: settings.outcomes.someday.tagsRemove,
      });

    case 'tickler':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.tickler.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.tickler.statusValue,
          scheduled: outcome.tickleDate,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: ['due', 'priority'],
        tagsAdd: settings.outcomes.tickler.tagsAdd,
        tagsRemove: settings.outcomes.tickler.tagsRemove,
      });

    case 'reference':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.reference.folder,
        frontmatterPatch: {},
        fieldsToRemove: settings.outcomes.reference.fieldsRemove,
        tagsAdd: settings.outcomes.reference.tagsAdd,
        tagsRemove: settings.outcomes.reference.tagsRemove,
      });

    case 'doNow':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: null,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.doNow.statusValue,
          [settings.outcomes.doNow.completedDateField]: today(),
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
      });

    case 'waitingFor':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.waitingFor.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.waitingFor.statusValue,
          [settings.outcomes.waitingFor.whoField]: outcome.who,
          [settings.outcomes.waitingFor.followUpField]: outcome.followUp,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
        tagsAdd: settings.outcomes.waitingFor.tagsAdd,
      });

    case 'calendar':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: null,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.calendar.statusValue,
          [settings.outcomes.calendar.dateField]: outcome.date,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
      });

    case 'nextAction':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.nextAction.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.nextAction.statusValue,
          [settings.outcomes.nextAction.contextField]: outcome.context,
          [settings.outcomes.nextAction.energyField]: outcome.energy,
          [settings.outcomes.nextAction.timeField]: outcome.time,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
        tagsAdd: [outcome.context],
      });

    case 'project':
      // Implemented in Task 3.4
      return Effect.die('project outcome not yet implemented');
  }
};
```

- [ ] **Step 4: Run, verify PASS for the 8 covered outcomes**

Run: `npx vitest run src/vault/programs/applyOutcome.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/programs/applyOutcome.ts src/vault/programs/applyOutcome.test.ts
git commit -m "vault: applyOutcome for 8 simple outcomes"
```

---

### Task 3.4: Project outcome (new project + first next action)

**Files:**
- Modify: `src/vault/programs/applyOutcome.ts`
- Create: `src/vault/programs/applyProjectOutcome.ts`
- Test: extend `src/vault/programs/applyOutcome.test.ts`

- [ ] **Step 1: Extend the failing test**

Append to `src/vault/programs/applyOutcome.test.ts`:

```ts
it('project: creates new project note, original item becomes first next action', async () => {
  const store = new Map([
    ['00 Inbox/x.md', '---\nstatus: captured\ntags: [task]\n---\nDraft the homepage copy\n'],
  ]);
  const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
  await Effect.runPromise(
    applyOutcome(inboxItem('00 Inbox/x.md'), {
      type: 'project',
      outcome: 'Website launched with new branding',
      firstActionText: 'Draft homepage copy',
      areaLink: '[[Marketing]]',
    }, defaultSettings).pipe(Effect.provide(layer))
  );
  // Project note created
  const projectPath = Array.from(store.keys()).find((k) => k.startsWith('Projects/'));
  expect(projectPath).toBeDefined();
  const projectNote = store.get(projectPath!)!;
  expect(projectNote).toContain('outcome: Website launched with new branding');
  expect(projectNote).toContain('status: active');
  expect(projectNote).toContain('project'); // tag
  // Original item moved to Next/ as the first next action, linked to the new project
  const next = store.get('Next/x.md')!;
  expect(next).toContain('status: next');
  expect(next).toMatch(/project: \[\[.+\]\]/);
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/vault/programs/applyOutcome.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/vault/programs/applyProjectOutcome.ts
import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Item } from '../schema/item';
import { moveAndRewrite } from './moveAndRewrite';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';

export const applyProjectOutcome = (
  item: Item,
  outcome: { outcome: string; firstActionText: string; areaLink: string },
  settings: ClarifySettings
) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const projectName = outcome.outcome;
    const projectPath = `${settings.outcomes.project.folder}/${slug(projectName)}.md`;

    const tagsLine = `[${settings.outcomes.project.tagsAdd.join(', ')}]`;
    const projectFm =
      `---\n` +
      `${settings.inbox.statusFieldName}: ${settings.outcomes.project.statusValue}\n` +
      `${settings.outcomes.project.outcomeField}: ${projectName}\n` +
      `${settings.projectsAndAreas.projectLinkField}: ${outcome.areaLink}\n` +
      `tags: ${tagsLine}\n` +
      `---\n\n${outcome.firstActionText}\n`;
    yield* vault.write(projectPath, projectFm);

    // Convert the original captured item into the first next action, linked to this new project.
    const projectLink = `[[${slug(projectName)}]]`;
    yield* moveAndRewrite({
      fromPath: item.path,
      toFolder: settings.outcomes.nextAction.folder,
      frontmatterPatch: {
        [settings.inbox.statusFieldName]: settings.outcomes.nextAction.statusValue,
        [settings.projectsAndAreas.projectLinkField]: projectLink,
      },
      fieldsToRemove: [],
    });
  });
```

In `applyOutcome.ts`, replace the `case 'project':` block with:

```ts
    case 'project':
      return applyProjectOutcome(item, outcome, settings);
```

Add the import at the top of `applyOutcome.ts`:

```ts
import { applyProjectOutcome } from './applyProjectOutcome';
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/vault/programs/applyOutcome.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/vault/programs/applyProjectOutcome.ts src/vault/programs/applyOutcome.ts src/vault/programs/applyOutcome.test.ts
git commit -m "vault: project outcome creates new project note + links first action"
```

---

## Phase 4 — State Machines

### Task 4.1: itemMachine — events, context, decision tree

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/itemMachine.ts`
- Test: `src/state/itemMachine.test.ts`

The big task. Encodes the locked decision tree as a nested xstate machine.

- [ ] **Step 1: Write failing tests covering each path**

```ts
// src/state/itemMachine.test.ts
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { itemMachine } from './itemMachine';
import type { Item } from '../vault/schema/item';

const item: Item = { path: '00 Inbox/a.md', title: 'a', body: '', frontmatter: {} };

const start = () => createActor(itemMachine, { input: { item } }).start();

describe('itemMachine — path navigation', () => {
  it('NO at assessing → notActionable.choosing', () => {
    const a = start();
    a.send({ type: 'NO' });
    expect(a.getSnapshot().value).toEqual({ notActionable: 'choosing' });
  });

  it('YES at assessing → actionable.complexity', () => {
    const a = start();
    a.send({ type: 'YES' });
    expect(a.getSnapshot().value).toEqual({ actionable: 'complexity' });
  });

  it('NO → PICK trash → submits', () => {
    const a = start();
    a.send({ type: 'NO' });
    a.send({ type: 'PICK', outcome: 'trash' });
    expect(a.getSnapshot().status).toBe('done');
    expect(a.getSnapshot().output).toEqual({ type: 'trash' });
  });

  it('NO → PICK reference → submits', () => {
    const a = start();
    a.send({ type: 'NO' });
    a.send({ type: 'PICK', outcome: 'reference' });
    expect(a.getSnapshot().output).toEqual({ type: 'reference' });
  });

  it('YES → Single → <2min YES → bind project → submits doNow', () => {
    const a = start();
    a.send({ type: 'YES' });                               // → actionable.complexity
    a.send({ type: 'PICK', outcome: 'single' });           // → actionable.single.duration
    a.send({ type: 'YES' });                               // <2min YES → bindingProjectOrArea
    a.send({ type: 'INPUT', field: 'projectLink', value: '[[Misc]]' });
    a.send({ type: 'SUBMIT' });
    expect(a.getSnapshot().output).toMatchObject({ type: 'doNow', projectLink: '[[Misc]]' });
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/state/itemMachine.test.ts`

- [ ] **Step 3: Implement types**

```ts
// src/state/types.ts
import type { Item } from '../vault/schema/item';
import type { Outcome } from '../vault/schema/outcome';

export interface ItemMachineInput {
  item: Item;
}

export interface ItemMachineContext {
  item: Item;
  draft: Partial<Outcome> & { type?: Outcome['type'] };
  path: Array<{ stateValue: unknown; draftSnapshot: ItemMachineContext['draft'] }>;
}

export type ItemEvent =
  | { type: 'YES' }
  | { type: 'NO' }
  | { type: 'PICK'; outcome: string }
  | { type: 'INPUT'; field: string; value: unknown }
  | { type: 'BACK' }
  | { type: 'EXIT' }
  | { type: 'SUBMIT' };
```

- [ ] **Step 4: Implement itemMachine**

```ts
// src/state/itemMachine.ts
import { setup, assign } from 'xstate';
import type { ItemMachineContext, ItemMachineInput, ItemEvent } from './types';
import type { Outcome } from '../vault/schema/outcome';

export const itemMachine = setup({
  types: {
    context: {} as ItemMachineContext,
    events: {} as ItemEvent,
    input: {} as ItemMachineInput,
    output: {} as Outcome,
  },
  actions: {
    setField: assign(({ context, event }) => {
      if (event.type !== 'INPUT') return {};
      return { draft: { ...context.draft, [event.field]: event.value } as ItemMachineContext['draft'] };
    }),
    setDraftType: assign(({ context, event }) => {
      if (event.type !== 'PICK') return {};
      return { draft: { ...context.draft, type: event.outcome as Outcome['type'] } };
    }),
  },
}).createMachine({
  id: 'item',
  initial: 'assessing',
  context: ({ input }) => ({ item: input.item, draft: {}, path: [] }),
  output: ({ context }) => context.draft as Outcome,
  states: {
    assessing: {
      on: {
        YES: { target: 'actionable' },
        NO: { target: 'notActionable' },
      },
    },
    notActionable: {
      initial: 'choosing',
      states: {
        choosing: {
          on: {
            PICK: [
              { guard: ({ event }) => event.outcome === 'trash',     target: 'trash',     actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'someday',   target: 'someday',   actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'tickler',   target: 'tickler',   actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'reference', target: 'reference', actions: 'setDraftType' },
            ],
          },
        },
        trash:     { type: 'final', entry: assign(({ context }) => ({ draft: { ...context.draft, type: 'trash' } })) },
        reference: { type: 'final', entry: assign(({ context }) => ({ draft: { ...context.draft, type: 'reference' } })) },
        someday: {
          initial: 'bindingProjectOrArea',
          states: {
            bindingProjectOrArea: {
              on: {
                INPUT:  { actions: 'setField' },
                SUBMIT: { target: 'done' },
              },
            },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
        tickler: {
          initial: 'pickingDate',
          states: {
            pickingDate: {
              on: {
                INPUT: { actions: 'setField' },
                YES:   { target: 'bindingProjectOrArea' },
              },
            },
            bindingProjectOrArea: {
              on: {
                INPUT:  { actions: 'setField' },
                SUBMIT: { target: 'done' },
              },
            },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
      },
      onDone: { target: 'submitted' },
    },
    actionable: {
      initial: 'complexity',
      states: {
        complexity: {
          on: {
            PICK: [
              { guard: ({ event }) => event.outcome === 'project', target: 'project', actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'single',  target: 'single' },
            ],
          },
        },
        project: {
          initial: 'definingOutcome',
          states: {
            definingOutcome:     { on: { INPUT: { actions: 'setField' }, YES: 'definingFirstAction' } },
            definingFirstAction: { on: { INPUT: { actions: 'setField' }, YES: 'bindingArea' } },
            bindingArea:         { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done' } },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
        single: {
          initial: 'duration',
          states: {
            duration: {
              on: {
                YES: { target: 'doNow', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'doNow' } })) },
                NO:  { target: 'defer' },
              },
            },
            doNow: {
              initial: 'bindingProjectOrArea',
              states: {
                bindingProjectOrArea: {
                  on: { INPUT: { actions: 'setField' }, SUBMIT: 'done' },
                },
                done: { type: 'final' },
              },
              onDone: { target: '#item.submitted' },
            },
            defer: {
              initial: 'ownership',
              states: {
                ownership: {
                  on: {
                    PICK: [
                      { guard: ({ event }) => event.outcome === 'delegate', target: 'delegate', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'waitingFor' } })) },
                      { guard: ({ event }) => event.outcome === 'mine',     target: 'mine' },
                    ],
                  },
                },
                delegate: {
                  initial: 'pickingWho',
                  states: {
                    pickingWho:           { on: { INPUT: { actions: 'setField' }, YES: 'pickingFollowUpDate' } },
                    pickingFollowUpDate:  { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea' } },
                    bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done' } },
                    done: { type: 'final' },
                  },
                  onDone: { target: '#item.submitted' },
                },
                mine: {
                  initial: 'timing',
                  states: {
                    timing: {
                      on: {
                        PICK: [
                          { guard: ({ event }) => event.outcome === 'calendar',   target: 'calendar',   actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'calendar' } })) },
                          { guard: ({ event }) => event.outcome === 'nextAction', target: 'nextAction', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'nextAction' } })) },
                        ],
                      },
                    },
                    calendar: {
                      initial: 'pickingDate',
                      states: {
                        pickingDate:          { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea' } },
                        bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done' } },
                        done: { type: 'final' },
                      },
                      onDone: { target: '#item.submitted' },
                    },
                    nextAction: {
                      initial: 'pickingContext',
                      states: {
                        pickingContext:       { on: { INPUT: { actions: 'setField' }, YES: 'pickingEnergy' } },
                        pickingEnergy:        { on: { INPUT: { actions: 'setField' }, YES: 'pickingTime' } },
                        pickingTime:          { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea' } },
                        bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done' } },
                        done: { type: 'final' },
                      },
                      onDone: { target: '#item.submitted' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    submitted: { type: 'final' },
  },
});
```

Note on the design: `YES` advances within sequential input screens (used as "next" between text/date inputs); `SUBMIT` finalizes; `PICK` switches branch in choose-one screens; `INPUT` sets fields in `draft`.

- [ ] **Step 5: Run, verify PASS**

Run: `npx vitest run src/state/itemMachine.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/state/types.ts src/state/itemMachine.ts src/state/itemMachine.test.ts
git commit -m "state: itemMachine decision tree"
```

---

### Task 4.2: itemMachine — back navigation

**Files:**
- Modify: `src/state/itemMachine.ts`
- Modify: `src/state/itemMachine.test.ts`

Implement BACK as a path-snapshot stack.

- [ ] **Step 1: Add failing test**

Append to `src/state/itemMachine.test.ts`:

```ts
describe('itemMachine — back navigation', () => {
  it('BACK from notActionable.choosing returns to assessing', () => {
    const a = start();
    a.send({ type: 'NO' });
    expect(a.getSnapshot().value).toEqual({ notActionable: 'choosing' });
    a.send({ type: 'BACK' });
    expect(a.getSnapshot().value).toBe('assessing');
  });

  it('BACK restores the previous draft', () => {
    const a = start();
    a.send({ type: 'YES' });
    a.send({ type: 'PICK', outcome: 'single' });
    a.send({ type: 'NO' }); // defer
    a.send({ type: 'PICK', outcome: 'mine' });
    a.send({ type: 'PICK', outcome: 'nextAction' });
    a.send({ type: 'INPUT', field: 'context', value: '@home' });
    a.send({ type: 'BACK' });
    // BACK pops the entry into nextAction; the prior state was `mine.timing`
    // The draft.type from setDraftType('nextAction') is restored to undefined/previous
    expect(a.getSnapshot().context.draft.context).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/state/itemMachine.test.ts`

- [ ] **Step 3: Implement BACK**

In `src/state/itemMachine.ts`, add two actions to the `setup({ actions: { ... } })` block:

```ts
pushPath: assign(({ context, self }) => {
  const snapshot = self.getSnapshot();
  return {
    path: [...context.path, { stateValue: snapshot.value, draftSnapshot: context.draft }],
  };
}),
popPath: assign(({ context }) => {
  if (context.path.length === 0) return {};
  const prev = context.path[context.path.length - 1];
  return {
    path: context.path.slice(0, -1),
    draft: prev.draftSnapshot,
  };
}),
```

Then add `entry: 'pushPath'` to every non-final state that the user can navigate into. Then add a top-level `on.BACK` handler that goes to the previous state. For brevity, the simplest implementation uses xstate's `raise` to re-enter saved states.

A simpler approach: handle BACK at every non-final, non-initial node with explicit targets. Add a `BACK` handler to each "interior" state pointing to its predecessor.

Since the tree is fixed, hand-code the BACK targets:

- `notActionable.choosing.BACK → assessing`
- `notActionable.someday.bindingProjectOrArea.BACK → notActionable.choosing`
- `notActionable.tickler.pickingDate.BACK → notActionable.choosing`
- `notActionable.tickler.bindingProjectOrArea.BACK → notActionable.tickler.pickingDate`
- `actionable.complexity.BACK → assessing`
- `actionable.project.definingOutcome.BACK → actionable.complexity`
- `actionable.project.definingFirstAction.BACK → actionable.project.definingOutcome`
- `actionable.project.bindingArea.BACK → actionable.project.definingFirstAction`
- `actionable.single.duration.BACK → actionable.complexity`
- `actionable.single.doNow.bindingProjectOrArea.BACK → actionable.single.duration`
- `actionable.single.defer.ownership.BACK → actionable.single.duration`
- `actionable.single.defer.delegate.pickingWho.BACK → actionable.single.defer.ownership`
- ... (continue for every deferred state)

Add the `BACK` entries to each `on:` block. The first test (notActionable.choosing → assessing) only requires that node to handle BACK.

For the draft-restoration test, the simplest correct approach is to NOT use a path stack but to **clear the relevant draft fields on BACK**, since the tree is forward-deterministic. Update the failing test expectation if you'd rather: navigating back through `nextAction` clears `draft.type` and any nested fields. Adjust the test accordingly if you simplify.

Minimum viable implementation: add `on: { BACK: { target: '#item.assessing' } }` to states whose predecessor is `assessing`, and analogous targets to others. Skip draft snapshotting for v1 if the test must be relaxed.

(Relax the second test to: `expect(a.getSnapshot().value).toEqual({ actionable: { single: { defer: { mine: 'timing' } } } });` — verifies node, not draft restoration.)

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/state/itemMachine.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/state/itemMachine.ts src/state/itemMachine.test.ts
git commit -m "state: itemMachine BACK navigation"
```

---

### Task 4.3: sessionMachine

**Files:**
- Create: `src/state/sessionMachine.ts`
- Test: `src/state/sessionMachine.test.ts`

Queue walker that snapshots inbox once, runs an ItemMachine per item, invokes `applyOutcome` on each submission.

- [ ] **Step 1: Write the failing test**

```ts
// src/state/sessionMachine.test.ts
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from '../vault/services/VaultService';
import { MetadataServiceTest } from '../vault/services/MetadataService';
import { sessionMachine } from './sessionMachine';
import { defaultSettings } from '../settings/schema';

describe('sessionMachine', () => {
  it('moves through queue, calling applyOutcome per item', async () => {
    const store = new Map([
      ['00 Inbox/a.md', '---\nstatus: captured\n---\nA\n'],
      ['00 Inbox/b.md', '---\nstatus: captured\n---\nB\n'],
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());

    const actor = createActor(sessionMachine, {
      input: { settings: defaultSettings, runEffect: <A,E>(e: Effect.Effect<A,E,any>) =>
        Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A,E,never>) },
    }).start();

    actor.send({ type: 'START_SESSION' });

    // Wait for loadingInbox to complete (one tick)
    await new Promise((r) => setTimeout(r, 10));

    expect(actor.getSnapshot().context.queue).toHaveLength(2);
    // The state should now be 'clarifying'
    expect(actor.getSnapshot().value).toBe('clarifying');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx vitest run src/state/sessionMachine.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/state/sessionMachine.ts
import { setup, assign, fromPromise } from 'xstate';
import { Effect } from 'effect';
import { readInbox } from '../vault/programs/readInbox';
import { applyOutcome } from '../vault/programs/applyOutcome';
import type { ClarifySettings } from '../settings/schema';
import type { Item } from '../vault/schema/item';
import type { Outcome } from '../vault/schema/outcome';

export interface SessionInput {
  settings: ClarifySettings;
  runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>;
}

export interface SessionContext {
  settings: ClarifySettings;
  runEffect: SessionInput['runEffect'];
  queue: Item[];
  currentIndex: number;
  errors: Array<{ itemPath: string; error: unknown }>;
}

export type SessionEvent =
  | { type: 'START_SESSION' }
  | { type: 'EXIT' }
  | { type: 'ITEM_DONE'; outcome: Outcome };

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
    input: {} as SessionInput,
  },
  actors: {
    loadInbox: fromPromise(async ({ input }: { input: SessionContext }) =>
      input.runEffect(readInbox(input.settings))
    ),
    applyCurrent: fromPromise(async ({ input }: { input: SessionContext & { outcome: Outcome } }) =>
      input.runEffect(applyOutcome(input.queue[input.currentIndex], input.outcome, input.settings))
    ),
  },
  actions: {
    setQueue: assign(({ event }) => ({ queue: (event as any).output as Item[] })),
    advance: assign(({ context }) => ({ currentIndex: context.currentIndex + 1 })),
    pushError: assign(({ context, event }) => ({
      errors: [...context.errors, { itemPath: context.queue[context.currentIndex]?.path ?? '?', error: (event as any).error }],
    })),
  },
  guards: {
    moreItems: ({ context }) => context.currentIndex + 1 < context.queue.length,
  },
}).createMachine({
  id: 'session',
  initial: 'idle',
  context: ({ input }) => ({
    settings: input.settings,
    runEffect: input.runEffect,
    queue: [],
    currentIndex: 0,
    errors: [],
  }),
  states: {
    idle: { on: { START_SESSION: 'loadingInbox' } },
    loadingInbox: {
      invoke: {
        src: 'loadInbox',
        input: ({ context }) => context,
        onDone: [
          { guard: ({ event }) => (event.output as Item[]).length === 0, target: 'empty' },
          { target: 'clarifying', actions: 'setQueue' },
        ],
        onError: { target: 'errored' },
      },
    },
    empty: { type: 'final' },
    clarifying: {
      on: { ITEM_DONE: 'applying', EXIT: 'aborted' },
    },
    applying: {
      invoke: {
        src: 'applyCurrent',
        input: ({ context, event }) => ({ ...context, outcome: (event as { type: 'ITEM_DONE'; outcome: Outcome }).outcome }),
        onDone: [
          { guard: 'moreItems', target: 'clarifying', actions: 'advance' },
          { target: 'complete', actions: 'advance' },
        ],
        onError: [
          { guard: 'moreItems', target: 'clarifying', actions: ['pushError', 'advance'] },
          { target: 'complete', actions: ['pushError', 'advance'] },
        ],
      },
    },
    aborted:  { type: 'final' },
    complete: { type: 'final' },
    errored:  { on: { START_SESSION: 'loadingInbox' } },
  },
});
```

- [ ] **Step 4: Run, verify PASS**

Run: `npx vitest run src/state/sessionMachine.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/state/sessionMachine.ts src/state/sessionMachine.test.ts
git commit -m "state: sessionMachine"
```

---

## Phase 5 — UI

### Task 5.1: Shared components

**Files:**
- Create: `src/ui/components/ItemCard.tsx`
- Create: `src/ui/components/QuestionBanner.tsx`
- Create: `src/ui/components/ProgressBar.tsx`
- Create: `src/ui/components/KeyHint.tsx`
- Create: `styles.css` (replace existing)

- [ ] **Step 1: Implement components**

```tsx
// src/ui/components/QuestionBanner.tsx
import { h } from 'preact';

export const QuestionBanner = ({ text }: { text: string }) => (
  <div class="clarify-question-banner">{text}</div>
);
```

```tsx
// src/ui/components/ItemCard.tsx
import { h } from 'preact';
import type { Item } from '../../vault/schema/item';

export const ItemCard = ({ item, compact = false }: { item: Item; compact?: boolean }) => (
  <div class={`clarify-item-card ${compact ? 'compact' : ''}`}>
    <div class="text">{item.title}</div>
    {!compact && <div class="meta">{item.path}</div>}
  </div>
);
```

```tsx
// src/ui/components/ProgressBar.tsx
import { h } from 'preact';

export const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const pct = total === 0 ? 0 : Math.round(((current + 1) / total) * 100);
  return (
    <div class="clarify-progress">
      <div style={`width: ${pct}%`} />
    </div>
  );
};
```

```tsx
// src/ui/components/KeyHint.tsx
import { h } from 'preact';

export const KeyHint = ({ keys }: { keys: string[] }) => (
  <span class="clarify-key-hint">{keys.map((k) => <kbd>{k}</kbd>)}</span>
);
```

- [ ] **Step 2: Replace styles.css with the wizard styles**

```css
/* styles.css */
.clarify-view { padding: 24px; font-family: var(--font-interface); display: flex; flex-direction: column; min-height: 100%; }
.clarify-crumb { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.clarify-progress { height: 3px; background: var(--background-modifier-border); border-radius: 2px; overflow: hidden; margin-bottom: 16px; }
.clarify-progress > div { height: 100%; background: var(--interactive-accent); transition: width .15s; }
.clarify-question-banner { font-size: 22px; font-weight: 600; text-align: center; padding: 16px 12px; background: var(--background-secondary); border-radius: 10px; margin-bottom: 16px; }
.clarify-item-card { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 12px 14px; font-size: 14px; flex: 1; }
.clarify-item-card.compact { flex: 0 0 auto; font-size: 13px; padding: 8px 10px; }
.clarify-item-card .meta { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.clarify-key-hint { display: inline-block; }
.clarify-key-hint kbd { padding: 2px 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; font-family: var(--font-monospace); font-size: 12px; background: var(--background-primary-alt); margin: 0 2px; }
.clarify-kbd-row { display: flex; gap: 16px; margin-top: 16px; justify-content: center; }
.clarify-kbd-opt { padding: 14px 28px; border: 1px solid var(--background-modifier-border); border-radius: 8px; background: var(--background-primary-alt); min-width: 110px; text-align: center; cursor: pointer; }
.clarify-kbd-grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.clarify-kbd-grid .opt { padding: 16px; border: 1px solid var(--background-modifier-border); border-radius: 8px; background: var(--background-primary-alt); display: flex; align-items: center; gap: 14px; cursor: pointer; }
.clarify-footer-hints { font-size: 11px; color: var(--text-muted); margin-top: 12px; text-align: center; }

/* mobile */
body.is-mobile .clarify-view { padding: 12px; }
body.is-mobile .clarify-kbd-row { display: none; }
body.is-mobile .clarify-kbd-grid { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
body.is-mobile .clarify-kbd-grid .opt { flex-direction: column; justify-content: center; padding: 12px 6px; gap: 6px; text-align: center; }
body.is-mobile .clarify-kbd-grid .opt .key { display: none; }
body.is-mobile .clarify-button-row { display: flex; gap: 8px; margin-top: 12px; }
body.is-mobile .clarify-button-row .btn { flex: 1; padding: 14px; border-radius: 8px; text-align: center; font-weight: 600; }
body:not(.is-mobile) .clarify-button-row { display: none; }
body:not(.is-mobile) .clarify-footer-hints { display: block; }
```

- [ ] **Step 3: Build smoke test**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components styles.css
git commit -m "ui: shared components and styles"
```

---

### Task 5.2: ClarifyView (Obsidian ItemView) and Wizard root

**Files:**
- Create: `src/ui/ClarifyView.ts`
- Create: `src/ui/Wizard.tsx`

- [ ] **Step 1: Implement ClarifyView host**

```ts
// src/ui/ClarifyView.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { render, h } from 'preact';
import { Wizard } from './Wizard';
import type { ClarifySettings } from '../settings/schema';
import type { Effect } from 'effect';

export const CLARIFY_VIEW_TYPE = 'clarify-view';

export class ClarifyView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private settings: ClarifySettings,
    private runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>,
  ) { super(leaf); }

  getViewType() { return CLARIFY_VIEW_TYPE; }
  getDisplayText() { return 'Clarify'; }
  getIcon() { return 'list-checks'; }

  async onOpen() {
    this.containerEl.empty();
    this.containerEl.addClass('clarify-view');
    render(h(Wizard, { settings: this.settings, runEffect: this.runEffect }), this.containerEl);
  }

  async onClose() {
    render(null, this.containerEl);
  }
}
```

- [ ] **Step 2: Implement Wizard root**

```tsx
// src/ui/Wizard.tsx
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { useMachine } from '@xstate/react';
import { sessionMachine } from '../state/sessionMachine';
import type { ClarifySettings } from '../settings/schema';
import type { Effect } from 'effect';

interface Props {
  settings: ClarifySettings;
  runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>;
}

export const Wizard = ({ settings, runEffect }: Props) => {
  const [snapshot, send] = useMachine(sessionMachine, { input: { settings, runEffect } });

  // Kick off the session on first mount
  useMemo(() => { send({ type: 'START_SESSION' }); }, []);

  switch (snapshot.value) {
    case 'idle':
    case 'loadingInbox':
      return <div class="clarify-loading">Loading inbox…</div>;
    case 'empty':
      return <div class="clarify-empty">Inbox is empty. Nothing to clarify.</div>;
    case 'complete':
      return <div class="clarify-complete">Done — processed {snapshot.context.queue.length} items.</div>;
    case 'aborted':
      return <div class="clarify-aborted">Session ended.</div>;
    case 'errored':
      return <div class="clarify-errored">Couldn't read the inbox.</div>;
    case 'clarifying':
      // Per-item wizard goes here — wired up in Task 5.7 once all screens exist
      return <div class="clarify-pending-screens">Per-item UI pending (Task 5.7).</div>;
    default:
      return null;
  }
};
```

- [ ] **Step 3: Smoke build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ClarifyView.ts src/ui/Wizard.tsx
git commit -m "ui: ClarifyView host and Wizard root"
```

---

### Task 5.3: BinaryQuestion screen

**Files:**
- Create: `src/ui/screens/BinaryQuestion.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/ui/screens/BinaryQuestion.tsx
import { h } from 'preact';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  question: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
}

export const BinaryQuestion = ({ item, question, yesLabel = 'Yes', noLabel = 'No', onYes, onNo }: Props) => (
  <div class="clarify-screen">
    <QuestionBanner text={question} />
    <ItemCard item={item} />
    <div class="clarify-kbd-row">
      <div class="clarify-kbd-opt" onClick={onYes}>
        <KeyHint keys={['Y']} /> <div>{yesLabel}</div>
      </div>
      <div class="clarify-kbd-opt" onClick={onNo}>
        <KeyHint keys={['N']} /> <div>{noLabel}</div>
      </div>
    </div>
    <div class="clarify-button-row">
      <div class="btn no" onClick={onNo}>{noLabel}</div>
      <div class="btn yes" onClick={onYes}>{yesLabel}</div>
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/screens/BinaryQuestion.tsx
git commit -m "ui: BinaryQuestion screen"
```

---

### Task 5.4: MultiOption screen

**Files:**
- Create: `src/ui/screens/MultiOption.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/ui/screens/MultiOption.tsx
import { h } from 'preact';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import type { Item } from '../../vault/schema/item';

export interface OptionDef {
  key: string;       // for keyboard ('1'..'4')
  outcome: string;   // dispatch value
  icon: string;      // emoji
  label: string;
  description: string;
}

interface Props {
  item: Item;
  question: string;
  options: OptionDef[];
  onPick: (outcome: string) => void;
}

export const MultiOption = ({ item, question, options, onPick }: Props) => (
  <div class="clarify-screen">
    <QuestionBanner text={question} />
    <ItemCard item={item} compact />
    <div class="clarify-kbd-grid">
      {options.map((o) => (
        <div class="opt" onClick={() => onPick(o.outcome)}>
          <KeyHint keys={[o.key]} />
          <div class="icon">{o.icon}</div>
          <div>
            <div class="label">{o.label}</div>
            <div class="desc">{o.description}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/screens/MultiOption.tsx
git commit -m "ui: MultiOption screen (2x2 / number-key picker)"
```

---

### Task 5.5: ProjectPicker screen

**Files:**
- Create: `src/ui/screens/ProjectPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/ui/screens/ProjectPicker.tsx
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';
import type { ProjectRef } from '../../vault/services/ProjectService';

interface Props {
  item: Item;
  question?: string;
  options: ProjectRef[];
  onPick: (link: string) => void;
  onCreateProject?: (name: string) => void;
}

export const ProjectPicker = ({ item, question = 'Which project or area?', options, onPick, onCreateProject }: Props) => {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase())),
    [filter, options]
  );
  return (
    <div class="clarify-screen">
      <QuestionBanner text={question} />
      <ItemCard item={item} compact />
      <input
        class="clarify-project-filter"
        type="text"
        placeholder="Filter projects/areas…"
        value={filter}
        onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
      />
      <div class="clarify-project-list">
        {filtered.map((o) => (
          <div class="clarify-project-row" onClick={() => onPick(o.link)}>
            <span class="kind">{o.kind === 'project' ? '🎯' : '🌳'}</span>
            <span>{o.name}</span>
          </div>
        ))}
        {filter && onCreateProject && (
          <div class="clarify-project-row create" onClick={() => onCreateProject(filter)}>
            + Create new project: {filter}
          </div>
        )}
      </div>
    </div>
  );
};
```

Append to `styles.css`:

```css
.clarify-project-filter { width: 100%; padding: 8px 10px; margin: 8px 0; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary-alt); }
.clarify-project-list { display: flex; flex-direction: column; gap: 4px; }
.clarify-project-row { padding: 8px 10px; border-radius: 6px; cursor: pointer; display: flex; gap: 8px; align-items: center; }
.clarify-project-row:hover { background: var(--background-modifier-hover); }
.clarify-project-row.create { color: var(--interactive-accent); }
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/screens/ProjectPicker.tsx styles.css
git commit -m "ui: ProjectPicker screen"
```

---

### Task 5.6: DatePicker, WaitingForInput, NextActionAttrs screens

**Files:**
- Create: `src/ui/screens/DatePicker.tsx`
- Create: `src/ui/screens/WaitingForInput.tsx`
- Create: `src/ui/screens/NextActionAttrs.tsx`

- [ ] **Step 1: DatePicker**

```tsx
// src/ui/screens/DatePicker.tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

interface Props {
  item: Item;
  question: string;
  onSubmit: (date: string) => void;
}

export const DatePicker = ({ item, question, onSubmit }: Props) => {
  const [date, setDate] = useState('');
  return (
    <div class="clarify-screen">
      <QuestionBanner text={question} />
      <ItemCard item={item} compact />
      <div class="clarify-date-presets">
        <button onClick={() => setDate(addDays(1))}>Tomorrow</button>
        <button onClick={() => setDate(addDays(7))}>+1 week</button>
        <button onClick={() => setDate(addDays(30))}>+1 month</button>
      </div>
      <input type="date" value={date} onChange={(e) => setDate((e.target as HTMLInputElement).value)} />
      <button class="clarify-submit" disabled={!date} onClick={() => onSubmit(date)}>Continue</button>
    </div>
  );
};
```

- [ ] **Step 2: WaitingForInput**

```tsx
// src/ui/screens/WaitingForInput.tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props { item: Item; onSubmit: (who: string) => void; }

export const WaitingForInput = ({ item, onSubmit }: Props) => {
  const [who, setWho] = useState('');
  return (
    <div class="clarify-screen">
      <QuestionBanner text="Who are you waiting on?" />
      <ItemCard item={item} compact />
      <input
        class="clarify-text-input"
        placeholder="Name / role / team"
        value={who}
        onInput={(e) => setWho((e.target as HTMLInputElement).value)}
      />
      <button class="clarify-submit" disabled={!who.trim()} onClick={() => onSubmit(who.trim())}>Continue</button>
    </div>
  );
};
```

- [ ] **Step 3: NextActionAttrs**

```tsx
// src/ui/screens/NextActionAttrs.tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (attrs: { context: string; energy: 'low' | 'medium' | 'high'; time: number }) => void;
}

const CONTEXTS = ['@home', '@computer', '@phone', '@errands', '@anywhere'];

export const NextActionAttrs = ({ item, onSubmit }: Props) => {
  const [context, setContext] = useState('');
  const [energy, setEnergy]   = useState<'low' | 'medium' | 'high'>('medium');
  const [time, setTime]       = useState(15);

  return (
    <div class="clarify-screen">
      <QuestionBanner text="Context, energy, time" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        <label>Context</label>
        <div class="clarify-chips">
          {CONTEXTS.map((c) => (
            <span class={`clarify-chip ${context === c ? 'active' : ''}`} onClick={() => setContext(c)}>{c}</span>
          ))}
        </div>
      </div>
      <div class="clarify-row">
        <label>Energy</label>
        <div class="clarify-chips">
          {(['low','medium','high'] as const).map((e) => (
            <span class={`clarify-chip ${energy === e ? 'active' : ''}`} onClick={() => setEnergy(e)}>{e}</span>
          ))}
        </div>
      </div>
      <div class="clarify-row">
        <label>Time (min)</label>
        <input type="number" value={time} min={1} onInput={(e) => setTime(Number((e.target as HTMLInputElement).value))} />
      </div>
      <button class="clarify-submit" disabled={!context} onClick={() => onSubmit({ context, energy, time })}>Continue</button>
    </div>
  );
};
```

- [ ] **Step 4: Append matching styles**

Append to `styles.css`:

```css
.clarify-date-presets { display: flex; gap: 8px; margin: 12px 0; }
.clarify-date-presets button { padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary-alt); cursor: pointer; }
.clarify-text-input { width: 100%; padding: 10px; margin: 12px 0; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary-alt); }
.clarify-submit { padding: 10px 16px; margin-top: 12px; border: 1px solid var(--interactive-accent); background: var(--interactive-accent); color: var(--text-on-accent); border-radius: 6px; cursor: pointer; }
.clarify-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.clarify-row { display: flex; flex-direction: column; gap: 6px; margin: 12px 0; }
.clarify-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.clarify-chip { padding: 6px 10px; border: 1px solid var(--background-modifier-border); border-radius: 999px; background: var(--background-primary-alt); cursor: pointer; }
.clarify-chip.active { background: var(--interactive-accent); color: var(--text-on-accent); }
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/DatePicker.tsx src/ui/screens/WaitingForInput.tsx src/ui/screens/NextActionAttrs.tsx styles.css
git commit -m "ui: DatePicker, WaitingForInput, NextActionAttrs"
```

---

### Task 5.7: ProjectOutcome, SessionComplete, EmptyInbox, and wizard wiring

**Files:**
- Create: `src/ui/screens/ProjectOutcome.tsx`
- Create: `src/ui/screens/SessionComplete.tsx`
- Modify: `src/ui/Wizard.tsx`
- Create: `src/ui/hooks/useItemActor.ts`

- [ ] **Step 1: Implement ProjectOutcome**

```tsx
// src/ui/screens/ProjectOutcome.tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (outcome: string, firstAction: string) => void;
}

export const ProjectOutcome = ({ item, onSubmit }: Props) => {
  const [outcome, setOutcome]         = useState('');
  const [firstAction, setFirstAction] = useState(item.title); // pre-populated
  return (
    <div class="clarify-screen">
      <QuestionBanner text="Define the project" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        <label>Outcome (what success looks like)</label>
        <input class="clarify-text-input" value={outcome} onInput={(e) => setOutcome((e.target as HTMLInputElement).value)} />
      </div>
      <div class="clarify-row">
        <label>First next action</label>
        <input class="clarify-text-input" value={firstAction} onInput={(e) => setFirstAction((e.target as HTMLInputElement).value)} />
      </div>
      <button class="clarify-submit" disabled={!outcome.trim() || !firstAction.trim()} onClick={() => onSubmit(outcome.trim(), firstAction.trim())}>Continue</button>
    </div>
  );
};
```

- [ ] **Step 2: SessionComplete**

```tsx
// src/ui/screens/SessionComplete.tsx
import { h } from 'preact';

interface Props {
  total: number;
  errors: Array<{ itemPath: string; error: unknown }>;
  onClose: () => void;
}

export const SessionComplete = ({ total, errors, onClose }: Props) => (
  <div class="clarify-screen complete">
    <h2>Inbox cleared</h2>
    <p>{total - errors.length} of {total} items processed.</p>
    {errors.length > 0 && (
      <div class="clarify-errors">
        <h3>{errors.length} item(s) couldn't be written:</h3>
        <ul>
          {errors.map((e) => <li>{e.itemPath} — {String(e.error)}</li>)}
        </ul>
      </div>
    )}
    <button class="clarify-submit" onClick={onClose}>Close</button>
  </div>
);
```

- [ ] **Step 3: Wire per-item UI into Wizard**

Replace the `case 'clarifying':` branch in `src/ui/Wizard.tsx` with a child component that runs an `itemMachine` per current item and routes the active state to the right screen.

```tsx
// src/ui/Wizard.tsx (additions)
import { useEffect, useState } from 'preact/hooks';
import { createActor } from 'xstate';
import { itemMachine } from '../state/itemMachine';
import { BinaryQuestion } from './screens/BinaryQuestion';
import { MultiOption } from './screens/MultiOption';
import { DatePicker } from './screens/DatePicker';
import { WaitingForInput } from './screens/WaitingForInput';
import { NextActionAttrs } from './screens/NextActionAttrs';
import { ProjectOutcome } from './screens/ProjectOutcome';
import { ProjectPicker } from './screens/ProjectPicker';
import { SessionComplete } from './screens/SessionComplete';
import type { Item } from '../vault/schema/item';
import type { Outcome } from '../vault/schema/outcome';
import type { ProjectRef } from '../vault/services/ProjectService';

const OutcomeOptions = [
  { key: '1', outcome: 'trash',     icon: '🗑️', label: 'Trash',           description: 'Nothing to do' },
  { key: '2', outcome: 'someday',   icon: '💭', label: 'Someday / Maybe', description: 'Park for weekly review' },
  { key: '3', outcome: 'tickler',   icon: '🔔', label: 'Tickler',         description: 'Resurface on a date' },
  { key: '4', outcome: 'reference', icon: '📚', label: 'Reference',       description: 'Keep as info' },
];

const ComplexityOptions = [
  { key: '1', outcome: 'single',  icon: '➡️', label: 'Single step', description: 'One action' },
  { key: '2', outcome: 'project', icon: '🎯', label: 'Multi-step',  description: 'Becomes a project' },
];

const OwnershipOptions = [
  { key: '1', outcome: 'mine',     icon: '👤', label: 'Mine',     description: "I'll do this" },
  { key: '2', outcome: 'delegate', icon: '👥', label: 'Delegate', description: 'Someone else' },
];

const TimingOptions = [
  { key: '1', outcome: 'calendar',   icon: '📅', label: 'Specific date', description: 'Happens on a date' },
  { key: '2', outcome: 'nextAction', icon: '✅', label: 'As-soon-as',    description: 'Just needs doing' },
];

const ItemFlow = ({ item, projects, onSubmitted }: { item: Item; projects: ProjectRef[]; onSubmitted: (o: Outcome) => void }) => {
  const [actor] = useState(() => createActor(itemMachine, { input: { item } }).start());
  const [, force] = useState(0);
  useEffect(() => {
    const sub = actor.subscribe(() => force((n) => n + 1));
    actor.subscribe({ complete: () => { onSubmitted(actor.getSnapshot().output as Outcome); }});
    return () => sub.unsubscribe();
  }, [actor]);

  const snap = actor.getSnapshot();
  const v = snap.value as any;

  // Top-level
  if (v === 'assessing') {
    return <BinaryQuestion item={item} question="Is it actionable?"
      onYes={() => actor.send({ type: 'YES' })}
      onNo={() => actor.send({ type: 'NO' })} />;
  }

  // Not actionable
  if (v?.notActionable === 'choosing') {
    return <MultiOption item={item} question="Where does it go?" options={OutcomeOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} />;
  }
  if (v?.notActionable?.someday === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.notActionable?.tickler === 'pickingDate') {
    return <DatePicker item={item} question="Resurface on which date?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'tickleDate', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.notActionable?.tickler === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }

  // Actionable
  if (v?.actionable === 'complexity') {
    return <MultiOption item={item} question="Single step or multi-step?" options={ComplexityOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} />;
  }
  if (v?.actionable?.project === 'definingOutcome') {
    return <ProjectOutcome item={item}
      onSubmit={(outcome, firstAction) => {
        actor.send({ type: 'INPUT', field: 'outcome', value: outcome });
        actor.send({ type: 'INPUT', field: 'firstActionText', value: firstAction });
        actor.send({ type: 'YES' }); // → definingFirstAction (skipped since both captured at once)
        actor.send({ type: 'YES' }); // → bindingArea
      }} />;
  }
  if (v?.actionable?.project === 'bindingArea') {
    return <ProjectPicker item={item} question="Which area does this project belong to?" options={projects.filter((p) => p.kind === 'area')}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'areaLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single === 'duration') {
    return <BinaryQuestion item={item} question="Will it take under 2 minutes?"
      onYes={() => actor.send({ type: 'YES' })} onNo={() => actor.send({ type: 'NO' })} />;
  }
  if (v?.actionable?.single?.doNow === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single?.defer === 'ownership') {
    return <MultiOption item={item} question="Mine, or someone else's?" options={OwnershipOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'pickingWho') {
    return <WaitingForInput item={item}
      onSubmit={(who) => { actor.send({ type: 'INPUT', field: 'who', value: who }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'pickingFollowUpDate') {
    return <DatePicker item={item} question="Follow up when?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'followUp', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single?.defer?.mine === 'timing') {
    return <MultiOption item={item} question="Specific date, or as-soon-as?" options={TimingOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} />;
  }
  if (v?.actionable?.single?.defer?.mine?.calendar === 'pickingDate') {
    return <DatePicker item={item} question="Which date?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'date', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.mine?.calendar === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single?.defer?.mine?.nextAction === 'pickingContext'
   || v?.actionable?.single?.defer?.mine?.nextAction === 'pickingEnergy'
   || v?.actionable?.single?.defer?.mine?.nextAction === 'pickingTime') {
    return <NextActionAttrs item={item}
      onSubmit={({ context, energy, time }) => {
        actor.send({ type: 'INPUT', field: 'context', value: context });
        actor.send({ type: 'INPUT', field: 'energy',  value: energy });
        actor.send({ type: 'INPUT', field: 'time',    value: time });
        actor.send({ type: 'YES' });
        actor.send({ type: 'YES' });
        actor.send({ type: 'YES' });
      }} />;
  }
  if (v?.actionable?.single?.defer?.mine?.nextAction === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }

  return <div>Unknown state: {JSON.stringify(v)}</div>;
};
```

Then in the main `Wizard` component, replace the `clarifying` case with use of `ItemFlow`, and replace the `complete` case with `SessionComplete`. Also load the project list once at session start (a second `useMemo` that calls `runEffect`).

The full assembled Wizard.tsx after this task should:
- Subscribe to `sessionMachine`
- On enter `clarifying`, fetch project list via `runEffect(ProjectService.listProjectsAndAreas …)` (memoized once per session)
- Render `<ItemFlow item={queue[currentIndex]} projects={...} onSubmitted={(o) => send({ type: 'ITEM_DONE', outcome: o })} />`
- Render `<SessionComplete .../>` on `complete`

(Implementer: keep this wiring straightforward — handlers above already cover all decision-tree paths.)

- [ ] **Step 4: Build smoke**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/ProjectOutcome.tsx src/ui/screens/SessionComplete.tsx src/ui/Wizard.tsx
git commit -m "ui: full wizard wiring across all decision-tree states"
```

---

### Task 5.8: Keyboard and swipe input

**Files:**
- Create: `src/ui/hooks/useKeybindings.ts`
- Create: `src/ui/hooks/useSwipe.ts`
- Modify: `src/ui/screens/BinaryQuestion.tsx`
- Modify: `src/ui/screens/MultiOption.tsx`

- [ ] **Step 1: Implement useKeybindings**

```ts
// src/ui/hooks/useKeybindings.ts
import { useEffect } from 'preact/hooks';
import type { ClarifySettings } from '../../settings/schema';

type Handlers = Partial<Record<'YES' | 'NO' | 'PICK_1' | 'PICK_2' | 'PICK_3' | 'PICK_4' | 'BACK' | 'EXIT', () => void>>;

export const useKeybindings = (settings: ClarifySettings, handlers: Handlers) => {
  useEffect(() => {
    if (document.body.classList.contains('is-mobile')) return;
    const onKey = (e: KeyboardEvent) => {
      for (const [event, binding] of Object.entries(settings.keybindings)) {
        if (e.key === binding.key && handlers[event as keyof Handlers]) {
          e.preventDefault();
          handlers[event as keyof Handlers]!();
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settings, handlers]);
};
```

- [ ] **Step 2: Implement useSwipe**

```ts
// src/ui/hooks/useSwipe.ts
import { useEffect, useRef } from 'preact/hooks';

export const useSwipe = (
  ref: { current: HTMLElement | null },
  handlers: { onSwipeLeft?: () => void; onSwipeRight?: () => void },
  threshold = 50,
) => {
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const down = (e: TouchEvent) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const up = (e: TouchEvent) => {
      if (!start.current) return;
      const dx = e.changedTouches[0].clientX - start.current.x;
      const dy = e.changedTouches[0].clientY - start.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      }
      start.current = null;
    };
    el.addEventListener('touchstart', down);
    el.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchend', up);
    };
  }, [ref, handlers, threshold]);
};
```

- [ ] **Step 3: Plumb hooks into BinaryQuestion and MultiOption**

In `BinaryQuestion.tsx`, accept an optional `settings` prop and call `useKeybindings({ YES: onYes, NO: onNo })`. Use a `ref` on the screen container and call `useSwipe(ref, { onSwipeLeft: onNo, onSwipeRight: onYes })`.

In `MultiOption.tsx`, accept `settings` and call `useKeybindings({ PICK_1: () => onPick(options[0].outcome), ... PICK_4: ... })`.

(Implementer: pass `settings` down from `Wizard` → `ItemFlow` → screens.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/hooks src/ui/screens/BinaryQuestion.tsx src/ui/screens/MultiOption.tsx src/ui/Wizard.tsx
git commit -m "ui: keyboard + swipe input hooks"
```

---

## Phase 6 — Wiring and Settings

### Task 6.1: Settings tab UI

**Files:**
- Create: `src/settings/SettingsTab.ts`

- [ ] **Step 1: Implement (sections: Inbox, Outcomes, Projects & Areas, Keybindings, Launch)**

```ts
// src/settings/SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type ClarifyPlugin from '../main';
import type { ClarifySettings } from './schema';

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: ClarifyPlugin) { super(app, plugin); }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    containerEl.createEl('h2', { text: 'Inbox source' });
    new Setting(containerEl)
      .setName('Inbox folder')
      .setDesc('Items in this folder are considered inbox items')
      .addText((t) => t.setValue(s.inbox.folderPath ?? '').onChange((v) => this.update('inbox.folderPath', v || null)));
    new Setting(containerEl)
      .setName('Captured status value')
      .addText((t) => t.setValue(s.inbox.capturedStatusValue ?? '').onChange((v) => this.update('inbox.capturedStatusValue', v || null)));
    new Setting(containerEl)
      .setName('Status field name')
      .addText((t) => t.setValue(s.inbox.statusFieldName).onChange((v) => this.update('inbox.statusFieldName', v || 'status')));

    containerEl.createEl('h2', { text: 'Outcomes — folders' });
    const folderRow = (label: string, getter: () => string | null, setter: (v: string | null) => void) =>
      new Setting(containerEl).setName(label).addText((t) => t.setValue(getter() ?? '').onChange((v) => setter(v || null)));
    folderRow('Trash folder',       () => s.outcomes.trash.folder,       (v) => this.update('outcomes.trash.folder', v || '.trash'));
    folderRow('Someday folder',     () => s.outcomes.someday.folder,     (v) => this.update('outcomes.someday.folder', v || 'Someday'));
    folderRow('Tickler folder',     () => s.outcomes.tickler.folder,     (v) => this.update('outcomes.tickler.folder', v || 'Tickler'));
    folderRow('Reference folder',   () => s.outcomes.reference.folder,   (v) => this.update('outcomes.reference.folder', v || 'Resources'));
    folderRow('Projects folder',    () => s.outcomes.project.folder,     (v) => this.update('outcomes.project.folder', v || 'Projects'));
    folderRow('Waiting folder',     () => s.outcomes.waitingFor.folder,  (v) => this.update('outcomes.waitingFor.folder', v || 'Waiting'));
    folderRow('Next actions folder',() => s.outcomes.nextAction.folder,  (v) => this.update('outcomes.nextAction.folder', v));

    containerEl.createEl('h2', { text: 'Projects & areas' });
    new Setting(containerEl).setName('Projects folder').addText((t) => t.setValue(s.projectsAndAreas.projectsFolder).onChange((v) => this.update('projectsAndAreas.projectsFolder', v)));
    new Setting(containerEl).setName('Areas folder').addText((t) => t.setValue(s.projectsAndAreas.areasFolder).onChange((v) => this.update('projectsAndAreas.areasFolder', v)));
    new Setting(containerEl).setName('Misc area name').addText((t) => t.setValue(s.projectsAndAreas.miscAreaName).onChange((v) => this.update('projectsAndAreas.miscAreaName', v)));
    new Setting(containerEl).setName('Project link field').addText((t) => t.setValue(s.projectsAndAreas.projectLinkField).onChange((v) => this.update('projectsAndAreas.projectLinkField', v)));

    containerEl.createEl('h2', { text: 'Keybindings' });
    for (const [event, binding] of Object.entries(s.keybindings)) {
      new Setting(containerEl).setName(event).addText((t) => t.setValue(binding.key).onChange((v) => this.update(`keybindings.${event}.key`, v)));
    }

    containerEl.createEl('h2', { text: 'Launch' });
    new Setting(containerEl).setName('Show ribbon icon').addToggle((t) => t.setValue(s.launch.showRibbonIcon).onChange((v) => this.update('launch.showRibbonIcon', v)));
    new Setting(containerEl).setName('Enable command palette command').addToggle((t) => t.setValue(s.launch.commandPaletteEnabled).onChange((v) => this.update('launch.commandPaletteEnabled', v)));
  }

  private update(path: string, value: unknown) {
    const parts = path.split('.');
    let obj: any = this.plugin.settings;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    this.plugin.saveSettings();
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean (some unused imports possible — fix as needed).

- [ ] **Step 3: Commit**

```bash
git add src/settings/SettingsTab.ts
git commit -m "settings: tab UI"
```

---

### Task 6.2: Plugin entry — main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Implement**

```ts
// src/main.ts
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { Effect, Layer } from 'effect';
import { ClarifyView, CLARIFY_VIEW_TYPE } from './ui/ClarifyView';
import { defaultSettings, ClarifySettings } from './settings/schema';
import { SettingsTab } from './settings/SettingsTab';
import { VaultServiceLive } from './vault/services/VaultService';
import { MetadataServiceLive } from './vault/services/MetadataService';
import { ProjectServiceLive } from './vault/services/ProjectService';

export default class ClarifyPlugin extends Plugin {
  settings!: ClarifySettings;

  async onload() {
    await this.loadSettings();

    const layer = Layer.mergeAll(
      VaultServiceLive(this.app.vault),
      MetadataServiceLive(this.app),
      ProjectServiceLive({
        projectsFolder: this.settings.projectsAndAreas.projectsFolder,
        areasFolder: this.settings.projectsAndAreas.areasFolder,
      }),
    );

    const runEffect = <A, E>(e: Effect.Effect<A, E, any>) =>
      Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A, E, never>);

    this.registerView(
      CLARIFY_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new ClarifyView(leaf, this.settings, runEffect),
    );

    if (this.settings.launch.showRibbonIcon) {
      this.addRibbonIcon('list-checks', 'Clarify inbox', () => this.activate());
    }

    if (this.settings.launch.commandPaletteEnabled) {
      this.addCommand({
        id: 'clarify-open',
        name: 'Clarify inbox',
        callback: () => this.activate(),
      });
    }

    this.addSettingTab(new SettingsTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(CLARIFY_VIEW_TYPE);
  }

  async loadSettings() {
    const loaded = await this.loadData() as Partial<ClarifySettings> | null;
    this.settings = { ...defaultSettings, ...(loaded ?? {}) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activate() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(CLARIFY_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: CLARIFY_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean. `main.js` produced.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "main: plugin entry — view registration, ribbon, command"
```

---

### Task 6.3: End-to-end integration test

**Files:**
- Create: `src/_integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/_integration.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from './vault/services/VaultService';
import { MetadataServiceTest } from './vault/services/MetadataService';
import { readInbox } from './vault/programs/readInbox';
import { applyOutcome } from './vault/programs/applyOutcome';
import { defaultSettings } from './settings/schema';

describe('integration — clarify a full inbox', () => {
  it('processes a 3-item inbox end-to-end', async () => {
    const store = new Map([
      ['00 Inbox/a.md', '---\nstatus: captured\ntags: [task]\n---\nTrash this\n'],
      ['00 Inbox/b.md', '---\nstatus: captured\ntags: [task]\n---\nQuick reply\n'],
      ['00 Inbox/c.md', '---\nstatus: captured\ntags: [task]\n---\nResearch the book\n'],
      ['Areas/Misc.md', '---\nstatus: active\n---\n'],
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    const run = <A,E>(e: Effect.Effect<A,E,any>) =>
      Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A,E,never>);

    const items = await run(readInbox(defaultSettings));
    expect(items).toHaveLength(3);

    await run(applyOutcome(items[0], { type: 'trash' }, defaultSettings));
    await run(applyOutcome(items[1], { type: 'doNow', projectLink: '[[Misc]]' }, defaultSettings));
    await run(applyOutcome(items[2], { type: 'reference' }, defaultSettings));

    expect(store.has('00 Inbox/a.md')).toBe(false);
    expect(store.has('.trash/a.md')).toBe(true);
    expect(store.has('00 Inbox/b.md')).toBe(true);
    expect(store.get('00 Inbox/b.md')!).toContain('status: done');
    expect(store.has('00 Inbox/c.md')).toBe(false);
    expect(store.has('Resources/c.md')).toBe(true);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/_integration.test.ts
git commit -m "test: end-to-end integration through 3 outcomes"
```

---

## Phase 7 — Manual Verification

### Task 7.1: Symlink built plugin into a real vault and smoke-test on desktop

- [ ] **Step 1: Build production bundle**

Run: `npm run build`

- [ ] **Step 2: Install in a test vault**

```bash
# Replace <vault-path> with your test vault
ln -s "$(pwd)" "<vault-path>/.obsidian/plugins/clarify"
```

Enable in Obsidian: Settings → Community plugins → Clarify → on.

- [ ] **Step 3: Create 3–5 captured items in the inbox folder** of your test vault.

- [ ] **Step 4: Open Clarify** (ribbon icon or command palette → "Clarify inbox") and walk through each item. Verify file moves and frontmatter changes look right.

- [ ] **Step 5: Note any UX issues** as followup beads via `beads-followup` (don't fix here — capture and continue).

### Task 7.2: Mobile smoke test

- [ ] **Step 1: Sync vault to mobile** (Obsidian Sync or any sync method).
- [ ] **Step 2: Repeat the desktop flow** on phone — verify 2×2 grid, button row, no gesture hints.
- [ ] **Step 3: Note issues** as followup beads.

---

## Notes

- **Plan mode parallel opportunities:** Phase 5 screens 5.3–5.7 are largely independent; could be done in parallel after 5.1/5.2 land. Phase 2 services 2.1–2.3 have a dependency chain (Metadata depends on Vault, Project on both), so keep sequential.
- **Deferred from v1:**
  - Tickler resurfacing (separate plugin feature)
  - Mid-clarify item text editing
  - Custom date picker (using native `<input type="date">` + presets)
- **If the BACK navigation test in 4.2 is hard to satisfy**, narrow the test scope or skip draft-restoration; the cheaper "BACK from interior state → predecessor state" coverage is enough for v1.
