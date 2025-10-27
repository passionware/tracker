import { Badge } from "@/components/ui/badge.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { GenericReport } from "@/services/io/_common/GenericReport";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService";
import { ContractorWidget } from "../elements/pickers/ContractorView";

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
  contractor: (services: WithContractorService) =>
    getColumnHelper<TimeEntry>().accessor("contractorId", {
      header: "Contractor",
      cell: (info) => {
        return (
          <ContractorWidget
            layout="full"
            services={services}
            contractorId={info.getValue()}
          />
        );
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
  costRate: (report: GenericReport, services: WithFormatService) =>
    getColumnHelper<TimeEntry>().display({
      id: "costRate",
      header: "Cost Rate",
      cell: (info) => {
        const entry = info.row.original;
        const roleType = report.definitions.roleTypes[entry.roleId];
        const matchingRate = roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        );
        if (!matchingRate) {
          return <span className="text-slate-400">No rate</span>;
        }

        return (
          <span className="font-mono text-sm">
            {services.formatService.financial.currency({
              amount: matchingRate.costRate,
              currency: matchingRate.costCurrency,
            })}
            /h
          </span>
        );
      },
      meta: {
        sortKey: "costRate",
      },
    }),
  billingRate: (report: GenericReport, services: WithFormatService) =>
    getColumnHelper<TimeEntry>().display({
      id: "billingRate",
      header: "Billing Rate",
      cell: (info) => {
        const entry = info.row.original;
        const roleType = report.definitions.roleTypes[entry.roleId];
        const matchingRate = roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        );
        if (!matchingRate) {
          return <span className="text-slate-400">No rate</span>;
        }

        return (
          <span className="font-mono text-sm">
            {services.formatService.financial.currency({
              amount: matchingRate.billingRate,
              currency: matchingRate.billingCurrency,
            })}
            /h
          </span>
        );
      },
      meta: {
        sortKey: "billingRate",
      },
    }),
  costAmount: (report: GenericReport, services: WithFormatService) =>
    getColumnHelper<TimeEntry>().display({
      id: "costAmount",
      header: "Cost Amount",
      cell: (info) => {
        const entry = info.row.original;
        const roleType = report.definitions.roleTypes[entry.roleId];
        const matchingRate = roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        );
        if (!matchingRate) {
          return <span className="text-slate-400">No rate</span>;
        }

        const hours =
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
        const cost = hours * matchingRate.costRate;

        return (
          <span className="font-medium text-red-600">
            {services.formatService.financial.currency({
              amount: cost,
              currency: matchingRate.costCurrency,
            })}
          </span>
        );
      },
      meta: {
        sortKey: "costAmount",
      },
    }),
  billingAmount: (report: GenericReport, services: WithFormatService) =>
    getColumnHelper<TimeEntry>().display({
      id: "billingAmount",
      header: "Billing Amount",
      cell: (info) => {
        const entry = info.row.original;
        const roleType = report.definitions.roleTypes[entry.roleId];
        const matchingRate = roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        );

        if (!matchingRate) {
          return <span className="text-slate-400">No rate</span>;
        }

        const hours =
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
        const billing = hours * matchingRate.billingRate;

        return (
          <span className="font-medium text-green-600">
            {services.formatService.financial.currency({
              amount: billing,
              currency: matchingRate.billingCurrency,
            })}
          </span>
        );
      },
      meta: {
        sortKey: "billingAmount",
      },
    }),
  profitAmount: (report: GenericReport, services: WithFormatService) =>
    getColumnHelper<TimeEntry>().display({
      id: "profitAmount",
      header: "Profit",
      cell: (info) => {
        const entry = info.row.original;
        const roleType = report.definitions.roleTypes[entry.roleId];
        const matchingRate = roleType?.rates.find(
          (rate) =>
            rate.activityType === entry.activityId &&
            rate.taskType === entry.taskId,
        );
        if (!matchingRate) {
          return <span className="text-slate-400">No rate</span>;
        }

        const hours =
          (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
        const cost = hours * matchingRate.costRate;
        const billing = hours * matchingRate.billingRate;

        // For simplicity, we'll show profit in the billing currency
        // In a real implementation, you'd want proper currency conversion
        const profit =
          billing -
          (matchingRate.billingCurrency === matchingRate.costCurrency
            ? cost
            : 0);

        const profitClass =
          profit > 0
            ? "text-green-600"
            : profit < 0
              ? "text-red-600"
              : "text-slate-500";

        return (
          <span className={`font-medium ${profitClass}`}>
            {services.formatService.financial.currency({
              amount: profit,
              currency: matchingRate.billingCurrency,
            })}
          </span>
        );
      },
      meta: {
        sortKey: "profitAmount",
      },
    }),
};
