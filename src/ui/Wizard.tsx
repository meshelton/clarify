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
