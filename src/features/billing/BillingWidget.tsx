import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { createEntityDrawerNodeFactory } from "@/features/_common/drawers/createEntityDrawerNodeFactory.tsx";
import { EntityDetailDrawers } from "@/features/_common/drawers/EntityDetailDrawers.tsx";
import { useEntityDrawerState } from "@/features/_common/drawers/useEntityDrawerState.ts";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { SimpleSinglePicker } from "@/features/_common/elements/pickers/SimpleSinglePicker.tsx";
import { BillingQueryBar } from "@/features/_common/elements/query/BillingQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
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
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
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
  InfiniteTimeline,
  Lane,
  TimelineItem,
} from "@/platform/passionware-timeline/passionware-timeline";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { getLocalTimeZone, toZoned } from "@internationalized/date";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
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
import { useMemo, useState } from "react";
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
  const drawerState = useEntityDrawerState();
  const scrollEvent = useMemo(() => createSimpleEvent<number>(), []);

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

  const columns = useColumns(props);
  const drawerReports = props.services.reportDisplayService.useReportView(
    reportQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const drawerCosts = props.services.reportDisplayService.useCostView(
    costQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const reportById = useMemo(
    () =>
      new Map(
        (rd.tryGet(drawerReports)?.entries ?? []).map((report) => [
          report.id,
          report,
        ]),
      ),
    [drawerReports],
  );
  const costById = useMemo(
    () =>
      new Map(
        (rd.tryGet(drawerCosts)?.entries ?? []).map((cost) => [cost.id, cost]),
      ),
    [drawerCosts],
  );
  const billingById = useMemo(
    () =>
      new Map(
        (rd.tryGet(finalBillings)?.entries ?? []).map((billing) => [
          billing.id,
          billing,
        ]),
      ),
    [finalBillings],
  );
  const createEntityDrawerNode = useMemo(
    () =>
      createEntityDrawerNodeFactory({
        reportById,
        costById,
        billingById,
        context: {
          clientId: props.clientId,
          workspaceId: props.workspaceId,
        },
        services: props.services,
        pushEntityDrawer: drawerState.pushEntityDrawer,
        popEntityDrawer: drawerState.popEntityDrawer,
      }),
    [
      billingById,
      costById,
      drawerState.popEntityDrawer,
      drawerState.pushEntityDrawer,
      props.clientId,
      props.services,
      props.workspaceId,
      reportById,
    ],
  );

  const timelineData = rd.map(finalBillings, (billingView) => {
    const timeZone = getLocalTimeZone();
    const getBillingStatusColor = (
      status: BillingViewEntry["status"],
    ): string => {
      switch (status) {
        case "unmatched":
          return "bg-rose-500";
        case "partially-matched":
          return "bg-amber-500";
        case "clarified":
          return "bg-emerald-500";
        case "overmatched":
          return "bg-violet-500";
        case "matched":
          return "bg-emerald-500";
      }
    };

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
          start: toZoned(earliestReport.periodStart, timeZone),
          end: toZoned(latestReport.periodEnd, timeZone).add({ days: 1 }),
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
        return {
          id: `billing-${billing.id}`,
          laneId,
          start,
          end,
          label: billing.invoiceNumber || `Billing #${billing.id}`,
          color:
            getBillingStatusColor(billing.status) || laneMap.get(laneId)?.color,
          data: billing,
        };
      },
    );

    return { lanes, items };
  });

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
            <InfiniteTimeline
              items={timeline.items}
              lanes={timeline.lanes}
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
            drawerState.openEntityDrawer(
              createEntityDrawerNode({ type: "billing", id: row.id }),
            );
          }}
          toolbar={
            selectionState.getTotalSelected(
              selection,
              rd.tryGet(billings)?.entries.length ?? 0,
            ) > 0 ? (
              <ListToolbar>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {selectionState.getTotalSelected(
                      selection,
                      rd.tryGet(finalBillings)?.entries.length ?? 0,
                    )}{" "}
                    selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <div>
                        <ListToolbarButton variant="destructive">
                          Delete
                        </ListToolbarButton>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-3">
                        <div className="text-sm text-slate-700">
                          Are you sure you want to delete{" "}
                          {selectedBillingIds.length} selected billing(s)? This
                          action cannot be undone.
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBatchDelete}
                            disabled={mt.isInProgress(deleteMutation.state)}
                          >
                            {mt.isInProgress(deleteMutation.state)
                              ? "Deleting..."
                              : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </ListToolbar>
            ) : undefined
          }
          caption={
            <>
              <div className="mb-2 font-semibold text-gray-700">
                A list of all billings for the selected client.
              </div>
              {rd.tryMap(finalBillings, (view) => {
                const totals = view.totalSelected ?? view.total;
                const selectedCount = view.totalSelected
                  ? selectedBillingIds.length
                  : view.entries.length;

                const billingDetails = [
                  { label: "Charged", value: totals.netAmount },
                  { label: "Reconciled", value: totals.matchedAmount },
                  { label: "To reconcile", value: totals.remainingAmount },
                ];

                return (
                  <div>
                    <h3 className="my-3 text-base font-semibold text-gray-900">
                      Summary ({selectedCount}{" "}
                      {selectedCount === 1 ? "invoice" : "invoices"})
                    </h3>
                    <Summary>
                      {billingDetails.map((item) => (
                        <SummaryCurrencyGroup
                          key={item.label}
                          label={item.label}
                          group={item.value}
                          services={props.services}
                        />
                      ))}
                    </Summary>
                  </div>
                );
              })}
            </>
          }
        />
        <EntityDetailDrawers
          entityStack={drawerState.entityStack}
          onOpenChange={(open) => {
            if (!open) {
              drawerState.closeEntityDrawer();
            }
          }}
          onBreadcrumbSelect={drawerState.jumpToEntityStackIndex}
        />
      </>
    );
  }
}
