import { clientQueryUtils } from "@/api/clients/clients.api.ts";
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
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ClientView } from "@/features/_common/elements/pickers/ClientView.tsx";
import {
  DrawerHeaderHero,
  DrawerHeaderHeroMetaItem,
  DrawerHeaderHeroSkeleton,
} from "@/features/_common/patterns/DrawerHeaderHero.tsx";
import { MutedInsetRow } from "@/features/_common/patterns/MutedInsetRow.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { WorkspaceHiddenBadge } from "@/features/workspaces/WorkspaceHiddenBadge.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Link2, Loader2, Unlink2, Users } from "lucide-react";
import { useMemo, useState } from "react";

export type WorkspaceDrawerSpec = { type: "workspace"; id: number };

export function WorkspaceDrawerHeaderPreview({
  workspaceId,
  services,
}: {
  workspaceId: number;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(workspaceId);
  return rd
    .journey(workspaceRd)
    .wait(<DrawerHeaderHeroSkeleton />)
    .catch(renderSmallError("min-h-16 w-full"))
    .map((workspace) => (
      <DrawerHeaderHero
        avatarUrl={workspace.avatarUrl}
        avatarAlt=""
        fallbackInitials={getInitials(workspace.name)}
        title={workspace.name}
        titleAdornment={<WorkspaceHiddenBadge hidden={workspace.hidden} />}
        meta={
          <>
            <DrawerHeaderHeroMetaItem
              label="Workspace ID"
              value={workspace.id}
              valueClassName="tabular-nums"
            />
            <DrawerHeaderHeroMetaItem
              label="Slug"
              value={workspace.slug}
              className="sm:max-w-[min(100%,22rem)]"
              valueClassName="font-mono [overflow-wrap:anywhere]"
            />
            <DrawerHeaderHeroMetaItem
              label="Visibility"
              value={workspace.hidden ? "Hidden" : "Visible"}
            />
          </>
        }
      />
    ));
}

export function WorkspaceDrawerBreadcrumbLabel({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);
  return rd
    .journey(workspaceRd)
    .wait(<Skeleton className="h-4 w-28" />)
    .catch(renderSmallError("h-4 w-28"))
    .map((workspace) => <>{workspace.name}</>);
}

export function WorkspaceDrawerSmallPreview({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  return (
    <WorkspaceDrawerHeaderPreview
      workspaceId={entity.id}
      services={services}
    />
  );
}

export function WorkspaceDrawerHeaderActions({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);
  const workspace = rd.tryGet(workspaceRd);
  if (workspace == null) {
    return null;
  }
  return (
    <div className="shrink-0" data-no-row-open>
      <ActionMenu services={services}>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "workspace-form",
              workspaceId: workspace.id,
              defaultValues: {
                name: workspace.name,
                slug: workspace.slug,
                avatarUrl: workspace.avatarUrl ?? null,
                hidden: workspace.hidden,
              },
            })
          }
        >
          Edit workspace
        </ActionMenuEditItem>
      </ActionMenu>
    </div>
  );
}

export function WorkspaceDrawerBody({
  entity,
  services,
}: {
  entity: WorkspaceDrawerSpec;
  services: DrawerDescriptorServices;
}) {
  const workspaceRd = services.workspaceService.useWorkspace(entity.id);
  const linkedRd = services.clientService.useWorkspaceLinkedClients(entity.id);

  const [clientToLink, setClientToLink] = useState<number | null>(null);
  const linkMutation = promiseState.useMutation(async (clientId: number) => {
    await services.mutationService.linkClientToWorkspace(entity.id, clientId);
    setClientToLink(null);
  });

  const [unlinkTarget, setUnlinkTarget] = useState<{
    clientId: number;
    label: string;
  } | null>(null);
  const unlinkMutation = promiseState.useMutation(
    async (payload: { clientId: number }) => {
      await services.mutationService.removeClientFromWorkspace(
        entity.id,
        payload.clientId,
      );
    },
  );

  const clientPickerQuery = useMemo(() => {
    const base = clientQueryUtils.ofDefault();
    const ids = rd.tryGet(linkedRd)?.map((c) => c.id) ?? [];
    if (ids.length === 0) {
      return base;
    }
    return clientQueryUtils.transform(base).build((q) => [
      q.withFilter("id", { operator: "matchNone", value: ids }),
    ]);
  }, [linkedRd]);

  return rd
    .journey(workspaceRd)
    .wait(
      <Skeleton className="min-h-[12rem] w-full rounded-2xl" />,
    )
    .catch(renderSmallError("min-h-32 w-full"))
    .map(() => (
      <div className="space-y-4">
        <SurfaceCard className="space-y-6">
          <section className="space-y-3">
            <PanelSectionLabel icon={Users}>Linked clients</PanelSectionLabel>
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
              .map((clients) =>
                clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No clients linked yet. Add one below.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {[...clients]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <li key={c.id}>
                          <MutedInsetRow>
                            <div className="min-w-0 flex-1">
                              <ClientView
                                client={rd.of(c)}
                                layout="full"
                                size="sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              title={`Unlink ${c.name}`}
                              onClick={() =>
                                setUnlinkTarget({
                                  clientId: c.id,
                                  label: c.name,
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
            <PanelSectionLabel icon={Link2}>Link client</PanelSectionLabel>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <ClientPicker
                value={clientToLink}
                onSelect={(id) =>
                  setClientToLink(
                    typeof id === "number" && !Number.isNaN(id) ? id : null,
                  )
                }
                services={services}
                itemsQuery={clientPickerQuery}
                placeholder="Choose client"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                disabled={
                  clientToLink == null || mt.isInProgress(linkMutation.state)
                }
                onClick={() => {
                  if (clientToLink == null) {
                    return;
                  }
                  void linkMutation.track(clientToLink);
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
              <AlertDialogTitle>Remove link?</AlertDialogTitle>
              <AlertDialogDescription>
                {unlinkTarget
                  ? `“${unlinkTarget.label}” will no longer be linked to this workspace. The client is deleted only when it has no workspace links and nothing else references it.`
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
                    .track({ clientId: unlinkTarget.clientId })
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
