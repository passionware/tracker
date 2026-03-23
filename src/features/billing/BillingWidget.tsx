import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { SimpleSinglePicker } from "@/features/_common/elements/pickers/SimpleSinglePicker.tsx";
import { BillingQueryBar } from "@/features/_common/elements/query/BillingQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListToolbar } from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  renderError,
  renderSmallError,
} from "@/features/_common/renderError.tsx";
import {
  SplitViewLayout,
  ViewMode,
} from "@/features/_common/SplitViewLayout.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { BillingBulkDialogs } from "@/features/billing/BillingBulkDialogs.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { BillingListBulkActions } from "@/features/billing/BillingListBulkActions.tsx";
import {
  getBillingTableRowClassName,
  getBillingTimelineItemColor,
} from "@/features/billing/billingPaymentStatusStyle.ts";
import type { BillingMatcherRestorePayload } from "@/features/billing/billingPaymentMatcherPersistence.ts";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { useRestoreBillingPaymentMatcherDraft } from "@/features/billing/useRestoreBillingPaymentMatcherDraft.ts";
import { cn } from "@/lib/utils";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  SelectionState,
  selectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState.ts";
import {
  calendarDateToJSDate,
  dateToCalendarDate,
} from "@/platform/lang/internationalized-date";
import {
  InfiniteTimelineWithState,
  Lane,
  TimelineItem,
} from "@/platform/passionware-timeline/passionware-timeline";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import type { BillingTimelineColorBy } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { expressionContextUtils } from "@/services/front/ExpressionService/ExpressionService.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { createSimpleEvent } from "@passionware/simple-event";
import {
  BriefcaseBusiness,
  Check,
  Frame,
  LayoutGrid,
  Loader2,
  Moon,
  PlusCircle,
  SplitSquareHorizontal,
  Sun,
  Table,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useColumns } from "./BillingWidget.columns";

export function BillingWidget(props: BillingWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("billing");
  const queryParams = queryParamsService.useQueryParams();

  const query = billingQueryUtils.ensureDefault(
    queryParams,
    props.workspaceId,
    props.clientId,
  );

  const addBillingState = promiseState.useRemoteData();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [timelineDarkMode, setTimelineDarkMode] = useState(false);
  const [timelineGroupBy, setTimelineGroupBy] = useState<
    "client" | "workspace"
  >("workspace");
  const { colorBy: billingTimelineColorBy } =
    props.services.preferenceService.useBillingTimelineView();
  const [bulkMarkPaidOpen, setBulkMarkPaidOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentMatcherOpen, setPaymentMatcherOpen] = useState(false);
  const [paymentMatcherUnpaidSnapshot, setPaymentMatcherUnpaidSnapshot] =
    useState<BillingViewEntry[]>([]);
  const [matcherRestorePayload, setMatcherRestorePayload] =
    useState<BillingMatcherRestorePayload | null>(null);
  const handleMatcherRestoreConsumed = useCallback(() => {
    setMatcherRestorePayload(null);
  }, []);
  const handleMatcherDraftRestored = useCallback(
    (selected: BillingViewEntry[], payload: BillingMatcherRestorePayload) => {
      setPaymentMatcherUnpaidSnapshot(selected);
      setMatcherRestorePayload(payload);
      setPaymentMatcherOpen(true);
    },
    [],
  );
  const { openEntityDrawer } = useEntityDrawerContext();
  const scrollEvent = useMemo(() => createSimpleEvent<number>(), []);

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

  const viewModeItems = [
    {
      id: "timeline",
      label: "Timeline",
      icon: <LayoutGrid className="h-4 w-4" />,
    },
    {
      id: "both",
      label: "Both",
      icon: <SplitSquareHorizontal className="h-4 w-4" />,
    },
    {
      id: "table",
      label: "Table",
      icon: <Table className="h-4 w-4" />,
    },
  ];
  const groupByItems = [
    {
      id: "client",
      label: "Client",
      icon: <BriefcaseBusiness className="h-4 w-4" />,
    },
    {
      id: "workspace",
      label: "Workspace",
      icon: <Frame className="h-4 w-4" />,
    },
  ];
  const colorByItems = [
    { id: "group", label: "Group color" },
    { id: "linking-status", label: "Linking status" },
    { id: "payment-status", label: "Payment status" },
  ];

  // Get billings - we'll calculate selected IDs from the billings data
  const billings = props.services.reportDisplayService.useBillingView(
    query,
    undefined,
  );

  // Calculate selected IDs from selection state and available billings
  const selectedBillingIds = useMemo(() => {
    return selectionState.getSelectedIds(
      selection,
      rd.tryGet(billings)?.entries.map((e) => e.id) ?? [],
    );
  }, [selection, billings]);

  // Get billings with selection totals if any items are selected
  const billingsWithSelection =
    props.services.reportDisplayService.useBillingView(
      query,
      selectedBillingIds.length > 0 ? selectedBillingIds : undefined,
    );

  // Use billings with selection totals if available, otherwise use regular billings
  const finalBillings =
    selectedBillingIds.length > 0 ? billingsWithSelection : billings;

  useSelectionCleanup(
    selection,
    rd.tryMap(finalBillings, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  useRestoreBillingPaymentMatcherDraft({
    workspaceId: props.workspaceId,
    clientId: props.clientId,
    finalBillings,
    onRestored: handleMatcherDraftRestored,
  });

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedBillingIds.length === 0) {
      return;
    }

    try {
      await props.services.mutationService.bulkDeleteBilling(
        selectedBillingIds,
      );
      setSelection(selectionState.selectNone());
      toast.success(
        `Successfully deleted ${selectedBillingIds.length} billing(s)`,
      );
    } catch (error) {
      console.error("Error deleting billings:", error);
      toast.error("Failed to delete billings");
    }
  });

  async function handleBatchDelete() {
    if (selectedBillingIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

  const selectedUnpaidBillings = useMemo(() => {
    const entries = rd.tryGet(finalBillings)?.entries ?? [];
    const sel = new Set(selectedBillingIds);
    return entries.filter((e) => sel.has(e.id) && e.paidAt == null);
  }, [finalBillings, selectedBillingIds]);

  const allBillingEntriesForMatcher = useMemo(
    () => rd.tryGet(finalBillings)?.entries ?? [],
    [finalBillings],
  );

  const columns = useColumns(props);

  const timelineData = useMemo(
    () =>
      rd.map(finalBillings, (billingView) => {
    const entriesWithBounds = billingView.entries
      .map((billing) => {
        const linkedReports = billing.links.flatMap((link) =>
          link.report ? [link.report] : [],
        );
        if (linkedReports.length === 0) {
          return null;
        }

        const earliestReport = linkedReports.reduce((earliest, current) =>
          calendarDateToJSDate(current.periodStart) <
          calendarDateToJSDate(earliest.periodStart)
            ? current
            : earliest,
        );
        const latestReport = linkedReports.reduce((latest, current) =>
          calendarDateToJSDate(current.periodEnd) >
          calendarDateToJSDate(latest.periodEnd)
            ? current
            : latest,
        );

        return {
          billing,
          start: earliestReport.periodStart,
          end: latestReport.periodEnd,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const laneMap = new Map<string, Lane>();
    const colors = [
      "bg-chart-1",
      "bg-chart-2",
      "bg-chart-3",
      "bg-chart-4",
      "bg-chart-5",
    ];

    const getLane = (billing: BillingViewEntry) => {
      if (timelineGroupBy === "client") {
        return {
          id: `client-${billing.client.id}`,
          name: billing.client.name || `Client ${billing.client.id}`,
        };
      }
      return {
        id: `workspace-${billing.workspace.id}`,
        name: billing.workspace.name || `Workspace ${billing.workspace.id}`,
      };
    };

    entriesWithBounds.forEach(({ billing }) => {
      const lane = getLane(billing);
      const laneId = lane.id;
      if (!laneMap.has(laneId)) {
        laneMap.set(laneId, {
          id: laneId,
          name: lane.name,
          color: colors[laneMap.size % colors.length],
        });
      }
    });

    const lanes = Array.from(laneMap.values());
    const items: TimelineItem<BillingViewEntry>[] = entriesWithBounds.map(
      ({ billing, start, end }) => {
        const laneId = getLane(billing).id;
        const laneColor = laneMap.get(laneId)?.color;
        return {
          id: `billing-${billing.id}`,
          laneId,
          start,
          end,
          label: billing.invoiceNumber || `Billing #${billing.id}`,
          color: getBillingTimelineItemColor(
            billing,
            billingTimelineColorBy,
            laneColor,
          ),
          data: billing,
        };
      },
    );

    return { lanes, items };
      }),
    [finalBillings, billingTimelineColorBy, timelineGroupBy],
  );

  return (
    <CommonPageContainer
      tools={
        <>
          <BillingQueryBar
            {...props}
            query={query}
            onQueryChange={queryParamsService.setQueryParams}
            spec={{
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              contractor: "show",
            }}
          />
          <Separator orientation="vertical" className="h-6" />
          <SimpleSinglePicker
            items={viewModeItems}
            value={viewMode}
            onSelect={(value) => {
              if (value) {
                setViewMode(value as ViewMode);
              }
            }}
            placeholder="View mode"
            searchPlaceholder="Search view mode"
            size="sm"
            variant="outline"
            searchable={false}
          />
          {viewMode !== "table" && (
            <>
              <SimpleSinglePicker
                items={groupByItems}
                value={timelineGroupBy}
                onSelect={(value) => {
                  if (value) {
                    setTimelineGroupBy(value as "client" | "workspace");
                  }
                }}
                placeholder="Group by"
                searchPlaceholder="Search group by"
                size="sm"
                variant="outline"
                searchable={false}
              />
              <SimpleSinglePicker
                items={colorByItems}
                value={billingTimelineColorBy}
                onSelect={(value) => {
                  if (value) {
                    void props.services.preferenceService.setBillingTimelineView({
                      colorBy: value as BillingTimelineColorBy,
                    });
                  }
                }}
                placeholder="Color by"
                searchPlaceholder="Search color mode"
                size="sm"
                variant="outline"
                searchable={false}
              />
              <div className="flex items-center gap-2">
                <Sun
                  className={cn(
                    "h-4 w-4",
                    timelineDarkMode
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                />
                <Switch
                  checked={timelineDarkMode}
                  onCheckedChange={setTimelineDarkMode}
                  aria-label="Toggle timeline dark mode"
                />
                <Moon
                  className={cn(
                    "h-4 w-4",
                    timelineDarkMode
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                />
              </div>
            </>
          )}
          <Separator orientation="vertical" className="h-6" />
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addBillingState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add client billing
              </Button>
            }
            content={(bag) => (
              <BillingForm
                onCancel={bag.close}
                defaultValues={{
                  workspaceId: idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  ),
                  currency: rd.tryMap(
                    finalBillings,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.netAmount
                        .currency,
                  ),
                  invoiceDate: dateToCalendarDate(new Date()),
                  clientId: idSpecUtils.switchAll(props.clientId, undefined),
                }}
                services={props.services}
                onSubmit={(data) =>
                  addBillingState.track(
                    props.services.mutationService
                      .createBilling(data)
                      .then(bag.close),
                  )
                }
              />
            )}
          />
        </>
      }
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Invoices</BreadcrumbPage>,
      ]}
    >
      <SplitViewLayout
        topSlot={renderTimeline()}
        bottomSlot={renderTableView()}
        viewMode={viewMode}
      />
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
          if (!open) {
            setPaymentMatcherUnpaidSnapshot([]);
            setMatcherRestorePayload(null);
          }
        }}
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
        selectedBillingIds={selectedBillingIds}
        onBulkMarkPaidConfirm={async (data) => {
          const ids = [...selectedBillingIds];
          if (ids.length === 0) return;
          await props.services.mutationService.bulkMarkBillingPaid(
            ids.map((id) => ({
              billingId: id,
              paidAt: data.paidAt,
              paidAtJustification: data.paidAtJustification,
            })),
          );
          setSelection(selectionState.selectNone());
          toast.success(`Marked ${ids.length} invoice(s) as paid`);
        }}
        deleteInProgress={mt.isInProgress(deleteMutation.state)}
        onBulkDeleteConfirm={handleBatchDelete}
        matcherRestorePayload={matcherRestorePayload}
        onMatcherRestoreConsumed={handleMatcherRestoreConsumed}
      />
    </CommonPageContainer>
  );

  function renderTimeline() {
    return rd
      .journey(timelineData)
      .wait(
        <div className="h-full rounded-md bg-card animate-pulse border border-border/50" />,
      )
      .catch(renderError)
      .map((timeline) => {
        if (timeline.items.length === 0) {
          return (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No linked reports found for timeline bounds
            </div>
          );
        }

        return (
          <div
            className={cn(
              "h-full rounded-md overflow-hidden bg-card",
              timelineDarkMode && "dark",
            )}
          >
            <InfiniteTimelineWithState
              items={timeline.items}
              lanes={timeline.lanes}
              isEventSelected={(item) =>
                selectionState.isSelected(selection, item.data.id)
              }
              onEventSelect={(item) => {
                setSelection((s) => selectionState.toggle(s, item.data.id));
              }}
              onRangeSelect={(hitItems, mod) => {
                const ids = [
                  ...new Set(
                    hitItems
                      .map((i) => i.data.id)
                      .filter((id): id is number => typeof id === "number"),
                  ),
                ];
                setSelection((s) => {
                  if (mod.subtract) return selectionState.removeFrom(s, ids);
                  if (mod.extend) return selectionState.addTo(s, ids);
                  return selectionState.selectSome(ids);
                });
              }}
              onEscapeSelection={() =>
                setSelection(selectionState.selectNone())
              }
              onItemClick={(item) => {
                scrollEvent.emit(item.data.id);
              }}
            />
          </div>
        );
      });
  }

  function renderTableView() {
    return (
      <>
        <ListView
          scrollEvent={scrollEvent}
          query={query}
          onQueryChange={queryParamsService.setQueryParams}
          data={rd.map(finalBillings, (x) => x.entries)}
          selection={selection}
          onSelectionChange={setSelection}
          columns={columns}
          getRowId={(x) => x.id}
          getRowClassName={(x) =>
            getBillingTableRowClassName(x, billingTimelineColorBy)
          }
          onRowDoubleClick={async (x) => {
            const result =
              await props.services.messageService.editBilling.sendRequest({
                defaultValues: x.originalBilling,
                operatingMode: "edit",
              });
            switch (result.action) {
              case "confirm":
                await props.services.mutationService.editBilling(
                  x.id,
                  result.changes,
                );
                break;
            }
          }}
          onRowClick={(row) => {
            openEntityDrawer({ type: "billing", id: row.id });
          }}
          toolbar={
            <ListToolbar>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <BillingListBulkActions
                  selectedCount={selectedBillingIds.length}
                  selectedUnpaidCount={selectedUnpaidBillings.length}
                  onMarkPaid={() => setBulkMarkPaidOpen(true)}
                  onMatchPayments={() => {
                    setPaymentMatcherUnpaidSnapshot(selectedUnpaidBillings);
                    setPaymentMatcherOpen(true);
                  }}
                  onDeleteRequest={() => setDeleteConfirmOpen(true)}
                />
              </div>
            </ListToolbar>
          }
          caption={rd.tryMap(finalBillings, (view) => {
            const totals = view.totalSelected ?? view.total;

            const billingDetails = [
              { label: "Charged", value: totals.netAmount },
              { label: "Reconciled", value: totals.matchedAmount },
              { label: "To reconcile", value: totals.remainingAmount },
            ];

            return (
              <Summary variant="strip" className="w-full">
                {billingDetails.map((item) => (
                  <SummaryCurrencyGroup
                    key={item.label}
                    label={item.label}
                    group={item.value}
                    services={props.services}
                    variant="strip"
                  />
                ))}
              </Summary>
            );
          })}
        />
      </>
    );
  }
}
