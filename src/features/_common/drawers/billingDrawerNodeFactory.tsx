import type { BillingPayload } from "@/api/billing/billing.api.ts";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import type { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { DrawerMainInfoGrid } from "./DrawerMainInfoGrid.tsx";
import { getCreateNode } from "./entityDrawerCreateNode";
import type { DrawerServices } from "./entityDrawerNodeFactory.types";
import type { EntityDrawerNode } from "./useEntityDrawerState";

export type BillingDetailEntity = { type: "billing"; id: number };

export type BillingFormEntity = {
  type: "billing-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: BillingPayload;
};

export type BillingDrawerEntity = BillingDetailEntity | BillingFormEntity;

// ----- Detail factory -----

export type BillingDetailDrawerFactoryDeps = DrawerServices & {
  billingById: Map<number, BillingViewEntry>;
  pushEntityDrawer: (node: EntityDrawerNode) => void;
  popEntityDrawer?: () => void;
};

function renderUnavailableBilling() {
  return (
    <div className="text-sm text-muted-foreground">
      Selected entity is not available in current list scope.
    </div>
  );
}

export function createBillingDetailDrawerNodeFactory(
  deps: BillingDetailDrawerFactoryDeps,
): (entity: BillingDetailEntity) => EntityDrawerNode {
  const { billingById, services, pushEntityDrawer, popEntityDrawer } = deps;
  const createNode = getCreateNode();

  return (entity) => {
    const billing = billingById.get(entity.id);
    if (!billing) {
      return {
        key: `billing-${entity.id}`,
        entity: { type: "billing", id: entity.id },
        label: `Billing #${entity.id}`,
        title: "Billing details",
        render: () => renderUnavailableBilling(),
      };
    }

    return {
      key: `billing-${entity.id}`,
      entity: { type: "billing", id: entity.id },
      label: `Billing #${entity.id}`,
      title: "Billing details",
      renderHeaderActions: () => (
        <div className="flex items-center gap-2">
          <CommitStatusBadge
            id={billing.id}
            isCommitted={billing.originalBilling.isCommitted}
            entityType="billing"
            services={services}
          />
          <ActionMenu services={services}>
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
                pushEntityDrawer(
                  createNode({
                    type: "billing-form",
                    id: entity.id,
                    mode: "edit",
                    defaultValues: billing.originalBilling,
                  }),
                )
              }
            >
              Edit Billing
            </ActionMenuEditItem>
            <ActionMenuDuplicateItem
              onClick={() =>
                pushEntityDrawer(
                  createNode({
                    type: "billing-form",
                    id: entity.id,
                    mode: "duplicate",
                    defaultValues: billing.originalBilling,
                  }),
                )
              }
            >
              Duplicate Billing
            </ActionMenuDuplicateItem>
            <ActionMenuCopyItem copyText={entity.id.toString()}>
              Copy billing ID
            </ActionMenuCopyItem>
          </ActionMenu>
        </div>
      ),
      renderMainInfo: () => (
        <DrawerMainInfoGrid
          items={[
            {
              label: "Client",
              value: billing.client.name || `#${billing.client.id}`,
            },
            {
              label: "Workspace",
              value: billing.workspace.name || `#${billing.workspace.id}`,
            },
            { label: "Invoice #", value: billing.invoiceNumber },
            {
              label: "Invoice date",
              value: services.formatService.temporal.single.compact(
                billing.invoiceDate,
              ),
            },
          ]}
        />
      ),
      render: () => (
        <ChargeInfo
          billing={billing}
          services={services}
          onOpenReportDetails={(reportId) =>
            pushEntityDrawer(createNode({ type: "report", id: reportId }))
          }
        />
      ),
    };
  };
}

// ----- Form factory -----

export type BillingFormDrawerFactoryDeps = DrawerServices & {
  popEntityDrawer?: () => void;
};

export function createBillingFormDrawerNodeFactory(
  deps: BillingFormDrawerFactoryDeps,
): (entity: BillingFormEntity) => EntityDrawerNode {
  const { services, popEntityDrawer } = deps;

  return (entity) => {
    const handleCancel = () => popEntityDrawer?.();
    return {
      key: `billing-form-${entity.id}-${entity.mode}`,
      label: entity.mode === "edit" ? "Edit billing" : "Duplicate billing",
      title: entity.mode === "edit" ? "Edit billing" : "Duplicate billing",
      render: () => (
        <BillingForm
          defaultValues={entity.defaultValues}
          services={services}
          onCancel={handleCancel}
          onSubmit={async (
            payload: BillingPayload,
            changes: Partial<BillingPayload>,
          ) => {
            if (entity.mode === "edit") {
              await services.mutationService.editBilling(entity.id, changes);
            } else {
              await services.mutationService.createBilling(payload);
            }
            popEntityDrawer?.();
          }}
        />
      ),
    };
  };
}
