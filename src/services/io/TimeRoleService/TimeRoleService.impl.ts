import type { TimeRoleApi } from "@/api/time-role/time-role.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type { TimeRoleService } from "@/services/io/TimeRoleService/TimeRoleService";
import { QueryClient, useQuery } from "@tanstack/react-query";

const ROOT_KEY = "time-role";

/**
 * Read-side service for `time_*.role`. Role grants change rarely, so the
 * default TanStack defaults (gcTime / staleTime) are fine — pages that
 * need a fresh view can still call `client.invalidateQueries`.
 */
export function createTimeRoleService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: TimeRoleApi;
  client: QueryClient;
}): TimeRoleService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({ queryKey: [ROOT_KEY] });
      request.sendResponse();
    },
  );

  return {
    useRoles: (query) =>
      useQuery(
        {
          queryKey: [ROOT_KEY, "list", query] as const,
          queryFn: () => api.getRoles(query),
        },
        client,
      ),
    useMyRoles: (userId) =>
      ensureIdleQuery(
        userId,
        useQuery(
          {
            enabled: !!userId,
            queryKey: [ROOT_KEY, "mine", userId] as const,
            queryFn: () => api.getRoles({ userId: userId! }),
          },
          client,
        ),
      ),
  };
}
