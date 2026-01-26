import { Project } from "@/api/project/project.api.ts";
import {
  ArgsScopedAccessor,
  TestQuery,
  testQuery,
} from "@passionware/platform-storybook";
import { ProjectService } from "./ProjectService";
import { rd } from "@passionware/monads";
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
  };
}
