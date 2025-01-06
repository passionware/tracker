import { RoutingService } from "@/services/front/RoutingService/RoutingService.ts";

export function createRoutingService(): RoutingService {
  return {
    forClient: (clientId = ":clientId") => ({
      reports: () => `/clients/${clientId}/reports`,
      billing: () => `/clients/${clientId}/billing`,
      root: () => `/clients/${clientId}`,
    }),
    forGlobal: () => ({
      root: () => "/",
    }),
  };
}
