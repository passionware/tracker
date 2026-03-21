import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
  ActionMenuMarkPaidMenuItem,
} from "@/features/_common/ActionMenu.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { rd } from "@passionware/monads";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { DrawerContextEntityStrip } from "@/features/_common/patterns/DrawerContextEntityStrip.tsx";
import { DrawerMainInfoGrid } from "../DrawerMainInfoGrid.tsx";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type BillingSpec = { type: "billing"; id: number };

function renderBillingStatusBadge(
  status:
    | "matched"
    | "unmatched"
    | "partially-matched"
    | "clarified"
    | "overmatched",
) {
  const variant = (
    {
      matched: "positive",
      unmatched: "destructive",
      "partially-matched": "warning",
      clarified: "positive",
      overmatched: "accent1",
    } as const
  )[status];
  const label = (
    {
      matched: "Matched",
      unmatched: "Unmatched",
      "partially-matched": "Partially Matched",
      clarified: "Clarified",
      overmatched: "Overmatched",
    } as const
  )[status];

  return (
    <Badge variant={variant} tone="secondary" size="sm">
      {label}
    </Badge>
  );
}

function BillingBreadcrumbLabel({
  entity,
  services,
}: {
  entity: BillingSpec;
  services: DrawerDescriptorServices;
}) {
  const billingRd = services.reportDisplayService.useBillingEntry(entity.id);
  return rd
    .journey(billingRd)
    .wait(<Skeleton className="h-4 w-24" />)
    .catch(renderSmallError("h-4 w-24"))
    .map((billing) => <>{billing.invoiceNumber || `Billing #${entity.id}`}</>);
}

function BillingSmallPreview({
  entity,
  services,
}: {
  entity: BillingSpec;
  services: DrawerDescriptorServices;
}) {
  const billingRd = services.reportDisplayService.useBillingEntry(entity.id);
  return rd
    .journey(billingRd)
    .wait(<Skeleton className="h-16 w-48" />)
    .catch(renderSmallError("h-16 w-48"))
    .map((billing) => {
      const clientLabel =
        (billing.client.name && billing.client.name.trim()) ||
        `#${billing.client.id}`;
      const workspaceLabel =
        (billing.workspace.name && billing.workspace.name.trim()) ||
        `#${billing.workspace.id}`;
      const invoiceNumberLabel =
        (billing.invoiceNumber && billing.invoiceNumber.trim()) ||
        `#${billing.id}`;
      const invoiceDateLabel = services.formatService.temporal.single.compact(
        billing.invoiceDate,
      );
      const paidLabel =
        billing.paidAt == null
          ? "Unpaid"
          : services.formatService.temporal.single.compact(billing.paidAt);
      return (
        <DrawerMainInfoGrid
          items={[
            { label: "Client", value: clientLabel },
            { label: "Workspace", value: workspaceLabel },
            { label: "Invoice #", value: invoiceNumberLabel },
            { label: "Invoice date", value: invoiceDateLabel },
            { label: "Paid", value: paidLabel },
            ...(billing.paidAtJustification
              ? [
                  {
                    label: "Payment note",
                    value: billing.paidAtJustification,
                  },
                ]
              : []),
            { label: "Status", value: renderBillingStatusBadge(billing.status) },
          ]}
        />
      );
    });
}

function BillingHeaderActions({
  entity,
  services,
}: {
  entity: BillingSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer, popEntityDrawer } = useEntityDrawerContext();
  const billingRd = services.reportDisplayService.useBillingEntry(entity.id);
  const billing = rd.tryGet(billingRd);
  if (billing == null) return null;
  return (
    <div className="flex items-center gap-2">
      <CommitStatusBadge
        id={billing.id}
        isCommitted={billing.originalBilling.isCommitted}
        entityType="billing"
        services={services}
      />
      <ActionMenu services={services}>
        <ActionMenuMarkPaidMenuItem
          billingId={entity.id}
          paidAt={billing.paidAt}
          services={services}
        />
        <ActionMenuDeleteItem
          onClick={() => {
            void services.mutationService.deleteBilling(entity.id);
            popEntityDrawer?.();
          }}
        >
          Delete Billing
        </ActionMenuDeleteItem>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "billing-form",
              id: entity.id,
              mode: "edit",
              defaultValues: billing.originalBilling,
            })
          }
        >
          Edit Billing
        </ActionMenuEditItem>
        <ActionMenuDuplicateItem
          onClick={() =>
            pushEntityDrawer({
              type: "billing-form",
              id: entity.id,
              mode: "duplicate",
              defaultValues: billing.originalBilling,
            })
          }
        >
          Duplicate Billing
        </ActionMenuDuplicateItem>
        <ActionMenuCopyItem copyText={entity.id.toString()}>
          Copy billing ID
        </ActionMenuCopyItem>
      </ActionMenu>
    </div>
  );
}

function BillingDrawerContent({
  entity,
  services,
}: {
  entity: BillingSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const billingRd = services.reportDisplayService.useBillingEntry(entity.id);
  return rd
    .journey(billingRd)
    .wait(
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>,
    )
    .catch(renderSmallError("min-h-24 w-full"))
    .map((billing) => (
      <>
        <DrawerContextEntityStrip
          services={services}
          workspace={billing.workspace}
          client={billing.client}
          onOpenClientDetails={(clientId) =>
            pushEntityDrawer({ type: "client", id: clientId })
          }
        />
        <ChargeInfo
          billing={billing}
          services={services}
          onOpenReportDetails={(reportId) =>
            pushEntityDrawer({ type: "report", id: reportId })
          }
        />
      </>
    ));
}

export const billingDrawerDescriptor: DrawerDescriptor<BillingSpec> = {
  getKey: (entity) => `billing-${entity.id}`,
  getLabel: (entity) => `Billing #${entity.id}`,
  getTitle: () => "Billing details",
  renderBreadcrumbLabel: (entity, services) => (
    <BillingBreadcrumbLabel entity={entity} services={services} />
  ),
  renderSmallPreview: (entity, services) => (
    <BillingSmallPreview entity={entity} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <BillingDrawerContent entity={entity} services={services} />
  ),
  renderHeaderActions: (entity, services) => (
    <BillingHeaderActions entity={entity} services={services} />
  ),
};
