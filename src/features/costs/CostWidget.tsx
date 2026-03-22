import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { SimpleSinglePicker } from "@/features/_common/elements/pickers/SimpleSinglePicker.tsx";
import { CostQueryBar } from "@/features/_common/elements/query/CostQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  ListToolbar,
  ListToolbarActionsMenu,
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
import { CostForm } from "@/features/costs/CostForm.tsx";
import { useColumns } from "@/features/costs/CostWidget.columns.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { cn } from "@/lib/utils";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  SelectionState,
  selectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState.ts";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import {
  InfiniteTimelineWithState,
  Lane,
  TimelineItem,
} from "@/platform/passionware-timeline/passionware-timeline";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createSimpleEvent } from "@passionware/simple-event";
import {
  Check,
  Frame,
  HardHat,
  LayoutGrid,
  Loader2,
  Moon,
  PlusCircle,
  SplitSquareHorizontal,
  Sun,
  Table,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function CostWidget(props: PotentialCostWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("costs");
  const queryParams = queryParamsService.useQueryParams();

  const query = costQueryUtils.ensureDefault(
    queryParams,
    props.workspaceId,
    props.clientId,
  );

  const addCostState = promiseState.useRemoteData<void>();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timelineDarkMode, setTimelineDarkMode] = useState(false);
  const [timelineGroupBy, setTimelineGroupBy] = useState<
    "contractor" | "workspace"
  >("contractor");
  const { openEntityDrawer } = useEntityDrawerContext();
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
      id: "contractor",
      label: "Contractor",
      icon: <HardHat className="h-4 w-4" />,
    },
    {
      id: "workspace",
      label: "Workspace",
      icon: <Frame className="h-4 w-4" />,
    },
  ];

  // Get costs - we'll calculate selected IDs from the costs data
  const costs = props.services.reportDisplayService.useCostView(
    query,
    undefined,
  );

  // Calculate selected IDs from selection state and available costs
  const selectedCostIds = useMemo(() => {
    return selectionState.getSelectedIds(
      selection,
      rd.tryGet(costs)?.entries.map((e) => e.id) ?? [],
    );
  }, [selection, costs]);

  // Get costs with selection totals if any items are selected
  const costsWithSelection = props.services.reportDisplayService.useCostView(
    query,
    selectedCostIds.length > 0 ? selectedCostIds : undefined,
  );

  // Use costs with selection totals if available, otherwise use regular costs
  const finalCosts = selectedCostIds.length > 0 ? costsWithSelection : costs;

  useSelectionCleanup(
    selection,
    rd.tryMap(finalCosts, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedCostIds.length === 0) {
      return;
    }

    try {
      // Bulk delete all selected costs
      await props.services.mutationService.bulkDeleteCost(selectedCostIds);
      // Clear selection after successful deletion
      setSelection(selectionState.selectNone());
      toast.success(`Successfully deleted ${selectedCostIds.length} cost(s)`);
    } catch (error) {
      console.error("Error deleting costs:", error);
      toast.error("Failed to delete costs");
    }
  });

  async function handleBatchDelete() {
    if (selectedCostIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

  const columns = useColumns(props);

  const timelineData = rd.map(finalCosts, (costView) => {
    const getCostStatusColor = (status: CostEntry["status"]): string => {
      switch (status) {
        case "unmatched":
          return "bg-rose-500";
        case "partially-matched":
          return "bg-amber-500";
        case "overmatched":
          return "bg-violet-500";
        case "matched":
          return "bg-emerald-500";
      }
    };
    const getLane = (cost: CostEntry) => {
      if (timelineGroupBy === "workspace") {
        return {
          id: `workspace-${cost.workspace.id}`,
          name: cost.workspace.name || `Workspace ${cost.workspace.id}`,
        };
      }
      return {
        id: cost.contractor
          ? `contractor-${cost.contractor.id}`
          : "contractor-none",
        name: cost.contractor?.fullName || "No contractor",
      };
    };

    const entriesWithBounds = costView.entries
      .map((cost) => {
        if (cost.linkReports.length === 0) {
          return null;
        }
        const earliestReport = cost.linkReports.reduce((earliest, current) =>
          current.report.periodStart.compare(earliest.report.periodStart) < 0
            ? current
            : earliest,
        );
        const latestReport = cost.linkReports.reduce((latest, current) =>
          current.report.periodEnd.compare(latest.report.periodEnd) > 0
            ? current
            : latest,
        );

        return {
          cost,
          start: earliestReport.report.periodStart,
          end: latestReport.report.periodEnd,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const colors = [
      "bg-chart-1",
      "bg-chart-2",
      "bg-chart-3",
      "bg-chart-4",
      "bg-chart-5",
    ];
    const laneMap = new Map<string, Lane>();
    entriesWithBounds.forEach(({ cost }) => {
      const lane = getLane(cost);
      if (!laneMap.has(lane.id)) {
        laneMap.set(lane.id, {
          id: lane.id,
          name: lane.name,
          color: colors[laneMap.size % colors.length],
        });
      }
    });

    const lanes = Array.from(laneMap.values());
    const items: TimelineItem<CostEntry>[] = entriesWithBounds.map(
      ({ cost, start, end }) => {
        const laneId = getLane(cost).id;
        return {
          id: `cost-${cost.id}`,
          laneId,
          start,
          end,
          label: cost.description || `Cost #${cost.id}`,
          color: getCostStatusColor(cost.status) || laneMap.get(laneId)?.color,
          data: cost,
        };
      },
    );

    return { lanes, items };
  });

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Costs</BreadcrumbPage>,
      ]}
      tools={
        <>
          <CostQueryBar
            services={props.services}
            query={query}
            onQueryChange={queryParamsService.setQueryParams}
            spec={{
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
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
                    setTimelineGroupBy(value as "contractor" | "workspace");
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
                  .fullJourney(addCostState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add cost
              </Button>
            }
            content={(bag) => (
              <CostForm
                onCancel={bag.close}
                defaultValues={{
                  workspaceId: idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  ),
                  currency: rd.tryMap(
                    finalCosts,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.netAmount
                        .currency,
                  ),
                  invoiceDate: dateToCalendarDate(new Date()),
                  contractorId: query.filters.contractorId?.value[0],
                }}
                services={props.services}
                onSubmit={(data) =>
                  addCostState.track(
                    props.services.mutationService
                      .createCost(data)
                      .then(bag.close),
                  )
                }
              />
            )}
          />
        </>
      }
    >
      <SplitViewLayout
        topSlot={renderTimeline()}
        bottomSlot={renderTableView()}
        viewMode={viewMode}
      />
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected costs?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCostIds.length} selected
              cost(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={mt.isInProgress(deleteMutation.state)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mt.isInProgress(deleteMutation.state) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          data={rd.map(finalCosts, (x) => x.entries)}
          selection={selection}
          onSelectionChange={setSelection}
          columns={columns}
          getRowId={(x) => x.id}
          onRowDoubleClick={async (x) => {
            const result =
              await props.services.messageService.editCost.sendRequest({
                defaultValues: x.originalCost,
                operatingMode: "edit",
              });
            switch (result.action) {
              case "confirm":
                await props.services.mutationService.editCost(
                  x.id,
                  result.changes,
                );
                break;
              default:
                break;
            }
          }}
          onRowClick={(row) => {
            openEntityDrawer({ type: "cost", id: row.id });
          }}
          toolbar={
            <ListToolbar>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ListToolbarActionsMenu selectedCount={selectedCostIds.length}>
                  <DropdownMenuItem
                    variant="destructrive"
                    disabled={selectedCostIds.length === 0}
                    onSelect={(e) => {
                      e.preventDefault();
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </ListToolbarActionsMenu>
              </div>
            </ListToolbar>
          }
          caption={rd.mapOrElse(
            finalCosts,
            (view) => {
              const totals = view.totalSelected ?? view.total;

              const billingDetails = [
                { label: "Net total", value: totals.netAmount },
                { label: "Total matched", value: totals.matchedAmount },
                {
                  label: "Total remaining",
                  value: totals.remainingAmount,
                },
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
            },
            <div className="grid grid-flow-col gap-3">
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
            </div>,
          )}
        />
      </>
    );
  }
}
