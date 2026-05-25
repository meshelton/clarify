import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService } from '../services/MetadataService';
import { ClarifySettings } from '../../settings/schema';
import { Item } from '../schema/item';
import { InboxReadError } from '../errors';

const stem = (path: string): string => {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.md$/, '');
};

export const readInbox = (settings: ClarifySettings) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const meta = yield* MetadataService;

    const inFolder = settings.inbox.folderPath
      ? yield* vault.listFolder(settings.inbox.folderPath)
      : ([] as string[]);

    const all: string[] = [...inFolder];
    const capturedValue = settings.inbox.capturedStatusValue;
    if (capturedValue) {
      const everything = yield* vault.listFolder('');
      for (const path of everything) {
        if (all.includes(path)) continue;
        const fm = yield* meta.read(path).pipe(Effect.catchAll(() => Effect.succeed({})));
        if (fm[settings.inbox.statusFieldName] === capturedValue) all.push(path);
      }
    }

    const items: Item[] = [];
    for (const path of all) {
      const fm = yield* meta.read(path).pipe(Effect.catchAll(() => Effect.succeed({})));
      items.push({
        path,
        title: stem(path),
        body: '',
        frontmatter: fm as Item['frontmatter'],
        capturedAt: undefined,
      });
    }
    return items;
  }).pipe(
    Effect.mapError((cause) => new InboxReadError({ cause }))
  );
