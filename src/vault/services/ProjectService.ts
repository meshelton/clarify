import { Context, Effect, Layer } from 'effect';
import { VaultService } from './VaultService';

export interface ProjectRef {
  name: string;
  path: string;
  kind: 'project' | 'area';
  link: string;
}

export interface ProjectServiceShape {
  readonly listProjectsAndAreas: Effect.Effect<ProjectRef[], never, VaultService>;
  readonly createProject: (name: string) => Effect.Effect<ProjectRef, never, VaultService>;
}

export class ProjectService extends Context.Tag('ProjectService')<ProjectService, ProjectServiceShape>() {}

const stem = (path: string): string => {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.md$/, '');
};

export const ProjectServiceLive = (opts: { projectsFolder: string; areasFolder: string }) =>
  Layer.effect(
    ProjectService,
    Effect.gen(function* () {
      return ProjectService.of({
        listProjectsAndAreas: Effect.gen(function* () {
          const vault = yield* VaultService;
          const projects = yield* vault.listFolder(opts.projectsFolder);
          const areas = yield* vault.listFolder(opts.areasFolder);
          const mk = (path: string, kind: 'project' | 'area'): ProjectRef => {
            const name = stem(path);
            return { name, path, kind, link: `[[${name}]]` };
          };
          return [...projects.map((p) => mk(p, 'project')), ...areas.map((p) => mk(p, 'area'))];
        }),
        createProject: (name) =>
          Effect.gen(function* () {
            const vault = yield* VaultService;
            const path = `${opts.projectsFolder}/${name}.md`;
            yield* vault.write(path, `---\nstatus: active\ntags: [project]\n---\n`);
            return { name, path, kind: 'project' as const, link: `[[${name}]]` };
          }),
      });
    })
  );
