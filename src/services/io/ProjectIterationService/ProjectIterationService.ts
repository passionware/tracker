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
  ensureProjectIterations: (
    query: ProjectIterationQuery,
  ) => Promise<ProjectIteration[]>;
  useProjectIterationDetail: (
    id: Maybe<ProjectIterationDetail["id"]>,
  ) => RemoteData<ProjectIterationDetail>;
  useProjectIterationById: (
    ids: Maybe<ProjectIteration["id"][]>,
  ) => RemoteData<Record<ProjectIteration["id"], ProjectIteration>>;
}

export interface WithProjectIterationService {
  projectIterationService: ProjectIterationService;
}
