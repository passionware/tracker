import { WorkspaceApi } from "@/api/workspace/workspace.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { WorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createWorkspaceService(
  api: WorkspaceApi,
  queryClient: QueryClient,
  messageService: MessageService,
): WorkspaceService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await queryClient.invalidateQueries({
      queryKey: ["workspaces"],
    });
    request.resolveCallback();
  });

  return {
    useWorkspaces: (query) =>
      useQuery(
        {
          queryKey: ["workspaces", "list", query],
          queryFn: () => api.getWorkspaces(query),
        },
        queryClient,
      ),
    useWorkspace: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["workspaces", "item", id],
            queryFn: () => api.getWorkspace(id!),
          },
          queryClient,
        ),
      ),
  };
}
