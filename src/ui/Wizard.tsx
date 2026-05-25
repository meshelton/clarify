import { h, Fragment } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useMachine } from '@xstate/react';
import { createActor } from 'xstate';
import { Effect, Layer } from 'effect';
import { sessionMachine } from '../state/sessionMachine';
import { itemMachine } from '../state/itemMachine';
import { ProjectService, ProjectServiceLive } from '../vault/services/ProjectService';
import { BinaryQuestion } from './screens/BinaryQuestion';
import { MultiOption } from './screens/MultiOption';
import { ProjectPicker } from './screens/ProjectPicker';
import { DatePicker } from './screens/DatePicker';
import { WaitingForInput } from './screens/WaitingForInput';
import { NextActionAttrs } from './screens/NextActionAttrs';
import { NextActionDelegate } from './screens/NextActionDelegate';
import { ProjectOutcome } from './screens/ProjectOutcome';
import { SessionComplete } from './screens/SessionComplete';
import type { App } from 'obsidian';
import type { ClarifySettings } from '../settings/schema';
import type { Item } from '../vault/schema/item';
import type { Outcome } from '../vault/schema/outcome';
import type { ProjectRef } from '../vault/services/ProjectService';

interface Props {
  app: App;
  settings: ClarifySettings;
  runEffect: <A, E>(e: Effect.Effect<A, E, any>) => Promise<A>;
  onDone?: () => void;
}

const hasTaskNotes = (app: App): boolean => {
  const plugins = (app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins;
  const tn = plugins?.tasknotes as { openTaskEditModal?: unknown; cacheManager?: { getTaskInfo?: unknown } } | undefined;
  return !!(tn?.openTaskEditModal && tn.cacheManager?.getTaskInfo);
};

const OutcomeOptions = [
  { key: '1', outcome: 'trash',     icon: '🗑️', label: 'Trash',           description: 'Nothing to do' },
  { key: '2', outcome: 'someday',   icon: '💭', label: 'Someday / Maybe', description: 'Park for weekly review' },
  { key: '3', outcome: 'tickler',   icon: '🔔', label: 'Tickler',         description: 'Resurface on a date' },
  { key: '4', outcome: 'reference', icon: '📚', label: 'Reference',       description: 'Keep as info' },
];
const ComplexityOptions = [
  { key: '1', outcome: 'single',  icon: '➡️', label: 'Single step', description: 'One action' },
  { key: '2', outcome: 'project', icon: '🎯', label: 'Multi-step',  description: 'Becomes a project' },
];
const OwnershipOptions = [
  { key: '1', outcome: 'mine',     icon: '👤', label: 'Mine',     description: "I'll do this" },
  { key: '2', outcome: 'delegate', icon: '👥', label: 'Delegate', description: 'Someone else' },
];
const TimingOptions = [
  { key: '1', outcome: 'calendar',   icon: '📅', label: 'Specific date', description: 'Happens on a date' },
  { key: '2', outcome: 'nextAction', icon: '✅', label: 'As-soon-as',    description: 'Just needs doing' },
];

const ItemFlow = ({ app, item, projects, settings, onSubmitted }: { app: App; item: Item; projects: ProjectRef[]; settings: ClarifySettings; onSubmitted: (o: Outcome) => void }) => {
  const [actor] = useState(() => createActor(itemMachine, { input: { item } }).start());
  const [, force] = useState(0);
  useEffect(() => {
    const sub = actor.subscribe(() => force((n) => n + 1));
    actor.subscribe({ complete: () => { onSubmitted(actor.getSnapshot().output as Outcome); } });
    return () => sub.unsubscribe();
  }, [actor]);

  const snap = actor.getSnapshot();
  const v = snap.value as any;

  if (v === 'assessing') {
    return <BinaryQuestion item={item} question="Is it actionable?"
      onYes={() => actor.send({ type: 'YES' })} onNo={() => actor.send({ type: 'NO' })} settings={settings} />;
  }
  if (v?.notActionable === 'choosing') {
    return <MultiOption item={item} question="Where does it go?" options={OutcomeOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} settings={settings} />;
  }
  if (v?.notActionable?.someday === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.notActionable?.tickler === 'pickingDate') {
    return <DatePicker item={item} question="Resurface on which date?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'tickleDate', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.notActionable?.tickler === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable === 'complexity') {
    return <MultiOption item={item} question="Single step or multi-step?" options={ComplexityOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} settings={settings} />;
  }
  if (v?.actionable?.project === 'definingOutcome') {
    return <ProjectOutcome item={item}
      onSubmit={(outcome, firstAction) => {
        actor.send({ type: 'INPUT', field: 'outcome', value: outcome });
        actor.send({ type: 'INPUT', field: 'firstActionText', value: firstAction });
        actor.send({ type: 'YES' });
        actor.send({ type: 'YES' });
      }} />;
  }
  if (v?.actionable?.project === 'bindingArea') {
    return <ProjectPicker item={item} question="Which area does this project belong to?"
      options={projects.filter((p) => p.kind === 'area')}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'areaLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single === 'duration') {
    return <BinaryQuestion item={item} question="Will it take under 2 minutes?"
      onYes={() => actor.send({ type: 'YES' })} onNo={() => actor.send({ type: 'NO' })} settings={settings} />;
  }
  if (v?.actionable?.single?.doNow === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single?.defer === 'ownership') {
    return <MultiOption item={item} question="Mine, or someone else's?" options={OwnershipOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} settings={settings} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'pickingWho') {
    return <WaitingForInput item={item}
      onSubmit={(who) => { actor.send({ type: 'INPUT', field: 'who', value: who }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'pickingFollowUpDate') {
    return <DatePicker item={item} question="Follow up when?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'followUp', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.delegate === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (v?.actionable?.single?.defer?.mine === 'timing') {
    return <MultiOption item={item} question="Specific date, or as-soon-as?" options={TimingOptions}
      onPick={(o) => actor.send({ type: 'PICK', outcome: o })} settings={settings} />;
  }
  if (v?.actionable?.single?.defer?.mine?.calendar === 'pickingDate') {
    return <DatePicker item={item} question="Which date?"
      onSubmit={(date) => { actor.send({ type: 'INPUT', field: 'date', value: date }); actor.send({ type: 'YES' }); }} />;
  }
  if (v?.actionable?.single?.defer?.mine?.calendar === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }
  if (
    v?.actionable?.single?.defer?.mine?.nextAction === 'pickingContext' ||
    v?.actionable?.single?.defer?.mine?.nextAction === 'pickingEnergy' ||
    v?.actionable?.single?.defer?.mine?.nextAction === 'pickingTime'
  ) {
    if (hasTaskNotes(app)) {
      return <NextActionDelegate
        app={app}
        item={item}
        onDone={() => {
          // Skip the three attr screens; TaskNotes will own those fields.
          actor.send({ type: 'YES' });
          actor.send({ type: 'YES' });
          actor.send({ type: 'YES' });
        }}
      />;
    }
    return <NextActionAttrs item={item}
      onSubmit={({ context, energy, time }) => {
        actor.send({ type: 'INPUT', field: 'context', value: context });
        actor.send({ type: 'INPUT', field: 'energy',  value: energy });
        actor.send({ type: 'INPUT', field: 'time',    value: time });
        actor.send({ type: 'YES' });
        actor.send({ type: 'YES' });
        actor.send({ type: 'YES' });
      }} />;
  }
  if (v?.actionable?.single?.defer?.mine?.nextAction === 'bindingProjectOrArea') {
    return <ProjectPicker item={item} options={projects}
      onPick={(link) => { actor.send({ type: 'INPUT', field: 'projectLink', value: link }); actor.send({ type: 'SUBMIT' }); }} />;
  }

  return <div>Unknown state: {JSON.stringify(v)}</div>;
};

export const Wizard = ({ app, settings, runEffect, onDone }: Props) => {
  const [snapshot, send] = useMachine(sessionMachine, { input: { settings, runEffect } });
  const [projects, setProjects] = useState<ProjectRef[]>([]);

  // Kick off the session once
  useMemo(() => { send({ type: 'START_SESSION' }); }, []);

  // Load projects/areas when the session enters clarifying for the first time
  useEffect(() => {
    if (snapshot.value !== 'clarifying' || projects.length > 0) return;
    const layer = ProjectServiceLive({
      projectsFolder: settings.projectsAndAreas.projectsFolder,
      areasFolder:    settings.projectsAndAreas.areasFolder,
    });
    runEffect(
      Effect.gen(function* () {
        const svc = yield* ProjectService;
        return yield* svc.listProjectsAndAreas;
      }).pipe(Effect.provide(layer))
    ).then((list) => setProjects(list as ProjectRef[]));
  }, [snapshot.value]);

  switch (snapshot.value) {
    case 'idle':
    case 'loadingInbox':
      return <div class="clarify-loading">Loading inbox…</div>;
    case 'empty':
      return <div class="clarify-empty">Inbox is empty. Nothing to clarify.</div>;
    case 'complete':
      return <SessionComplete total={snapshot.context.queue.length} errors={snapshot.context.errors} onClose={() => onDone?.()} />;
    case 'aborted':
      return <div class="clarify-aborted">Session ended.</div>;
    case 'errored':
      return <div class="clarify-errored">Couldn't read the inbox.</div>;
    case 'clarifying':
    case 'applying': {
      const item = snapshot.context.queue[snapshot.context.currentIndex];
      if (!item) return <div class="clarify-loading">…</div>;
      return (
        <ItemFlow
          key={item.path}
          app={app}
          item={item}
          projects={projects}
          settings={settings}
          onSubmitted={(o) => send({ type: 'ITEM_DONE', outcome: o })}
        />
      );
    }
    default:
      return null;
  }
};
