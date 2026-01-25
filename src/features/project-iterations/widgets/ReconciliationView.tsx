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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import {
  BillingReconciliationPreview,
  CostReconciliationPreview,
  getBillingId,
  getCostId,
  getReportId,
  ReportBillingLinkPreview,
  ReportCostLinkPreview,
  ReportReconciliationPreview,
} from "@/services/front/ReconciliationService/ReconciliationService.ts";
import { rd, RemoteData } from "@passionware/monads";
import { toast } from "sonner";
import { useState } from "react";

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
  const reconciliation =
    props.services.reconciliationService.useReconciliationView({
      report: props.report,
      iteration: props.iteration,
      projectId: props.projectId,
      workspaceId: props.workspaceId,
      clientId: props.clientId,
    });

  // Get project to access clientId and workspaceIds (needed for executeReconciliation)
  const project = props.services.projectService.useProject(props.projectId);

  const [isReconciling, setIsReconciling] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{
    rowIndex: number;
    column: "cost" | "costLink" | "report" | "billingLink" | "billing";
  } | null>(null);

  const handleReconciliation = async () => {
    const preview = rd.tryGet(reconciliation);
    if (!preview) {
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

    setIsReconciling(true);
    try {
      await props.services.reconciliationService.executeReconciliation({
        preview,
        report: props.report,
        iteration: iterationData,
        project: {
          clientId: projectData.clientId,
          workspaceIds: projectData.workspaceIds,
        },
        projectIterationId: props.projectIterationId,
      });

      const totalItems =
        preview.reports.length +
        preview.billings.length +
        preview.costs.length +
        preview.reportBillingLinks.length +
        preview.reportCostLinks.length;

      toast.success(`Successfully reconciled ${totalItems} item(s)`);
    } catch (error) {
      console.error("Failed to reconcile:", error);
      toast.error("Failed to reconcile");
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>
            Preview of reconciliation operations based on generated report data.
            This includes reports, billing, costs, and their links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rd
            .journey(reconciliation)
            .wait(
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>,
            )
            .catch(renderError)
            .map((preview) => {
              const totalItems =
                preview.reports.length +
                preview.billings.length +
                preview.costs.length +
                preview.reportBillingLinks.length +
                preview.reportCostLinks.length;

              if (totalItems === 0) {
                return (
                  <div className="text-sm text-slate-600">
                    No items to reconcile for this iteration.
                  </div>
                );
              }

              // Helper function to render a compact item card
              const renderItemCard = (
                type: "cost" | "report" | "billing",
                item:
                  | CostReconciliationPreview
                  | ReportReconciliationPreview
                  | BillingReconciliationPreview,
                rowIndex: number,
                column: "cost" | "report" | "billing",
                isHighlighted: boolean,
              ) => {
                const isNew =
                  (type === "cost" &&
                    (item as CostReconciliationPreview).type === "create") ||
                  (type === "report" &&
                    (item as ReportReconciliationPreview).type === "create") ||
                  (type === "billing" &&
                    (item as BillingReconciliationPreview).type === "create");
                const id =
                  type === "cost"
                    ? getCostId(item as CostReconciliationPreview)
                    : type === "report"
                      ? getReportId(item as ReportReconciliationPreview)
                      : getBillingId(item as BillingReconciliationPreview);
                const label =
                  type === "cost"
                    ? "Cost"
                    : type === "report"
                      ? "Report"
                      : "Billing";

                return (
                  <Card
                    key={`${type}-${rowIndex}`}
                    className={`border-slate-200 mb-3 transition-all ${
                      isHighlighted
                        ? "ring-2 ring-indigo-500 shadow-lg scale-[1.02]"
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredItem({ rowIndex, column })}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">
                          {label} {id === 0 ? "(New)" : `#${id}`}
                        </span>
                        {isNew ? (
                          <Badge variant="success" tone="secondary" size="sm">
                            Will be created
                          </Badge>
                        ) : (
                          <Badge variant="info" tone="secondary" size="sm">
                            Will be updated
                          </Badge>
                        )}
                      </div>
                      {type === "report" && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Net Value:</span>
                            <span className="font-medium">
                              <CurrencyValueWidget
                                values={[
                                  {
                                    amount: (
                                      item as ReportReconciliationPreview
                                    ).netValue,
                                    currency: (
                                      item as ReportReconciliationPreview
                                    ).currency,
                                  },
                                ]}
                                services={props.services}
                                exchangeService={props.services.exchangeService}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Quantity:</span>
                            <span className="font-medium">
                              {(
                                item as ReportReconciliationPreview
                              ).quantity.toFixed(2)}{" "}
                              {(item as ReportReconciliationPreview).unit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Unit Price:</span>
                            <span className="font-medium">
                              {props.services.formatService.financial.amount(
                                (item as ReportReconciliationPreview).unitPrice,
                                (item as ReportReconciliationPreview).currency,
                              )}
                              /{(item as ReportReconciliationPreview).unit}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between mb-2">
                              <span className="text-slate-500 text-xs">
                                Billing Unit Price:
                              </span>
                              <span className="font-medium text-xs">
                                {props.services.formatService.financial.amount(
                                  (item as ReportReconciliationPreview)
                                    .billingUnitPrice,
                                  (item as ReportReconciliationPreview)
                                    .billingCurrency,
                                )}
                                /{(item as ReportReconciliationPreview).unit}
                              </span>
                            </div>
                            {(item as ReportReconciliationPreview)
                              .rateSignature && (
                              <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                <div className="font-medium mb-1">
                                  Rate Conditions:
                                </div>
                                <div className="text-slate-600">
                                  {
                                    (item as ReportReconciliationPreview)
                                      .rateSignature
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {type === "billing" && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Net Amount:</span>
                            <span className="font-medium">
                              <CurrencyValueWidget
                                values={[
                                  {
                                    amount: (
                                      item as BillingReconciliationPreview
                                    ).totalNet,
                                    currency: (
                                      item as BillingReconciliationPreview
                                    ).currency,
                                  },
                                ]}
                                services={props.services}
                                exchangeService={props.services.exchangeService}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Invoice:</span>
                            <span className="font-medium text-xs">
                              {
                                (item as BillingReconciliationPreview)
                                  .invoiceNumber
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      {type === "cost" && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Net Value:</span>
                            <span className="font-medium">
                              <CurrencyValueWidget
                                values={[
                                  {
                                    amount: (item as CostReconciliationPreview)
                                      .netValue,
                                    currency: (
                                      item as CostReconciliationPreview
                                    ).currency,
                                  },
                                ]}
                                services={props.services}
                                exchangeService={props.services.exchangeService}
                              />
                            </span>
                          </div>
                          {(item as CostReconciliationPreview)
                            .invoiceNumber && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Invoice:</span>
                              <span className="font-medium text-xs">
                                {
                                  (item as CostReconciliationPreview)
                                    .invoiceNumber
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              };

              // Build rows for 5-column layout: (cost)(link)(report)(link)(billing)
              // Each row represents a linked chain: cost -> report -> billing
              interface ReconciliationRow {
                cost: CostReconciliationPreview | null;
                costLink: ReportCostLinkPreview | null;
                report: ReportReconciliationPreview | null;
                billingLink: ReportBillingLinkPreview | null;
                billing: BillingReconciliationPreview | null;
              }

              const rows: ReconciliationRow[] = [];
              const usedCostIds = new Set<number>();
              const usedBillingIds = new Set<number>();

              // Iterate through ALL reports to ensure every report is displayed
              // Each report in preview.reports is already unique by contractor + rate + currency
              // (grouped in calculateReportReconciliation)
              // Reports are shown separately - each gets its own row
              for (const report of preview.reports) {
                const reportId = getReportId(report);
                // Find billing link for this report (match by reportId)
                const billingLink = preview.reportBillingLinks.find(
                  (bl) => bl.reportId === reportId,
                );
                const billing = billingLink
                  ? preview.billings.find(
                      (b) => getBillingId(b) === billingLink.billingId,
                    )
                  : null;

                // Find cost link for this report (match by reportId)
                const costLink = preview.reportCostLinks.find(
                  (cl) => cl.reportId === reportId,
                );
                const cost = costLink
                  ? preview.costs.find((c) => getCostId(c) === costLink.costId)
                  : null;

                // Check if cost/billing tiles are already used - if so, don't show them again
                // But always show the report tile (each report is separate)
                const isCostUsed = cost
                  ? usedCostIds.has(getCostId(cost))
                  : false;
                const isBillingUsed = billing
                  ? usedBillingIds.has(getBillingId(billing))
                  : false;

                rows.push({
                  cost: isCostUsed ? null : cost || null, // Only show cost tile if not already used
                  costLink: costLink || null,
                  report, // Always show the report tile - each report is separate
                  billingLink: billingLink || null,
                  billing: isBillingUsed ? null : billing || null, // Only show billing tile if not already used
                });

                // Mark items as used (for tile deduplication)
                if (cost && !isCostUsed) {
                  usedCostIds.add(getCostId(cost));
                }
                if (billing && !isBillingUsed) {
                  usedBillingIds.add(getBillingId(billing));
                }
              }

              // Add standalone costs (no links)
              for (const cost of preview.costs) {
                const costId = getCostId(cost);
                if (usedCostIds.has(costId)) continue;

                rows.push({
                  cost,
                  costLink: null,
                  report: null,
                  billingLink: null,
                  billing: null,
                });

                usedCostIds.add(costId);
              }

              // Add standalone billings (no links)
              for (const billing of preview.billings) {
                const billingId = getBillingId(billing);
                if (usedBillingIds.has(billingId)) continue;

                rows.push({
                  cost: null,
                  costLink: null,
                  report: null,
                  billingLink: null,
                  billing,
                });

                usedBillingIds.add(billingId);
              }

              // Helper to render link card with breakdown
              const renderLink = (
                link: ReportCostLinkPreview | ReportBillingLinkPreview | null,
                rowIndex: number,
                column: "costLink" | "billingLink",
                isHighlighted: boolean,
              ) => {
                if (!link) {
                  return (
                    <div className="flex items-center justify-center h-full min-h-[120px]">
                      <div className="text-xs text-slate-300">—</div>
                    </div>
                  );
                }

                // Determine link type based on properties
                const isCostLink = "costId" in link;
                const costLink = isCostLink
                  ? (link as ReportCostLinkPreview)
                  : null;
                const billingLink = !isCostLink
                  ? (link as ReportBillingLinkPreview)
                  : null;

                return (
                  <Card
                    className={`border-slate-200 mb-3 transition-all ${
                      isHighlighted
                        ? "ring-2 ring-indigo-500 shadow-lg scale-[1.02]"
                        : ""
                    }`}
                    onMouseEnter={() => setHoveredItem({ rowIndex, column })}
                    onMouseLeave={() => setHoveredItem(null)}
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
                        {costLink ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantity:</span>
                              <span className="font-medium">
                                {costLink.breakdown.quantity.toFixed(2)}{" "}
                                {costLink.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Report Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  costLink.breakdown.reportUnitPrice,
                                  costLink.breakdown.reportCurrency,
                                )}
                                /{costLink.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Cost Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  costLink.breakdown.costUnitPrice,
                                  costLink.breakdown.costCurrency,
                                )}
                                /{costLink.breakdown.unit}
                              </span>
                            </div>
                            {costLink.breakdown.exchangeRate !== 1 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Exchange Rate:
                                </span>
                                <span className="font-medium text-xs">
                                  {costLink.breakdown.exchangeRate.toFixed(4)}
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
                                        amount: costLink.reportAmount,
                                        currency:
                                          costLink.breakdown.reportCurrency,
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
                                        amount: costLink.costAmount,
                                        currency:
                                          costLink.breakdown.costCurrency,
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
                        ) : billingLink ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantity:</span>
                              <span className="font-medium">
                                {billingLink.breakdown.quantity.toFixed(2)}{" "}
                                {billingLink.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Report Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  billingLink.breakdown.reportUnitPrice,
                                  billingLink.breakdown.reportCurrency,
                                )}
                                /{billingLink.breakdown.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Billing Unit Price:
                              </span>
                              <span className="font-medium">
                                {props.services.formatService.financial.amount(
                                  billingLink.breakdown.billingUnitPrice,
                                  billingLink.breakdown.billingCurrency,
                                )}
                                /{billingLink.breakdown.unit}
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
                                        amount: billingLink.reportAmount,
                                        currency:
                                          billingLink.breakdown.reportCurrency,
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
                                        amount: billingLink.billingAmount,
                                        currency:
                                          billingLink.breakdown.billingCurrency,
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

              return (
                <div className="space-y-4">
                  {/* Column Headers */}
                  <div className="grid grid-cols-5 gap-4 pb-2 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-700">
                      Cost
                    </div>
                    <div className="text-sm font-semibold text-slate-700 text-center">
                      Link
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      Report
                    </div>
                    <div className="text-sm font-semibold text-slate-700 text-center">
                      Link
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      Billing
                    </div>
                  </div>

                  {/* Rows */}
                  {rows.length > 0 ? (
                    rows.map((row, index) => {
                      // Determine which items should be highlighted based on hover
                      // Cost card hover → highlight cost + costLink
                      // Cost link hover → highlight cost + costLink + report
                      // Report card hover → highlight costLink + report + billingLink
                      // Billing link hover → highlight report + billingLink + billing
                      // Billing card hover → highlight billingLink + billing
                      const isCostHighlighted =
                        hoveredItem?.rowIndex === index &&
                        (hoveredItem.column === "cost" ||
                          hoveredItem.column === "costLink");
                      const isCostLinkHighlighted =
                        hoveredItem?.rowIndex === index &&
                        (hoveredItem.column === "costLink" ||
                          hoveredItem.column === "cost" ||
                          hoveredItem.column === "report");
                      const isReportHighlighted =
                        hoveredItem?.rowIndex === index &&
                        (hoveredItem.column === "report" ||
                          hoveredItem.column === "costLink" ||
                          hoveredItem.column === "billingLink");
                      const isBillingLinkHighlighted =
                        hoveredItem?.rowIndex === index &&
                        (hoveredItem.column === "billingLink" ||
                          hoveredItem.column === "report" ||
                          hoveredItem.column === "billing");
                      const isBillingHighlighted =
                        hoveredItem?.rowIndex === index &&
                        (hoveredItem.column === "billing" ||
                          hoveredItem.column === "billingLink");

                      return (
                        <div
                          key={index}
                          className="grid grid-cols-5 gap-4 items-start"
                        >
                          {/* Cost Column */}
                          <div>
                            {row.cost ? (
                              renderItemCard(
                                "cost",
                                row.cost,
                                index,
                                "cost",
                                isCostHighlighted,
                              )
                            ) : (
                              <div className="text-xs text-slate-400 italic py-8 text-center">
                                —
                              </div>
                            )}
                          </div>

                          {/* Cost Link Column */}
                          <div>
                            {renderLink(
                              row.costLink,
                              index,
                              "costLink",
                              isCostLinkHighlighted,
                            )}
                          </div>

                          {/* Report Column */}
                          <div>
                            {row.report ? (
                              renderItemCard(
                                "report",
                                row.report,
                                index,
                                "report",
                                isReportHighlighted,
                              )
                            ) : (
                              <div className="text-xs text-slate-400 italic py-8 text-center">
                                —
                              </div>
                            )}
                          </div>

                          {/* Billing Link Column */}
                          <div>
                            {renderLink(
                              row.billingLink,
                              index,
                              "billingLink",
                              isBillingLinkHighlighted,
                            )}
                          </div>

                          {/* Billing Column */}
                          <div>
                            {row.billing ? (
                              renderItemCard(
                                "billing",
                                row.billing,
                                index,
                                "billing",
                                isBillingHighlighted,
                              )
                            ) : (
                              <div className="text-xs text-slate-400 italic py-8 text-center">
                                —
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-600 py-8 text-center">
                      No items to reconcile
                    </div>
                  )}

                  {/* Links Summary */}
                  {(preview.reportBillingLinks.length > 0 ||
                    preview.reportCostLinks.length > 0) && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">
                          {preview.reportCostLinks.length} cost link
                          {preview.reportCostLinks.length !== 1 ? "s" : ""}
                        </span>
                        {" · "}
                        <span className="font-medium">
                          {preview.reportBillingLinks.length} billing link
                          {preview.reportBillingLinks.length !== 1 ? "s" : ""}
                        </span>
                        {" will be created"}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <Button
                      onClick={handleReconciliation}
                      disabled={isReconciling}
                      className="w-full md:w-auto"
                    >
                      {isReconciling
                        ? "Reconciling..."
                        : `Reconcile ${totalItems} Item(s)`}
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
