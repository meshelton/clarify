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
