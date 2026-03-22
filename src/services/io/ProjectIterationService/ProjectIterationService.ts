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
  /** For batch loaders; shares React Query cache with `useProjectIterationDetail`. */
  ensureProjectIterationDetail: (
    id: ProjectIterationDetail["id"],
  ) => Promise<ProjectIterationDetail>;
  /**
   * Parallel detail fetches for many iterations. Map contains only successfully loaded entries.
   * Shares React Query cache with `useProjectIterationDetail` / `ensureProjectIterationDetail`.
   */
  useProjectIterationDetailsByIds: (
    ids: Maybe<ProjectIteration["id"][]>,
  ) => ReadonlyMap<ProjectIteration["id"], ProjectIterationDetail>;
}

export interface WithProjectIterationService {
  projectIterationService: ProjectIterationService;
}
