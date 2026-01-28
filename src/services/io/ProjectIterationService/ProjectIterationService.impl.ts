import { ProjectIterationApi } from "@/api/project-iteration/project-iteration.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createProjectIterationService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: ProjectIterationApi;
  client: QueryClient;
}): ProjectIterationService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({
        queryKey: ["project-iteration"],
      });
      request.sendResponse();
    },
  );
  return {
    useProjectIterations: (query) =>
      ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["project-iteration", "list", query],
            queryFn: () => api.getProjectIterations(query!),
            enabled: !!query,
          },
          client,
        ),
      ),
    ensureProjectIterations: (query) =>
      client.ensureQueryData({
        queryKey: ["project-iteration", "list", query],
        queryFn: () => api.getProjectIterations(query),
      }),
    useProjectIterationDetail: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: !!id,
            queryKey: ["project-iteration", "detail", id],
            queryFn: () => api.getProjectIterationDetail(id!),
          },
          client,
        ),
      ),
    useProjectIterationById: (ids) =>
      ensureIdleQuery(
        ids,
        useQuery(
          {
            enabled: !!ids && ids.length > 0,
            queryKey: ["project-iteration", "by-ids", ids],
            queryFn: () => api.getProjectIterationsByIds(ids!),
          },
          client,
        ),
      ),
  };
}
