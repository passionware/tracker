import { Client, ClientsApi } from "@/api/clients/clients.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { ClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createClientService(
  api: ClientsApi,
  client: QueryClient,
  messageService: MessageService,
): ClientService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["client"],
    });
    request.sendResponse();
  });

  // Funkcja do wyszukiwania klienta w pamięci podręcznej
  const findClientInCache = (id: Client["id"]) => {
    // Pobierz wszystkie list queries z pamięci podręcznej
    const allLists = client.getQueriesData<Client[]>({
      queryKey: ["client", "list"],
    });

    // Przeszukaj każdą tablicę z list
    for (const [, list] of allLists) {
      if (list) {
        const found = list.find((client) => client.id === id);
        if (found) {
          return found;
        }
      }
    }

    return undefined; // Nie znaleziono klienta
  };

  return {
    useClients: (query) => {
      return useQuery(
        {
          queryKey: ["client", "list", query],
          queryFn: () => api.getClients(query),
        },
        client,
      );
    },
    useClient: (id) => {
      return ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["client", "item", id],
            enabled: maybe.isPresent(id),
            queryFn: () => api.getClient(id!),
            staleTime: 10 * 60 * 1000, // Dłuższy czas "starości" dla pojedynczych klienta
            initialData: () => findClientInCache(id!),
          },
          client,
        ),
      );
    },
  };
}
