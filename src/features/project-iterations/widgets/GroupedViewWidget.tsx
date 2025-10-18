import {
  GeneratedReportSource,
  generatedReportSourceQueryUtils,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import {
  CubeView,
  type CubeViewProps,
} from "@/features/_common/Cube/CubeView.tsx";
import type { PathItem } from "@/features/_common/Cube/useCubeState.ts";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { routingUtils } from "@/services/front/RoutingService/RoutingService.ts";
import type { GenericReport } from "@/services/io/_common/GenericReport.ts";
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

// const factory = withDataType<TimeEntry>();

export function GroupedViewWidget(props: GroupedViewWidgetProps) {
  const navigate = useNavigate();

  // Use shared cube state from context instead of creating our own
  const { state: cubeState, dimensions } = useCubeContext();

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
        <TimeEntriesForCube
          timeEntries={items as TimeEntry[]}
          report={props.report}
          services={props.services}
        />
      </div>
    );
  };

  return (
    <CubeView
      className="bg-white w-full h-full flex-1 min-h-0 p-4 flex flex-col"
      state={cubeState}
      renderRawData={renderRawData}
      enableDimensionPicker={true}
      enableRawDataView={true}
      enableZoomIn={true}
      showGrandTotals={false} // Disable internal sidebar since we'll use context-based components
    />
  );
}
