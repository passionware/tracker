import {
  CockpitTenant,
  CockpitTenantSettingsUpdate,
} from "@/api/cockpit-tenants/cockpit-tenants.api";
import { Maybe, RemoteData } from "@passionware/monads";

export interface CockpitTenantService {
  useTenant: (tenantId: Maybe<string>) => RemoteData<CockpitTenant>;
  updateTenantSettings: (
    tenantId: string,
    payload: CockpitTenantSettingsUpdate,
  ) => Promise<void>;
}

export interface WithCockpitTenantService {
  cockpitTenantService: CockpitTenantService;
}
