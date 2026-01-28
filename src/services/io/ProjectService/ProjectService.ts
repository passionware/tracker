import {
  Project,
  ProjectContractor,
  ProjectQuery,
} from "@/api/project/project.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ProjectService {
  useProjects(query: Maybe<ProjectQuery>): RemoteData<Project[]>;
  ensureProjects(query: ProjectQuery): Promise<Project[]>;
  useProject(projectId: Maybe<Project["id"]>): RemoteData<Project>;
  ensureProject(projectId: Project["id"]): Promise<Project>;
  useProjectContractors(
    projectId: Maybe<Project["id"]>,
  ): RemoteData<ProjectContractor[]>;
  ensureProjectContractors(
    projectId: Project["id"],
  ): Promise<ProjectContractor[]>;
  useProjectById: (
    ids: Maybe<Project["id"][]>,
  ) => RemoteData<Record<Project["id"], Project>>;
}

export interface WithProjectService {
  projectService: ProjectService;
}
