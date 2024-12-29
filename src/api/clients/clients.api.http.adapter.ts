import { Client$ } from "@/api/clients/clients.api.http.schema.ts";
import { Client } from "@/api/clients/clients.api.ts";

export function fromHttp(client: Client$): Client {
  return {
    id: client.id,
    name: client.name,
    avatarUrl: client.avatar_url,
  };
}
