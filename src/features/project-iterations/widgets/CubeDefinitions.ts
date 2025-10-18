/**
 * Shared Cube Definitions
 *
 * Centralized definition of cube dimensions and measures for consistency
 * across all cube-related components.
 */

import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { useMemo } from "react";
import type {
  DimensionDescriptor,
  MeasureDescriptor,
  CubeDataItem,
} from "@/features/_common/Cube/CubeService.types.ts";

export function useCubeDefinitions(
  report: GeneratedReportSource,
  services: WithFrontServices["services"],
) {
  return useMemo(() => {
    const dimensions: DimensionDescriptor<CubeDataItem, unknown>[] = [
      {
        id: "project",
        name: "Project",
        icon: "🏗️",
        getValue: (item) => item.project?.name,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "contractor",
        name: "Contractor",
        icon: "👤",
        getValue: (item) => item.contractor?.name,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "role",
        name: "Role",
        icon: "🎭",
        getValue: (item) => item.role?.name,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "task",
        name: "Task",
        icon: "📋",
        getValue: (item) => item.task?.name,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "activity",
        name: "Activity",
        icon: "⚡",
        getValue: (item) => item.activity?.name,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "date",
        name: "Date",
        icon: "📅",
        getValue: (item) => item.date,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
    ];

    const measures: MeasureDescriptor<CubeDataItem, unknown>[] = [
      {
        id: "hours",
        name: "Hours",
        icon: "⏱️",
        getValue: (item) => item.hours,
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `${value}h`,
        sidebarOptions: {
          mode: "percentage",
        },
      },
      {
        id: "cost",
        name: "Cost",
        icon: "💰",
        getValue: (item) => item.cost,
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "absolute",
        },
      },
      {
        id: "billing",
        name: "Billing",
        icon: "💳",
        getValue: (item) => item.billing,
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "absolute",
        },
      },
      {
        id: "profit",
        name: "Profit",
        icon: "📈",
        getValue: (item) => item.billing - item.cost,
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `$${value.toFixed(2)}`,
        sidebarOptions: {
          mode: "divergent",
          positiveColorClassName: "bg-green-500",
          negativeColorClassName: "bg-red-500",
        },
      },
      {
        id: "entries",
        name: "Entries",
        icon: "📊",
        getValue: () => 1,
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `${value}`,
        sidebarOptions: {
          mode: "absolute",
        },
      },
    ];

    return { dimensions, measures };
  }, [report, services]);
}
