import { WorkspaceQuery } from "@/api/workspace/workspace.api.ts";
import { workspaceMock } from "@/api/workspace/workspace.mock.ts";
import { WorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";

function filterWorkspacesByQuery(
  query: WorkspaceQuery,
): typeof workspaceMock.static.list {
  let list = workspaceMock.static.list;
  if (query.filters.hidden) {
    list = list.filter((w) => w.hidden === query.filters.hidden!.value);
  }
  return list;
}

export function createWorkspaceService(): WorkspaceService {
  return {
    useWorkspaces: (query) => rd.of(filterWorkspacesByQuery(query)),
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
