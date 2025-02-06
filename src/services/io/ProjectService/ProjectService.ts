import { Project, ProjectQuery } from "@/api/project/project.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ProjectService {
  useProjects(query: Maybe<ProjectQuery>): RemoteData<Project[]>;
  ensureProjects(query: ProjectQuery): Promise<Project[]>;
  useProject(projectId: Maybe<Project["id"]>): RemoteData<Project>;
  ensureProject(projectId: Project["id"]): Promise<Project>;
}

export interface WithProjectService {
  projectService: ProjectService;
}
