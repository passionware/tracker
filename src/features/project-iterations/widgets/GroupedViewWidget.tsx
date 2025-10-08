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
import type {
  DimensionDescriptor,
  MeasureDescriptor,
} from "@/features/_common/Cube/CubeService.types.ts";
import {
  CubeView,
  type CubeViewProps,
} from "@/features/_common/Cube/CubeView.tsx";
import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { ListView } from "@/features/_common/ListView.tsx";
import { rd } from "@passionware/monads";
import { useMemo } from "react";
import type { GenericReport } from "@/services/io/_common/GenericReport.ts";

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

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
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
  const dimensions = useMemo((): DimensionDescriptor<TimeEntry>[] => {
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
      {
        id: "contractor",
        name: "Contractor",
        icon: "👥",
        getValue: (item: TimeEntry) => item.contractorId,
        getKey: (value: unknown) => String(value),
        formatValue: (value: unknown) => contractorNameLookup(value as number),
      },
      {
        id: "role",
        name: "Role",
        icon: "🎭",
        getValue: (item: TimeEntry) => item.roleId,
        getKey: (value: unknown) => value as string,
        formatValue: (value: unknown) =>
          props.report.data.definitions.roleTypes[value as string]?.name ||
          (value as string),
      },
      {
        id: "task",
        name: "Task Type",
        icon: "📋",
        getValue: (item: TimeEntry) => item.taskId,
        getKey: (value: unknown) => value as string,
        formatValue: (value: unknown) =>
          props.report.data.definitions.taskTypes[value as string]?.name ||
          (value as string),
      },
      {
        id: "activity",
        name: "Activity",
        icon: "🎯",
        getValue: (item: TimeEntry) => item.activityId,
        getKey: (value: unknown) => value as string,
        formatValue: (value: unknown) =>
          props.report.data.definitions.activityTypes[value as string]?.name ||
          (value as string),
      },
      {
        id: "project",
        name: "Project",
        icon: "📁",
        getValue: (item: TimeEntry) => item.projectId,
        getKey: (value: unknown) => value as string,
        formatValue: (value: unknown) =>
          props.report.data.definitions.projectTypes[value as string]?.name ||
          (value as string),
      },
      {
        id: "month",
        name: "Month",
        icon: "📅",
        getValue: (item: TimeEntry) => {
          const date = new Date(item.startAt);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        },
        getKey: (value: unknown) => value as string,
        formatValue: (value: unknown) => {
          const [year, month] = (value as string).split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });
        },
      },
      {
        id: "weekday",
        name: "Day of Week",
        icon: "📆",
        getValue: (item: TimeEntry) => {
          const date = new Date(item.startAt);
          return date.getDay();
        },
        getKey: (value: unknown) => String(value),
        formatValue: (value: unknown) => {
          const days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          return days[value as number];
        },
      },
    ];
  }, [contractorsQuery, props.report.data.definitions]);

  // Create cube measures from report data
  const measures = useMemo((): MeasureDescriptor<TimeEntry>[] => {
    return [
      {
        id: "hours",
        name: "Hours",
        icon: "⏱️",
        getValue: (item: TimeEntry) => {
          const start = new Date(item.startAt);
          const end = new Date(item.endAt);
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
        },
        aggregate: (values: number[]) =>
          values.reduce((sum, val) => sum + val, 0),
        formatValue: (value: number) => `${value.toFixed(2)}h`,
      },
      {
        id: "entries",
        name: "Entries",
        icon: "📊",
        getValue: () => 1, // Each item counts as 1 entry
        aggregate: (values: number[]) =>
          values.reduce((sum, val) => sum + val, 0),
        formatValue: (value: number) => `${value} entries`,
      },
    ];
  }, []);

  // Initialize cube state
  const cubeState = useCubeState({
    data: props.report.data.timeEntries,
    dimensions,
    measures,
    initialDefaultDimensionSequence: [
      "project",
      "task",
      "activity",
      "contractor",
    ],
    includeItems: true, // Enable raw data viewing
  });

  // Custom render functions for the cube
  const renderGroupHeader: CubeViewProps["renderGroupHeader"] = (
    group,
    level,
  ) => {
    const indent = level * 20;
    return (
      <div
        className="p-3 border rounded-lg mb-2"
        style={{ marginLeft: `${indent}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600">
                {group.dimensionLabel}
              </span>
              <Badge variant="secondary" className="text-xs">
                {group.itemCount} entries
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-slate-600">Hours: </span>
              <span className="font-medium">
                {group.cells.find((c) => c.measureId === "hours")
                  ?.formattedValue || "0.00h"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-600">Entries: </span>
              <span className="font-medium">
                {group.cells.find((c) => c.measureId === "entries")
                  ?.formattedValue || "0 entries"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">
              Dataset: {cubeState.cube.totalItems} time entries •{" "}
              {contractorIds.length} contractors •{" "}
              {Object.keys(props.report.data.definitions.projectTypes).length}{" "}
              projects • Total:{" "}
              {cubeState.cube.grandTotals.find((c) => c.measureId === "hours")
                ?.formattedValue || "0.00h"}
            </div>
          </div>

          <CubeView
            state={cubeState}
            renderGroupHeader={renderGroupHeader}
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
