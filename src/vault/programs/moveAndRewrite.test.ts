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

  it('tag swap (tagsAdd + tagsRemove) works when tags is not in the patch', async () => {
    const store = new Map([['00 Inbox/foo.md', captured]]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      moveAndRewrite({
        fromPath: '00 Inbox/foo.md',
        toFolder: 'Someday',
        frontmatterPatch: { status: 'someday' },
        fieldsToRemove: [],
        tagsAdd: ['someday'],
        tagsRemove: ['task'],
      }).pipe(Effect.provide(layer))
    );
    const out = store.get('Someday/foo.md')!;
    expect(out).toContain('someday');
    expect(out).not.toMatch(/tags:.*\btask\b/);
  });

  it('toFolder: null keeps the file in place', async () => {
    const store = new Map([['00 Inbox/foo.md', captured]]);
    const layer = Layer.merge(VaultServiceTest(store), MetadataServiceTest());
    await Effect.runPromise(
      moveAndRewrite({
        fromPath: '00 Inbox/foo.md',
        toFolder: null,
        frontmatterPatch: { status: 'done' },
        fieldsToRemove: [],
      }).pipe(Effect.provide(layer))
    );
    expect(store.has('00 Inbox/foo.md')).toBe(true);
    expect(store.get('00 Inbox/foo.md')).toContain('status: done');
  });
});
