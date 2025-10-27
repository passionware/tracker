import { CockpitTenant } from "@/api/cockpit-tenants/cockpit-tenants.api";
import { Maybe, RemoteData } from "@passionware/monads";

export interface CockpitTenantService {
  useTenant: (tenantId: Maybe<string>) => RemoteData<CockpitTenant>;
}

export interface WithCockpitTenantService {
  cockpitTenantService: CockpitTenantService;
}
