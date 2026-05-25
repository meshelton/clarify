import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Outcome } from '../schema/outcome';
import { Item } from '../schema/item';
import { moveAndRewrite } from './moveAndRewrite';
import { applyProjectOutcome } from './applyProjectOutcome';

const today = () => new Date().toISOString().slice(0, 10);

const stripWikiLink = (link: string): string => link.replace(/^\[\[|\]\]$/g, '');

/**
 * Resolve the destination folder for a task bound to a project/area link.
 *
 * Lookup order:
 *   1. Project subfolder exists (Projects/<name>/) → task goes inside it
 *   2. Area subfolder exists (Areas/<name>/)      → task goes inside it
 *   3. Project note exists (Projects/<name>.md)   → task goes in Projects/ root
 *   4. Area note exists (Areas/<name>.md)         → task goes in Areas/ root
 *   5. Fall back to Projects/ root
 */
export const resolveDestinationFolder = (
  projectLink: string,
  settings: ClarifySettings,
) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const name = stripWikiLink(projectLink);
    const projectsRoot = settings.projectsAndAreas.projectsFolder;
    const areasRoot    = settings.projectsAndAreas.areasFolder;

    if (yield* vault.exists(`${projectsRoot}/${name}`)) return `${projectsRoot}/${name}`;
    if (yield* vault.exists(`${areasRoot}/${name}`))    return `${areasRoot}/${name}`;
    if (yield* vault.exists(`${projectsRoot}/${name}.md`)) return projectsRoot;
    if (yield* vault.exists(`${areasRoot}/${name}.md`))    return areasRoot;
    return projectsRoot;
  });

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
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: { [settings.inbox.statusFieldName]: settings.outcomes.someday.statusValue, [link]: [outcome.projectLink] },
          fieldsToRemove: ['scheduled', 'due', 'priority'],
          tagsAdd: settings.outcomes.someday.tagsAdd,
          tagsRemove: settings.outcomes.someday.tagsRemove,
        });
      });

    case 'tickler':
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: {
            [settings.inbox.statusFieldName]: settings.outcomes.tickler.statusValue,
            scheduled: outcome.tickleDate,
            [link]: [outcome.projectLink],
          },
          fieldsToRemove: ['due', 'priority'],
          tagsAdd: settings.outcomes.tickler.tagsAdd,
          tagsRemove: settings.outcomes.tickler.tagsRemove,
        });
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
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: {
            [settings.inbox.statusFieldName]: settings.outcomes.doNow.statusValue,
            [settings.outcomes.doNow.completedDateField]: today(),
            [link]: [outcome.projectLink],
          },
          fieldsToRemove: [],
        });
      });

    case 'waitingFor':
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: {
            [settings.inbox.statusFieldName]: settings.outcomes.waitingFor.statusValue,
            [settings.outcomes.waitingFor.whoField]: outcome.who,
            [settings.outcomes.waitingFor.followUpField]: outcome.followUp,
            [link]: [outcome.projectLink],
          },
          fieldsToRemove: [],
          tagsAdd: settings.outcomes.waitingFor.tagsAdd,
        });
      });

    case 'calendar':
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: {
            [settings.inbox.statusFieldName]: settings.outcomes.calendar.statusValue,
            [settings.outcomes.calendar.dateField]: outcome.date,
            [link]: [outcome.projectLink],
          },
          fieldsToRemove: [],
        });
      });

    case 'nextAction':
      return Effect.gen(function* () {
        const dest = yield* resolveDestinationFolder(outcome.projectLink, settings);
        const patch: Record<string, unknown> = {
          [settings.inbox.statusFieldName]: settings.outcomes.nextAction.statusValue,
          [link]: [outcome.projectLink],
        };
        if (outcome.context !== undefined) patch[settings.outcomes.nextAction.contextField] = [outcome.context];
        if (outcome.energy  !== undefined) patch[settings.outcomes.nextAction.energyField]  = outcome.energy;
        if (outcome.time    !== undefined) patch[settings.outcomes.nextAction.timeField]    = outcome.time;
        yield* moveAndRewrite({
          fromPath: item.path,
          toFolder: dest,
          frontmatterPatch: patch,
          fieldsToRemove: [],
        });
      });

    case 'project':
      return applyProjectOutcome(item, outcome, settings);
  }
};
