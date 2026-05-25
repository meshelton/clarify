import { setup, assign } from 'xstate';
import type { ItemMachineContext, ItemMachineInput, ItemEvent } from './types';
import type { Outcome } from '../vault/schema/outcome';

export const itemMachine = setup({
  types: {
    context: {} as ItemMachineContext,
    events: {} as ItemEvent,
    input: {} as ItemMachineInput,
    output: {} as Outcome,
  },
  actions: {
    setField: assign(({ context, event }) => {
      if (event.type !== 'INPUT') return {};
      return { draft: { ...context.draft, [event.field]: event.value } as ItemMachineContext['draft'] };
    }),
    setDraftType: assign(({ context, event }) => {
      if (event.type !== 'PICK') return {};
      return { draft: { ...context.draft, type: event.outcome as Outcome['type'] } };
    }),
  },
}).createMachine({
  id: 'item',
  initial: 'assessing',
  context: ({ input }) => ({ item: input.item, draft: {}, path: [] }),
  output: ({ context }) => context.draft as Outcome,
  states: {
    assessing: {
      on: {
        YES: { target: 'actionable' },
        NO: { target: 'notActionable' },
      },
    },
    notActionable: {
      initial: 'choosing',
      states: {
        choosing: {
          on: {
            PICK: [
              { guard: ({ event }) => event.outcome === 'trash',     target: 'trash',     actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'someday',   target: 'someday',   actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'tickler',   target: 'tickler',   actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'reference', target: 'reference', actions: 'setDraftType' },
            ],
            BACK: { target: '#item.assessing' },
          },
        },
        trash:     { type: 'final', entry: assign(({ context }) => ({ draft: { ...context.draft, type: 'trash' as const } })) },
        reference: { type: 'final', entry: assign(({ context }) => ({ draft: { ...context.draft, type: 'reference' as const } })) },
        someday: {
          initial: 'bindingProjectOrArea',
          states: {
            bindingProjectOrArea: {
              on: {
                INPUT:  { actions: 'setField' },
                SUBMIT: { target: 'done' },
                BACK:   { target: '#item.notActionable.choosing' },
              },
            },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
        tickler: {
          initial: 'pickingDate',
          states: {
            pickingDate: {
              on: {
                INPUT: { actions: 'setField' },
                YES:   { target: 'bindingProjectOrArea' },
                BACK:  { target: '#item.notActionable.choosing' },
              },
            },
            bindingProjectOrArea: {
              on: {
                INPUT:  { actions: 'setField' },
                SUBMIT: { target: 'done' },
                BACK:   { target: '#item.notActionable.tickler.pickingDate' },
              },
            },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
      },
      onDone: { target: 'submitted' },
    },
    actionable: {
      initial: 'complexity',
      states: {
        complexity: {
          on: {
            PICK: [
              { guard: ({ event }) => event.outcome === 'project', target: 'project', actions: 'setDraftType' },
              { guard: ({ event }) => event.outcome === 'single',  target: 'single' },
            ],
            BACK: { target: '#item.assessing' },
          },
        },
        project: {
          initial: 'definingOutcome',
          states: {
            definingOutcome: { on: { INPUT: { actions: 'setField' }, YES: 'bindingArea', BACK: { target: '#item.actionable.complexity' } } },
            bindingArea:     { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done', BACK: { target: '#item.actionable.project.definingOutcome' } } },
            done: { type: 'final' },
          },
          onDone: { target: '#item.submitted' },
        },
        single: {
          initial: 'duration',
          states: {
            duration: {
              on: {
                YES:  { target: 'doNow', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'doNow' as const } })) },
                NO:   { target: 'defer' },
                BACK: { target: '#item.actionable.complexity' },
              },
            },
            doNow: {
              initial: 'bindingProjectOrArea',
              states: {
                bindingProjectOrArea: {
                  on: { INPUT: { actions: 'setField' }, SUBMIT: 'done', BACK: { target: '#item.actionable.single.duration' } },
                },
                done: { type: 'final' },
              },
              onDone: { target: '#item.submitted' },
            },
            defer: {
              initial: 'ownership',
              states: {
                ownership: {
                  on: {
                    PICK: [
                      { guard: ({ event }) => event.outcome === 'delegate', target: 'delegate', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'waitingFor' as const } })) },
                      { guard: ({ event }) => event.outcome === 'mine',     target: 'mine' },
                    ],
                    BACK: { target: '#item.actionable.single.duration' },
                  },
                },
                delegate: {
                  initial: 'pickingWho',
                  states: {
                    pickingWho:           { on: { INPUT: { actions: 'setField' }, YES: 'pickingFollowUpDate', BACK: { target: '#item.actionable.single.defer.ownership' } } },
                    pickingFollowUpDate:  { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea', BACK: { target: '#item.actionable.single.defer.delegate.pickingWho' } } },
                    bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done', BACK: { target: '#item.actionable.single.defer.delegate.pickingFollowUpDate' } } },
                    done: { type: 'final' },
                  },
                  onDone: { target: '#item.submitted' },
                },
                mine: {
                  initial: 'timing',
                  states: {
                    timing: {
                      on: {
                        PICK: [
                          { guard: ({ event }) => event.outcome === 'calendar',   target: 'calendar',   actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'calendar' as const } })) },
                          { guard: ({ event }) => event.outcome === 'nextAction', target: 'nextAction', actions: assign(({ context }) => ({ draft: { ...context.draft, type: 'nextAction' as const } })) },
                        ],
                        BACK: { target: '#item.actionable.single.defer.ownership' },
                      },
                    },
                    calendar: {
                      initial: 'pickingDate',
                      states: {
                        pickingDate:          { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea', BACK: { target: '#item.actionable.single.defer.mine.timing' } } },
                        bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done', BACK: { target: '#item.actionable.single.defer.mine.calendar.pickingDate' } } },
                        done: { type: 'final' },
                      },
                      onDone: { target: '#item.submitted' },
                    },
                    nextAction: {
                      initial: 'pickingContext',
                      states: {
                        pickingContext:       { on: { INPUT: { actions: 'setField' }, YES: 'pickingEnergy', BACK: { target: '#item.actionable.single.defer.mine.timing' } } },
                        pickingEnergy:        { on: { INPUT: { actions: 'setField' }, YES: 'pickingTime', BACK: { target: '#item.actionable.single.defer.mine.nextAction.pickingContext' } } },
                        pickingTime:          { on: { INPUT: { actions: 'setField' }, YES: 'bindingProjectOrArea', BACK: { target: '#item.actionable.single.defer.mine.nextAction.pickingEnergy' } } },
                        bindingProjectOrArea: { on: { INPUT: { actions: 'setField' }, SUBMIT: 'done', BACK: { target: '#item.actionable.single.defer.mine.nextAction.pickingTime' } } },
                        done: { type: 'final' },
                      },
                      onDone: { target: '#item.submitted' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    submitted: { type: 'final' },
  },
});
