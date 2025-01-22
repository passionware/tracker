import { Client } from "@/api/clients/clients.api.ts";
import { createMockFactory } from "@passionware/entities";

export const clientsMock = createMockFactory<Client>(
  () => ({
    id: 1,
    name: "Test client",
    avatarUrl: null,
  }),
  [
    {
      id: 1,
      name: "Test client",
      avatarUrl: null,
    },
    {
      id: 2,
      name: "Very important client",
      avatarUrl: null,
    },
  ],
);
