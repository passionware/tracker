import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import {
  ReportCostInfo,
  ReportCostInfoProps,
} from "@/features/_common/info/ReportCostInfo.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  BillingViewEntry,
  CostEntry,
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { DrawerMainInfoGrid } from "./DrawerMainInfoGrid.tsx";
import { EntityDrawerNode, EntityDrawerTarget } from "./useEntityDrawerState.ts";

type DrawerServices = WithServices<
  [
    WithFormatService,
    WithMutationService,
    WithPreferenceService,
    WithReportDisplayService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithExpressionService,
  ]
>;

export interface CreateEntityDrawerNodeFactoryProps extends DrawerServices {
  reportById: Map<number, ReportViewEntry>;
  costById: Map<number, CostEntry>;
  billingById: Map<number, BillingViewEntry>;
  context: {
    clientId: ClientSpec;
    workspaceId: WorkspaceSpec;
  };
  pushEntityDrawer: (node: EntityDrawerNode) => void;
}

function getEntityLabel(entity: EntityDrawerTarget) {
  return `${entity.type === "report" ? "Report" : entity.type === "cost" ? "Cost" : "Billing"} #${entity.id}`;
}

function getEntityTitle(entity: EntityDrawerTarget) {
  if (entity.type === "report") {
    return "Report details";
  }
  if (entity.type === "cost") {
    return "Cost details";
  }
  return "Billing details";
}

function renderUnavailableEntity() {
  return (
    <div className="text-sm text-muted-foreground">
      Selected entity is not available in current list scope.
    </div>
  );
}

export function createEntityDrawerNodeFactory({
  reportById,
  costById,
  billingById,
  context,
  services,
  pushEntityDrawer,
}: CreateEntityDrawerNodeFactoryProps) {
  function createNode(entity: EntityDrawerTarget): EntityDrawerNode {
    return {
      key: `${entity.type}-${entity.id}`,
      entity,
      label: getEntityLabel(entity),
      title: getEntityTitle(entity),
      renderMainInfo: () => {
        if (entity.type === "report") {
          const report = reportById.get(entity.id);
          if (!report) {
            return null;
          }
          return (
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
          );
        }

        if (entity.type === "cost") {
          const cost = costById.get(entity.id);
          if (!cost) {
            return null;
          }
          return (
            <DrawerMainInfoGrid
              items={[
                {
                  label: "Workspace",
                  value: cost.workspace.name || `#${cost.workspace.id}`,
                },
                {
                  label: "Contractor",
                  value: cost.contractor?.fullName || "-",
                },
                {
                  label: "Invoice date",
                  value: services.formatService.temporal.single.compact(cost.invoiceDate),
                },
                { label: "Status", value: cost.status },
              ]}
            />
          );
        }

        const billing = billingById.get(entity.id);
        if (!billing) {
          return null;
        }
        return (
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
                value: services.formatService.temporal.single.compact(billing.invoiceDate),
              },
            ]}
          />
        );
      },
      render: () => {
        if (entity.type === "report") {
          const report = reportById.get(entity.id);
          if (!report) {
            return renderUnavailableEntity();
          }
          return (
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
                  services={services as unknown as ReportCostInfoProps["services"]}
                  onOpenCostDetails={(costId) =>
                    pushEntityDrawer(createNode({ type: "cost", id: costId }))
                  }
                />
              </div>
            </>
          );
        }

        if (entity.type === "cost") {
          const cost = costById.get(entity.id);
          if (!cost) {
            return renderUnavailableEntity();
          }
          return (
            <CostInfo
              costEntry={cost}
              clientId={idSpecUtils.mapSpecificOrElse(
                context.clientId,
                (x) => x,
                idSpecUtils.ofAll(),
              )}
              workspaceId={idSpecUtils.mapSpecificOrElse(
                context.workspaceId,
                (x) => x,
                idSpecUtils.ofAll(),
              )}
              services={services}
              onOpenReportDetails={(reportId) =>
                pushEntityDrawer(createNode({ type: "report", id: reportId }))
              }
            />
          );
        }

        const billing = billingById.get(entity.id);
        if (!billing) {
          return renderUnavailableEntity();
        }
        return (
          <ChargeInfo
            billing={billing}
            services={services}
            onOpenReportDetails={(reportId) =>
              pushEntityDrawer(createNode({ type: "report", id: reportId }))
            }
          />
        );
      },
    };
  }

  return createNode;
}
