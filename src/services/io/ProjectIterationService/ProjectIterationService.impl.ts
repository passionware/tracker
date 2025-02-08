import { ProjectIterationApi } from "@/api/project-iteration/project-iteration.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
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
        queryKey: ["project-iterations"],
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
            queryKey: ["project-iterations", query],
            queryFn: () => api.getProjectIterations(query!),
            enabled: !!query,
          },
          client,
        ),
      ),
    useProjectIterationDetail: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["project-iteration", id],
            queryFn: () => api.getProjectIterationDetail(id),
          },
          client,
        ),
      ),
  };
}
