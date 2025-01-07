import { RoutingService } from "@/services/front/RoutingService/RoutingService.ts";

export function createRoutingService(): RoutingService {
  return {
    forClient: (clientId = ":clientId") => ({
      reports: () => `/clients/${clientId}/reports`,
      charges: () => `/clients/${clientId}/charges`,
      costs: () => `/clients/${clientId}/costs`,
      root: () => `/clients/${clientId}`,
    }),
    forGlobal: () => ({
      root: () => "/",
    }),
  };
}
