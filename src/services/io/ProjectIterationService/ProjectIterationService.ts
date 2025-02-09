import {
  ProjectIteration,
  ProjectIterationDetail,
  ProjectIterationQuery,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ProjectIterationService {
  useProjectIterations: (
    query: Maybe<ProjectIterationQuery>,
  ) => RemoteData<ProjectIteration[]>;
  useProjectIterationDetail: (
    id: Maybe<ProjectIterationDetail["id"]>,
  ) => RemoteData<ProjectIterationDetail>;
}

export interface WithProjectIterationService {
  projectIterationService: ProjectIterationService;
}
