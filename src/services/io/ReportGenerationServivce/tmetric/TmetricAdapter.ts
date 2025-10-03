import { GenericReport } from "../impl/AbstractReportPlugin";
import {
  TMetricProject,
  TMetricTimeEntry,
  TMetricUser,
} from "./TmetricSchemas";

export type ActivityId =
  | "development"
  | "code_review"
  | "meeting"
  | "operations";

export interface TMetricAdapterInput {
  entries: TMetricTimeEntry[];
  projects: TMetricProject[];
  users: TMetricUser[];
  defaultRoleId: string; // simple single role mapping for now
  currency: string;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

export function inferActivity(
  description: string,
  projectName: string,
): ActivityId {
  const d = normalize(description);
  const p = normalize(projectName);
  if (d.includes("meeting") || p.includes("meeting")) return "meeting";
  if (d.includes("review") || p.includes("review")) return "code_review";
  // fallback heuristics: treat entries with words like "ops" as operations
  if (d.includes("ops") || p.includes("ops") || d.includes("operation"))
    return "operations";
  return "development";
}

export function adaptTMetricToGeneric(
  input: TMetricAdapterInput,
): GenericReport {
  // Build unique task types from notes
  const uniqueDescriptions = new Map<string, string>();
  for (const e of input.entries) {
    const name = e.note?.trim() || "Unnamed task";
    if (!uniqueDescriptions.has(name)) uniqueDescriptions.set(name, name);
  }

  const taskTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, any> }
  > = {};
  for (const [taskId, taskName] of uniqueDescriptions.entries()) {
    taskTypes[taskId] = {
      name: taskName,
      description: taskName,
      parameters: {},
    };
  }

  const activityTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, any> }
  > = {
    development: {
      name: "Development",
      description: "Hands-on implementation work",
      parameters: {},
    },
    code_review: {
      name: "Code Review",
      description: "PR/MR reviews and related",
      parameters: {},
    },
    meeting: {
      name: "Meeting",
      description: "Calls, standups, ceremonies",
      parameters: {},
    },
    operations: {
      name: "Operations",
      description: "Planning, triage, coordination",
      parameters: {},
    },
  };

  const roleTypes: Record<
    string,
    {
      name: string;
      description: string;
      rates: Array<{
        billing: "hourly";
        activityType: string;
        taskType: string;
        currency: string;
        rate: number;
      }>;
    }
  > = {
    [input.defaultRoleId]: {
      name: input.defaultRoleId,
      description: "Default role",
      rates: [], // can be filled externally; adapter is not responsible
    },
  };

  const timeEntries = input.entries.map((e) => {
    const projectName = e.project.name;
    const activityId = inferActivity(e.note ?? "", projectName);
    const taskId = e.note?.trim() || "Unnamed task";
    const startAt = new Date(e.startTime);
    const endAt = new Date(e.endTime as string);
    return {
      id: String(e.id),
      note: e.note ?? "",
      taskId,
      activityId,
      roleId: input.defaultRoleId,
      createdAt: startAt, // No created/updated fields in new schema
      updatedAt: endAt,
      startAt,
      endAt,
    };
  });

  const report: GenericReport = {
    definitions: {
      taskTypes,
      activityTypes,
      roleTypes,
    },
    timeEntries,
  };

  return report;
}
