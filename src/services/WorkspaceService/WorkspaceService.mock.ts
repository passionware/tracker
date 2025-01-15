import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { WorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";

export function createWorkspaceService(): WorkspaceService {
  return {
    useWorkspaces: () => rd.of(workspaceMock.static.list),
    useWorkspace: (id) =>
      maybe.mapOrElse(
        id,
        (id) =>
          rd.of(
            maybe.getOrThrow(
              workspaceMock.static.list.find(
                (workspace) => workspace.id === id,
              ),
              "Workspace not found",
            ),
          ),
        rd.ofIdle(),
      ),
  };
}
