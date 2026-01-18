import { Contractor } from "@/api/contractor/contractor.api.ts";
import { GenericReport, RoleType } from "../../../../_common/GenericReport.ts";
import { TMetricTag, TMetricTimeEntry } from "./TmetricSchemas.ts";
import { SharedIdMap } from "./SharedIdMap.ts";

export type ActivityId =
  | "development"
  | "code_review"
  | "review"
  | "meeting"
  | "operations"
  | "polishment";

export interface TMetricAdapterInput {
  entries: TMetricTimeEntry[];
  contractorId: Contractor["id"];
  defaultRoleId: string; // simple single role mapping for now
  currency: string;
  idMaps?: Record<string, SharedIdMap>; // Optional shared ID maps per field (e.g., "activity", "task", "project")
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

/**
 * Extracts activity type from tags with format "activity:meeting", "activity:operations", etc.
 * Returns the activity type (e.g., "meeting", "operations") or null if not found.
 */
function extractActivityFromTag(tagName: string): string | null {
  const normalized = normalize(tagName);
  // Check if tag starts with "activity:" prefix
  if (normalized.startsWith("activity:")) {
    const activityType = normalized.substring("activity:".length).trim();
    return activityType || null;
  }
  return null;
}

/**
 * Maps tag activity value to ActivityId type.
 * Handles variations like "review" -> "code_review", etc.
 */
function mapTagActivityToActivityId(tagActivity: string): ActivityId {
  const normalized = normalize(tagActivity);

  // Direct mappings
  if (normalized === "meeting") return "meeting";
  if (normalized === "operations") return "operations";
  if (normalized === "polishment") return "polishment";
  if (normalized === "development" || normalized === "dev")
    return "development";

  // Review variations
  if (normalized === "review" || normalized === "code_review")
    return "code_review";

  // Default fallback
  return "development";
}

export function inferActivity(
  description: string | null | undefined,
  tags: TMetricTag[] = [],
): ActivityId {
  // Check tags first for explicit activity type using "activity:" prefix
  for (const tag of tags) {
    if (tag?.name) {
      const activityFromTag = extractActivityFromTag(tag.name);
      if (activityFromTag) {
        return mapTagActivityToActivityId(activityFromTag);
      }
    }
  }

  // Fallback to description (no longer using project name)
  const d = normalize(description || "");
  if (d.includes("meeting")) return "meeting";
  if (d.includes("review")) return "code_review";
  if (d.includes("ops") || d.includes("operation")) return "operations";

  // Default to development
  return "development";
}

export function adaptTMetricToGeneric(
  input: TMetricAdapterInput,
): GenericReport {
  // Get or create SharedIdMap instances for each field
  const activityIdMap = input.idMaps?.activity || new SharedIdMap("a");
  const taskIdMap = input.idMaps?.task || new SharedIdMap("t");
  const projectIdMap = input.idMaps?.project || new SharedIdMap("p");

  // Activity display name mapping (activity name -> display name)
  const activityNameToDisplayName: Record<string, string> = {
    development: "Development",
    code_review: "Code Review",
    review: "Review",
    meeting: "Meeting",
    operations: "Operations",
    polishment: "Polishment",
  };

  // Maps to track name -> short ID mappings for this adapter call
  const taskNameToShortId = new Map<string, string>();
  const activityNameToShortId = new Map<string, string>();
  const projectDisplayNameToShortId = new Map<string, string>();
  // Map to store original TMetric project IDs by display name (for rate matching)
  const projectDisplayNameToOriginalId = new Map<string, string>();

  // First pass: collect all unique task, activity, and project names
  for (const e of input.entries) {
    // Process task
    const taskName = resolveTaskName(e);
    if (!taskNameToShortId.has(taskName)) {
      const shortTaskId = taskIdMap.getOrCreateKey(taskName);
      taskNameToShortId.set(taskName, shortTaskId);
    }

    // Process activity
    const activityName = inferActivity(e.note, e.tags || []);
    const displayName = activityNameToDisplayName[activityName] || activityName;
    if (!activityNameToShortId.has(activityName)) {
      const shortActivityId = activityIdMap.getOrCreateKey(displayName);
      activityNameToShortId.set(activityName, shortActivityId);
    }

    // Process project
    const projectDisplayName = e.project?.name?.trim() || "default";
    if (!projectDisplayNameToShortId.has(projectDisplayName)) {
      const shortProjectId = projectIdMap.getOrCreateKey(projectDisplayName);
      projectDisplayNameToShortId.set(projectDisplayName, shortProjectId);
      // Store original TMetric project ID for rate matching
      const originalProjectId = e.project ? String(e.project.id) : "default";
      projectDisplayNameToOriginalId.set(projectDisplayName, originalProjectId);
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
  for (const [
    projectDisplayName,
    shortProjectId,
  ] of projectDisplayNameToShortId.entries()) {
    const originalProjectId =
      projectDisplayNameToOriginalId.get(projectDisplayName) || "default";
    projectTypes[shortProjectId] = {
      name: projectDisplayName,
      description: projectDisplayName,
      parameters: {
        // Store original TMetric project ID for rate matching
        originalProjectId: originalProjectId,
      },
    };
  }

  // Build activityTypes with short IDs as keys, display names as values
  const activityTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  const activityNameToDescription: Record<string, string> = {
    development: "Hands-on implementation work",
    code_review: "PR/MR reviews and related",
    review: "Code reviews and related",
    meeting: "Calls, standups, ceremonies",
    operations: "Planning, triage, coordination",
    polishment: "Code polish and refinement",
  };

  // Build activityTypes from the map entries (grouped by short ID)
  const shortIdToDisplayName = new Map<string, string>();
  for (const [
    activityName,
    shortActivityId,
  ] of activityNameToShortId.entries()) {
    const displayName = activityNameToDisplayName[activityName] || activityName;
    shortIdToDisplayName.set(shortActivityId, displayName);
  }

  for (const [shortActivityId, displayName] of shortIdToDisplayName.entries()) {
    // Find the first activity name that maps to this display name for description
    const activityName =
      Array.from(activityNameToShortId.entries()).find(
        ([_, id]) => id === shortActivityId,
      )?.[0] || "development";

    activityTypes[shortActivityId] = {
      name: displayName, // Store display name for label mapping
      description:
        activityNameToDescription[activityName] ||
        "Activity type not specified",
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
    // Determine activity and task names (original labels)
    // Activity is now determined from tags with "activity:" prefix
    const activityName = inferActivity(e.note, e.tags || []);
    const taskName = resolveTaskName(e);
    const projectDisplayName = e.project?.name?.trim() || "default";

    // Map to short IDs
    const activityId = activityNameToShortId.get(activityName) || activityName;
    const taskId = taskNameToShortId.get(taskName) || taskName;
    const projectId =
      projectDisplayNameToShortId.get(projectDisplayName) || projectDisplayName;

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
      projectId,
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
