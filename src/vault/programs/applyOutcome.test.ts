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

// Seed the store with the inbox item plus stub project/area notes so the
// destination resolver finds them when we bind tasks. The resolver checks
// for a subfolder first (Projects/X/), then the note (Projects/X.md), then
// falls back to the root Projects folder.
const seedWith = (entries: Array<[string, string]>) => new Map(entries);

const inboxOnly = (path: string) =>
  seedWith([[path, '---\nstatus: captured\ntags: [task]\n---\nbody\n']]);

const inboxAndArea = (inboxPath: string, areaName: string) =>
  seedWith([
    [inboxPath, '---\nstatus: captured\ntags: [task]\n---\nbody\n'],
    [`Areas/${areaName}.md`, '---\nstatus: active\ntags: [area]\n---\n'],
  ]);

const inboxAndProject = (inboxPath: string, projectName: string) =>
  seedWith([
    [inboxPath, '---\nstatus: captured\ntags: [task]\n---\nbody\n'],
    [`Projects/${projectName}.md`, '---\nstatus: active\ntags: [project]\n---\n'],
  ]);

describe('applyOutcome', () => {
  it('trash: moves item to .trash (not project-bound)', async () => {
    const store = inboxOnly('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'trash' }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    expect(store.has('.trash/x.md')).toBe(true);
  });

  it('someday: resolves to Areas/Health when the area note exists', async () => {
    const store = inboxAndArea('00 Inbox/x.md', 'Health');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'someday', projectLink: '[[Health]]' }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Areas/x.md')!;
    expect(out).toContain('status: someday');
    expect(out).not.toMatch(/tags:.*\btask\b/);
    expect(out).toMatch(/projects: \["\[\[Health\]\]"\]/);
  });

  it('tickler: resolves to project subfolder when one exists', async () => {
    const store = seedWith([
      ['00 Inbox/x.md', '---\nstatus: captured\ntags: [task]\n---\nbody\n'],
      ['Projects/Build website/_README.md', '---\n---\n'],  // makes the folder "exist"
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'tickler', projectLink: '[[Build website]]', tickleDate: '2026-09-01',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Projects/Build website/x.md')!;
    expect(out).toContain('scheduled: 2026-09-01');
    expect(out).toContain('status: tickler');
  });

  it('reference: moves to Resources/, drops status/priority/scheduled/due, tags swapped', async () => {
    const store = inboxOnly('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'reference' }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Resources/x.md')!;
    expect(out).not.toContain('status:');
    expect(out).toContain('reference');
  });

  it('doNow: moves OUT of inbox into the project area, marked done', async () => {
    const store = inboxAndArea('00 Inbox/x.md', 'Misc');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), { type: 'doNow', projectLink: '[[Misc]]' }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Areas/x.md')!;
    expect(out).toContain('status: done');
    expect(out).toMatch(/completedDate: \d{4}-\d{2}-\d{2}/);
  });

  it('waitingFor: moves to bound project, sets who and follow-up', async () => {
    const store = inboxAndProject('00 Inbox/x.md', 'Build website');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'waitingFor', projectLink: '[[Build website]]', who: 'Mark', followUp: '2026-06-01',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Projects/x.md')!;
    expect(out).toContain('waitingFor: Mark');
    expect(out).toContain('scheduled: 2026-06-01');
  });

  it('calendar: moves to bound area, status scheduled, date set', async () => {
    const store = inboxAndArea('00 Inbox/x.md', 'Misc');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'calendar', projectLink: '[[Misc]]', date: '2026-06-15',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Areas/x.md')!;
    expect(out).toContain('status: scheduled');
    expect(out).toContain('scheduled: 2026-06-15');
  });

  it('nextAction: moves to bound project, sets contexts/timeEstimate, no context tag', async () => {
    const store = inboxAndProject('00 Inbox/x.md', 'Build website');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'nextAction', projectLink: '[[Build website]]',
        context: '@computer', energy: 'medium', time: 30,
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    const out = store.get('Projects/x.md')!;
    expect(out).toContain('contexts: [@computer]');
    expect(out).toContain('energy: medium');
    expect(out).toContain('timeEstimate: 30');
    expect(out).not.toMatch(/tags:.*@computer/);
  });

  it('nextAction: falls back to Projects/ root when neither subfolder nor note exists', async () => {
    const store = inboxOnly('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'nextAction', projectLink: '[[Nonexistent]]',
        context: '@computer', energy: 'medium', time: 30,
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/x.md')).toBe(false);
    expect(store.has('Projects/x.md')).toBe(true);
  });

  it('project: outcome goes in body, dateCreated set, first next action lands next to the new project note', async () => {
    const store = seedWith([
      ['00 Inbox/x.md', '---\nstatus: captured\ntags: [task]\n---\nDraft the homepage copy\n'],
      ['Areas/Marketing.md', '---\nstatus: active\n---\n'],
    ]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'project',
        outcome: 'Website launched with new branding',
        areaLink: '[[Marketing]]',
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    const projectPath = Array.from(store.keys()).find((k) => k.startsWith('Projects/') && k !== 'Projects/x.md');
    expect(projectPath).toBeDefined();
    const projectNote = store.get(projectPath!)!;
    expect(projectNote).not.toMatch(/^outcome:/m);
    expect(projectNote).toContain('Website launched with new branding');
    expect(projectNote).toContain('status: active');
    expect(projectNote).toMatch(/dateCreated: \d{4}-\d{2}-\d{2}T/);
    // First next action: the captured item moves to Projects/ root (no
    // subfolder for the new project yet, but the project note exists, so
    // resolver returns Projects/).
    const next = store.get('Projects/x.md')!;
    expect(next).toContain('status: next');
    expect(next).toMatch(/projects: \["\[\[.+\]\]"\]/);
  });
});
