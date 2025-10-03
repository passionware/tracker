import { ContractorApi } from "@/api/contractor/contractor.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createContractorService(
  api: ContractorApi,
  client: QueryClient,
  messageService: MessageService,
): ContractorService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["contractor", "list"],
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
  };
}
