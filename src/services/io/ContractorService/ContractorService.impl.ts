import {
  ContractorApi,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { maybe, rd } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createContractorService(
  api: ContractorApi,
  client: QueryClient,
  messageService: MessageService,
): ContractorService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["contractor"],
    });
    request.sendResponse();
  });

  return {
    useContractors: (query) => {
      return ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["contractor", "list", query],
            enabled: maybe.isPresent(query),
            queryFn: () => api.getContractors(query!),
          },
          client,
        ),
      );
    },
    useContractor: (id) => {
      return ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["contractor", "get", id],
            enabled: maybe.isPresent(id),
            queryFn: () => api.getContractor(id!),
          },
          client,
        ),
      );
    },
    useMyContractor: (authUserId) => {
      // There's no server-side "by auth_user_id" lookup today, but the
      // contractor list is cheap (a few dozen rows in practice), cached
      // at the service level, and the payload already carries user_id.
      // So we reuse the list query and filter client-side — no new API
      // surface, and we stay in sync with any list invalidation the
      // message bus fires.
      const listRd = useQuery(
        {
          queryKey: ["contractor", "list", contractorQueryUtils.ofEmpty()],
          enabled: maybe.isPresent(authUserId),
          queryFn: () =>
            api.getContractors(contractorQueryUtils.ofEmpty()),
        },
        client,
      );
      return rd.useMemoMap(
        ensureIdleQuery(authUserId, listRd),
        (contractors, uid) =>
          contractors.find((c) => c.authUserId === uid) ?? null,
        authUserId,
      );
    },
    setContractorAuthUser: async ({ contractorId, authUserId }) => {
      await api.setContractorAuthUser({ contractorId, authUserId });
      // No messaging service broadcast here (that would invalidate
      // unrelated caches across the app); we only need contractor
      // queries to refresh.
      await client.invalidateQueries({ queryKey: ["contractor"] });
    },
    useAuthUserDirectory: (enabled) =>
      useQuery(
        {
          queryKey: ["contractor", "auth-user-directory"],
          enabled,
          queryFn: () => api.listAuthUserDirectory(),
          // This list only changes when a user signs up / deactivates —
          // noticeably lower churn than anything else in the app.
          staleTime: 5 * 60 * 1000,
        },
        client,
      ),
  };
}
