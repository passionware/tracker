import { ProjectApi } from "@/api/project/project.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createProjectService(
  config: { api: ProjectApi; client: QueryClient } & WithServices<
    [WithMessageService]
  >,
): ProjectService {
  config.services.messageService.reportSystemEffect.subscribeToRequest(
    async (payload) => {
      await config.client.invalidateQueries({ queryKey: ["project"] });
      payload.sendResponse();
    },
  );

  return {
    useProjects: (query) =>
      ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["project", "list", query],
            enabled: !!query,
            queryFn: () => config.api.getProjects(query!),
          },
          config.client,
        ),
      ),
    ensureProjects: (query) =>
      config.client.ensureQueryData({
        queryKey: ["project", "list", query],
        queryFn: () => config.api.getProjects(query),
      }),
    useProject: (projectId) =>
      ensureIdleQuery(
        projectId,
        useQuery(
          {
            queryKey: ["project", "detail", projectId],
            enabled: !!projectId,
            queryFn: () => config.api.getProject(projectId!),
          },
          config.client,
        ),
      ),
    ensureProject: (projectId) =>
      config.client.ensureQueryData({
        queryKey: ["project", "detail", projectId],
        queryFn: () => config.api.getProject(projectId),
      }),
    useProjectContractors: (projectId) =>
      ensureIdleQuery(
        projectId,
        useQuery(
          {
            queryKey: ["project", "contractors", projectId],
            enabled: !!projectId,
            queryFn: () => config.api.getProjectContractors(projectId!),
          },
          config.client,
        ),
      ),
    ensureProjectContractors: (projectId) =>
      config.client.ensureQueryData({
        queryKey: ["project", "contractors", projectId],
        queryFn: () => config.api.getProjectContractors(projectId),
      }),
  };
}
