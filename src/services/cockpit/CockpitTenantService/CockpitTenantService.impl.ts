import { CockpitTenantsApi } from "@/api/cockpit-tenants/cockpit-tenants.api";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { CockpitTenantService } from "./CockpitTenantService";

export function createCockpitTenantService(
  api: CockpitTenantsApi,
  client: QueryClient,
): CockpitTenantService {
  return {
    useTenant: (tenantId) =>
      ensureIdleQuery(
        tenantId,
        useQuery(
          {
            queryKey: ["cockpit_tenant", tenantId],
            enabled: maybe.isPresent(tenantId),
            queryFn: () => api.getTenant(tenantId!),
          },
          client,
        ),
      ),
  };
}
