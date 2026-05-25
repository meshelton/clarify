import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultService, VaultServiceTest } from './VaultService';
import { MetadataService, MetadataServiceTest } from './MetadataService';

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
