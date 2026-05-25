import { Context, Effect, Layer } from 'effect';
import type { App } from 'obsidian';
import { VaultService } from './VaultService';
import { FrontmatterParseError } from '../errors';

export type Frontmatter = Record<string, unknown>;

export interface MetadataServiceShape {
  readonly read: (path: string) => Effect.Effect<Frontmatter, FrontmatterParseError, VaultService>;
  readonly write: (path: string, fm: Frontmatter) => Effect.Effect<void, FrontmatterParseError, VaultService>;
}

export class MetadataService extends Context.Tag('MetadataService')<MetadataService, MetadataServiceShape>() {}

/** Minimal YAML helpers — sufficient for flat key/value/array shapes we use. */
const parseFrontmatter = (raw: string): { fm: Frontmatter; body: string } => {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) return { fm: {}, body: raw };
  const fm: Frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let value: unknown = kv[2];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        value = trimmed.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (trimmed === 'true' || trimmed === 'false') {
        value = trimmed === 'true';
      } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        value = Number(trimmed);
      } else {
        value = trimmed.replace(/^"|"$/g, '');
      }
    }
    fm[key] = value;
  }
  return { fm, body: match[2] };
};

// Inline-array string items must be quoted when they contain YAML-significant
// characters — wiki-links like `[[Foo]]` would otherwise be parsed as nested
// arrays, and colons / commas / hashes break the flow syntax. We use simple
// double-quoting with backslash escaping for embedded quotes.
const yamlNeedsQuoting = (s: string) => /[\[\]:,#"]/.test(s);
const quoteIfNeeded = (s: string) =>
  yamlNeedsQuoting(s) ? `"${s.replace(/"/g, '\\"')}"` : s;

const serializeFrontmatter = (fm: Frontmatter, body: string): string => {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      const items = v.map((item) => quoteIfNeeded(String(item)));
      lines.push(`${k}: [${items.join(', ')}]`);
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n') + body;
};

export const MetadataServiceTest = () =>
  Layer.effect(
    MetadataService,
    Effect.gen(function* () {
      return MetadataService.of({
        read: (path) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const raw = yield* vault.read(path).pipe(
              Effect.mapError(() => new FrontmatterParseError({ path, reason: 'file not found' }))
            );
            return parseFrontmatter(raw).fm;
          }),
        write: (path, fm) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const raw = yield* vault.read(path).pipe(
              Effect.mapError(() => new FrontmatterParseError({ path, reason: 'file not found' }))
            );
            const { body } = parseFrontmatter(raw);
            yield* vault.write(path, serializeFrontmatter(fm, body));
          }),
      });
    })
  );

export const MetadataServiceLive = (app: App) =>
  Layer.effect(
    MetadataService,
    Effect.gen(function* () {
      return MetadataService.of({
        read: (path) =>
          Effect.tryPromise({
            try: async () => {
              const file = app.vault.getAbstractFileByPath(path);
              if (!file) throw new Error('not found');
              const cache = app.metadataCache.getFileCache(file as never);
              return (cache?.frontmatter ?? {}) as Frontmatter;
            },
            catch: (cause) => new FrontmatterParseError({ path, reason: String(cause) }),
          }),
        write: (path, fm) =>
          Effect.tryPromise({
            try: async () => {
              const file = app.vault.getAbstractFileByPath(path);
              if (!file) throw new Error('not found');
              await app.fileManager.processFrontMatter(file as never, (existing: Frontmatter) => {
                for (const k of Object.keys(existing)) delete existing[k];
                Object.assign(existing, fm);
              });
            },
            catch: (cause) => new FrontmatterParseError({ path, reason: String(cause) }),
          }),
      });
    })
  );
