import { Project } from "@/api/project/project.api.ts";
import {
  ArgsScopedAccessor,
  TestQuery,
  testQuery,
} from "@passionware/platform-storybook";
import { ProjectService } from "./ProjectService";
import { maybe, rd } from "@passionware/monads";
import { contractorMock } from "@/api/contractor/contractor.mock";

export function createProjectService(config: {
  listAccessor: ArgsScopedAccessor<TestQuery<Project[]>>;
  itemAccessor: ArgsScopedAccessor<TestQuery<Project>>;
}): ProjectService {
  return {
    useProjects: () => testQuery.useData(config.listAccessor.use()),
    ensureProjects: () => testQuery.asPromise(config.listAccessor.get()),
    useProject: () => testQuery.useData(config.itemAccessor.use()),
    ensureProject: () => testQuery.asPromise(config.itemAccessor.get()),
    useProjectContractors: () =>
      rd.of(
        contractorMock.static.list.map((c) => ({
          contractor: c,
          workspaceId: 1,
        })),
      ),
    ensureProjectContractors: () =>
      Promise.resolve(
        contractorMock.static.list.map((c) => ({
          contractor: c,
          workspaceId: 1,
        })),
      ),
    useProjectById: () => rd.of({}),
  };
}

/**
 * Storybook: `useProject` resolves only when `id === projectId`.
 * Used for `DrawerContextEntityStrip` and similar “pick one project by id” demos.
 */
export function createProjectServiceForEntityStripStory(
  projectId: number,
  project: Project,
): ProjectService {
  return {
    useProjects: () => rd.of([]),
    ensureProjects: () => Promise.resolve([]),
    useProject: (id) =>
      maybe.isPresent(id) && id === projectId ? rd.of(project) : rd.ofIdle(),
    ensureProject: () => Promise.resolve(project),
    useProjectContractors: () => rd.of([]),
    ensureProjectContractors: () => Promise.resolve([]),
    useProjectById: () => rd.of({}),
  };
}
