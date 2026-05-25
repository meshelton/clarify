import { Context, Effect, Layer } from 'effect';
import type { Vault, TFile } from 'obsidian';
import { FileNotFound } from '../errors';

export interface VaultServiceShape {
  readonly read: (path: string) => Effect.Effect<string, FileNotFound>;
  readonly write: (path: string, content: string) => Effect.Effect<void>;
  readonly move: (from: string, to: string) => Effect.Effect<void, FileNotFound>;
  readonly delete: (path: string) => Effect.Effect<void, FileNotFound>;
  readonly exists: (path: string) => Effect.Effect<boolean>;
  readonly listFolder: (folder: string) => Effect.Effect<string[]>;
}

export class VaultService extends Context.Tag('VaultService')<VaultService, VaultServiceShape>() {}

/** Test layer backed by an in-memory Map. */
export const VaultServiceTest = (store: Map<string, string>) =>
  Layer.succeed(VaultService, {
    read: (path) =>
      store.has(path)
        ? Effect.succeed(store.get(path)!)
        : Effect.fail(new FileNotFound({ path })),
    write: (path, content) =>
      Effect.sync(() => { store.set(path, content); }),
    move: (from, to) =>
      store.has(from)
        ? Effect.sync(() => {
            store.set(to, store.get(from)!);
            store.delete(from);
          })
        : Effect.fail(new FileNotFound({ path: from })),
    delete: (path) =>
      store.has(path)
        ? Effect.sync(() => { store.delete(path); })
        : Effect.fail(new FileNotFound({ path })),
    exists: (path) => Effect.succeed(store.has(path)),
    listFolder: (folder) => {
      if (folder === '') return Effect.succeed(Array.from(store.keys()));
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;
      return Effect.succeed(
        Array.from(store.keys()).filter((p) => p.startsWith(prefix))
      );
    },
  });

/** Live layer backed by Obsidian's Vault API. */
export const VaultServiceLive = (vault: Vault) =>
  Layer.succeed(VaultService, {
    read: (path) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(path) as TFile | null;
          if (!file) throw new FileNotFound({ path });
          return await vault.read(file);
        },
        catch: () => new FileNotFound({ path }),
      }),
    write: (path, content) =>
      Effect.tryPromise(async () => {
        const file = vault.getAbstractFileByPath(path) as TFile | null;
        if (file) {
          await vault.modify(file, content);
        } else {
          await vault.create(path, content);
        }
      }).pipe(Effect.orDie),
    move: (from, to) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(from) as TFile | null;
          if (!file) throw new FileNotFound({ path: from });
          await vault.rename(file, to);
        },
        catch: () => new FileNotFound({ path: from }),
      }),
    delete: (path) =>
      Effect.tryPromise({
        try: async () => {
          const file = vault.getAbstractFileByPath(path) as TFile | null;
          if (!file) throw new FileNotFound({ path });
          await vault.delete(file);
        },
        catch: () => new FileNotFound({ path }),
      }),
    exists: (path) =>
      Effect.sync(() => vault.getAbstractFileByPath(path) !== null),
    listFolder: (folder) =>
      Effect.sync(() => {
        if (folder === '') return vault.getMarkdownFiles().map((f) => f.path);
        const prefix = folder.endsWith('/') ? folder : `${folder}/`;
        return vault.getMarkdownFiles()
          .filter((f) => f.path.startsWith(prefix))
          .map((f) => f.path);
      }),
  });
