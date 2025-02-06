import { ProjectApi } from "@/api/project/project.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { ProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createProjectService(
  config: { api: ProjectApi; client: QueryClient } & WithServices<
    [WithMessageService]
  >,
): ProjectService {
  config.services.messageService.reportSystemEffect.subscribeToRequest(
    async (payload) => {
      await config.client.invalidateQueries({ queryKey: ["projects"] });
      payload.sendResponse();
    },
  );

  return {
    useProjects: (query) =>
      ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["projects", query],
            enabled: !!query,
            queryFn: () => config.api.getProjects(query!),
          },
          config.client,
        ),
      ),
    ensureProjects: (query) =>
      config.client.ensureQueryData({
        queryKey: ["projects", query],
        queryFn: () => config.api.getProjects(query),
      }),
    useProject: (projectId) =>
      ensureIdleQuery(
        projectId,
        useQuery(
          {
            queryKey: ["project", projectId],
            enabled: !!projectId,
            queryFn: () => config.api.getProject(projectId!),
          },
          config.client,
        ),
      ),
    ensureProject: (projectId) =>
      config.client.ensureQueryData({
        queryKey: ["project", projectId],
        queryFn: () => config.api.getProject(projectId),
      }),
  };
}
