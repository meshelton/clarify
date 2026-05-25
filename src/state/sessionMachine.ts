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
