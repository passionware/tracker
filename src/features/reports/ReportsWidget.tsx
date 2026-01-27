import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { ReportQueryBar } from "@/features/_common/elements/query/ReportQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";
import { useColumns } from "@/features/reports/ReportsWidget.columns.tsx";
import { ReportsWidgetProps } from "@/features/reports/ReportsWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  SelectionState,
  selectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState.ts";
import {
  addDaysToCalendarDate,
  calendarDateToJSDate,
  dateToCalendarDate,
} from "@/platform/lang/internationalized-date";
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { chain, groupBy, partialRight } from "lodash";
import {
  Check,
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
import {
  DefaultTimelineItem,
  InfiniteTimeline,
  Lane,
  TimelineItem,
} from "@/platform/passionware-timeline/passionware-timeline";
import type { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { ReportPreview } from "@/features/_common/previews/ReportPreview.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";
import { SimpleSinglePicker } from "@/features/_common/elements/pickers/SimpleSinglePicker.tsx";

export function ReportsWidget(props: ReportsWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("reports");
  const queryParams = queryParamsService.useQueryParams();

  const query = chain(queryParams)
    .thru((x) =>
      reportQueryUtils.ensureDefault(x, props.workspaceId, props.clientId),
    )
    .value();

  const addReportState = promiseState.useRemoteData<void>();

  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );

  const [viewMode, setViewMode] = useState<"timeline" | "table" | "both">(
    "both",
  );
  const [timelineDarkMode, setTimelineDarkMode] = useState(false);

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

  // Get reports - we'll calculate selected IDs from the reports data
  const reports = props.services.reportDisplayService.useReportView(
    query,
    undefined,
  );

  // Calculate selected IDs from selection state and available reports
  const selectedReportIds = useMemo(() => {
    return selectionState.getSelectedIds(
      selection,
      rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
    );
  }, [selection, reports]);

  // Get reports with selection totals if any items are selected
  const reportsWithSelection =
    props.services.reportDisplayService.useReportView(
      query,
      selectedReportIds.length > 0 ? selectedReportIds : undefined,
    );

  // Use reports with selection totals if available, otherwise use regular reports
  const finalReports =
    selectedReportIds.length > 0 ? reportsWithSelection : reports;

  useSelectionCleanup(
    selection,
    rd.tryMap(finalReports, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  const deleteMutation = promiseState.useMutation(async () => {
    if (selectedReportIds.length === 0) {
      return;
    }

    try {
      // Bulk delete all selected reports
      await props.services.mutationService.bulkDeleteCostReport(
        selectedReportIds,
      );
      // Clear selection after successful deletion
      setSelection(selectionState.selectNone());
      toast.success(
        `Successfully deleted ${selectedReportIds.length} report(s)`,
      );
    } catch (error) {
      console.error("Error deleting reports:", error);
      toast.error("Failed to delete reports");
    }
  });

  async function handleBatchDelete() {
    if (selectedReportIds.length === 0) return;
    await deleteMutation.track(void 0);
  }

  const columns = useColumns(props);

  // Convert CalendarDate to minutes from a base date (start of the earliest report)
  const timelineData = useMemo(() => {
    return (
      rd.tryMap(finalReports, (reportView) => {
        const reports = reportView.entries;
        if (reports.length === 0) {
          return { lanes: [], items: [], baseDate: new Date() };
        }

        // Find the earliest report start date to use as base
        const lastestDate = reports.reduce(
          (lastest: Date, report: ReportViewEntry) => {
            const endDate = calendarDateToJSDate(report.periodEnd);
            return endDate > lastest ? endDate : lastest;
          },
          calendarDateToJSDate(reports[0].periodEnd),
        );

        // Set base date to start of day of lastest report
        const baseDate = new Date(lastestDate);
        baseDate.setHours(0, 0, 0, 0);

        // Convert date to minutes from base date
        const dateToMinutes = (date: Date): number => {
          const diffMs = date.getTime() - baseDate.getTime();
          return Math.floor(diffMs / (1000 * 60));
        };

        // Group reports by contractor
        const reportsByContractor = groupBy(reports, (r) => r.contractor.id);

        // Create lanes (one per contractor)
        const lanes: Lane[] = Object.entries(reportsByContractor).map(
          ([contractorId, contractorReports], index) => {
            const contractor = contractorReports[0].contractor;
            const colors = [
              "bg-chart-1",
              "bg-chart-2",
              "bg-chart-3",
              "bg-chart-4",
              "bg-chart-5",
            ];
            return {
              id: `contractor-${contractorId}`,
              name: contractor.name || `Contractor ${contractorId}`,
              color: colors[index % colors.length],
            };
          },
        );

        // Convert reports to timeline items
        const items: TimelineItem<ReportViewEntry>[] = reports.map(
          (report: ReportViewEntry) => {
            const startDate = calendarDateToJSDate(report.periodStart);
            const endDate = calendarDateToJSDate(report.periodEnd);
            // Add one day to end date to include the full end day
            endDate.setHours(23, 59, 59, 999);

            const startMinutes = dateToMinutes(startDate);
            const endMinutes = dateToMinutes(endDate);

            const contractorLane = lanes.find(
              (l) => l.id === `contractor-${report.contractor.id}`,
            );

            return {
              id: `report-${report.id}`,
              laneId:
                contractorLane?.id || `contractor-${report.contractor.id}`,
              start: startMinutes,
              end: endMinutes,
              label: report.description || `Report #${report.id}`,
              color: contractorLane?.color,
              data: report,
            };
          },
        );

        return { lanes, items, baseDate };
      }) ?? { lanes: [], items: [], baseDate: new Date() }
    );
  }, [finalReports]);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Reported work</BreadcrumbPage>,
      ]}
      tools={
        <>
          <ReportQueryBar
            spec={{
              contractor: "show",
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
            }}
            query={query}
            onQueryChange={queryParamsService.setQueryParams}
            services={props.services}
          />
          <SimpleSinglePicker
            items={viewModeItems}
            value={viewMode}
            onSelect={(value) => {
              if (value) {
                setViewMode(value as "timeline" | "table" | "both");
              }
            }}
            placeholder="View mode"
            searchPlaceholder="Search view mode"
            size="sm"
            variant="outline"
          />
          {viewMode !== "table" && (
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
          )}
          <Separator orientation="vertical" className="h-6" />
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addReportState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add report
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new contractor report</PopoverHeader>
                <ReportForm
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    currency: rd.tryMap(
                      finalReports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    ),
                    contractorId: rd.tryMap(
                      finalReports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.contractor
                          .id,
                    ),
                    periodStart: rd.tryMap(finalReports, (reports) =>
                      maybe.map(
                        reports.entries[reports.entries.length - 1]?.periodEnd,
                        partialRight(addDaysToCalendarDate, 1),
                      ),
                    ),
                    periodEnd: dateToCalendarDate(new Date()),
                    clientId: idSpecUtils.switchAll(props.clientId, undefined),
                  }}
                  services={props.services}
                  onSubmit={(data) =>
                    addReportState.track(
                      props.services.mutationService
                        .createReport(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
    >
      <div className="flex-1 min-h-0">
        {viewMode === "both" ? (
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel
              defaultSize={40}
              minSize={20}
              className="flex flex-col min-h-0"
            >
              {renderTimeline()}
            </ResizablePanel>
            <ResizableHandle withHandle className="my-2" />
            <ResizablePanel
              defaultSize={60}
              minSize={30}
              className="flex flex-col min-h-0"
            >
              {renderTableView()}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : viewMode === "timeline" ? (
          <div className="h-full">{renderTimeline()}</div>
        ) : (
          <div className="h-full">{renderTableView()}</div>
        )}
      </div>
    </CommonPageContainer>
  );

  function renderTimeline() {
    return rd
      .journey(finalReports)
      .wait(
        <div
          className={cn(
            "h-full rounded-md overflow-hidden bg-card",
            timelineDarkMode && "dark",
          )}
        >
          <div className="h-full flex flex-col">
            {/* Skeleton header */}
            <div className="h-12 border-b flex items-center px-4">
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Skeleton lanes */}
            <div className="flex-1 flex flex-col">
              {[1, 2, 3, 4].map((laneIndex) => (
                <div
                  key={laneIndex}
                  className="flex items-center border-b last:border-b-0"
                  style={{ height: "80px" }}
                >
                  {/* Lane label skeleton */}
                  <div className="w-[180px] border-r p-4 shrink-0">
                    <Skeleton className="h-5 w-28" />
                  </div>
                  {/* Timeline items skeleton */}
                  <div className="flex-1 relative p-2">
                    <div className="flex gap-2">
                      <Skeleton
                        className="h-12 rounded"
                        style={{ width: `${80 + laneIndex * 20}px` }}
                      />
                      <Skeleton
                        className="h-12 rounded"
                        style={{ width: `${100 + laneIndex * 15}px` }}
                      />
                      {laneIndex % 2 === 0 && (
                        <Skeleton
                          className="h-12 rounded"
                          style={{ width: `${60 + laneIndex * 10}px` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
      )
      .catch(() => null)
      .map(() => {
        if (timelineData.items.length === 0) {
          return (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No timeline data available
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
              items={timelineData.items}
              lanes={timelineData.lanes}
              baseDate={timelineData.baseDate}
              renderItem={(itemProps) => {
                const reportEntry = itemProps.item.data as ReportViewEntry;
                if (!reportEntry) {
                  // Fallback to default if no report data
                  return <DefaultTimelineItem {...itemProps} />;
                }

                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <DefaultTimelineItem {...itemProps} />
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4">
                      <ReportPreview
                        services={props.services}
                        reportId={reportEntry.id}
                      />
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
          </div>
        );
      });
  }

  function renderTableView() {
    return (
      <ListView
        query={query}
        onQueryChange={queryParamsService.setQueryParams}
        data={rd.map(finalReports, (r) => r.entries)}
        selection={selection}
        onSelectionChange={setSelection}
        getRowId={(x) => x.id}
        onRowDoubleClick={async (row) => {
          const result =
            await props.services.messageService.editReport.sendRequest({
              defaultValues: row.originalReport,
              operatingMode: "edit",
            });
          switch (result.action) {
            case "confirm": {
              await props.services.mutationService.editReport(
                row.id,
                result.changes,
              );
            }
          }
        }}
        columns={columns}
        toolbar={
          selectionState.getTotalSelected(
            selection,
            rd.tryGet(reports)?.entries.length ?? 0,
          ) > 0 ? (
            <ListToolbar>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectionState.getTotalSelected(
                    selection,
                    rd.tryGet(finalReports)?.entries.length ?? 0,
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
                        {selectedReportIds.length} selected report(s)? This
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
            A list of all reported work for given client, matched with billing
            or clarifications.
            {rd.tryMap(finalReports, (view) => {
              const totals = view.totalSelected ?? view.total;
              const selectedCount = view.totalSelected
                ? selectedReportIds.length
                : view.entries.length;

              const billingDetails = [
                {
                  label: "Reported",
                  description: "Total value of reported work",
                  value: totals.netAmount,
                },
                {
                  label: "Billed",
                  description: "How much billed value is linked to reports",
                  value: totals.chargedAmount,
                },
                {
                  label: "To link",
                  description:
                    "Report amount that is not yet linked to any billing",
                  value: totals.toChargeAmount,
                },
                { label: "To pay", value: totals.toCompensateAmount },
                { label: "Paid", value: totals.compensatedAmount },
                {
                  label: "To compensate",
                  value: totals.toFullyCompensateAmount,
                },
              ];

              return (
                <>
                  <h3 className="my-3 text-base font-semibold ">
                    Summary ({selectedCount}{" "}
                    {selectedCount === 1 ? "report" : "reports"})
                  </h3>
                  <Summary>
                    {billingDetails.map((item) => (
                      <SummaryCurrencyGroup
                        key={item.label}
                        label={item.label}
                        description={item.description}
                        group={item.value}
                        services={props.services}
                      />
                    ))}
                  </Summary>
                </>
              );
            })}
          </>
        }
      />
    );
  }
}
