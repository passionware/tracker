import { Project, ProjectQuery } from "@/api/project/project.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ProjectService {
  useProjects(query: Maybe<ProjectQuery>): RemoteData<Project[]>;
  ensureProjects(query: ProjectQuery): Promise<Project[]>;
}

export interface WithProjectService {
  projectService: ProjectService;
}
