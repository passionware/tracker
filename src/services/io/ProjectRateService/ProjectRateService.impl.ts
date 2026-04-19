import type { ProjectRateApi } from "@/api/rate/rate.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type { ProjectRateService } from "@/services/io/ProjectRateService/ProjectRateService";
import { QueryClient, useQuery } from "@tanstack/react-query";

const ROOT_KEY = "project-rate";

export function createProjectRateService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: ProjectRateApi;
  client: QueryClient;
}): ProjectRateService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({ queryKey: [ROOT_KEY] });
      request.sendResponse();
    },
  );

  return {
    useCurrentRate: (projectId, contractorId) => {
      const isReady =
        projectId !== undefined &&
        projectId !== null &&
        contractorId !== undefined &&
        contractorId !== null;
      return ensureIdleQuery(
        isReady ? `${projectId}:${contractorId}` : null,
        useQuery(
          {
            enabled: isReady,
            queryKey: [ROOT_KEY, "current", projectId, contractorId] as const,
            queryFn: () => api.getCurrentRate(projectId!, contractorId!),
          },
          client,
        ),
      );
    },
    useRatesForProject: (projectId) =>
      ensureIdleQuery(
        projectId,
        useQuery(
          {
            enabled: projectId !== undefined && projectId !== null,
            queryKey: [ROOT_KEY, "by-project", projectId] as const,
            queryFn: () => api.getRatesForProject(projectId!),
          },
          client,
        ),
      ),
    useRatesForContractor: (contractorId) =>
      ensureIdleQuery(
        contractorId,
        useQuery(
          {
            enabled: contractorId !== undefined && contractorId !== null,
            queryKey: [ROOT_KEY, "by-contractor", contractorId] as const,
            queryFn: () => api.getRatesForContractor(contractorId!),
          },
          client,
        ),
      ),
  };
}
