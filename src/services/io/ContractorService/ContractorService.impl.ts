import { ContractorApi } from "@/api/contractor/contractor.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
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
      queryKey: ["contractors", "list"],
    });
    request.sendResponse();
  });

  return {
    useContractors: (query) => {
      return useQuery(
        {
          queryKey: ["contractors", "list", query],
          queryFn: () => api.getContractors(query),
        },
        client,
      );
    },
    useContractor: (id) => {
      return ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["contractors", "get", id],
            enabled: maybe.isPresent(id),
            queryFn: () => api.getContractor(id!),
          },
          client,
        ),
      );
    },
  };
}
