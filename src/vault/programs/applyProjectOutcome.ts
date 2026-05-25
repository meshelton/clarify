import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Item } from '../schema/item';
import { moveAndRewrite } from './moveAndRewrite';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';

export const applyProjectOutcome = (
  item: Item,
  outcome: { outcome: string; firstActionText: string; areaLink: string },
  settings: ClarifySettings
) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const projectName = outcome.outcome;
    const projectPath = `${settings.outcomes.project.folder}/${slug(projectName)}.md`;

    const tagsLine = `[${settings.outcomes.project.tagsAdd.join(', ')}]`;
    const projectFm =
      `---\n` +
      `${settings.inbox.statusFieldName}: ${settings.outcomes.project.statusValue}\n` +
      `${settings.outcomes.project.outcomeField}: ${projectName}\n` +
      `${settings.projectsAndAreas.projectLinkField}: ${outcome.areaLink}\n` +
      `tags: ${tagsLine}\n` +
      `---\n\n${outcome.firstActionText}\n`;
    yield* vault.write(projectPath, projectFm);

    // Convert the original captured item into the first next action, linked to this new project.
    const projectLink = `[[${slug(projectName)}]]`;
    yield* moveAndRewrite({
      fromPath: item.path,
      toFolder: settings.outcomes.nextAction.folder,
      frontmatterPatch: {
        [settings.inbox.statusFieldName]: settings.outcomes.nextAction.statusValue,
        [settings.projectsAndAreas.projectLinkField]: projectLink,
      },
      fieldsToRemove: [],
    });
  });
