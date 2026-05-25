import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
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
