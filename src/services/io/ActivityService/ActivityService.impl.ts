import type { ActivityApi } from "@/api/activity/activity.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type { ActivityService } from "@/services/io/ActivityService/ActivityService";
import { QueryClient, useQuery } from "@tanstack/react-query";

const ROOT_KEY = "activity";

export function createActivityService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: ActivityApi;
  client: QueryClient;
}): ActivityService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({ queryKey: [ROOT_KEY] });
      request.sendResponse();
    },
  );

  return {
    getActivities: (query) => api.getActivities(query),
    useActivities: (query) =>
      useQuery(
        {
          queryKey: [ROOT_KEY, "list", query] as const,
          queryFn: () => api.getActivities(query),
        },
        client,
      ),
    useActivity: (activityId) =>
      ensureIdleQuery(
        activityId,
        useQuery(
          {
            enabled: !!activityId,
            queryKey: [ROOT_KEY, "activity", activityId] as const,
            queryFn: () => api.getActivity(activityId!),
          },
          client,
        ),
      ),
  };
}
