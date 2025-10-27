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
  type SerializableCubeConfig,
  type SerializableDimension,
  type SerializableMeasure,
  type SerializableDataField,
} from "@/features/_common/Cube/serialization/CubeSerialization.types.ts";
import { rd } from "@passionware/monads";
import { useMemo } from "react";

/**
 * Define the serializable cube configuration.
 * This is the source of truth - no reverse engineering needed!
 */
function getSerializableCubeConfig(
  report: GeneratedReportSource,
  contractors: Array<{ id: number; name: string; fullName?: string }>,
): SerializableCubeConfig {
  // Build label mappings for each dimension
  const projectLabelMapping: Record<string, string> = {};
  Object.entries(report.data.definitions.projectTypes).forEach(([id, type]) => {
    if (id !== type.name) {
      projectLabelMapping[id] = type.name;
    }
  });

  const taskLabelMapping: Record<string, string> = {};
  Object.entries(report.data.definitions.taskTypes).forEach(([id, type]) => {
    if (id !== type.name) {
      taskLabelMapping[id] = type.name;
    }
  });

  const activityLabelMapping: Record<string, string> = {};
  Object.entries(report.data.definitions.activityTypes).forEach(
    ([id, type]) => {
      if (id !== type.name) {
        activityLabelMapping[id] = type.name;
      }
    },
  );

  const roleLabelMapping: Record<string, string> = {};
  Object.entries(report.data.definitions.roleTypes).forEach(([id, type]) => {
    if (id !== type.name) {
      roleLabelMapping[id] = type.name;
    }
  });

  const contractorLabelMapping: Record<string, string> = {};
  contractors.forEach((contractor) => {
    const displayName = contractor.fullName || contractor.name;
    if (String(contractor.id) !== displayName) {
      contractorLabelMapping[String(contractor.id)] = displayName;
    }
  });

  const dimensions: SerializableDimension[] = [
    {
      id: "project",
      name: "Project",
      icon: "🏗️",
      fieldName: "projectId",
      ...(Object.keys(projectLabelMapping).length > 0 && {
        labelMapping: projectLabelMapping,
      }),
    },
    {
      id: "task",
      name: "Task",
      icon: "📋",
      fieldName: "taskId",
      ...(Object.keys(taskLabelMapping).length > 0 && {
        labelMapping: taskLabelMapping,
      }),
    },
    {
      id: "contractor",
      name: "Contractor",
      icon: "👤",
      fieldName: "contractorId",
      ...(Object.keys(contractorLabelMapping).length > 0 && {
        labelMapping: contractorLabelMapping,
      }),
    },
    {
      id: "activity",
      name: "Activity",
      icon: "⚡",
      fieldName: "activityId",
      ...(Object.keys(activityLabelMapping).length > 0 && {
        labelMapping: activityLabelMapping,
      }),
    },
    {
      id: "role",
      name: "Role",
      icon: "🎭",
      fieldName: "roleId",
      ...(Object.keys(roleLabelMapping).length > 0 && {
        labelMapping: roleLabelMapping,
      }),
    },
    {
      id: "date",
      name: "Date",
      icon: "📅",
      fieldName: "startAt",
      formatFunction: {
        type: "date",
        parameters: { format: "short" },
      },
    },
  ];

  const measures: SerializableMeasure[] = [
    {
      id: "hours",
      name: "Hours",
      icon: "⏱️",
      fieldName: "numHours",
      aggregationFunction: "sum",
      formatFunction: {
        type: "number",
        parameters: { decimals: 2 },
      },
      sidebarOptions: {
        mode: "percentage",
      },
    },
    {
      id: "cost",
      name: "Cost",
      icon: "💰",
      fieldName: "costValue",
      aggregationFunction: "sum",
      formatFunction: {
        type: "currency",
        parameters: { currency: "USD", decimals: 2 },
      },
      sidebarOptions: {
        mode: "absolute",
      },
    },
    {
      id: "billing",
      name: "Billing",
      icon: "💳",
      fieldName: "billingValue",
      aggregationFunction: "sum",
      formatFunction: {
        type: "currency",
        parameters: { currency: "USD", decimals: 2 },
      },
      sidebarOptions: {
        mode: "absolute",
      },
    },
    {
      id: "profit",
      name: "Profit",
      icon: "📈",
      fieldName: "profitValue",
      aggregationFunction: "sum",
      formatFunction: {
        type: "currency",
        parameters: { currency: "USD", decimals: 2 },
      },
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
      fieldName: "id",
      aggregationFunction: "count",
      sidebarOptions: {
        mode: "absolute",
      },
    },
  ];

  // Define the data schema
  const dataSchema: SerializableDataField[] = [
    { name: "id", type: "string", nullable: false },
    { name: "projectId", type: "string", nullable: true },
    { name: "taskId", type: "string", nullable: true },
    { name: "contractorId", type: "string", nullable: true },
    { name: "activityId", type: "string", nullable: true },
    { name: "roleId", type: "string", nullable: true },
    { name: "startAt", type: "string", nullable: true },
    { name: "numHours", type: "number", nullable: false, defaultValue: 0 },
    { name: "costValue", type: "number", nullable: false, defaultValue: 0 },
    { name: "billingValue", type: "number", nullable: false, defaultValue: 0 },
    { name: "profitValue", type: "number", nullable: false, defaultValue: 0 },
  ];

  return {
    metadata: {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      name: "Project Iteration Report Cube",
    },
    dataSchema: { fields: dataSchema },
    dimensions,
    measures,
    activeMeasures: ["hours", "cost", "billing", "profit", "entries"],
  };
}

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
    // Get contractor data for name resolution
    const contractors = rd.mapOrElse(contractorsQuery, (data) => data, []);

    // Get the serializable config - this is our source of truth!
    const serializableConfig = getSerializableCubeConfig(report, contractors);

    return {
      serializableConfig,
      // No more deserialization - we work directly with the serializable config
    };
  }, [report, contractorsQuery]);
}
