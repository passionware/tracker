import { Workspace, WorkspaceQuery } from "@/api/workspace/workspace.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface WorkspaceService {
  useWorkspaces: (query: WorkspaceQuery) => RemoteData<Workspace[]>;
  useWorkspace: (id: Maybe<Workspace["id"]>) => RemoteData<Workspace>;
}

export interface WithWorkspaceService {
  workspaceService: WorkspaceService;
}
