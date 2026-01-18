import { Contractor } from "@/api/contractor/contractor.api.ts";
import { GenericReport, RoleType } from "../../../../_common/GenericReport.ts";
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

function resolveTaskName(entry: TMetricTimeEntry): string {
  const tagNames =
    entry.tags
      ?.filter((tag) => tag?.name?.trim())
      .map((tag) => tag.name.trim()) ?? [];

  const candidates = [
    entry.task?.name,
    entry.note,
    entry.project?.name ? `Task in ${entry.project.name}` : null,
    tagNames.length > 0 ? `Tagged: ${tagNames.join(", ")}` : null,
  ];

  for (const candidate of candidates) {
    if (candidate?.trim()) {
      return candidate.trim();
    }
  }

  return "Unnamed task";
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
  // Build unique task names (original labels) and assign short sequential IDs
  const uniqueTaskNames = new Set<string>();
  const taskNameToShortId = new Map<string, string>();
  let taskCounter = 1;

  // Build unique activity names (original labels) and assign short sequential IDs
  const uniqueActivityNames = new Set<string>();
  const activityNameToShortId = new Map<string, string>();
  let activityCounter = 1;

  // Build unique project types from project IDs (use TMetric project ID)
  const uniqueProjects = new Map<string, { id: string; name: string }>();

  // First pass: collect all unique task and activity names
  for (const e of input.entries) {
    const taskName = resolveTaskName(e);
    if (!uniqueTaskNames.has(taskName)) {
      uniqueTaskNames.add(taskName);
      const shortTaskId = `t${taskCounter++}`;
      taskNameToShortId.set(taskName, shortTaskId);
    }

    const projectName = e.project?.name || null;
    const activityName = inferActivity(e.note, projectName, e.tags || []);
    if (!uniqueActivityNames.has(activityName)) {
      uniqueActivityNames.add(activityName);
      const shortActivityId = `a${activityCounter++}`;
      activityNameToShortId.set(activityName, shortActivityId);
    }

    // Extract project ID and name from TMetric entry
    if (e.project) {
      const projectId = String(e.project.id);
      const projectDisplayName = e.project.name?.trim() || "default";
      if (!uniqueProjects.has(projectId)) {
        uniqueProjects.set(projectId, {
          id: projectId,
          name: projectDisplayName,
        });
      }
    } else {
      // Fallback for entries without project
      const projectId = "default";
      const projectDisplayName = "default";
      if (!uniqueProjects.has(projectId)) {
        uniqueProjects.set(projectId, {
          id: projectId,
          name: projectDisplayName,
        });
      }
    }
  }

  // Build taskTypes with short IDs as keys, original names as values
  const taskTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  for (const [taskName, shortTaskId] of taskNameToShortId.entries()) {
    taskTypes[shortTaskId] = {
      name: taskName, // Store original name for label mapping
      description: taskName,
      parameters: {},
    };
  }

  const projectTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  for (const [projectId, project] of uniqueProjects.entries()) {
    projectTypes[projectId] = {
      name: project.name,
      description: project.name,
      parameters: {},
    };
  }

  // Build activityTypes with short IDs as keys, original names as values
  const activityTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  const activityNameToDisplayName: Record<string, string> = {
    development: "Development",
    code_review: "Code Review",
    meeting: "Meeting",
    operations: "Operations",
  };
  for (const [activityName, shortActivityId] of activityNameToShortId.entries()) {
    activityTypes[shortActivityId] = {
      name: activityNameToDisplayName[activityName] || activityName, // Store display name for label mapping
      description:
        activityName === "development"
          ? "Hands-on implementation work"
          : activityName === "code_review"
            ? "PR/MR reviews and related"
            : activityName === "meeting"
              ? "Calls, standups, ceremonies"
              : "Planning, triage, coordination",
      parameters: {},
    };
  }

  const roleTypes: Record<string, RoleType> = {
    [input.defaultRoleId]: {
      name: input.defaultRoleId,
      description: "Default role",
      rates: [], // can be filled externally; adapter is not responsible
    },
  };

  const timeEntries = input.entries.map((e) => {
    // Handle missing project data
    const projectName = e.project?.name || null;

    // Determine activity and task names (original labels)
    const activityName = inferActivity(e.note, projectName, e.tags || []);
    const taskName = resolveTaskName(e);

    // Map to short IDs
    const activityId = activityNameToShortId.get(activityName) || activityName;
    const taskId = taskNameToShortId.get(taskName) || taskName;

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
      note: null, // Note field is redundant for TMetric reports
      taskId,
      activityId,
      projectId: e.project ? String(e.project.id) : "default", // Use TMetric project ID
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
      projectTypes,
      roleTypes,
    },
    timeEntries,
  };

  return report;
}
