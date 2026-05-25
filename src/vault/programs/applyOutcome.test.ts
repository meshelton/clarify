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

  it('nextAction: moves to Next/, sets contexts array (TaskNotes-compatible), energy, time', async () => {
    const store = seed('00 Inbox/x.md');
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      applyOutcome(inboxItem('00 Inbox/x.md'), {
        type: 'nextAction', projectLink: '[[Build website]]',
        context: '@computer', energy: 'medium', time: 30,
      }, defaultSettings).pipe(Effect.provide(layer))
    );
    const out = store.get('Next/x.md')!;
    // TaskNotes-compatible: contexts is an array under the `contexts` key
    expect(out).toContain('contexts: [@computer]');
    expect(out).toContain('energy: medium');
    expect(out).toContain('time: 30');
    // Context should NOT be added to the tags array
    expect(out).not.toMatch(/tags:.*@computer/);
  });

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
    // Project note created somewhere under Projects/
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
});
