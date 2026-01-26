import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { BillingPreview } from "@/features/_common/previews/BillingPreview.tsx";
import { CostPreview } from "@/features/_common/previews/CostPreview.tsx";
import { ReportPreview } from "@/features/_common/previews/ReportPreview.tsx";
import { BillingPicker } from "@/features/_common/pickers/BillingPicker.tsx";
import { CostPicker } from "@/features/_common/pickers/CostPicker.tsx";
import { ReportPicker } from "@/features/_common/pickers/ReportPicker.tsx";
import { X } from "lucide-react";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import {
  ReportFact,
  BillingFact,
  CostFact,
  LinkCostReportFact,
  LinkBillingReportFact,
  Fact,
} from "@/services/front/ReconciliationService/ReconciliationService.types.ts";
import { maybe, mt, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";

// Helper function to extract ID from fact
function getFactId(fact: ReportFact | BillingFact | CostFact): number {
  return fact.action.type === "update" ? fact.action.id : 0;
}

// Simple BFS traversal: follow links based on fact types and direction constraints
function findRelatedFactUuids(
  startUuid: string,
  uuidToFactType: Map<string, Fact["type"]>,
  facts: Array<Fact>,
): Set<string> {
  const related = new Set<string>([startUuid]);
  const visited = new Set<string>([startUuid]);
  const startFactType = uuidToFactType.get(startUuid);
  if (!startFactType) return related;

  // Build connections: fact UUID -> Set of directly connected UUIDs
  const connections = new Map<string, Set<string>>();
  facts.forEach((fact) => connections.set(fact.uuid, new Set()));

  // Link facts connect to entities in their linkedFacts array
  facts.forEach((fact) => {
    if (fact.type === "linkCostReport" || fact.type === "linkBillingReport") {
      const linkFact = fact as LinkCostReportFact | LinkBillingReportFact;
      linkFact.linkedFacts.forEach((linkedUuid) => {
        connections.get(linkFact.uuid)!.add(linkedUuid);
        connections.get(linkedUuid)!.add(linkFact.uuid);
      });
    }
  });

  // Determine allowed directions
  const canGoRight =
    startFactType === "cost" ||
    startFactType === "linkCostReport" ||
    startFactType === "report";
  const canGoLeft =
    startFactType === "billing" ||
    startFactType === "linkBillingReport" ||
    startFactType === "report";

  // BFS with direction tracking
  const queue: Array<{
    uuid: string;
    canGoRight: boolean;
    canGoLeft: boolean;
  }> = [{ uuid: startUuid, canGoRight, canGoLeft }];

  while (queue.length > 0) {
    const { uuid, canGoRight: canR, canGoLeft: canL } = queue.shift()!;
    const factType = uuidToFactType.get(uuid);
    if (!factType) continue;

    for (const neighborUuid of connections.get(uuid) || []) {
      if (visited.has(neighborUuid)) continue;
      const neighborType = uuidToFactType.get(neighborUuid);
      if (!neighborType || neighborType === startFactType) continue;

      // Determine if this is a valid forward traversal
      const isRightward =
        (factType === "cost" && neighborType === "linkCostReport") ||
        (factType === "linkCostReport" && neighborType === "report") ||
        (factType === "report" && neighborType === "linkBillingReport") ||
        (factType === "linkBillingReport" && neighborType === "billing");

      const isLeftward =
        (factType === "billing" && neighborType === "linkBillingReport") ||
        (factType === "linkBillingReport" && neighborType === "report") ||
        (factType === "report" && neighborType === "linkCostReport");

      // Allow reverse traversal from link facts to their connected entities (for highlighting)
      const isReverseToEntity =
        (factType === "linkCostReport" && neighborType === "cost") ||
        (factType === "linkBillingReport" && neighborType === "billing");

      if ((canR && isRightward) || (canL && isLeftward) || isReverseToEntity) {
        visited.add(neighborUuid);
        related.add(neighborUuid);
        queue.push({
          uuid: neighborUuid,
          canGoRight: isRightward || (canR && neighborType === "report"),
          canGoLeft: isLeftward || (canL && neighborType === "report"),
        });
      }
    }
  }

  return related;
}

export function ReconciliationView(
  props: WithFrontServices & {
    report: GeneratedReportSource;
    iteration: RemoteData<ProjectIteration>;
    projectIterationId: ProjectIteration["id"];
    projectId: number;
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const facts = props.services.reconciliationService.useReconciliationView({
    report: props.report,
    iteration: props.iteration,
    projectId: props.projectId,
    workspaceId: props.workspaceId,
    clientId: props.clientId,
  });

  // Get project to access clientId and workspaceIds (needed for executeReconciliation)
  const project = props.services.projectService.useProject(props.projectId);

  const [hoveredFactUuid, setHoveredFactUuid] = useState<string | null>(null);

  // Get facts data once
  const factsData = rd.tryGet(facts);

  // Compute highlighted facts based on hovered fact UUID
  // Use facts directly to avoid dependency on potentially unstable factsData reference
  const highlightedFactUuids = useMemo(() => {
    if (!hoveredFactUuid) {
      return new Set<string>();
    }

    const currentFactsData = rd.tryGet(facts);
    if (!currentFactsData) {
      return new Set<string>();
    }

    const activeFacts = currentFactsData.filter(
      (fact) => fact.action.type !== "ignore",
    );

    // Build UUID to fact type map for directional traversal
    const uuidToFactType = new Map<string, Fact["type"]>();
    activeFacts.forEach((fact) => {
      uuidToFactType.set(fact.uuid, fact.type);
    });

    return findRelatedFactUuids(hoveredFactUuid, uuidToFactType, activeFacts);
  }, [hoveredFactUuid, facts]);

  const reconciliationMutation = promiseState.useMutation(async () => {
    if (!factsData) {
      toast.error("Reconciliation data not available");
      return;
    }

    const iterationData = rd.tryGet(props.iteration);
    if (!iterationData) {
      toast.error("Iteration data not available");
      return;
    }

    const projectData = rd.tryGet(project);
    if (!projectData) {
      toast.error("Project data not available");
      return;
    }

    await props.services.reconciliationService.executeReconciliation({
      facts: factsData,
      report: props.report,
      iteration: iterationData,
      project: {
        clientId: projectData.clientId,
        workspaceIds: projectData.workspaceIds,
      },
      projectIterationId: props.projectIterationId,
    });

    toast.success(`Successfully reconciled ${factsData.length} item(s)`);
  });

  const handleReconciliation = () => {
    reconciliationMutation.track(undefined).catch((error) => {
      console.error("Failed to reconcile:", error);
      toast.error("Failed to reconcile");
    });
  };

  const isReconciling = mt.isInProgress(reconciliationMutation.state);

  // Calculate totalItems from reconciliation data for header button
  const totalItems = factsData ? factsData.length : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Reconciliation</CardTitle>
              <CardDescription>
                Preview of reconciliation operations based on generated report
                data. This includes reports, billing, costs, and their links.
              </CardDescription>
            </div>
            {totalItems > 0 && (
              <Button
                onClick={handleReconciliation}
                disabled={isReconciling}
                className="shrink-0"
              >
                {isReconciling
                  ? "Reconciling..."
                  : `Reconcile ${totalItems} Item(s)`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-0">
          {rd
            .journey(facts)
            .wait(
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>,
            )
            .catch(renderError)
            .map((factsData) => {
              // Filter out ignored facts
              const activeFacts = factsData.filter(
                (fact) => fact.action.type !== "ignore",
              );

              if (activeFacts.length === 0) {
                return (
                  <div className="text-sm text-slate-600">
                    No items to reconcile for this iteration.
                  </div>
                );
              }

              // Helper function to format amount as string
              const formatAmountAsString = (
                value: number,
                currency: string,
              ): string => {
                const formatter = new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: currency || "EUR",
                  currencyDisplay: "symbol",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                return formatter.format(Math.abs(value));
              };

              // Helper function to render field diff (old -> new)
              const renderFieldDiff = (
                label: string,
                oldValue: string | number | null | undefined,
                newValue: string | number | null | undefined,
                formatter?: (
                  value: string | number | null | undefined,
                ) => string,
              ) => {
                const formatValue = formatter || ((v) => String(v ?? "—"));
                const oldFormatted = formatValue(oldValue);
                const newFormatted = formatValue(newValue);
                const hasChanged = oldFormatted !== newFormatted;

                if (!hasChanged) {
                  return (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{label}:</span>
                      <span className="font-medium">{newFormatted}</span>
                    </div>
                  );
                }

                return (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">{label}:</span>
                    <div className="text-right">
                      <div className="text-slate-400 line-through text-xs">
                        {oldFormatted}
                      </div>
                      <div className="font-medium text-green-600">
                        {newFormatted}
                      </div>
                    </div>
                  </div>
                );
              };

              // Navigation handlers for header buttons
              const handleCostHeaderClick = () => {
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .costs(),
                );
              };

              const handleReportHeaderClick = () => {
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .reports(),
                );
              };

              const handleBillingHeaderClick = () => {
                props.services.navigationService.navigate(
                  props.services.routingService
                    .forWorkspace(props.workspaceId)
                    .forClient(props.clientId)
                    .charges(),
                );
              };

              // Helper function to render a compact item card
              const renderItemCard = (
                type: "cost" | "report" | "billing",
                item: CostFact | ReportFact | BillingFact,
              ) => {
                const isHighlighted = highlightedFactUuids.has(item.uuid);
                const isUpdate = item.action.type === "update";
                const id = getFactId(item);
                const label =
                  type === "cost"
                    ? "Cost"
                    : type === "report"
                      ? "Report"
                      : "Billing";

                return (
                  <Card
                    key={`${type}-${item.uuid}`}
                    className={`border-slate-200 bg-white mb-3 transition-all ${
                      isHighlighted
                        ? "ring-2 ring-indigo-500 shadow-lg scale-[1.02] bg-indigo-50"
                        : ""
                    }`}
                    onMouseOver={() => setHoveredFactUuid(item.uuid)}
                    onMouseLeave={() => setHoveredFactUuid(null)}
                  >
                    <CardContent className="p-4 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {(type === "report" || type === "cost") && (
                            <>
                              {type === "report" && (
                                <ContractorWidget
                                  contractorId={maybe.of(
                                    (item as ReportFact).payload.contractorId,
                                  )}
                                  services={props.services}
                                  layout="avatar"
                                  size="sm"
                                />
                              )}
                              {type === "cost" &&
                                (item as CostFact).payload.contractorId !==
                                  null &&
                                (item as CostFact).payload.contractorId !==
                                  undefined && (
                                  <ContractorWidget
                                    contractorId={maybe.of(
                                      (item as CostFact).payload.contractorId!,
                                    )}
                                    services={props.services}
                                    layout="avatar"
                                    size="sm"
                                  />
                                )}
                              {type === "cost" &&
                                ((item as CostFact).payload.contractorId ===
                                  null ||
                                  (item as CostFact).payload.contractorId ===
                                    undefined) &&
                                (item as CostFact).payload.counterparty && (
                                  <div className="text-xs text-slate-500">
                                    {(item as CostFact).payload.counterparty}
                                  </div>
                                )}
                            </>
                          )}
                          <span className="text-sm font-medium text-slate-700">
                            {label} {id === 0 ? "(New)" : `#${id}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge
                                variant={id === 0 ? "success" : "info"}
                                tone="secondary"
                                size="sm"
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {id === 0
                                  ? "Will be created"
                                  : "Will be updated"}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[600px] max-h-[80vh] overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PopoverHeader>
                                {id === 0
                                  ? `Select ${label}`
                                  : `${label} #${id} Preview`}
                              </PopoverHeader>
                              {id === 0 ? (
                                <div className="space-y-4">
                                  <div className="text-sm text-slate-500">
                                    This {label.toLowerCase()} will be created
                                    during reconciliation.
                                  </div>
                                  {type === "cost" && (
                                    <CostPicker
                                      services={props.services}
                                      workspaceId={props.workspaceId}
                                      clientId={props.clientId}
                                      onSelect={(costId) => {
                                        // TODO: Handle selection - link fact to existing cost
                                        console.log("Select cost", costId);
                                      }}
                                    />
                                  )}
                                  {type === "report" && (
                                    <ReportPicker
                                      services={props.services}
                                      workspaceId={props.workspaceId}
                                      clientId={props.clientId}
                                      onSelect={(reportId) => {
                                        // TODO: Handle selection - link fact to existing report
                                        console.log("Select report", reportId);
                                      }}
                                    />
                                  )}
                                  {type === "billing" && (
                                    <BillingPicker
                                      services={props.services}
                                      workspaceId={props.workspaceId}
                                      clientId={props.clientId}
                                      onSelect={(billingId) => {
                                        // TODO: Handle selection - link fact to existing billing
                                        console.log(
                                          "Select billing",
                                          billingId,
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {type === "cost" && (
                                    <CostPreview
                                      services={props.services}
                                      costId={id}
                                    />
                                  )}
                                  {type === "report" && (
                                    <ReportPreview
                                      services={props.services}
                                      reportId={id}
                                    />
                                  )}
                                  {type === "billing" && (
                                    <BillingPreview
                                      services={props.services}
                                      billingId={id}
                                    />
                                  )}
                                  <div className="pt-4 border-t border-slate-200">
                                    <div className="text-sm font-medium mb-2">
                                      Change {label}:
                                    </div>
                                    {type === "cost" && (
                                      <CostPicker
                                        services={props.services}
                                        workspaceId={props.workspaceId}
                                        clientId={props.clientId}
                                        onSelect={(costId) => {
                                          // TODO: Handle selection - link fact to existing cost
                                          console.log("Select cost", costId);
                                        }}
                                      />
                                    )}
                                    {type === "report" && (
                                      <ReportPicker
                                        services={props.services}
                                        workspaceId={props.workspaceId}
                                        clientId={props.clientId}
                                        onSelect={(reportId) => {
                                          // TODO: Handle selection - link fact to existing report
                                          console.log(
                                            "Select report",
                                            reportId,
                                          );
                                        }}
                                      />
                                    )}
                                    {type === "billing" && (
                                      <BillingPicker
                                        services={props.services}
                                        workspaceId={props.workspaceId}
                                        clientId={props.clientId}
                                        onSelect={(billingId) => {
                                          // TODO: Handle selection - link fact to existing billing
                                          console.log(
                                            "Select billing",
                                            billingId,
                                          );
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="pt-2">
                                    <Button
                                      variant="outline-destructive"
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Handle clear - set back to "will be created"
                                        console.log("Clear", type, id);
                                      }}
                                      className="w-full"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Clear (will be created)
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {type === "report" && (
                        <div className="space-y-2 text-sm">
                          {isUpdate &&
                          item.action.type === "update" &&
                          item.action.oldValues ? (
                            (() => {
                              const reportFact = item as ReportFact;
                              const oldValues = item.action
                                .oldValues as Partial<ReportFact["payload"]>;
                              return (
                                <>
                                  {renderFieldDiff(
                                    "Net Value",
                                    oldValues.netValue,
                                    reportFact.payload.netValue,
                                    (value) => {
                                      return formatAmountAsString(
                                        value as number,
                                        (oldValues.currency ||
                                          reportFact.payload
                                            .currency) as string,
                                      );
                                    },
                                  )}
                                  {renderFieldDiff(
                                    "Quantity",
                                    oldValues.quantity !== null &&
                                      oldValues.quantity !== undefined
                                      ? `${oldValues.quantity!.toFixed(2)} ${
                                          oldValues.unit || "h"
                                        }`
                                      : undefined,
                                    `${reportFact.payload.quantity!.toFixed(2)} ${
                                      reportFact.payload.unit || "h"
                                    }`,
                                  )}
                                  {renderFieldDiff(
                                    "Unit Price",
                                    oldValues.unitPrice !== null &&
                                      oldValues.unitPrice !== undefined
                                      ? `${formatAmountAsString(
                                          oldValues.unitPrice!,
                                          (oldValues.currency ||
                                            reportFact.payload
                                              .currency) as string,
                                        )}/${oldValues.unit || "h"}`
                                      : undefined,
                                    `${formatAmountAsString(
                                      reportFact.payload.unitPrice!,
                                      reportFact.payload.currency,
                                    )}/${reportFact.payload.unit || "h"}`,
                                  )}
                                  {renderFieldDiff(
                                    "Currency",
                                    oldValues.currency,
                                    reportFact.payload.currency,
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Net Value:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount: (item as ReportFact).payload
                                          .netValue,
                                        currency: (item as ReportFact).payload
                                          .currency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Quantity:
                                </span>
                                <span className="font-medium">
                                  {(
                                    item as ReportFact
                                  ).payload.quantity!.toFixed(2)}{" "}
                                  {(item as ReportFact).payload.unit || "h"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Unit Price:
                                </span>
                                <span className="font-medium">
                                  {props.services.formatService.financial.amount(
                                    (item as ReportFact).payload.unitPrice!,
                                    (item as ReportFact).payload.currency,
                                  )}
                                  /{(item as ReportFact).payload.unit || "h"}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="pt-2 border-t border-slate-200">
                            {(item as ReportFact).payload.description && (
                              <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                <div className="font-medium mb-1">
                                  Description:
                                </div>
                                <div className="text-slate-600 whitespace-pre-wrap">
                                  {(item as ReportFact).payload.description}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {type === "billing" && (
                        <div className="space-y-2 text-sm">
                          {isUpdate &&
                          item.action.type === "update" &&
                          item.action.oldValues ? (
                            (() => {
                              const billingFact = item as BillingFact;
                              const oldValues = item.action
                                .oldValues as Partial<BillingFact["payload"]>;
                              return (
                                <>
                                  {renderFieldDiff(
                                    "Net Amount",
                                    oldValues.totalNet,
                                    billingFact.payload.totalNet,
                                    (value) => {
                                      return formatAmountAsString(
                                        value as number,
                                        (oldValues.currency ||
                                          billingFact.payload
                                            .currency) as string,
                                      );
                                    },
                                  )}
                                  {renderFieldDiff(
                                    "Gross Amount",
                                    oldValues.totalGross,
                                    billingFact.payload.totalGross,
                                    (value) => {
                                      return formatAmountAsString(
                                        value as number,
                                        (oldValues.currency ||
                                          billingFact.payload
                                            .currency) as string,
                                      );
                                    },
                                  )}
                                  {renderFieldDiff(
                                    "Currency",
                                    oldValues.currency,
                                    billingFact.payload.currency,
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Net Amount:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount: (item as BillingFact).payload
                                          .totalNet,
                                        currency: (item as BillingFact).payload
                                          .currency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Invoice:</span>
                                <span className="font-medium text-xs">
                                  {(item as BillingFact).payload.invoiceNumber}
                                </span>
                              </div>
                            </>
                          )}
                          {(item as BillingFact).payload.description && (
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-xs text-slate-500">
                                <div className="font-medium mb-1">
                                  Description:
                                </div>
                                <div className="text-slate-600 whitespace-pre-wrap">
                                  {(item as BillingFact).payload.description}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {type === "cost" && (
                        <div className="space-y-2 text-sm">
                          {isUpdate &&
                          item.action.type === "update" &&
                          item.action.oldValues ? (
                            (() => {
                              const costFact = item as CostFact;
                              const oldValues = item.action
                                .oldValues as Partial<CostFact["payload"]>;
                              return (
                                <>
                                  {renderFieldDiff(
                                    "Net Value",
                                    oldValues.netValue,
                                    costFact.payload.netValue,
                                    (value) => {
                                      return formatAmountAsString(
                                        value as number,
                                        (oldValues.currency ||
                                          costFact.payload.currency) as string,
                                      );
                                    },
                                  )}
                                  {renderFieldDiff(
                                    "Gross Value",
                                    oldValues.grossValue,
                                    costFact.payload.grossValue,
                                    (value) => {
                                      return value !== null &&
                                        value !== undefined
                                        ? formatAmountAsString(
                                            value as number,
                                            (oldValues.currency ||
                                              costFact.payload
                                                .currency) as string,
                                          )
                                        : "—";
                                    },
                                  )}
                                  {renderFieldDiff(
                                    "Currency",
                                    oldValues.currency,
                                    costFact.payload.currency,
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Net Value:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount: (item as CostFact).payload
                                          .netValue,
                                        currency: (item as CostFact).payload
                                          .currency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                              {(item as CostFact).payload.invoiceNumber && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">
                                    Invoice:
                                  </span>
                                  <span className="font-medium text-xs">
                                    {(item as CostFact).payload.invoiceNumber}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {(item as CostFact).payload.description && (
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-xs text-slate-500">
                                <div className="font-medium mb-1">
                                  Description:
                                </div>
                                <div className="text-slate-600 whitespace-pre-wrap">
                                  {(item as CostFact).payload.description}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              };

              // Build rows for 5-column layout: (cost)(costLink)(report)(billingLink)(billing)
              // Display facts 1:1 - each fact gets its own row
              interface ReconciliationRow {
                cost: CostFact | null;
                costLink: LinkCostReportFact | null;
                report: ReportFact | null;
                billingLink: LinkBillingReportFact | null;
                billing: BillingFact | null;
              }

              // Separate facts by type
              const costFacts = activeFacts.filter(
                (f): f is CostFact => f.type === "cost",
              );
              const reportFacts = activeFacts.filter(
                (f): f is ReportFact => f.type === "report",
              );
              const billingFacts = activeFacts.filter(
                (f): f is BillingFact => f.type === "billing",
              );
              const costLinkFacts = activeFacts.filter(
                (f): f is LinkCostReportFact => f.type === "linkCostReport",
              );
              const billingLinkFacts = activeFacts.filter(
                (f): f is LinkBillingReportFact =>
                  f.type === "linkBillingReport",
              );

              const rows: ReconciliationRow[] = [];

              // Track which links have been shown to avoid duplicates
              const shownCostLinks = new Set<string>(); // fact UUID
              const shownBillingLinks = new Set<string>(); // fact UUID

              // Step 1: Add all costs (each cost gets its own row)
              for (const cost of costFacts) {
                // Find cost-report link for this cost
                const costLink = costLinkFacts.find(
                  (cl) =>
                    cl.linkedFacts.includes(cost.uuid) &&
                    !shownCostLinks.has(cl.uuid),
                );

                if (costLink) {
                  shownCostLinks.add(costLink.uuid);
                }

                rows.push({
                  cost,
                  costLink: costLink || null,
                  report: null,
                  billingLink: null,
                  billing: null,
                });
              }

              // Step 2: Add all reports (each report gets its own row)
              for (const report of reportFacts) {
                // Find links for this report (only unshown ones)
                const costLink = costLinkFacts.find(
                  (cl) =>
                    cl.linkedFacts.includes(report.uuid) &&
                    !shownCostLinks.has(cl.uuid),
                );

                const billingLink = billingLinkFacts.find(
                  (bl) =>
                    bl.linkedFacts.includes(report.uuid) &&
                    !shownBillingLinks.has(bl.uuid),
                );

                if (costLink) {
                  shownCostLinks.add(costLink.uuid);
                }
                if (billingLink) {
                  shownBillingLinks.add(billingLink.uuid);
                }

                rows.push({
                  cost: null,
                  costLink: costLink || null,
                  report,
                  billingLink: billingLink || null,
                  billing: null,
                });
              }

              // Step 3: Add all billings (each billing gets its own row)
              for (const billing of billingFacts) {
                // Find first unshown billing-report link for this billing
                const billingLink = billingLinkFacts.find(
                  (bl) =>
                    bl.linkedFacts.includes(billing.uuid) &&
                    !shownBillingLinks.has(bl.uuid),
                );

                if (billingLink) {
                  shownBillingLinks.add(billingLink.uuid);
                }

                rows.push({
                  cost: null,
                  costLink: null,
                  report: null,
                  billingLink: billingLink || null,
                  billing,
                });
              }

              // Step 4: Add remaining billing-report links that weren't shown
              for (const billingLink of billingLinkFacts) {
                if (!shownBillingLinks.has(billingLink.uuid)) {
                  rows.push({
                    cost: null,
                    costLink: null,
                    report: null,
                    billingLink,
                    billing: null,
                  });
                }
              }

              // Step 5: Add remaining cost-report links that weren't shown
              for (const costLink of costLinkFacts) {
                if (!shownCostLinks.has(costLink.uuid)) {
                  rows.push({
                    cost: null,
                    costLink,
                    report: null,
                    billingLink: null,
                    billing: null,
                  });
                }
              }

              // Helper to render link card with breakdown
              const renderLink = (
                link: LinkCostReportFact | LinkBillingReportFact,
              ) => {
                const isHighlighted = highlightedFactUuids.has(link.uuid);
                // Determine link type based on fact type
                const isCostLink = link.type === "linkCostReport";
                const costLink = isCostLink
                  ? (link as LinkCostReportFact)
                  : null;
                const billingLink = !isCostLink
                  ? (link as LinkBillingReportFact)
                  : null;

                return (
                  <Card
                    key={`link-${link.uuid}`}
                    className={`border-2 border-dashed border-purple-300 bg-purple-50/30 mb-3 transition-all ${
                      isHighlighted
                        ? "ring-2 ring-purple-500 shadow-lg scale-[1.02] bg-purple-100 border-purple-400"
                        : ""
                    }`}
                    onMouseOver={() => setHoveredFactUuid(link.uuid)}
                    onMouseLeave={() => setHoveredFactUuid(null)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">
                          Link
                        </span>
                        <Badge
                          variant={isCostLink ? "info" : "primary"}
                          tone="secondary"
                          size="sm"
                        >
                          {isCostLink ? "Cost → Report" : "Report → Billing"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        {costLink && costLink.payload.breakdown ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantity:</span>
                              <span className="font-medium">
                                {costLink.payload.breakdown.quantity.toFixed(2)}{" "}
                                {costLink.payload.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Report Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  costLink.payload.breakdown.reportUnitPrice,
                                  costLink.payload.breakdown.reportCurrency,
                                )}
                                /{costLink.payload.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Cost Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  costLink.payload.breakdown.costUnitPrice,
                                  costLink.payload.breakdown.costCurrency,
                                )}
                                /{costLink.payload.breakdown.unit}
                              </span>
                            </div>
                            {costLink.payload.breakdown.exchangeRate !== 1 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Exchange Rate:
                                </span>
                                <span className="font-medium text-xs">
                                  {costLink.payload.breakdown.exchangeRate.toFixed(
                                    4,
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Report Amount:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount: costLink.payload.reportAmount,
                                        currency:
                                          costLink.payload.breakdown
                                            .reportCurrency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Cost Amount:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount: costLink.payload.costAmount,
                                        currency:
                                          costLink.payload.breakdown
                                            .costCurrency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                            </div>
                          </>
                        ) : billingLink && billingLink.payload.breakdown ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantity:</span>
                              <span className="font-medium">
                                {billingLink.payload.breakdown.quantity.toFixed(
                                  2,
                                )}{" "}
                                {billingLink.payload.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Report Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  billingLink.payload.breakdown.reportUnitPrice,
                                  billingLink.payload.breakdown.reportCurrency,
                                )}
                                /{billingLink.payload.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Billing Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  billingLink.payload.breakdown
                                    .billingUnitPrice,
                                  billingLink.payload.breakdown.billingCurrency,
                                )}
                                /{billingLink.payload.breakdown.unit}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Report Amount:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount:
                                          billingLink.payload.reportAmount,
                                        currency:
                                          billingLink.payload.breakdown
                                            .reportCurrency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Billing Amount:
                                </span>
                                <span className="font-medium">
                                  <CurrencyValueWidget
                                    values={[
                                      {
                                        amount:
                                          billingLink.payload.billingAmount,
                                        currency:
                                          billingLink.payload.breakdown
                                            .billingCurrency,
                                      },
                                    ]}
                                    services={props.services}
                                    exchangeService={
                                      props.services.exchangeService
                                    }
                                  />
                                </span>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              };

              // Separate items by column type (only actual items, no placeholders)
              const costItems: CostFact[] = [];
              const costLinkItems: LinkCostReportFact[] = [];
              const reportItems: ReportFact[] = [];
              const billingLinkItems: LinkBillingReportFact[] = [];
              const billingItems: BillingFact[] = [];

              // Track which links have been added to avoid duplicates
              const addedCostLinks = new Set<string>();
              const addedBillingLinks = new Set<string>();

              rows.forEach((row) => {
                if (row.cost) {
                  costItems.push(row.cost);
                }
                if (row.costLink && !addedCostLinks.has(row.costLink.uuid)) {
                  costLinkItems.push(row.costLink);
                  addedCostLinks.add(row.costLink.uuid);
                }
                if (row.report) {
                  reportItems.push(row.report);
                }
                if (
                  row.billingLink &&
                  !addedBillingLinks.has(row.billingLink.uuid)
                ) {
                  billingLinkItems.push(row.billingLink);
                  addedBillingLinks.add(row.billingLink.uuid);
                }
                if (row.billing) {
                  billingItems.push(row.billing);
                }
              });

              return (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Column Headers */}
                  <div className="flex flex-row gap-4 pb-2 border-b border-slate-200 shrink-0">
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCostHeaderClick();
                        }}
                        className="text-sm font-semibold text-slate-700 hover:text-indigo-600 active:text-indigo-700 cursor-pointer text-left transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded relative z-10"
                        style={{ pointerEvents: "auto" }}
                      >
                        Cost
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-sm font-semibold text-slate-700">
                        Cost→Report Link
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReportHeaderClick();
                        }}
                        className="text-sm font-semibold text-slate-700 hover:text-indigo-600 active:text-indigo-700 cursor-pointer text-left transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded relative z-10"
                        style={{ pointerEvents: "auto" }}
                      >
                        Report
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-sm font-semibold text-slate-700">
                        Report→Billing Link
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBillingHeaderClick();
                        }}
                        className="text-sm font-semibold text-slate-700 hover:text-indigo-600 active:text-indigo-700 cursor-pointer text-left transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded relative z-10"
                        style={{ pointerEvents: "auto" }}
                      >
                        Billing
                      </button>
                    </div>
                  </div>

                  {/* Columns */}
                  {rows.length > 0 ? (
                    <div className="flex flex-row gap-4 flex-1 min-h-0">
                      {/* Cost Column */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-2">
                        <div className="space-y-3">
                          {costItems.map((item, index) => (
                            <div key={`cost-${item.uuid}-${index}`}>
                              {renderItemCard("cost", item)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cost Link Column */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-2">
                        <div className="space-y-3">
                          {costLinkItems.map((item, index) => (
                            <div key={`costLink-${item.uuid}-${index}`}>
                              {renderLink(item)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Report Column */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-2">
                        <div className="space-y-3">
                          {reportItems.map((item, index) => (
                            <div key={`report-${item.uuid}-${index}`}>
                              {renderItemCard("report", item)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Billing Link Column */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-2">
                        <div className="space-y-3">
                          {billingLinkItems.map((item, index) => (
                            <div key={`billingLink-${item.uuid}-${index}`}>
                              {renderLink(item)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Billing Column */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-2">
                        <div className="space-y-3">
                          {billingItems.map((item, index) => (
                            <div key={`billing-${item.uuid}-${index}`}>
                              {renderItemCard("billing", item)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 py-8 text-center">
                      No items to reconcile
                    </div>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
