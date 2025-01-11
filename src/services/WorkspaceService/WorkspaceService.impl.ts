import { Workspace, WorkspaceApi } from "@/api/workspace/workspace.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { WorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
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

  const findWorkspaceInCache = (id: Workspace["id"]) => {
    const allLists = queryClient.getQueriesData<Workspace[]>({
      queryKey: ["workspaces", "list"],
    });

    // Przeszukaj każdą tablicę z list
    for (const [, list] of allLists) {
      if (list) {
        const found = list.find((workspace) => workspace.id === id);
        if (found) {
          return found;
        }
      }
    }

    return undefined; // Nie znaleziono workspace
  };

  return {
    useWorkspaces: (query) =>
      useQuery(
        {
          queryKey: ["workspaces", "list", query],
          queryFn: () => api.getWorkspaces(query),
          staleTime: 10 * 60 * 1000, // Dłuższy czas "starości" dla listy workspace
          refetchOnMount: false,
          refetchOnWindowFocus: false,
        },
        queryClient,
      ),

    useWorkspace: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: maybe.isPresent(id),
            queryKey: ["workspaces", "item", id],
            queryFn: () => api.getWorkspace(id!),
            staleTime: 10 * 60 * 1000, // Dłuższy czas "starości" dla pojedynczych workspace
            initialData: () => findWorkspaceInCache(id!), // Znajdź dane w cache, jeśli istnieją
          },
          queryClient,
        ),
      ),
  };
}
