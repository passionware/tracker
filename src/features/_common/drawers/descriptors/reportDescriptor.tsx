import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { ReportCostInfo } from "@/features/_common/info/ReportCostInfo.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { rd } from "@passionware/monads";
import { ExternalLink } from "lucide-react";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { DrawerContextEntityStrip } from "@/features/_common/patterns/DrawerContextEntityStrip.tsx";
import { DrawerMainInfoGrid } from "../DrawerMainInfoGrid.tsx";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type ReportSpec = { type: "report"; id: number };

function renderReportStatusBadge(
  status: "billed" | "partially-billed" | "clarified" | "uncovered",
) {
  const variant = (
    {
      billed: "positive",
      "partially-billed": "warning",
      clarified: "positive",
      uncovered: "destructive",
    } as const
  )[status];
  const label = (
    {
      billed: "Billed",
      "partially-billed": "Partially Billed",
      clarified: "Clarified",
      uncovered: "Uncovered",
    } as const
  )[status];

  return (
    <Badge variant={variant} tone="secondary" size="sm">
      {label}
    </Badge>
  );
}

function ReportBreadcrumbLabel({
  entity,
  services,
}: {
  entity: ReportSpec;
  services: DrawerDescriptorServices;
}) {
  const reportRd = services.reportDisplayService.useReportEntry(entity.id);
  return rd
    .journey(reportRd)
    .wait(<Skeleton className="h-4 w-24" />)
    .catch(renderSmallError("h-4 w-24"))
    .map((report) => (
      <>{report.originalReport.description || `Report #${entity.id}`}</>
    ));
}

function ReportSmallPreview({
  entity,
  services,
}: {
  entity: ReportSpec;
  services: DrawerDescriptorServices;
}) {
  const reportRd = services.reportDisplayService.useReportEntry(entity.id);
  return rd
    .journey(reportRd)
    .wait(<Skeleton className="h-16 w-48" />)
    .catch(renderSmallError("h-16 w-48"))
    .map((report) => {
      const clientLabel =
        (report.client.name && report.client.name.trim()) ||
        `#${report.client.id}`;
      const workspaceLabel =
        (report.workspace.name && report.workspace.name.trim()) ||
        `#${report.workspace.id}`;
      const contractorLabel =
        (report.contractor.fullName && report.contractor.fullName.trim()) ||
        `#${report.contractor.id}`;
      const periodLabel = services.formatService.temporal.range.long(
        report.periodStart,
        report.periodEnd,
      );
      return (
        <DrawerMainInfoGrid
          items={[
            { label: "Client", value: clientLabel },
            { label: "Workspace", value: workspaceLabel },
            { label: "Contractor", value: contractorLabel },
            { label: "Period", value: periodLabel },
            { label: "Status", value: renderReportStatusBadge(report.status) },
          ]}
        />
      );
    });
}

function ReportHeaderActions({
  entity,
  services,
}: {
  entity: ReportSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer, popEntityDrawer } = useEntityDrawerContext();
  const reportRd = services.reportDisplayService.useReportEntry(entity.id);
  const report = rd.tryGet(reportRd);
  if (report == null) return null;
  return (
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
            pushEntityDrawer({
              type: "report-form",
              id: entity.id,
              mode: "edit",
              defaultValues: report.originalReport,
            })
          }
        >
          Edit Report
        </ActionMenuEditItem>
        <ActionMenuDuplicateItem
          onClick={() =>
            pushEntityDrawer({
              type: "report-form",
              id: entity.id,
              mode: "duplicate",
              defaultValues: report.originalReport,
            })
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
  );
}

function ReportDrawerContent({
  entity,
  services,
}: {
  entity: ReportSpec;
  services: DrawerDescriptorServices;
}) {
  const { context, pushEntityDrawer } = useEntityDrawerContext();
  const reportRd = services.reportDisplayService.useReportEntry(entity.id);
  return rd
    .journey(reportRd)
    .wait(
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>,
    )
    .catch(renderSmallError("min-h-24 w-full"))
    .map((report) => (
      <>
        <DrawerContextEntityStrip
          services={services}
          workspace={report.workspace}
          client={report.client}
          onOpenClientDetails={(clientId) =>
            pushEntityDrawer({ type: "client", id: clientId })
          }
        />
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
            pushEntityDrawer({ type: "billing", id: billingId })
          }
        />
        <div className="mt-4">
          <ReportCostInfo
            report={report}
            services={services}
            onOpenCostDetails={(costId) =>
              pushEntityDrawer({ type: "cost", id: costId })
            }
          />
        </div>
      </>
    ));
}

export const reportDrawerDescriptor = {
  getKey: (entity) => `report-${entity.id}`,
  getLabel: (entity) => `Report #${entity.id}`,
  getTitle: () => "Report details",
  renderBreadcrumbLabel: (entity, services) => (
    <ReportBreadcrumbLabel entity={entity} services={services} />
  ),
  renderSmallPreview: (entity, services) => (
    <ReportSmallPreview entity={entity} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <ReportDrawerContent entity={entity} services={services} />
  ),
  renderHeaderActions: (entity, services) => (
    <ReportHeaderActions entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<ReportSpec>;
