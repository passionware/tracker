import { Client } from "@/api/clients/clients.api.ts";

export interface RoutingService {
  forClient: (clientId?: ":clientId" | Client["id"]) => {
    reports: () => string;
    billing: () => string;
    root: () => string;
  };
}
export interface WithRoutingService {
  routingService: RoutingService;
}
