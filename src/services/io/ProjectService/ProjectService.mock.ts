import { Project } from "@/api/project/project.api.ts";
import {
  ArgsScopedAccessor,
  TestQuery,
  testQuery,
} from "@passionware/platform-storybook";
import { ProjectService } from "./ProjectService";

export function createProjectService(config: {
  listAccessor: ArgsScopedAccessor<TestQuery<Project[]>>;
  itemAccessor: ArgsScopedAccessor<TestQuery<Project>>;
}): ProjectService {
  return {
    useProjects: () => testQuery.useData(config.listAccessor.use()),
    ensureProjects: () => testQuery.asPromise(config.listAccessor.get()),
    useProject: () => testQuery.useData(config.itemAccessor.use()),
    ensureProject: () => testQuery.asPromise(config.itemAccessor.get()),
  };
}
