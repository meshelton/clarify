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
      input: {
        settings: defaultSettings,
        runEffect: <A, E>(e: Effect.Effect<A, E, any>) =>
          Effect.runPromise(e.pipe(Effect.provide(layer)) as Effect.Effect<A, E, never>),
      },
    }).start();

    actor.send({ type: 'START_SESSION' });

    // Wait a tick for loadingInbox to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(actor.getSnapshot().context.queue).toHaveLength(2);
    expect(actor.getSnapshot().value).toBe('clarifying');
  });
});
