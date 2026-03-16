import type { ReportPayload } from "@/api/reports/reports.api.ts";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { ReportCostInfo } from "@/features/_common/info/ReportCostInfo.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { ExternalLink } from "lucide-react";
import type { EntityDrawerNode } from "./useEntityDrawerState";
import { DrawerMainInfoGrid } from "./DrawerMainInfoGrid.tsx";
import { getCreateNode } from "./entityDrawerCreateNode";
import type {
  DrawerContext,
  DrawerServices,
} from "./entityDrawerNodeFactory.types";
import type { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";

export type ReportDetailEntity = { type: "report"; id: number };

export type ReportFormEntity = {
  type: "report-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: ReportPayload;
};

export type ReportDrawerEntity = ReportDetailEntity | ReportFormEntity;

// ----- Detail factory -----

export type ReportDetailDrawerFactoryDeps = DrawerServices & {
  reportById: Map<number, ReportViewEntry>;
  context: DrawerContext;
  pushEntityDrawer: (node: EntityDrawerNode) => void;
  popEntityDrawer?: () => void;
};

function renderUnavailableReport() {
  return (
    <div className="text-sm text-muted-foreground">
      Selected entity is not available in current list scope.
    </div>
  );
}

export function createReportDetailDrawerNodeFactory(
  deps: ReportDetailDrawerFactoryDeps,
): (entity: ReportDetailEntity) => EntityDrawerNode {
  const { reportById, context, services, pushEntityDrawer, popEntityDrawer } =
    deps;
  const createNode = getCreateNode();

  return (entity) => {
    const report = reportById.get(entity.id);
    if (!report) {
      return {
        key: `report-${entity.id}`,
        entity: { type: "report", id: entity.id },
        label: `Report #${entity.id}`,
        title: "Report details",
        render: () => renderUnavailableReport(),
      };
    }

    return {
      key: `report-${entity.id}`,
      entity: { type: "report", id: entity.id },
      label: `Report #${entity.id}`,
      title: "Report details",
      renderHeaderActions: () => (
        <div className="flex items-center gap-2">
          <CommitStatusBadge
            id={report.id}
            isCommitted={report.originalReport.isCommitted}
            entityType="report"
            services={services}
          />
          <ActionMenu services={services}>
            <ActionMenuDeleteItem
              onClick={() => {
                void services.mutationService.deleteCostReport(entity.id);
                popEntityDrawer?.();
              }}
            >
              Delete Report
            </ActionMenuDeleteItem>
            <ActionMenuEditItem
              onClick={() =>
                pushEntityDrawer(
                  createNode({
                    type: "report-form",
                    id: entity.id,
                    mode: "edit",
                    defaultValues: report.originalReport,
                  }),
                )
              }
            >
              Edit Report
            </ActionMenuEditItem>
            <ActionMenuDuplicateItem
              onClick={() =>
                pushEntityDrawer(
                  createNode({
                    type: "report-form",
                    id: entity.id,
                    mode: "duplicate",
                    defaultValues: report.originalReport,
                  }),
                )
              }
            >
              Duplicate Report
            </ActionMenuDuplicateItem>
            <DropdownMenuItem
              onClick={async () => {
                await services.expressionService.ensureExpressionValue(
                  {
                    clientId: report.client.id,
                    contractorId: report.contractor.id,
                    workspaceId: report.workspace.id,
                  },
                  "vars.open_report_action",
                  {
                    reportStart: report.periodStart,
                    reportEnd: report.periodEnd,
                  },
                );
              }}
            >
              <ExternalLink className="size-4" />
              Navigate to report
            </DropdownMenuItem>
            <ActionMenuCopyItem copyText={entity.id.toString()}>
              Copy report ID
            </ActionMenuCopyItem>
          </ActionMenu>
        </div>
      ),
      renderMainInfo: () => (
        <DrawerMainInfoGrid
          items={[
            {
              label: "Client",
              value: report.client.name || `#${report.client.id}`,
            },
            {
              label: "Workspace",
              value: report.workspace.name || `#${report.workspace.id}`,
            },
            {
              label: "Contractor",
              value: report.contractor.fullName || `#${report.contractor.id}`,
            },
            {
              label: "Period",
              value: services.formatService.temporal.range.long(
                report.periodStart,
                report.periodEnd,
              ),
            },
          ]}
        />
      ),
      render: () => (
        <>
          <ReportInfo
            report={report}
            workspaceId={idSpecUtils.mapSpecificOrElse(
              context.workspaceId,
              (x) => x,
              report.workspace.id,
            )}
            clientId={idSpecUtils.mapSpecificOrElse(
              context.clientId,
              (x) => x,
              report.client.id,
            )}
            services={services}
            onOpenBillingDetails={(billingId) =>
              pushEntityDrawer(createNode({ type: "billing", id: billingId }))
            }
          />
          <div className="mt-4">
            <ReportCostInfo
              report={report}
              services={services}
              onOpenCostDetails={(costId) =>
                pushEntityDrawer(createNode({ type: "cost", id: costId }))
              }
            />
          </div>
        </>
      ),
    };
  };
}

// ----- Form factory -----

export type ReportFormDrawerFactoryDeps = DrawerServices & {
  popEntityDrawer?: () => void;
};

export function createReportFormDrawerNodeFactory(
  deps: ReportFormDrawerFactoryDeps,
): (entity: ReportFormEntity) => EntityDrawerNode {
  const { services, popEntityDrawer } = deps;

  return (entity) => {
    const handleCancel = () => popEntityDrawer?.();
    return {
      key: `report-form-${entity.id}-${entity.mode}`,
      label: entity.mode === "edit" ? "Edit report" : "Duplicate report",
      title: entity.mode === "edit" ? "Edit report" : "Duplicate report",
      render: () => (
        <ReportForm
          defaultValues={entity.defaultValues}
          services={services}
          onCancel={handleCancel}
          onSubmit={async (
            payload: ReportPayload,
            changes: Partial<ReportPayload>,
          ) => {
            if (entity.mode === "edit") {
              await services.mutationService.editReport(entity.id, changes);
            } else {
              await services.mutationService.createReport(payload);
            }
            popEntityDrawer?.();
          }}
        />
      ),
    };
  };
}
