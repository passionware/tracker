"use client";

import type { ReportQuery } from "@/api/reports/reports.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { BulkDeleteAlertDialog } from "@/features/_common/bulk/BulkDeleteAlertDialog.tsx";
import { CostListBulkDeleteMenuItem } from "@/features/_common/bulk/CostListBulkDeleteMenuItem.tsx";
import { ProjectIterationBulkStatusSubmenu } from "@/features/_common/bulk/ProjectIterationBulkStatusSubmenu.tsx";
import { ReportListBulkMenuItems } from "@/features/_common/bulk/ReportListBulkMenuItems.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ListToolbarActionsMenu } from "@/features/_common/ListToolbar.tsx";
import {
  getBillingViewTotalsStripRows,
  getCostViewTotalsStripRows,
  getReportViewTotalsStripRows,
  TotalsSummaryStrip,
} from "@/features/_common/listTotalsSummaryStrip.tsx";
import { BillingBulkDialogs } from "@/features/billing/BillingBulkDialogs.tsx";
import { BillingListBulkActions } from "@/features/billing/BillingListBulkActions.tsx";
import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { expressionContextUtils } from "@/services/front/ExpressionService/ExpressionService.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type {
  BillingView,
  BillingViewEntry,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type { TimelineItem } from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import {
  selectionState,
  type SelectionState,
} from "@/platform/lang/SelectionState.ts";
import { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import {
  maybe,
  mt,
  rd,
  type Maybe,
  type RemoteData,
} from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Loader2, X } from "lucide-react";
import { capitalize } from "lodash";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  projectTimelineSelectionKeyFromItem,
  type ProjectTimelineItemData,
} from "./projectTimelineModel.ts";

/** Strip layout aligned with toolbar row (centered metrics, start-aligned group). */
const bulkStatsSummaryClassName =
  "min-w-0 flex-1 flex-wrap items-center justify-start gap-x-2 sm:gap-x-3 md:gap-x-4";

function ProjectTimelineEntityStatsRow(props: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex shrink-0 items-center text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground sm:h-8 sm:w-22">
        {props.label}
      </div>
      <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-x-1">
        {props.children}
      </div>
    </div>
  );
}

function ProjectTimelineBillingBulkStatsStrip(props: {
  services: WithFrontServices["services"];
  billingViewRd: RemoteData<BillingView>;
}) {
  const summary = rd.tryMap(props.billingViewRd, (view) => {
    const totals = view.totalSelected ?? view.total;
    return (
      <TotalsSummaryStrip
        rows={getBillingViewTotalsStripRows(totals)}
        formatContext={props.services}
        summaryClassName={bulkStatsSummaryClassName}
      />
    );
  });

  return (
    <>
      {summary ??
        (rd.isPending(props.billingViewRd) ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Loading billing totals"
          />
        ) : null)}
    </>
  );
}

/** Cost totals for the bulk bar (same metrics as the costs list caption). */
function ProjectTimelineCostBulkStatsSummary(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    costIds: number[];
  },
) {
  const costQuery = useMemo(
    () => costQueryUtils.ofDefault(props.workspaceId, props.clientId),
    [props.workspaceId, props.clientId],
  );
  const costViewRd = props.services.reportDisplayService.useCostView(
    maybe.of(costQuery),
    props.costIds,
  );

  const summary = rd.tryMap(costViewRd, (view) => {
    const totals = view.totalSelected ?? view.total;
    return (
      <TotalsSummaryStrip
        rows={getCostViewTotalsStripRows(totals)}
        formatContext={props.services}
        summaryClassName={bulkStatsSummaryClassName}
      />
    );
  });

  return (
    <>
      {summary ??
        (rd.isPending(costViewRd) ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Loading cost totals"
          />
        ) : null)}
    </>
  );
}

/** Report financial totals for the bulk bar (same metrics as the reports list caption). */
function ProjectTimelineReportBulkStatsSummary(
  props: WithFrontServices & {
    reportQuery: Maybe<ReportQuery>;
    reportIds: number[];
  },
) {
  const reportViewRd = props.services.reportDisplayService.useReportView(
    props.reportQuery,
    props.reportIds,
  );

  const summary = rd.tryMap(reportViewRd, (view) => {
    const totals = view.totalSelected ?? view.total;
    return (
      <TotalsSummaryStrip
        rows={getReportViewTotalsStripRows(totals)}
        formatContext={props.services}
        summaryClassName={bulkStatsSummaryClassName}
      />
    );
  });

  return (
    <>
      {summary ??
        (rd.isPending(reportViewRd) ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Loading report totals"
          />
        ) : null)}
    </>
  );
}

function parseTimelineKey(
  k: string,
): { kind: string; id: number } | null {
  const idx = k.lastIndexOf(":");
  if (idx <= 0) return null;
  const kind = k.slice(0, idx);
  const id = Number(k.slice(idx + 1));
  if (!Number.isFinite(id)) return null;
  return { kind, id };
}

export interface ProjectTimelineFloatingBulkBarProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  selection: SelectionState<string>;
  onSelectionChange: (s: SelectionState<string>) => void;
  timelineItems: TimelineItem<ProjectTimelineItemData>[];
  iterations: ProjectIteration[];
  reportQuery: Maybe<ReportQuery>;
}

export function ProjectTimelineFloatingBulkBar(
  props: ProjectTimelineFloatingBulkBarProps,
) {
  const { openEntityDrawer } = useEntityDrawerContext();
  const allKeys = useMemo(
    () => props.timelineItems.map(projectTimelineSelectionKeyFromItem),
    [props.timelineItems],
  );

  const selectedKeys = useMemo(
    () => selectionState.getSelectedIds(props.selection, allKeys),
    [props.selection, allKeys],
  );

  const {
    reportIds,
    billingIds,
    costIds,
    iterationIds,
  } = useMemo(() => {
    const reportIds: number[] = [];
    const billingIds: number[] = [];
    const costIds: number[] = [];
    const iterationIds: number[] = [];
    const seenIt = new Set<number>();
    for (const k of selectedKeys) {
      const p = parseTimelineKey(k);
      if (!p) continue;
      switch (p.kind) {
        case "report":
          reportIds.push(p.id);
          break;
        case "billing":
          billingIds.push(p.id);
          break;
        case "cost":
          costIds.push(p.id);
          break;
        case "iteration":
        case "iteration-budget":
          if (!seenIt.has(p.id)) {
            seenIt.add(p.id);
            iterationIds.push(p.id);
          }
          break;
        default:
          break;
      }
    }
    return { reportIds, billingIds, costIds, iterationIds };
  }, [selectedKeys]);

  const totalSelected = selectedKeys.length;
  const hasSelection = totalSelected > 0;

  const billingQuery = useMemo(
    () => billingQueryUtils.ofDefault(props.workspaceId, props.clientId),
    [props.workspaceId, props.clientId],
  );
  const billingVariableContext = useMemo(
    () =>
      expressionContextUtils
        .ofGlobal()
        .setWorkspace(props.workspaceId)
        .setClient(props.clientId)
        .setContractor(idSpecUtils.ofAll())
        .build(),
    [props.workspaceId, props.clientId],
  );

  const billingViewRd = props.services.reportDisplayService.useBillingView(
    maybe.of(billingQuery),
    billingIds.length > 0 ? billingIds : undefined,
  );

  const selectedBillingEntries = useMemo(() => {
    const entries = rd.tryGet(billingViewRd)?.entries ?? [];
    const set = new Set(billingIds);
    return entries.filter((e) => set.has(e.id));
  }, [billingViewRd, billingIds]);

  const selectedUnpaidBillings = useMemo(
    () => selectedBillingEntries.filter((e) => e.paidAt == null),
    [selectedBillingEntries],
  );

  const allBillingEntriesForMatcher = useMemo(
    () => rd.tryGet(billingViewRd)?.entries ?? [],
    [billingViewRd],
  );

  const [deleteReportOpen, setDeleteReportOpen] = useState(false);
  const [deleteBillingOpen, setDeleteBillingOpen] = useState(false);
  const [deleteCostOpen, setDeleteCostOpen] = useState(false);
  const [bulkMarkPaidOpen, setBulkMarkPaidOpen] = useState(false);
  const [paymentMatcherOpen, setPaymentMatcherOpen] = useState(false);
  const [paymentMatcherUnpaidSnapshot, setPaymentMatcherUnpaidSnapshot] =
    useState<BillingViewEntry[]>([]);
  const [iterationMenuOpen, setIterationMenuOpen] = useState(false);

  const deleteReportMutation = promiseState.useMutation(async () => {
    if (reportIds.length === 0) return;
    await props.services.mutationService.bulkDeleteCostReport(reportIds);
    props.onSelectionChange(selectionState.selectNone());
    toast.success(`Deleted ${reportIds.length} report(s)`);
  });

  const deleteBillingMutation = promiseState.useMutation(async () => {
    if (billingIds.length === 0) return;
    await props.services.mutationService.bulkDeleteBilling(billingIds);
    props.onSelectionChange(selectionState.selectNone());
    toast.success(`Deleted ${billingIds.length} billing record(s)`);
  });

  const deleteCostMutation = promiseState.useMutation(async () => {
    if (costIds.length === 0) return;
    await props.services.mutationService.bulkDeleteCost(costIds);
    props.onSelectionChange(selectionState.selectNone());
    toast.success(`Deleted ${costIds.length} cost(s)`);
  });

  const bulkIterationMutation = promiseState.useMutation(
    async (status: "draft" | "active" | "closed") => {
      if (iterationIds.length === 0) return;
      await props.services.mutationService.bulkEditProjectIteration(
        iterationIds,
        { status },
      );
      props.onSelectionChange(selectionState.selectNone());
      setIterationMenuOpen(false);
      toast.success(
        `Updated ${iterationIds.length} iteration(s) to ${capitalize(status)}`,
      );
    },
  );

  const handleBulkIteration = useCallback(
    async (status: "draft" | "active" | "closed") => {
      try {
        await bulkIterationMutation.track(status);
      } catch {
        toast.error("Failed to update iteration status");
      }
    },
    [bulkIterationMutation],
  );

  if (!hasSelection) {
    return null;
  }

  const hasFinancialStats =
    reportIds.length > 0 ||
    billingIds.length > 0 ||
    costIds.length > 0;

  return (
    <>
      <div
        className={[
          "pointer-events-none fixed bottom-6 right-0 z-50 flex justify-center px-2 transition-[left] duration-200",
          // Wrapper occupies exactly the content area (right of any desktop sidebar)
          // via the variables exposed by SidebarProvider, so the centered card never
          // bleeds under the sidebar or off the viewport edge.
          "left-[var(--app-content-offset-left)]",
        ].join(" ")}
      >
        <Card
          className={[
            "pointer-events-auto flex max-w-full flex-wrap items-center gap-3 border-border/80 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm",
            hasFinancialStats ? "sm:gap-4" : "",
          ].join(" ")}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              {totalSelected} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() =>
                props.onSelectionChange(selectionState.selectNone())
              }
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </Button>
            <div className="h-6 w-px bg-border" aria-hidden />
            {reportIds.length > 0 ? (
              <ListToolbarActionsMenu
                selectedCount={reportIds.length}
                label="Reports"
                contentClassName="min-w-[11rem]"
              >
                <ReportListBulkMenuItems
                  selectedCount={reportIds.length}
                  onCreateCost={() =>
                    openEntityDrawer({
                      type: "bulk-create-cost-for-reports",
                      reportIds,
                      afterCreate: () =>
                        props.onSelectionChange(selectionState.selectNone()),
                    })
                  }
                  onDeleteRequest={() => setDeleteReportOpen(true)}
                  deleteLabel="Delete reports"
                />
              </ListToolbarActionsMenu>
            ) : null}
            {iterationIds.length > 0 ? (
              <ListToolbarActionsMenu
                selectedCount={iterationIds.length}
                label="Iterations"
                open={iterationMenuOpen}
                onOpenChange={setIterationMenuOpen}
                disabled={
                  iterationIds.length === 0 ||
                  mt.isInProgress(bulkIterationMutation.state)
                }
                disabledReason={
                  mt.isInProgress(bulkIterationMutation.state)
                    ? "Updating iteration status…"
                    : undefined
                }
              >
                <ProjectIterationBulkStatusSubmenu
                  mutationInProgress={mt.isInProgress(
                    bulkIterationMutation.state,
                  )}
                  onStatusChange={handleBulkIteration}
                />
              </ListToolbarActionsMenu>
            ) : null}
            {billingIds.length > 0 ? (
              <BillingListBulkActions
                selectedCount={billingIds.length}
                selectedUnpaidCount={selectedUnpaidBillings.length}
                label="Billings"
                onMarkPaid={() => setBulkMarkPaidOpen(true)}
                onMatchPayments={() => {
                  setPaymentMatcherUnpaidSnapshot(selectedUnpaidBillings);
                  setPaymentMatcherOpen(true);
                }}
                onDeleteRequest={() => setDeleteBillingOpen(true)}
              />
            ) : null}
            {costIds.length > 0 ? (
              <ListToolbarActionsMenu
                selectedCount={costIds.length}
                label="Costs"
              >
                <CostListBulkDeleteMenuItem
                  selectedCount={costIds.length}
                  onDeleteRequest={() => setDeleteCostOpen(true)}
                  label="Delete costs"
                />
              </ListToolbarActionsMenu>
            ) : null}
          </div>
          {hasFinancialStats ? (
            <div className="flex min-h-0 min-w-0 flex-1 basis-full flex-col gap-3 border-t border-border/60 pt-3 sm:basis-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              {reportIds.length > 0 ? (
                <ProjectTimelineEntityStatsRow label="Reports">
                  <ProjectTimelineReportBulkStatsSummary
                    services={props.services}
                    reportQuery={props.reportQuery}
                    reportIds={reportIds}
                  />
                </ProjectTimelineEntityStatsRow>
              ) : null}
              {billingIds.length > 0 ? (
                <ProjectTimelineEntityStatsRow label="Billings">
                  <ProjectTimelineBillingBulkStatsStrip
                    services={props.services}
                    billingViewRd={billingViewRd}
                  />
                </ProjectTimelineEntityStatsRow>
              ) : null}
              {costIds.length > 0 ? (
                <ProjectTimelineEntityStatsRow label="Costs">
                  <ProjectTimelineCostBulkStatsSummary
                    services={props.services}
                    workspaceId={props.workspaceId}
                    clientId={props.clientId}
                    costIds={costIds}
                  />
                </ProjectTimelineEntityStatsRow>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>

      <BillingBulkDialogs
        services={props.services}
        workspaceId={props.workspaceId}
        clientId={props.clientId}
        variableContext={billingVariableContext}
        billingLookupEntries={allBillingEntriesForMatcher}
        unpaidBillingsSnapshot={paymentMatcherUnpaidSnapshot}
        bulkMarkPaidOpen={bulkMarkPaidOpen}
        onBulkMarkPaidOpenChange={setBulkMarkPaidOpen}
        paymentMatcherOpen={paymentMatcherOpen}
        onPaymentMatcherOpenChange={(open) => {
          setPaymentMatcherOpen(open);
          if (!open) setPaymentMatcherUnpaidSnapshot([]);
        }}
        deleteConfirmOpen={deleteBillingOpen}
        onDeleteConfirmOpenChange={setDeleteBillingOpen}
        selectedBillingIds={billingIds}
        onBulkMarkPaidConfirm={async (data) => {
          const ids = [...billingIds];
          if (ids.length === 0) return;
          await props.services.mutationService.bulkMarkBillingPaid(
            ids.map((id) => ({
              billingId: id,
              paidAt: data.paidAt,
              paidAtJustification: data.paidAtJustification,
            })),
          );
          props.onSelectionChange(selectionState.selectNone());
          toast.success(`Marked ${ids.length} invoice(s) as paid`);
        }}
        deleteInProgress={mt.isInProgress(deleteBillingMutation.state)}
        onBulkDeleteConfirm={() => deleteBillingMutation.track(void 0)}
        matcherRestorePayload={null}
      />
      <BulkDeleteAlertDialog
        open={deleteReportOpen}
        onOpenChange={setDeleteReportOpen}
        title="Delete selected reports?"
        description={
          <>This will permanently delete {reportIds.length} report(s).</>
        }
        deleteInProgress={mt.isInProgress(deleteReportMutation.state)}
        onConfirmDelete={() => deleteReportMutation.track(void 0)}
      />
      <BulkDeleteAlertDialog
        open={deleteCostOpen}
        onOpenChange={setDeleteCostOpen}
        title="Delete selected costs?"
        description={<>This will permanently delete {costIds.length} cost(s).</>}
        deleteInProgress={mt.isInProgress(deleteCostMutation.state)}
        onConfirmDelete={() => deleteCostMutation.track(void 0)}
      />
    </>
  );
}
