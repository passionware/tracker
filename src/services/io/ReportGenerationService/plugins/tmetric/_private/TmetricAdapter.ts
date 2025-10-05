import { Contractor } from "@/api/contractor/contractor.api.ts";
import { GenericReport } from "../../../../_common/GenericReport.ts";
import { TMetricTag, TMetricTimeEntry } from "./TmetricSchemas.ts";

export type ActivityId =
  | "development"
  | "code_review"
  | "meeting"
  | "operations";

export interface TMetricAdapterInput {
  entries: TMetricTimeEntry[];
  contractorId: Contractor["id"];
  defaultRoleId: string; // simple single role mapping for now
  currency: string;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

export function inferActivity(
  description: string | null | undefined,
  projectName: string | null | undefined,
  tags: TMetricTag[] = [],
): ActivityId {
  // Handle missing or empty fields
  const d = normalize(description || "");
  const p = normalize(projectName || "");

  // Check tags first for explicit activity type
  for (const tag of tags) {
    if (tag?.name) {
      const tagName = normalize(tag.name);
      if (tagName.includes("meeting")) return "meeting";
      if (tagName.includes("review")) return "code_review";
      if (tagName.includes("ops") || tagName.includes("operation"))
        return "operations";
      if (tagName.includes("development") || tagName.includes("dev"))
        return "development";
    }
  }

  // Fallback to description and project name
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
  // Build unique task types from notes, with fallbacks for missing data
  const uniqueDescriptions = new Map<string, string>();
  for (const e of input.entries) {
    let taskName = "Unnamed task";

    // Try to get task name from note
    if (e.note?.trim()) {
      taskName = e.note.trim();
    }
    // Fallback to project name if note is empty and project exists
    else if (e.project?.name?.trim()) {
      taskName = `Task in ${e.project.name}`;
    }
    // Use tags if available
    else if (e.tags?.length > 0) {
      const tagNames = e.tags
        .filter((tag) => tag?.name?.trim())
        .map((tag) => tag.name.trim());
      if (tagNames.length > 0) {
        taskName = `Tagged: ${tagNames.join(", ")}`;
      }
    }

    if (!uniqueDescriptions.has(taskName)) {
      uniqueDescriptions.set(taskName, taskName);
    }
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
        costRate: number; // What we pay the contractor
        costCurrency: string; // Currency for cost rate
        billingRate: number; // What we charge the client
        billingCurrency: string; // Currency for billing rate
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
    // Handle missing project data
    const projectName = e.project?.name || null;

    // Determine activity and task with fallbacks
    const activityId = inferActivity(e.note, projectName, e.tags || []);

    // Determine task ID with multiple fallbacks
    let taskId = "Unnamed task";
    if (e.note?.trim()) {
      taskId = e.note.trim();
    } else if (projectName) {
      taskId = `Task in ${projectName}`;
    } else if (e.tags?.length > 0) {
      const tagNames = e.tags
        .filter((tag) => tag?.name?.trim())
        .map((tag) => tag.name.trim());
      if (tagNames.length > 0) {
        taskId = `Tagged: ${tagNames.join(", ")}`;
      }
    }

    // Handle date parsing with validation
    let startAt: Date;
    let endAt: Date;

    try {
      startAt = new Date(e.startTime);
      if (isNaN(startAt.getTime())) {
        throw new Error("Invalid start time");
      }
    } catch {
      // Fallback to current time if start time is invalid
      startAt = new Date();
    }

    try {
      if (e.endTime) {
        endAt = new Date(e.endTime);
        if (isNaN(endAt.getTime())) {
          throw new Error("Invalid end time");
        }
      } else {
        // If no end time, use start time + 1 hour as fallback
        endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      }
    } catch {
      // Fallback to start time + 1 hour
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    }

    return {
      id: String(e.id || `entry_${Date.now()}_${Math.random()}`),
      note: e.note || "",
      taskId,
      activityId,
      roleId: input.defaultRoleId,
      contractorId: input.contractorId,
      createdAt: startAt,
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
