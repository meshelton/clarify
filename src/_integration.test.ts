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
    const run = <A, E>(e: Effect.Effect<A, E, any>) =>
      Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A, E, never>);

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
