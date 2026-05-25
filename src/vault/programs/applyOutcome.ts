import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Outcome } from '../schema/outcome';
import { Item } from '../schema/item';
import { moveAndRewrite } from './moveAndRewrite';
import { applyProjectOutcome } from './applyProjectOutcome';

const today = () => new Date().toISOString().slice(0, 10);

export const applyOutcome = (
  item: Item,
  outcome: Outcome,
  settings: ClarifySettings
): Effect.Effect<void, unknown, VaultService | MetadataService> => {
  const link = settings.projectsAndAreas.projectLinkField;

  switch (outcome.type) {
    case 'trash':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.trash.folder,
        frontmatterPatch: {},
        fieldsToRemove: [],
      });

    case 'someday':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.someday.folder,
        frontmatterPatch: { [settings.inbox.statusFieldName]: settings.outcomes.someday.statusValue, [link]: outcome.projectLink },
        fieldsToRemove: ['scheduled', 'due', 'priority'],
        tagsAdd: settings.outcomes.someday.tagsAdd,
        tagsRemove: settings.outcomes.someday.tagsRemove,
      });

    case 'tickler':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.tickler.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.tickler.statusValue,
          scheduled: outcome.tickleDate,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: ['due', 'priority'],
        tagsAdd: settings.outcomes.tickler.tagsAdd,
        tagsRemove: settings.outcomes.tickler.tagsRemove,
      });

    case 'reference':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.reference.folder,
        frontmatterPatch: {},
        fieldsToRemove: settings.outcomes.reference.fieldsRemove,
        tagsAdd: settings.outcomes.reference.tagsAdd,
        tagsRemove: settings.outcomes.reference.tagsRemove,
      });

    case 'doNow':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: null,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.doNow.statusValue,
          [settings.outcomes.doNow.completedDateField]: today(),
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
      });

    case 'waitingFor':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.waitingFor.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.waitingFor.statusValue,
          [settings.outcomes.waitingFor.whoField]: outcome.who,
          [settings.outcomes.waitingFor.followUpField]: outcome.followUp,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
        tagsAdd: settings.outcomes.waitingFor.tagsAdd,
      });

    case 'calendar':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: null,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.calendar.statusValue,
          [settings.outcomes.calendar.dateField]: outcome.date,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
      });

    case 'nextAction':
      return moveAndRewrite({
        fromPath: item.path,
        toFolder: settings.outcomes.nextAction.folder,
        frontmatterPatch: {
          [settings.inbox.statusFieldName]: settings.outcomes.nextAction.statusValue,
          [settings.outcomes.nextAction.contextField]: outcome.context,
          [settings.outcomes.nextAction.energyField]: outcome.energy,
          [settings.outcomes.nextAction.timeField]: outcome.time,
          [link]: outcome.projectLink,
        },
        fieldsToRemove: [],
        tagsAdd: [outcome.context],
      });

    case 'project':
      return applyProjectOutcome(item, outcome, settings);
  }
};
