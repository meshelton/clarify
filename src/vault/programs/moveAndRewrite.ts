import { Effect } from 'effect';
import { VaultService } from '../services/VaultService';
import { MetadataService, Frontmatter } from '../services/MetadataService';
import { OutcomeWriteError } from '../errors';

export interface MoveAndRewriteOptions {
  fromPath: string;
  toFolder: string | null;             // null = stay in place
  frontmatterPatch: Frontmatter;       // fields to set/add
  fieldsToRemove: readonly string[];   // fields to drop
  tagsAdd?: readonly string[];
  tagsRemove?: readonly string[];
}

const fileName = (path: string) => path.split('/').pop() ?? path;

export const moveAndRewrite = (opts: MoveAndRewriteOptions) =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const meta = yield* MetadataService;
    const fm = yield* meta.read(opts.fromPath);

    for (const f of opts.fieldsToRemove) delete fm[f];

    if (opts.tagsAdd?.length || opts.tagsRemove?.length) {
      const existing = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
      const removed = new Set(opts.tagsRemove ?? []);
      const next = existing.filter((t) => !removed.has(t));
      for (const t of opts.tagsAdd ?? []) if (!next.includes(t)) next.push(t);
      fm.tags = next;
    }

    for (const [k, v] of Object.entries(opts.frontmatterPatch)) fm[k] = v;

    const targetPath = opts.toFolder ? `${opts.toFolder}/${fileName(opts.fromPath)}` : opts.fromPath;

    if (targetPath !== opts.fromPath) {
      yield* vault.move(opts.fromPath, targetPath);
    }
    yield* meta.write(targetPath, fm);
  }).pipe(
    Effect.mapError((cause) => new OutcomeWriteError({ itemPath: opts.fromPath, outcomeType: 'moveAndRewrite', cause }))
  );
