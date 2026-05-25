import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { VaultServiceTest } from './VaultService';
import { MetadataServiceTest } from './MetadataService';
import { ProjectService, ProjectServiceLive } from './ProjectService';

const proj = `---
status: active
---
content
`;

describe('ProjectService', () => {
  it('lists projects and areas', async () => {
    const store = new Map([
      ['Projects/Build website.md', proj],
      ['Projects/Renovate kitchen.md', proj],
      ['Areas/Health.md', proj],
      ['Areas/Misc.md', proj],
      ['Inbox/foo.md', proj],
    ]);
    const layer = Layer.mergeAll(
      VaultServiceTest(store),
      MetadataServiceTest(),
      ProjectServiceLive({ projectsFolder: 'Projects', areasFolder: 'Areas' }),
    );
    const list = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* ProjectService;
        return yield* svc.listProjectsAndAreas;
      }).pipe(Effect.provide(layer))
    );
    expect(list.map((p) => p.name).sort()).toEqual(['Build website', 'Health', 'Misc', 'Renovate kitchen']);
    expect(list.find((p) => p.name === 'Health')!.kind).toBe('area');
    expect(list.find((p) => p.name === 'Build website')!.kind).toBe('project');
  });
});
