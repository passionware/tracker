import { Client } from "@/api/clients/clients.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import {
  ClientView,
  ClientWidget,
} from "@/features/_common/elements/pickers/ClientView.tsx";
import {
  WorkspaceView,
  WorkspaceWidget,
} from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import type { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { type Maybe, maybe, rd } from "@passionware/monads";
import type { ReactNode } from "react";

import { ClickableRegion } from "./ClickableRegion.tsx";

export type DrawerContextEntityStripServices = WithServices<
  [WithClientService, WithWorkspaceService]
>;

export interface DrawerContextEntityStripProps {
  services: DrawerContextEntityStripServices["services"];
  /** Prefer when already loaded (avoids a workspace fetch). */
  workspace?: Workspace;
  /** When `workspace` is omitted, loads workspace by id. */
  workspaceId?: Maybe<Workspace["id"]>;
  /** Prefer when available (avoids an extra client fetch). */
  client?: Client;
  /** When only an id is known (e.g. cost → first linked report’s `clientId`). */
  clientId?: number | null;
  /** When set, the client block is wrapped in `ClickableRegion`. */
  onOpenClientDetails?: (clientId: number) => void;
  /** Override default “Context” label (e.g. i18n). */
  contextLabel?: ReactNode;
}

/**
 * Workspace + optional client strip for entity drawer bodies. Reuses picker views
 * so visuals stay aligned with the rest of the app.
 */
export function DrawerContextEntityStrip({
  services,
  workspace,
  workspaceId,
  client,
  clientId,
  onOpenClientDetails,
  contextLabel = "Context",
}: DrawerContextEntityStripProps) {
  const resolvedId = client?.id ?? clientId ?? null;

  const workspaceNode =
    workspace != null ? (
      <WorkspaceView workspace={rd.of(workspace)} layout="full" size="sm" />
    ) : workspaceId !== undefined && !maybe.isAbsent(workspaceId) ? (
      <WorkspaceWidget
        workspaceId={workspaceId}
        services={services}
        layout="full"
        size="sm"
      />
    ) : null;

  const clientNode =
    client != null ? (
      <ClientView client={rd.of(client)} layout="full" size="sm" />
    ) : resolvedId != null ? (
      <ClientWidget
        clientId={resolvedId}
        services={services}
        layout="full"
        size="sm"
      />
    ) : null;

  if (workspaceNode == null && clientNode == null) {
    return null;
  }

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm"
      data-no-row-open
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {contextLabel}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {workspaceNode}
        {clientNode != null &&
        onOpenClientDetails != null &&
        resolvedId != null ? (
          <ClickableRegion
            onActivate={() => onOpenClientDetails(resolvedId)}
            aria-label={`Open client details for ${client?.name ?? `client ${resolvedId}`}`}
          >
            {clientNode}
          </ClickableRegion>
        ) : (
          clientNode
        )}
      </div>
    </div>
  );
}
