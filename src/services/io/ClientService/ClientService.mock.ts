import type { Client } from "@/api/clients/clients.api.ts";
import { ClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe, rd } from "@passionware/monads";

export function createClientService(): ClientService {
  return {
    useClients: () =>
      rd.of([
        {
          id: 1,
          name: "Client 1",
          avatarUrl: null,
          senderName: null,
        },
      ]),
    useClient: () =>
      rd.of({
        id: 1,
        name: "Client 1",
        avatarUrl: null,
        senderName: null,
      }),
    useClientLinkedWorkspaces: () => rd.of([]),
  };
}

/**
 * Storybook: empty client list; `useClient` resolves only when `id === clientId`.
 * Used for `DrawerContextEntityStrip` and similar “pick one client by id” demos.
 */
export function createClientServiceForEntityStripStory(
  clientId: number,
  client: Client,
): ClientService {
  return {
    useClients: () => rd.of([]),
    useClient: (id) =>
      maybe.isPresent(id) && id === clientId ? rd.of(client) : rd.ofIdle(),
    useClientLinkedWorkspaces: () => rd.of([]),
  };
}
