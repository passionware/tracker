import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ActionMenu,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { WorkspaceView } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor";
import {
  DrawerHeaderHero,
  DrawerHeaderHeroMetaItem,
  DrawerHeaderHeroSkeleton,
} from "@/features/_common/patterns/DrawerHeaderHero.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { MutedInsetRow } from "@/features/_common/patterns/MutedInsetRow.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { ClientHiddenBadge } from "@/features/clients/ClientHiddenBadge.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Building2, Link2, Loader2, Unlink2 } from "lucide-react";
import { useMemo, useState } from "react";

export type ClientDrawerSpec = { type: "client"; id: number };

/** Logo + main facts for entity drawer header (details and edit stack). */
export function ClientDrawerHeaderPreview({
  clientId,
  services,
}: {
  clientId: number;
  services: DrawerDescriptorServices;
}) {
  const clientRd = services.clientService.useClient(clientId);
  return rd
    .journey(clientRd)
    .wait(<DrawerHeaderHeroSkeleton />)
    .catch(renderSmallError("min-h-16 w-full"))
    .map((client) => (
      <DrawerHeaderHero
        avatarUrl={client.avatarUrl}
        avatarAlt=""
        fallbackInitials={getInitials(client.name)}
        title={client.name}
        titleAdornment={<ClientHiddenBadge hidden={client.hidden} />}
        meta={
          <>
            <DrawerHeaderHeroMetaItem
              label="Client ID"
              value={client.id}
              valueClassName="tabular-nums"
            />
            <DrawerHeaderHeroMetaItem
              label="Bank sender"
              value={client.senderName ?? "—"}
              className="sm:max-w-[min(100%,22rem)]"
              valueClassName="[overflow-wrap:anywhere]"
            />
            <DrawerHeaderHeroMetaItem
              label="Visibility"
              value={client.hidden ? "Hidden" : "Visible"}
            />
          </>
        }
      />
    ));
}

export function ClientDrawerBreadcrumbLabel({
  entity,
  services,
}: {
  entity: ClientDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const clientRd = services.clientService.useClient(entity.id);
  return rd
    .journey(clientRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((client) => <>{client.name}</>);
}

export function ClientDrawerSmallPreview({
  entity,
  services,
}: {
  entity: ClientDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  return <ClientDrawerHeaderPreview clientId={entity.id} services={services} />;
}

export function ClientDrawerHeaderActions({
  entity,
  services,
}: {
  entity: ClientDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const clientRd = services.clientService.useClient(entity.id);
  const client = rd.tryGet(clientRd);
  if (client == null) {
    return null;
  }
  return (
    <div className="shrink-0" data-no-row-open>
      <ActionMenu services={services}>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "client-form",
              clientId: client.id,
              defaultValues: {
                name: client.name,
                senderName: client.senderName ?? "",
                avatarUrl: client.avatarUrl ?? null,
                hidden: client.hidden,
              },
            })
          }
        >
          Edit client
        </ActionMenuEditItem>
      </ActionMenu>
    </div>
  );
}

export function ClientDrawerBody({
  entity,
  services,
}: {
  entity: ClientDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const clientRd = services.clientService.useClient(entity.id);
  const linkedRd = services.clientService.useClientLinkedWorkspaces(entity.id);

  const [workspaceToLink, setWorkspaceToLink] = useState<number | null>(null);
  const linkMutation = promiseState.useMutation(async (workspaceId: number) => {
    await services.mutationService.linkClientToWorkspace(
      workspaceId,
      entity.id,
    );
    setWorkspaceToLink(null);
  });

  const [unlinkTarget, setUnlinkTarget] = useState<{
    workspaceId: number;
    label: string;
  } | null>(null);
  const unlinkMutation = promiseState.useMutation(
    async (payload: { workspaceId: number }) => {
      await services.mutationService.removeClientFromWorkspace(
        payload.workspaceId,
        entity.id,
      );
    },
  );

  const workspacePickerQuery = useMemo(() => {
    const base = workspaceQueryUtils.ofDefault();
    const ids = rd.tryGet(linkedRd)?.map((w) => w.id) ?? [];
    if (ids.length === 0) {
      return base;
    }
    return workspaceQueryUtils.transform(base).build((q) => [
      q.withFilter("id", { operator: "matchNone", value: ids }),
    ]);
  }, [linkedRd]);

  return rd
    .journey(clientRd)
    .wait(
      <Skeleton className="min-h-[12rem] w-full rounded-2xl" />,
    )
    .catch(renderSmallError("min-h-24 w-full"))
    .map(() => (
      <div className="space-y-4">
        <SurfaceCard className="space-y-6">
          <section className="space-y-3">
            <PanelSectionLabel icon={Building2}>
              Linked workspaces
            </PanelSectionLabel>
            {rd
              .fullJourney(linkedRd)
              .initially(null)
              .wait(
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>,
              )
              .catch(renderSmallError("w-full"))
              .map((workspaces) =>
                workspaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not linked to any workspace yet. Add one below.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {[...workspaces]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((ws) => (
                        <li key={ws.id}>
                          <MutedInsetRow>
                            <div className="min-w-0 flex-1">
                              <WorkspaceView
                                workspace={rd.of(ws)}
                                layout="full"
                                size="sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              title={`Remove from ${ws.name}`}
                              onClick={() =>
                                setUnlinkTarget({
                                  workspaceId: ws.id,
                                  label: ws.name,
                                })
                              }
                            >
                              <Unlink2 className="size-4" />
                            </Button>
                          </MutedInsetRow>
                        </li>
                      ))}
                  </ul>
                ),
              )}
          </section>

          <Separator />

          <section className="space-y-3">
            <PanelSectionLabel icon={Link2}>Add to workspace</PanelSectionLabel>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <WorkspacePicker
                value={workspaceToLink}
                onSelect={(id) =>
                  setWorkspaceToLink(
                    typeof id === "number" && !Number.isNaN(id) ? id : null,
                  )
                }
                services={services}
                itemsQuery={workspacePickerQuery}
                placeholder="Choose workspace"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                disabled={
                  workspaceToLink == null ||
                  mt.isInProgress(linkMutation.state)
                }
                onClick={() => {
                  if (workspaceToLink == null) {
                    return;
                  }
                  void linkMutation.track(workspaceToLink);
                }}
              >
                {mt.isInProgress(linkMutation.state) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Link
              </Button>
            </div>
          </section>
        </SurfaceCard>

        <AlertDialog
          open={unlinkTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setUnlinkTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                {unlinkTarget
                  ? `“${unlinkTarget.label}” will no longer include this client. The client is deleted only when it has no workspace links and nothing else references it.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={
                  unlinkTarget === null ||
                  mt.isInProgress(unlinkMutation.state)
                }
                onClick={() => {
                  if (unlinkTarget == null) {
                    return;
                  }
                  void unlinkMutation
                    .track({
                      workspaceId: unlinkTarget.workspaceId,
                    })
                    .then(() => setUnlinkTarget(null));
                }}
              >
                {mt.isInProgress(unlinkMutation.state) ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Remove link
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    ));
}
