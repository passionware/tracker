import { Badge } from "@/components/ui/badge.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { GenericReport } from "@/services/io/_common/GenericReport";

export type TimeEntry = GenericReport["timeEntries"][0];

export const timeEntryColumns = {
  id: getColumnHelper<TimeEntry>().accessor("id", {
    header: "ID",
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
    meta: {
      sortKey: "id",
    },
  }),
  task: (report: GenericReport) =>
    getColumnHelper<TimeEntry>().accessor("taskId", {
      header: "Task",
      cell: (info) => {
        const taskType = report.definitions.taskTypes[info.getValue()];
        return (
          <Badge variant="secondary">{taskType?.name || info.getValue()}</Badge>
        );
      },
      meta: {
        sortKey: "taskId",
      },
    }),
  activity: (report: GenericReport) =>
    getColumnHelper<TimeEntry>().accessor("activityId", {
      header: "Activity",
      cell: (info) => {
        const activityType = report.definitions.activityTypes[info.getValue()];
        return (
          <Badge variant="accent1">
            {activityType?.name || info.getValue()}
          </Badge>
        );
      },
      meta: {
        sortKey: "activityId",
      },
    }),
  role: (report: GenericReport) =>
    getColumnHelper<TimeEntry>().accessor("roleId", {
      header: "Role",
      cell: (info) => {
        const roleType = report.definitions.roleTypes[info.getValue()];
        return (
          <Badge variant="primary">{roleType?.name || info.getValue()}</Badge>
        );
      },
      meta: {
        sortKey: "roleId",
      },
    }),
  startTime: (services: WithFormatService) =>
    getColumnHelper<TimeEntry>().accessor("startAt", {
      header: "Start Time",
      cell: (info) =>
        services.formatService.temporal.single.compactWithTime(info.getValue()),
      meta: {
        sortKey: "startAt",
      },
    }),
  endTime: (services: WithFormatService) =>
    getColumnHelper<TimeEntry>().accessor("endAt", {
      header: "End Time",
      cell: (info) =>
        services.formatService.temporal.single.compactWithTime(info.getValue()),
      meta: {
        sortKey: "endAt",
      },
    }),
  duration: getColumnHelper<TimeEntry>().display({
    id: "duration",
    header: "Duration",
    cell: (info) => {
      const startAt = info.row.original.startAt;
      const endAt = info.row.original.endAt;
      const diffMs = endAt.getTime() - startAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return <span className="font-mono">{`${diffHours.toFixed(1)}h`}</span>;
    },
    meta: {
      sortKey: "duration",
    },
  }),
  note: getColumnHelper<TimeEntry>().accessor("note", {
    header: "Note",
    cell: (info) => {
      const note = info.getValue();
      return note ? (
        <span className="max-w-xs truncate">{note}</span>
      ) : (
        <span className="text-slate-400 italic">No note</span>
      );
    },
    meta: {
      sortKey: "note",
    },
  }),
};
