import {
  ProjectIteration,
  ProjectIterationDetail,
} from "@/api/project-iteration/project-iteration.api.ts";
import { ProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import {
  ArgsScopedAccessor,
  testQuery,
  TestQuery,
} from "@passionware/platform-storybook";

export function createProjectIterationService(config: {
  listAccessor: ArgsScopedAccessor<TestQuery<ProjectIteration[]>>;
  itemAccessor: ArgsScopedAccessor<TestQuery<ProjectIterationDetail>>;
}): ProjectIterationService {
  return {
    useProjectIterations: () => testQuery.useData(config.listAccessor.use()),
    useProjectIterationDetail: () =>
      testQuery.useData(config.itemAccessor.use()),
  };
}
