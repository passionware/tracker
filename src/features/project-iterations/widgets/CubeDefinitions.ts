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
        getValue: (item) => item.projectId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const projectType =
            report.data.definitions.projectTypes[value as string];
          return projectType?.name || String(value ?? "Unknown");
        },
      },
      {
        id: "contractor",
        name: "Contractor",
        icon: "👤",
        getValue: (item) => item.contractorId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
      {
        id: "role",
        name: "Role",
        icon: "🎭",
        getValue: (item) => item.roleId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const roleType = report.data.definitions.roleTypes[value as string];
          return roleType?.name || String(value ?? "Unknown");
        },
      },
      {
        id: "task",
        name: "Task",
        icon: "📋",
        getValue: (item) => item.taskId,
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => {
          const taskType = report.data.definitions.taskTypes[value as string];
          return taskType?.name || String(value ?? "Unknown");
        },
      },
      {
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
      },
      {
        id: "date",
        name: "Date",
        icon: "📅",
        getValue: (item) => {
          const date = new Date(item.startAt);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDay()).padStart(2, "0")}`;
        },
        getKey: (value) => String(value ?? "null"),
        formatValue: (value) => String(value ?? "Unknown"),
      },
    ];

    const measures: MeasureDescriptor<CubeDataItem, unknown>[] = [
      {
        id: "hours",
        name: "Hours",
        icon: "⏱️",
        getValue: (item) => {
          const start = new Date(item.startAt);
          const end = new Date(item.endAt);
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
        },
        aggregate: (values) =>
          values.reduce((sum: any, val: any) => sum + val, 0),
        formatValue: (value: any) => `${value.toFixed(2)}h`,
        sidebarOptions: {
          mode: "percentage",
        },
      },
      {
        id: "cost",
        name: "Cost",
        icon: "💰",
        getValue: (item) => {
          const roleType = report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (new Date(item.endAt).getTime() -
              new Date(item.startAt).getTime()) /
            (1000 * 60 * 60);
          return hours * matchingRate.costRate;
        },
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
        getValue: (item) => {
          const roleType = report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (new Date(item.endAt).getTime() -
              new Date(item.startAt).getTime()) /
            (1000 * 60 * 60);
          return hours * matchingRate.billingRate;
        },
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
        getValue: (item) => {
          const roleType = report.data.definitions.roleTypes[item.roleId];
          const matchingRate =
            roleType?.rates.find(
              (rate) =>
                rate.activityType === item.activityId &&
                rate.taskType === item.taskId,
            ) || roleType?.rates[0]; // Fallback to first rate

          if (!matchingRate) return 0;

          const hours =
            (new Date(item.endAt).getTime() -
              new Date(item.startAt).getTime()) /
            (1000 * 60 * 60);
          return hours * (matchingRate.billingRate - matchingRate.costRate);
        },
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
