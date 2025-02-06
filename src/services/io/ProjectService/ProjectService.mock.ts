import { Project } from "@/api/project/project.api.ts";
import {
  ArgsScopedAccessor,
  TestQuery,
  testQuery,
} from "@passionware/platform-storybook";
import { ProjectService } from "./ProjectService";

export function createProjectService(config: {
  accessor: ArgsScopedAccessor<TestQuery<Project[]>>;
}): ProjectService {
  return {
    useProjects: () => testQuery.useData(config.accessor.use()),
    ensureProjects: () => testQuery.asPromise(config.accessor.get()),
  };
}
