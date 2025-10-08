import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import {
  GeneratedReportSource,
  generatedReportSourceQueryUtils,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import {
  type DimensionDescriptor,
  type MeasureDescriptor,
  withDataType,
} from "@/features/_common/Cube/CubeService.types.ts";
import {
  CubeView,
  type CubeViewProps,
} from "@/features/_common/Cube/CubeView.tsx";
import type { PathItem } from "@/features/_common/Cube/useCubeState.ts";
import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { ListView } from "@/features/_common/ListView.tsx";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date.ts";
import { routingUtils } from "@/services/front/RoutingService/RoutingService.ts";
import type { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { CalendarDate } from "@internationalized/date";
import { rd } from "@passionware/monads";
import { useEffect, useMemo } from "react";
import { useMatch, useNavigate } from "react-router-dom";

// Type for time entry data
type TimeEntry = GenericReport["timeEntries"][0];

interface GroupedViewWidgetProps extends WithFrontServices {
  report: GeneratedReportSource;
}

interface TimeEntriesForCubeProps extends WithFrontServices {
  timeEntries: TimeEntry[];
  report: GeneratedReportSource;
}

function TimeEntriesForCube({
  timeEntries,
  report,
  services,
}: TimeEntriesForCubeProps) {
  const query = generatedReportSourceQueryUtils.ofDefault();
  const timeEntriesData = rd.of(timeEntries);

  if (timeEntries.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        No time entries found.
      </div>
    );
  }

  return (
    <ListView
      data={timeEntriesData}
      query={query}
      onQueryChange={() => {}}
      columns={[
        timeEntryColumns.id,
        timeEntryColumns.task(report.data),
        timeEntryColumns.activity(report.data),
        timeEntryColumns.role(report.data),
        timeEntryColumns.contractor(services),
        timeEntryColumns.startTime(services),
        timeEntryColumns.endTime(services),
        timeEntryColumns.duration,
        timeEntryColumns.note,
      ]}
    />
  );
}

const factory = withDataType<TimeEntry>();

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
  const navigate = useNavigate();

  // Use useMatch to get the wildcard path parameter
  const match = useMatch(
    "/w/:workspaceId/clients/:clientId/project/:projectId/iteration/:iterationId/generated-reports/:reportId/grouped-view/*",
  );

  // Parse cube path segments from URL (dimensionId:valueKey strings)
  const cubePathSegmentsFromUrl = useMemo(() => {
    const wildcard = match?.params["*"];
    if (!wildcard) {
      return [];
    }
    const pathSegments = routingUtils.cubePath.fromString(wildcard);

    // Keep raw segments; we'll resolve to PathItem after dimensions are ready
    return pathSegments.map((segment) => {
      const [dimensionId, valueStr] = segment.split(":");
      return { dimensionId, valueStr };
    });
  }, [match?.params]);

  // Fetch contractor data for name lookup
  const contractorIds = Array.from(
    new Set(props.report.data.timeEntries.map((entry) => entry.contractorId)),
  );
  const contractorsQuery = props.services.contractorService.useContractors(
    contractorQueryUtils
      .getBuilder()
      .build((q) => [
        q.withFilter("id", { operator: "oneOf", value: contractorIds }),
      ]),
  );

  // Create cube dimensions from report data
  const dimensions = useMemo(() => {
    const contractorNameLookup = (contractorId: number) => {
      return (
        rd.tryMap(
          contractorsQuery,
          (contractors) =>
            contractors.find((c) => c.id === contractorId)?.fullName,
        ) || `Contractor ${contractorId}`
      );
    };

    return [
      factory.createDimension({
        id: "contractor",
        name: "Contractor",
        icon: "👥",
        getValue: (item) => item.contractorId,
        getKey: (value) => String(value),
        formatValue: (value) => contractorNameLookup(value),
      }),
      factory.createDimension({
        id: "role",
        name: "Role",
        icon: "🎭",
        getValue: (item) => item.roleId,
        getKey: (value) => value,
        formatValue: (value) =>
          props.report.data.definitions.roleTypes[value]?.name || value,
      }),
      factory.createDimension({
        id: "task",
        name: "Task Type",
        icon: "📋",
        getValue: (item) => item.taskId,
        getKey: (value) => value,
        formatValue: (value) =>
          props.report.data.definitions.taskTypes[value]?.name || value,
      }),
      factory.createDimension({
        id: "activity",
        name: "Activity",
        icon: "🎯",
        getValue: (item) => item.activityId,
        getKey: (value) => value,
        formatValue: (value) =>
          props.report.data.definitions.activityTypes[value]?.name || value,
      }),
      factory.createDimension({
        id: "project",
        name: "Project",
        icon: "📁",
        getValue: (item) => item.projectId,
        getKey: (value) => value,
        formatValue: (value) =>
          props.report.data.definitions.projectTypes[value]?.name || value,
      }),
      factory.createDimension({
        id: "month",
        name: "Month",
        icon: "📅",
        getValue: (item) => {
          const date = new Date(item.startAt);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        },
        getKey: (value) => value,
        formatValue: (value) => {
          const [year, month] = value.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });
        },
      }),
      factory.createDimension({
        id: "weekday",
        name: "Day of Week",
        icon: "📆",
        getValue: (item) => {
          const date = new Date(item.startAt);
          return date.getDay();
        },
        getKey: (value) => String(value),
        formatValue: (value) => {
          const days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          return days[value];
        },
      }),
      factory.createDimension({
        id: "date",
        name: "Date",
        icon: "📅",
        getValue: (item) => {
          const date = new Date(item.startAt);
          return dateToCalendarDate(date);
        },
        getKey: (value) => {
          const calendarDate = value as CalendarDate;
          return `${calendarDate.year}-${String(calendarDate.month).padStart(2, "0")}-${String(calendarDate.day).padStart(2, "0")}`;
        },
        formatValue: (value) => {
          const calendarDate = value as CalendarDate;
          return calendarDate.toDate("UTC").toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
      }),
    ];
  }, [contractorsQuery, props.report.data.definitions]);

  // Create cube measures from report data
  const measures = useMemo(() => {
    return [
      factory.createMeasure({
        id: "hours",
        name: "Hours",
        icon: "⏱️",
        getValue: (item) => {
          const start = new Date(item.startAt);
          const end = new Date(item.endAt);
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
        },
        aggregate: (values) => values.reduce((sum, val) => sum + val, 0),
        formatValue: (value) => `${value.toFixed(2)}h`,
        sidebarOptions: {
          mode: "percentage",
        },
      }),
      factory.createMeasure({
        id: "cost",
        name: "Cost",
        icon: "💸",
        getValue: (item) => {
          const roleType = props.report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (item.endAt.getTime() - item.startAt.getTime()) / (1000 * 60 * 60);
          return hours * matchingRate.costRate;
        },
        aggregate: (values) => values.reduce((sum, val) => sum + val, 0),
        formatValue: (value) => `${value.toFixed(2)} EUR`, // TODO: Use currency from rate
        sidebarOptions: {
          mode: "absolute",
        },
      }),
      factory.createMeasure({
        id: "billing",
        name: "Billing",
        icon: "💰",
        getValue: (item) => {
          const roleType = props.report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (item.endAt.getTime() - item.startAt.getTime()) / (1000 * 60 * 60);
          return hours * matchingRate.billingRate;
        },
        aggregate: (values) => values.reduce((sum, val) => sum + val, 0),
        formatValue: (value) => `${value.toFixed(2)} EUR`, // TODO: Use currency from rate
        sidebarOptions: {
          mode: "absolute",
        },
      }),
      factory.createMeasure({
        id: "profit",
        name: "Profit",
        icon: "📈",
        getValue: (item) => {
          const roleType = props.report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (item.endAt.getTime() - item.startAt.getTime()) / (1000 * 60 * 60);
          return hours * (matchingRate.billingRate - matchingRate.costRate);
        },
        aggregate: (values) => values.reduce((sum, val) => sum + val, 0),
        formatValue: (value) => `${value.toFixed(2)} EUR`, // TODO: Use currency from rate
        sidebarOptions: {
          mode: "divergent",
          positiveColorClassName: "bg-teal-500",
          negativeColorClassName: "bg-pink-500",
        },
      }),
      factory.createMeasure({
        id: "entries",
        name: "Entries",
        icon: "📊",
        getValue: () => 1, // Each item counts as 1 entry
        aggregate: (values) => values.reduce((sum, val) => sum + val, 0),
        formatValue: (value) => `${value} entries`,
        sidebarOptions: {
          mode: "percentage",
        },
      }),
    ];
  }, [props.report.data.definitions.roleTypes]);

  // Initialize cube state
  const cubeState = useCubeState({
    data: props.report.data.timeEntries,
    dimensions: dimensions as DimensionDescriptor<TimeEntry, unknown>[],
    measures: measures as MeasureDescriptor<TimeEntry, unknown>[],
    initialDefaultDimensionSequence: [
      "project",
      "task",
      "activity",
      "contractor",
    ],
    includeItems: true, // Enable raw data viewing
  });

  // Sync cube path from URL on mount (resolve keys to actual values using dimensions & data)
  useEffect(() => {
    if (cubePathSegmentsFromUrl.length === 0) return;

    const resolvedPath: PathItem[] = [];
    for (const seg of cubePathSegmentsFromUrl) {
      const dimension = dimensions.find((d) => d.id === seg.dimensionId);
      if (!dimension) continue;

      let resolvedValue: unknown = seg.valueStr;

      // Prefer resolving via getKey by scanning data for a matching key
      if (dimension.getKey) {
        const match = props.report.data.timeEntries.find((item) => {
          const val = dimension.getValue(item);
          const key = (dimension.getKey as (v: unknown) => string)(val);
          return key === seg.valueStr;
        });
        if (match) {
          resolvedValue = dimension.getValue(match);
        }
      } else {
        // Heuristics when no getKey defined
        if (seg.valueStr === "null") {
          resolvedValue = null;
        } else if (/^\d+$/.test(seg.valueStr)) {
          resolvedValue = Number(seg.valueStr);
        }
      }

      resolvedPath.push({
        dimensionId: seg.dimensionId,
        dimensionValue: resolvedValue,
      });
    }

    if (resolvedPath.length > 0) {
      cubeState.setZoomPath(resolvedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync URL when cube path changes
  useEffect(() => {
    const currentPath = cubeState.path;

    // Convert cube path to URL segments
    const urlSegments = currentPath.map((pathItem) => {
      // Find the dimension to get its getKey function
      const dimension = dimensions.find((d) => d.id === pathItem.dimensionId);
      const key = dimension?.getKey
        ? (dimension.getKey as (v: unknown) => string)(pathItem.dimensionValue)
        : String(pathItem.dimensionValue ?? "null");
      return `${pathItem.dimensionId}:${key}`;
    });

    // Build the URL using the match params
    if (match?.params) {
      const { workspaceId, clientId, projectId, iterationId, reportId } =
        match.params;
      const basePath = `/w/${workspaceId}/clients/${clientId}/project/${projectId}/iteration/${iterationId}/generated-reports/${reportId}/grouped-view`;
      const newPath =
        urlSegments.length > 0
          ? `${basePath}/${urlSegments.join("/")}`
          : basePath;

      // Only navigate if the path has changed
      const currentPathname = window.location.pathname;
      if (currentPathname !== newPath) {
        navigate(newPath);
      }
    }
  }, [cubeState.path, dimensions, navigate, match?.params]);

  const renderRawData: CubeViewProps["renderRawData"] = (items) => {
    return (
      <div className="mt-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            Raw Time Entries
          </h4>
          <Badge variant="secondary" className="text-xs">
            {items.length} entries
          </Badge>
        </div>
        <TimeEntriesForCube
          timeEntries={items as TimeEntry[]}
          report={props.report}
          services={props.services}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cube Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Report BI Analysis</CardTitle>
          <CardDescription>
            Comprehensive analytics for time tracking, costs, billing, and
            profitability. Explore by contractor, project, task type, activity,
            role, and time period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CubeView
            state={cubeState}
            renderRawData={renderRawData}
            enableDimensionPicker={true}
            enableRawDataView={true}
            enableZoomIn={true}
            showGrandTotals={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
