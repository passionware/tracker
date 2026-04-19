import type { TimeEntryApi } from "@/api/time-entry/time-entry.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type { TimeEntryService } from "@/services/io/TimeEntryService/TimeEntryService";
import { QueryClient, useQuery } from "@tanstack/react-query";

const ROOT_KEY = "time-entry";

/**
 * Read-side service for the `time_*.entry` projection.
 *
 * The optimistic-overlay pass for in-flight events lives in the (separate)
 * EventQueueService — once that lands, this service will compose its server
 * results with the queue's pending overlay. For now hooks return raw server
 * state; that's already correct, just not optimistic.
 */
export function createTimeEntryService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: TimeEntryApi;
  client: QueryClient;
}): TimeEntryService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({ queryKey: [ROOT_KEY] });
      request.sendResponse();
    },
  );

  return {
    getEntries: (query) => api.getEntries(query),
    useEntries: (query) =>
      useQuery(
        {
          queryKey: [ROOT_KEY, "list", query] as const,
          queryFn: () => api.getEntries(query),
        },
        client,
      ),
    useEntry: (entryId) =>
      ensureIdleQuery(
        entryId,
        useQuery(
          {
            enabled: !!entryId,
            queryKey: [ROOT_KEY, "entry", entryId] as const,
            queryFn: () => api.getEntry(entryId!),
          },
          client,
        ),
      ),
    useActiveEntry: (contractorId) =>
      ensureIdleQuery(
        contractorId,
        useQuery(
          {
            enabled: contractorId !== undefined && contractorId !== null,
            queryKey: [ROOT_KEY, "active", contractorId] as const,
            queryFn: () => api.getActiveEntry(contractorId!),
          },
          client,
        ),
      ),
  };
}
