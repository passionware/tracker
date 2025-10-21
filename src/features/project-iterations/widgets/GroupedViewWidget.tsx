import {
  GeneratedReportSource,
  generatedReportSourceQueryUtils,
} from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { timeEntryColumns } from "@/features/_common/columns/timeEntry.tsx";
import { type CubeViewProps } from "@/features/_common/Cube/CubeView.tsx";
import { CubeViewWithSelection } from "@/features/_common/Cube/CubeViewWithSelection.tsx";
import { useCubeContext } from "@/features/_common/Cube/CubeContext.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import type { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { rd } from "@passionware/monads";

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
  // Use shared cube state from context instead of creating our own
  const { state: cubeState } = useCubeContext();

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
    <CubeViewWithSelection
      className="bg-white w-full h-full flex-1 min-h-0 p-4 flex flex-col"
      state={cubeState}
      renderRawData={renderRawData}
      enableZoomIn={true}
      onSelectionMeasurementsChange={(measurements) => {
        // Optional: Handle selection measurements changes
        // This could be used to show aggregated data for selected groups
      }}
    />
  );
}
