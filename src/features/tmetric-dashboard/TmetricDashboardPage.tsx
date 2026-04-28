import { myRouting } from "@/routing/myRouting.ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithFrontServices } from "@/core/frontServices";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { MobileSidebarTrigger } from "@/features/_common/MobileSidebarTrigger.tsx";
import { SimpleArrayPicker } from "@/features/_common/elements/pickers/SimpleArrayPicker";
import {
  createComposedRangeShadow,
  InfiniteTimelineWithState,
  useTimelineRangeShadingFromPreference,
} from "@/platform/passionware-timeline/passionware-timeline.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer";
import { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { maybe, mt, rd } from "@passionware/monads";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Database,
  Grid3X3,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ByContractorHierarchyView } from "./ByContractorHierarchyView";
import { CustomKpiCards } from "./custom-kpis/CustomKpiCards";
import { TmetricContractorDashboard } from "./TmetricContractorDashboard";
import { TmetricCubeExplorer } from "./TmetricCubeExplorer";
import { TmetricHoursPieChart } from "./TmetricHoursPieChart";
import { TmetricIterationBarChart } from "./TmetricIterationBarChart";
import { TmetricNoOverlapMessage } from "./TmetricNoOverlapMessage";
import { TmetricScopeHierarchyPanel } from "./TmetricScopeHierarchyPanel";
import { useBudgetLogSync } from "./useBudgetLogSync";
import { useTmetricDashboardData } from "./useTmetricDashboardData";
import type { TimePreset } from "./tmetric-dashboard.utils";
import {
  AriaCalendarBody,
  AriaCalendarHeader,
} from "@/components/ui/aria-calendar.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calendarDateToJSDate,
  dateToCalendarDate,
} from "@/platform/lang/internationalized-date.ts";
import { useIsMobile } from "@/platform/react/use-mobile.tsx";
import { cn } from "@/lib/utils";
import { getDimmedClasses } from "@/features/_common/DimmedContainer";
import {
  CalendarDate,
  fromAbsolute,
  getLocalTimeZone,
} from "@internationalized/date";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { useState } from "react";
import { RangeCalendar } from "react-aria-components";

interface RangePreset {
  id: string;
  label: string;
  range: () => { start: Date; end: Date };
}

const RANGE_PRESETS: RangePreset[] = [
  {
    id: "today",
    label: "Today",
    range: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
  },
  {
    id: "yesterday",
    label: "Yesterday",
    range: () => {
      const y = subDays(new Date(), 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    },
  },
  {
    id: "last7",
    label: "Last 7 days",
    range: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: "last30",
    label: "Last 30 days",
    range: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    id: "this_week",
    label: "This week",
    range: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    id: "last_week",
    label: "Last week",
    range: () => {
      const ref = subDays(new Date(), 7);
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      };
    },
  },
  {
    id: "this_month",
    label: "This month",
    range: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    id: "last_month",
    label: "Last month",
    range: () => {
      const ref = subMonths(new Date(), 1);
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    },
  },
];

function DashboardRangeBar({
  start,
  end,
  onRangeSelect,
}: {
  start: Date | null;
  end: Date | null;
  onRangeSelect: (from: Date, to: Date) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const ariaRange =
    start && end
      ? {
          start: dateToCalendarDate(start),
          end: dateToCalendarDate(end),
        }
      : null;

  const handleAriaRangeChange = (
    r: { start: CalendarDate; end: CalendarDate } | null,
  ) => {
    if (!r) return;
    onRangeSelect(
      startOfDay(calendarDateToJSDate(r.start)),
      endOfDay(calendarDateToJSDate(r.end)),
    );
    setOpen(false);
  };

  const handlePreset = (preset: RangePreset) => {
    const { start: s, end: e } = preset.range();
    onRangeSelect(s, e);
    setOpen(false);
  };

  const label =
    start && end
      ? start.getTime() === startOfDay(start).getTime() &&
        end.getTime() === endOfDay(start).getTime()
        ? format(start, "dd MMM yyyy")
        : `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`
      : "—";

  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 min-w-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs transition-colors sm:px-3 sm:text-sm",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "w-auto shrink-0 justify-center whitespace-nowrap sm:min-w-[220px]",
      )}
      aria-label="Select date range"
    >
      <CalendarRange className="h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">{label}</span>
    </button>
  );

  const presetRail = (
    <ul
      className={cn(
        "flex shrink-0 gap-1 text-xs",
        isMobile
          ? "flex-row flex-nowrap overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "w-32 flex-col border-r border-border pr-3",
      )}
      role="list"
    >
      {RANGE_PRESETS.map((preset) => {
        const r = preset.range();
        const isActive =
          start &&
          end &&
          startOfDay(start).getTime() === startOfDay(r.start).getTime() &&
          endOfDay(end).getTime() === endOfDay(r.end).getTime();
        return (
          <li key={preset.id} className="shrink-0">
            <button
              type="button"
              onClick={() => handlePreset(preset)}
              className={cn(
                "w-full whitespace-nowrap rounded-md px-2 py-1.5 text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground",
              )}
            >
              {preset.label}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const calendarPanel = (
    <RangeCalendar
      value={ariaRange}
      onChange={(r) =>
        handleAriaRangeChange(
          r as { start: CalendarDate; end: CalendarDate } | null,
        )
      }
      visibleDuration={{ months: isMobile ? 1 : 2 }}
      autoFocus
      className="select-none"
    >
      <AriaCalendarHeader large={isMobile} />
      <div className={cn("flex", isMobile ? "flex-col" : "gap-6")}>
        <AriaCalendarBody isRange large={isMobile} />
        {!isMobile && (
          <AriaCalendarBody isRange large={isMobile} offset={{ months: 1 }} />
        )}
      </div>
    </RangeCalendar>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 min-w-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "w-auto shrink-0 justify-center whitespace-nowrap",
          )}
          aria-label="Select date range"
          onClick={() => setOpen(true)}
        >
          <CalendarRange className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
        </button>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Select date range</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            {presetRail}
            <div className="flex justify-center">{calendarPanel}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-1.5rem)] overflow-x-auto p-3"
        align="start"
        sideOffset={6}
      >
        <div className="flex gap-3">
          {presetRail}
          {calendarPanel}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DashboardNavButton({
  direction,
  unit,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  unit: "day" | "week" | "month";
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      disabled={disabled}
      title={`${direction === "prev" ? "Previous" : "Next"} ${unit}`}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{`${direction} ${unit}`}</span>
    </Button>
  );
}

export function TmetricDashboardPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { services, workspaceId, clientId } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: "overview" | "cube" | "timeline" | "contractor" =
    location.pathname.includes("/tmetric-dashboard/contractor")
      ? "contractor"
      : location.pathname.includes("/tmetric-dashboard/timeline")
        ? "timeline"
        : location.pathname.includes("/tmetric-dashboard/cube")
          ? "cube"
          : "overview";

  const data = useTmetricDashboardData({ services, workspaceId, clientId });
  const {
    timePreset,
    selectedIterationIds,
    setTimePreset,
    setSelectedIterationIds,
    start,
    end,
    canLoadOrRefresh,
    setCustomRange,
    navigatePrev,
    navigateNext,
    cachedReportQuery,
    byClientCachedReportQuery,
    handleRefresh,
    isRefreshing,
    refreshMutation,
    projectsData,
    iterationsForScope,
    iterationRange,
    projectsMap,
    iterationPickerItems,
    contractorIterationBreakdown,
    contractorNameMap,
    integrationStatus,
    contractorsSummary,
    iterationSummary,
    basicInfo,
    reportAsSource,
    timeline,
    scope,
  } = data;

  const { syncBudgetLogNow, isSyncing: isSyncingBudgetLog } = useBudgetLogSync({
    services,
    iterations: iterationsForScope,
    scope,
  });

  const periodDoesNotOverlapIterations =
    iterationsForScope.length > 0 &&
    iterationRange &&
    start === null &&
    end === null;

  const dashboardReportRd = rd.useMemoMap(
    cachedReportQuery,
    (entry) => entry.data,
  );
  const byClientReportRd = rd.useMemoMap(
    byClientCachedReportQuery,
    (entry) => entry.data,
  );

  const dashboardTimelineShading = useTimelineRangeShadingFromPreference(
    services.preferenceService,
    "timeline-range-shading:tmetric-dashboard",
    { night: true, weekend: true },
  );

  const isMobile = useIsMobile();
  const isRefreshInProgress = mt.isInProgress(refreshMutation.state);

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden p-3 sm:p-6">
      {/* Header + tabs row */}
      <div className="flex-shrink-0 space-y-2 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MobileSidebarTrigger />
              <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
                TMetric Dashboard
              </h1>
              <Badge variant="secondary">BETA</Badge>
            </div>
            <p className="hidden text-pretty text-sm text-muted-foreground sm:block sm:text-base">
              Cross-workspace time tracking insights. Click Refresh to fetch
              from TMetric.
            </p>
          </div>
          <div
            className={cn(
              "flex w-full min-w-0 gap-2",
              "flex-row flex-nowrap items-center overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:w-auto sm:max-w-full sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0",
            )}
          >
            <div className="flex shrink-0 items-center gap-1.5 sm:contents">
              <Select
                value={timePreset}
                onValueChange={(v) => setTimePreset(v as TimePreset)}
              >
                <SelectTrigger className="h-9 w-[140px] shrink-0 sm:h-10 sm:w-[160px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This week</SelectItem>
                  <SelectItem value="last_week">Last week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="unscoped">
                    Unscoped (whole iterations)
                  </SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <DashboardRangeBar
                start={start}
                end={end}
                onRangeSelect={(from, to) => setCustomRange(from, to)}
              />
            </div>

            <div
              className={cn(
                "flex shrink-0 items-center justify-center gap-0.5 rounded-md border bg-muted/50 sm:w-auto sm:justify-start",
                isMobile ? "px-0 py-0" : "p-0.5",
              )}
            >
              <DashboardNavButton
                direction="prev"
                unit="day"
                onClick={() => navigatePrev("day")}
                disabled={!start || !end}
              />
              <DashboardNavButton
                direction="next"
                unit="day"
                onClick={() => navigateNext("day")}
                disabled={!start || !end}
              />
              <div className="w-px h-6 bg-border" />
              <DashboardNavButton
                direction="prev"
                unit="week"
                onClick={() => navigatePrev("week")}
                disabled={!start || !end}
              />
              <DashboardNavButton
                direction="next"
                unit="week"
                onClick={() => navigateNext("week")}
                disabled={!start || !end}
              />
              <div className="w-px h-6 bg-border" />
              <DashboardNavButton
                direction="prev"
                unit="month"
                onClick={() => navigatePrev("month")}
                disabled={!start || !end}
              />
              <DashboardNavButton
                direction="next"
                unit="month"
                onClick={() => navigateNext("month")}
                disabled={!start || !end}
              />
            </div>

            <SimpleArrayPicker
              className="min-w-[min(18rem,85vw)] max-w-[min(22rem,90vw)] shrink-0 sm:max-w-md"
              items={iterationPickerItems}
              value={selectedIterationIds.map(String)}
              onSelect={(ids) =>
                setSelectedIterationIds(ids.map((id) => Number(id)))
              }
              placeholder="All active iterations"
              searchPlaceholder="Search iterations..."
              variant="outline"
              align="start"
              side="bottom"
              maxValueItems={1}
              itemOverflowMessage={(value) => `${value.length} iterations`}
            />

            <div className="flex shrink-0 items-center gap-1.5 sm:contents sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:gap-2">
              <Button
                className="h-9 shrink-0 whitespace-nowrap px-2 text-xs sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
                onClick={() => syncBudgetLogNow()}
                disabled={
                  isSyncingBudgetLog ||
                  !canLoadOrRefresh ||
                  iterationsForScope.length === 0
                }
                variant="outline"
                title="Sync budget target log from TMetric (today and missing days)"
              >
                <Database
                  className={`mr-1.5 h-4 w-4 shrink-0 sm:mr-2 ${isSyncingBudgetLog ? "animate-pulse" : ""}`}
                />
                <span className="truncate sm:hidden">Sync log</span>
                <span className="hidden truncate sm:inline">
                  Sync budget log
                </span>
              </Button>
              <Button
                className="h-9 shrink-0 whitespace-nowrap px-2 text-xs sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
                onClick={handleRefresh}
                disabled={isRefreshing || !canLoadOrRefresh}
                variant="default"
              >
                <RefreshCw
                  className={`mr-1.5 h-4 w-4 shrink-0 sm:mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="truncate sm:hidden">Refresh</span>
                <span className="hidden truncate sm:inline">
                  Refresh from TMetric
                </span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v as "overview" | "cube" | "timeline" | "contractor";
            const routing = myRouting
              .forWorkspace(workspaceId)
              .forClient(clientId);
            if (tab === "cube") navigate(routing.tmetricDashboardCube());
            else if (tab === "timeline")
              navigate(routing.tmetricDashboardTimeline());
            else if (tab === "contractor")
              navigate(routing.tmetricDashboardContractor());
            else navigate(routing.tmetricDashboard());
          }}
        >
          <TabsList
            className="w-full min-w-0 justify-start gap-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden"
            size="sm"
          >
            <TabsTrigger
              value="overview"
              className="shrink-0 gap-1.5 px-2 py-2 text-xs sm:gap-2 sm:px-1 sm:py-4 sm:text-sm"
              size="sm"
            >
              <TrendingUp className="h-4 w-4 shrink-0 sm:mr-0.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="shrink-0 gap-1.5 px-2 py-2 text-xs sm:gap-2 sm:px-1 sm:py-4 sm:text-sm"
              size="sm"
            >
              <CalendarRange className="h-4 w-4 shrink-0 sm:mr-0.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="contractor"
              className="shrink-0 gap-1.5 px-2 py-2 text-xs sm:gap-2 sm:px-1 sm:py-4 sm:text-sm"
              size="sm"
            >
              <Users className="h-4 w-4 shrink-0 sm:mr-0.5" />
              Contractor
            </TabsTrigger>
            <TabsTrigger
              value="cube"
              className="shrink-0 gap-1.5 px-2 py-2 text-xs sm:gap-2 sm:px-1 sm:py-4 sm:text-sm"
              size="sm"
            >
              <Grid3X3 className="h-4 w-4 shrink-0 sm:mr-0.5" />
              Cube
              <span className="hidden sm:inline"> Explorer</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      {activeTab === "timeline" ? (
        rd
          .journey(
            rd.combine({ cachedReportQuery, contractorNameMap, timeline }),
          )
          .wait(() =>
            periodDoesNotOverlapIterations ? (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <TmetricNoOverlapMessage />
              </div>
            ) : (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <Skeleton className="h-[400px] w-full max-w-4xl rounded-md" />
              </div>
            ),
          )
          .catch(() => null)
          .map(({ timeline: resolvedTimeline }) =>
            resolvedTimeline.timelineItems.length > 0 ? (
              <div
                className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col"
                key="timeline-tab"
              >
                <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <CardHeader>
                    <CardTitle>Tasks over time</CardTitle>
                    <CardDescription>
                      Timeline view of time entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-6">
                    <div className="h-full min-h-[min(22rem,55svh)] w-full min-w-0 flex-1 overflow-hidden rounded-md border border-border sm:min-h-[28rem]">
                      {(() => {
                        const minStartFromItems =
                          resolvedTimeline.timelineItems.reduce(
                            (min, item) =>
                              item.start.compare(min) < 0 ? item.start : min,
                            resolvedTimeline.timelineItems[0].start,
                          );
                        const maxEndFromItems =
                          resolvedTimeline.timelineItems.reduce(
                            (max, item) =>
                              item.end.compare(max) > 0 ? item.end : max,
                            resolvedTimeline.timelineItems[0].end,
                          );
                        const clampStart =
                          start != null && end != null
                            ? fromAbsolute(start.getTime(), getLocalTimeZone())
                            : minStartFromItems;
                        const clampEnd =
                          start != null && end != null
                            ? fromAbsolute(end.getTime(), getLocalTimeZone())
                            : maxEndFromItems;
                        const mergedTimeRangeShadows = [
                          createComposedRangeShadow({
                            clamp: { start: clampStart, end: clampEnd },
                            rangeShadingState:
                              dashboardTimelineShading.rangeShadingState,
                          }),
                        ];
                        return (
                          <InfiniteTimelineWithState
                            items={resolvedTimeline.timelineItems}
                            lanes={resolvedTimeline.timelineLanes}
                            timeRangeShadows={mergedTimeRangeShadows}
                            rangeShadingState={
                              dashboardTimelineShading.rangeShadingState
                            }
                            onRangeShadingStateChange={
                              dashboardTimelineShading.onRangeShadingStateChange
                            }
                          />
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <Card className="max-w-md">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No time entries in the selected range. Load report and try
                    another range.
                  </CardContent>
                </Card>
              </div>
            ),
          )
      ) : activeTab === "contractor" ? (
        <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {periodDoesNotOverlapIterations ? (
            <TmetricNoOverlapMessage className="mx-auto" />
          ) : (
            <TmetricContractorDashboard
              services={services}
              contractorIterationBreakdown={contractorIterationBreakdown}
              contractorNameMap={contractorNameMap}
              integrationStatus={integrationStatus}
              getContractorDetailUrl={(id) =>
                myRouting
                  .forWorkspace(workspaceId)
                  .forClient(clientId)
                  .tmetricDashboardContractorFor(id)
              }
              onRefresh={handleRefresh}
              canLoadOrRefresh={canLoadOrRefresh}
              isRefreshing={isRefreshing}
            />
          )}
        </div>
      ) : activeTab === "cube" ? (
        rd
          .journey(reportAsSource)
          .wait(() =>
            periodDoesNotOverlapIterations ? (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <TmetricNoOverlapMessage />
              </div>
            ) : (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <div className="w-full max-w-md space-y-4 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                </div>
              </div>
            ),
          )
          .catch((error) => (
            <div className="flex-1 min-h-0 mt-4 p-4">
              <Card className="border-destructive">
                <CardContent className="pt-6 text-destructive">
                  <ErrorMessageRenderer error={error} />
                </CardContent>
              </Card>
            </div>
          ))
          .map((report) => (
            <div
              className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col"
              key="cube"
            >
              <TmetricCubeExplorer
                report={report}
                services={services}
                className="w-full h-full min-h-0"
                clampRange={
                  start != null && end != null
                    ? {
                        start: dateToCalendarDate(start),
                        end: dateToCalendarDate(end),
                      }
                    : undefined
                }
              />
            </div>
          ))
      ) : (
        <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col space-y-6 overflow-x-hidden overflow-y-auto">
          {rd
            .journey(rd.combine({ contractorsSummary, contractorNameMap }))
            .wait(() => (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="min-w-0">
                      <CardContent className="flex min-w-0 flex-col gap-1.5 p-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
            .catch(() => null)
            .map(
              ({
                contractorsSummary: resolvedContractorsSummary,
                contractorNameMap: resolvedContractorNameMap,
              }) => (
                <div className={getDimmedClasses(isRefreshInProgress)}>
                  <CustomKpiCards
                    services={services}
                    contractorsSummary={resolvedContractorsSummary}
                    contractorNameMap={resolvedContractorNameMap}
                  />
                </div>
              ),
            )}

          {rd
            .journey(cachedReportQuery)
            .wait(() =>
              periodDoesNotOverlapIterations ? null : (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ),
            )
            .catch(() => null)
            .map(() => (
              <TmetricScopeHierarchyPanel
                key="scope-panel"
                services={services}
                projectsData={projectsData}
                iterationsForScope={iterationsForScope}
                projectsMap={projectsMap}
                cachedReport={dashboardReportRd}
                byClientCachedReport={byClientReportRd}
                persistenceKey={`${String(workspaceId)}-${String(clientId)}`}
                workspaceId={workspaceId}
              />
            ))}

          {rd
            .journey(cachedReportQuery)
            .wait(() =>
              periodDoesNotOverlapIterations ? (
                <TmetricNoOverlapMessage variant="full" />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Skeleton className="h-16 w-16 rounded-full mb-4" />
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </CardContent>
                </Card>
              ),
            )
            .catch(() => null)
            .map((data) =>
              !data && !mt.isInError(refreshMutation.state) ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    {timePreset === "unscoped" && !canLoadOrRefresh ? (
                      <>
                        <CalendarRange className="mb-4 h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No iterations in scope. Add active iterations or
                          select specific ones.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Iterations are chosen above; by default all active
                          iterations.
                        </p>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No cached data. Click &quot;Refresh from TMetric&quot;
                          to fetch data.
                        </p>
                        {start && end && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {format(start, "dd MMM yyyy")} –{" "}
                            {format(end, "dd MMM yyyy")}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null,
            )}

          {/* {integrationStatus &&
            (integrationStatus.integratedContractorIds.length > 0 ||
              integrationStatus.nonIntegratedContractorIds.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scope</CardTitle>
                  <CardDescription>
                    {integrationStatus.integratedContractorIds.length +
                      integrationStatus.nonIntegratedContractorIds.length}{" "}
                    contractor(s) in scope ·{" "}
                    {integrationStatus.integratedContractorIds.length}{" "}
                    integrated with TMetric
                    {integrationStatus.nonIntegratedContractorIds.length > 0 &&
                      ` · ${integrationStatus.nonIntegratedContractorIds.length} not integrated`}
                  </CardDescription>
                </CardHeader>
                {integrationStatus.nonIntegratedContractorIds.length > 0 && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>Not integrated (excluded from refresh):</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {integrationStatus.nonIntegratedContractorIds.map(
                        (cid) => (
                          <ContractorWidget
                            key={cid}
                            contractorId={maybe.of(cid)}
                            services={services}
                            layout="full"
                            size="sm"
                            className="opacity-60"
                          />
                        ),
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )} */}

          {mt.isInError(refreshMutation.state) && (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-destructive">
                {refreshMutation.state.error?.message ??
                  refreshMutation.state.error}
              </CardContent>
            </Card>
          )}

          {rd
            .journey(
              rd.combine({
                cachedReportQuery,
                basicInfo,
                contractorsSummary,
                iterationSummary,
                contractorIterationBreakdown,
                contractorNameMap,
              }),
            )
            .wait(() =>
              periodDoesNotOverlapIterations ? null : (
                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-8 w-24" />
                      <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-full mt-1" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ),
            )
            .catch((error) => (
              <Card className="border-destructive">
                <CardContent className="pt-6 text-destructive">
                  <ErrorMessageRenderer error={error} />
                </CardContent>
              </Card>
            ))
            .map(
              ({
                cachedReportQuery: _report,
                contractorsSummary: resolvedContractorsSummary,
                iterationSummary: resolvedIterationSummary,
                contractorIterationBreakdown:
                  resolvedContractorIterationBreakdown,
                contractorNameMap: resolvedContractorNameMap,
              }) =>
                !_report ? null : (
                  <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                    {resolvedContractorsSummary &&
                    resolvedContractorsSummary.contractors.length > 0 &&
                    !(
                      resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0
                    ) ? (
                      <Card className="min-w-0">
                        <CardHeader>
                          <CardTitle>By contractor</CardTitle>
                          <CardDescription>
                            Cost, billing, and profit per contractor (integrated
                            only)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                          {(() => {
                            const integratedIds = new Set(
                              integrationStatus?.integratedContractorIds ?? [],
                            );
                            const displayedContractors =
                              integratedIds.size > 0
                                ? resolvedContractorsSummary.contractors.filter(
                                    (c) => integratedIds.has(c.contractorId),
                                  )
                                : resolvedContractorsSummary.contractors;
                            const excludedCount =
                              resolvedContractorsSummary.contractors.length -
                              displayedContractors.length;

                            return (
                              <>
                                {excludedCount > 0 && (
                                  <p className="mb-4 text-sm text-muted-foreground">
                                    {excludedCount} contractor(s) in cached data
                                    are no longer integrated and excluded from
                                    this view. Totals above include their data.
                                  </p>
                                )}
                                <div className="space-y-4">
                                  {displayedContractors.map((c) => (
                                    <div
                                      key={c.contractorId}
                                      className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <ContractorWidget
                                        contractorId={maybe.of(c.contractorId)}
                                        services={services}
                                        layout="full"
                                        size="sm"
                                      />
                                      <div className="flex flex-wrap gap-4 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Cost:{" "}
                                          </span>
                                          <CurrencyValueWidget
                                            values={c.costBudget}
                                            services={services}
                                            className="font-medium"
                                          />
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Billing:{" "}
                                          </span>
                                          <CurrencyValueWidget
                                            values={c.billingBudget}
                                            services={services}
                                            className="font-medium"
                                          />
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Profit:{" "}
                                          </span>
                                          <Badge variant="secondary">
                                            <CurrencyValueWidget
                                              values={c.earningsBudget}
                                              services={services}
                                              className="text-inherit"
                                            />
                                          </Badge>
                                        </div>
                                        <span className="text-muted-foreground">
                                          {c.totalHours.toFixed(1)}h ·{" "}
                                          {c.entriesCount} entries
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ) : !(
                        resolvedContractorIterationBreakdown &&
                        resolvedContractorIterationBreakdown.length > 0
                      ) ? (
                      <Card className="min-w-0">
                        <CardHeader>
                          <CardTitle>By contractor</CardTitle>
                          <CardDescription>
                            No contractors in cached data
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ) : null}

                    {resolvedIterationSummary &&
                      resolvedIterationSummary.length > 0 && (
                        <TmetricIterationBarChart
                          iterationSummary={resolvedIterationSummary}
                          services={services}
                        />
                      )}
                    {resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0 && (
                        <TmetricHoursPieChart
                          contractorBreakdown={
                            resolvedContractorIterationBreakdown
                          }
                          contractorNameMap={resolvedContractorNameMap}
                        />
                      )}
                    {!(
                      resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0
                    ) &&
                      resolvedContractorsSummary &&
                      resolvedContractorsSummary.contractors.length > 0 && (
                        <TmetricHoursPieChart
                          contractorBreakdown={resolvedContractorsSummary.contractors.map(
                            (c) => ({
                              contractorId: c.contractorId,
                              total: {
                                cost: c.costBudget,
                                billing: c.billingBudget,
                                profit: c.earningsBudget,
                                hours: c.totalHours,
                                entries: c.entriesCount,
                              },
                              byIteration: [],
                            }),
                          )}
                          contractorNameMap={resolvedContractorNameMap}
                        />
                      )}

                    {/* By contractor with iteration breakdown (when iteration mode) */}
                    {resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0 && (
                        <Card className="col-span-full min-w-0">
                          <CardHeader className="min-w-0 space-y-1">
                            <CardTitle>By contractor</CardTitle>
                            <CardDescription className="text-pretty">
                              Cost, billing, and profit per contractor with
                              breakdown by iteration (integrated only)
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="min-w-0 px-3 sm:px-6">
                            {(() => {
                              const integratedIds = new Set(
                                integrationStatus?.integratedContractorIds ??
                                  [],
                              );
                              const displayed =
                                integratedIds.size > 0
                                  ? resolvedContractorIterationBreakdown.filter(
                                      (c) => integratedIds.has(c.contractorId),
                                    )
                                  : resolvedContractorIterationBreakdown;
                              const excludedCount =
                                resolvedContractorIterationBreakdown.length -
                                displayed.length;

                              return (
                                <>
                                  {excludedCount > 0 && (
                                    <p className="mb-4 text-sm text-muted-foreground">
                                      {excludedCount} contractor(s) in cached
                                      data are no longer integrated and excluded
                                      from this view.
                                    </p>
                                  )}
                                  <ByContractorHierarchyView
                                    contractors={displayed}
                                    services={services}
                                    getContractorDetailUrl={(id) =>
                                      myRouting
                                        .forWorkspace(workspaceId)
                                        .forClient(clientId)
                                        .tmetricDashboardContractorFor(id)
                                    }
                                  />
                                </>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}
                  </div>
                ),
            )}
        </div>
      )}
    </div>
  );
}
