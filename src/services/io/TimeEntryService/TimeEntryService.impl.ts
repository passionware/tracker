import type { TimeEntryApi } from "@/api/time-entry/time-entry.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type {
  TagSuggestion,
  TimeEntryService,
} from "@/services/io/TimeEntryService/TimeEntryService";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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
    useContractorTagSuggestions: (contractorId, options) => {
      const days = options?.days ?? 60;
      const limit = options?.limit ?? 25;
      const startedFrom = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1));
        return d;
      }, [days]);
      return ensureIdleQuery(
        contractorId,
        useQuery(
          {
            enabled: contractorId !== undefined && contractorId !== null,
            queryKey: [
              ROOT_KEY,
              "tag-suggestions",
              contractorId,
              days,
              limit,
            ] as const,
            queryFn: async () => {
              const list = await api.getEntries({
                contractorId: contractorId!,
                startedFrom,
                limit: 1000,
              });
              return aggregateTagSuggestions(list, limit);
            },
          },
          client,
        ),
      );
    },
  };
}

function aggregateTagSuggestions(
  entries: { tags: string[]; startedAt: Date; deletedAt: Date | null }[],
  limit: number,
): TagSuggestion[] {
  const counts = new Map<string, { count: number; lastUsedAt: Date }>();
  for (const e of entries) {
    if (e.deletedAt !== null) continue;
    for (const tag of e.tags) {
      const existing = counts.get(tag);
      if (existing) {
        existing.count += 1;
        if (e.startedAt > existing.lastUsedAt) existing.lastUsedAt = e.startedAt;
      } else {
        counts.set(tag, { count: 1, lastUsedAt: e.startedAt });
      }
    }
  }
  return Array.from(counts.entries())
    .map(([tag, v]) => ({ tag, count: v.count, lastUsedAt: v.lastUsedAt }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
    })
    .slice(0, limit);
}
