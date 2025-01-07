import { Client } from "@/api/clients/clients.api.ts";
import { Maybe } from "@passionware/monads";

export interface RoutingService {
  forClient: (clientId?: Maybe<":clientId" | Client["id"]>) => {
    reports: () => string;
    charges: () => string;
    costs: () => string;
    root: () => string;
  };
  forGlobal: () => {
    root: () => string;
  };
}
export interface WithRoutingService {
  routingService: RoutingService;
}
