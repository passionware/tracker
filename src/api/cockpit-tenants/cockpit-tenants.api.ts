import { Maybe } from "@passionware/monads";
export interface CockpitTenant {
  id: string;
  client_id: number;
  name: string;
  logo_url: Maybe<string>;
  created_at: string;
  updated_at: string;
}

export interface CockpitTenantsApi {
  getTenant: (tenantId: string) => Promise<CockpitTenant>;
}
