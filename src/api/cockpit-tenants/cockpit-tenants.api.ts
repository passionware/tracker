import { Maybe } from "@passionware/monads";

export interface CockpitTenant {
  id: string;
  clientId: number;
  /** Client / tenant organization name (cockpit chrome, email client column). */
  name: string;
  /** Report issuer display name (email/PDF workspace column); optional. */
  workspaceName: Maybe<string>;
  /** Report issuer / agency (PDF cover, email "workspace" slot). */
  workspaceLogoUrl: Maybe<string>;
  /** Client organization (cockpit header, email client slot). */
  clientLogoUrl: Maybe<string>;
  createdAt: string;
  updatedAt: string;
}

/** Partial update for cockpit tenant workspace settings (admin-only in UI). */
export type CockpitTenantSettingsUpdate = Partial<{
  /** Cockpit + email client column label (`tenants.name`, NOT NULL). */
  name: string;
  workspaceName: string | null;
  workspaceLogoUrl: string | null;
  clientLogoUrl: string | null;
}>;

export interface CockpitTenantsApi {
  getTenant: (tenantId: string) => Promise<CockpitTenant>;
  updateTenantSettings: (
    tenantId: string,
    payload: CockpitTenantSettingsUpdate,
  ) => Promise<void>;
}
