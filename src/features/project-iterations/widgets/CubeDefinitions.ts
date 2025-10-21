/**
 * Shared Cube Definitions
 *
 * Centralized definition of cube dimensions and measures for consistency
 * across all cube-related components.
 */

import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  type CubeDataItem,
  type MeasureDescriptor,
  withDataType,
} from "@/features/_common/Cube/CubeService.types.ts";
import { SortOptions } from "@/features/_common/Cube/CubeSortOptions.ts";
import { rd } from "@passionware/monads";
import { useMemo } from "react";
import { sum } from "lodash";

export function useCubeDefinitions(
  report: GeneratedReportSource,
  services: WithFrontServices["services"],
) {
  // Get unique contractor IDs from the report
  const contractorIds = useMemo(() => {
    const uniqueIds = new Set(
      report.data.timeEntries.map((entry) => entry.contractorId),
    );
    return Array.from(uniqueIds);
  }, [report.data.timeEntries]);

  // Fetch contractor data
  const contractorsQuery = services.contractorService.useContractors(
    contractorQueryUtils.getBuilder().build((q) => [
      q.withFilter("id", {
        operator: "oneOf",
        value: contractorIds,
      }),
    ]),
  );

  return useMemo(() => {
    const factory = withDataType<CubeDataItem>();
    // Get contractor data for name resolution
    const contractors = rd.mapOrElse(contractorsQuery, (data) => data, []);

    const dimensions = [
      factory.createDimension({
        id: "project",
        name: "Project",
        icon: "🏗️",
        getValue: (item) => item.projectId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const projectType =
            report.data.definitions.projectTypes[value as string];
          return projectType?.name || String(value ?? "Unknown");
        },
        sortOptions: SortOptions.string(), // Alphabetical, Reverse, By Length
      }),
      factory.createDimension({
        id: "task",
        name: "Task",
        icon: "📋",
        getValue: (item) => item.taskId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const taskType = report.data.definitions.taskTypes[value as string];
          return taskType?.name || String(value ?? "Unknown");
        },
        sortOptions: SortOptions.string(), // Alphabetical, Reverse, By Length
      }),
      factory.createDimension({
        id: "contractor",
        name: "Contractor",
        icon: "👤",
        getValue: (item) => item.contractorId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const contractorId = value as string;
          const contractor = contractors.find(
            (c: any) => String(c.id) === String(contractorId),
          );
          const result =
            contractor?.fullName ||
            contractor?.name ||
            String(value ?? "Unknown");
          return result;
        },
        sortOptions: SortOptions.string(), // Alphabetical, Reverse, By Length
      }),
      factory.createDimension({
        id: "activity",
        name: "Activity",
        icon: "⚡",
        getValue: (item) => item.activityId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const activityType =
            report.data.definitions.activityTypes[value as string];
          return activityType?.name || String(value ?? "Unknown");
        },
        sortOptions: SortOptions.string(), // Alphabetical, Reverse, By Length
      }),
      factory.createDimension({
        id: "role",
        name: "Role",
        icon: "🎭",
        getValue: (item) => item.roleId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const roleType = report.data.definitions.roleTypes[value as string];
          return roleType?.name || String(value ?? "Unknown");
        },
        sortOptions: SortOptions.custom([
          {
            id: "alphabetical",
            label: "Alphabetical",
            comparator: (a, b) => String(a).localeCompare(String(b)),
            defaultDirection: "asc",
          },
          {
            id: "reverse-alphabetical",
            label: "Reverse Alphabetical",
            comparator: (a, b) => String(b).localeCompare(String(a)),
            defaultDirection: "desc",
          },
          {
            id: "by-length",
            label: "By Length",
            comparator: (a, b) => String(a).length - String(b).length,
            defaultDirection: "asc",
          },
        ]),
      }),
    ];

    const measures: MeasureDescriptor<CubeDataItem, unknown>[] = [
      {
        id: "hours",
        name: "Hours",
        icon: "⏱️",
        getValue: (item) => {
          return item.numHours || 0; // Use pre-calculated numHours field
        },
        aggregate: sum,
        formatValue: (value: any) => `${value.toFixed(2)}h`,
        sidebarOptions: {
          mode: "percentage",
        },
        sortOptions: SortOptions.number(), // Ascending, Descending, Absolute Value
      },
      {
        id: "cost",
        name: "Cost",
        icon: "💰",
        getValue: (item) => {
          return item.costValue || 0; // Use pre-calculated costValue field
        },
        aggregate: sum,
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "absolute",
        },
        sortOptions: SortOptions.number(), // Ascending, Descending, Absolute Value
      },
      {
        id: "billing",
        name: "Billing",
        icon: "💳",
        getValue: (item) => {
          return item.billingValue || 0; // Use pre-calculated billingValue field
        },
        aggregate: sum,
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "absolute",
        },
        sortOptions: SortOptions.number(), // Ascending, Descending, Absolute Value
      },
      {
        id: "profit",
        name: "Profit",
        icon: "📈",
        getValue: (item) => {
          return item.profitValue || 0; // Use pre-calculated profitValue field
        },
        aggregate: sum,
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "divergent",
          positiveColorClassName: "bg-green-500",
          negativeColorClassName: "bg-red-500",
        },
        sortOptions: SortOptions.number(), // Ascending, Descending, Absolute Value
      },
      {
        id: "entries",
        name: "Entries",
        icon: "📊",
        getValue: () => 1,
        aggregate: sum,
        formatValue: (value: any) => `${value}`,
        sidebarOptions: {
          mode: "absolute",
        },
        sortOptions: SortOptions.number(), // Ascending, Descending, Absolute Value
      },
    ];

    // Create raw data dimension - use date if available, otherwise use entry ID
    const rawDataDimension = factory.createDimension<any>({
      id: "date",
      name: "Date",
      icon: "📅",
      getValue: (item) => {
        // Handle anonymized time entries where startAt might be undefined
        if (!item.startAt) {
          return "Services";
        }
        const date = new Date(item.startAt);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return "Invalid Date";
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDay()).padStart(2, "0")}`;
      },
      getKey: (value) => String(value ?? "null"),
      formatValue: (value) => String(value ?? "Unknown"),
      sortOptions: SortOptions.date(), // Chronological, Reverse Chronological
    });

    // Create alternative raw data dimension for anonymized data
    const anonymizedRawDataDimension = factory.createDimension<any>({
      id: "entry",
      name: "Entry",
      icon: "📋",
      getValue: (item) => {
        return item.id || "Unknown Entry";
      },
      getKey: (value) => String(value ?? "null"),
      formatValue: (value) => String(value ?? "Unknown"),
      sortOptions: SortOptions.string(), // Alphabetical, Reverse, By Length
    });

    return {
      dimensions,
      measures,
      rawDataDimension,
      anonymizedRawDataDimension,
    };
  }, [report, services, contractorsQuery]);
}
