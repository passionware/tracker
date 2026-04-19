import type { Contractor } from "@/api/contractor/contractor.api";
import type { Project } from "@/api/project/project.api";
import type { ProjectRate } from "@/api/rate/rate.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface ProjectRateService {
  useCurrentRate: (
    projectId: Maybe<Project["id"]>,
    contractorId: Maybe<Contractor["id"]>,
  ) => RemoteData<ProjectRate | null>;
  useRatesForProject: (
    projectId: Maybe<Project["id"]>,
  ) => RemoteData<ProjectRate[]>;
  useRatesForContractor: (
    contractorId: Maybe<Contractor["id"]>,
  ) => RemoteData<ProjectRate[]>;
}

export interface WithProjectRateService {
  projectRateService: ProjectRateService;
}
