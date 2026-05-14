import { Contractor } from "@/api/contractor/contractor.api.ts";
import { GenericReport, RoleType } from "../../../../_common/GenericReport.ts";
import { parseSimpleRate } from "../../_common/parseRateConfiguration.ts";
import {
  buildTmetricProjectIdByContractorForReportProject,
  REPORT_PROJECT_RATE_SOURCE_EXPLICIT,
  resolveReportProjectIdForTmetricEntry,
  scopeTmetricReportProjectId,
  type ProjectTmetricConfigurationV1,
} from "../../_common/projectTmetricConfiguration.ts";
import { TMetricTag, TMetricTimeEntry } from "./TmetricSchemas.ts";
import { SharedIdMap } from "./SharedIdMap.ts";

export type ActivityId =
  | "development"
  | "code_review"
  | "review"
  | "meeting"
  | "operations"
  | "polishment";

const ACTIVITY_DISPLAY: Record<ActivityId, string> = {
  development: "Development",
  code_review: "Code Review",
  review: "Review",
  meeting: "Meeting",
  operations: "Operations",
  polishment: "Polishment",
};

const ACTIVITY_DESCRIPTION: Record<ActivityId, string> = {
  development: "Hands-on implementation work",
  code_review: "PR/MR reviews and related",
  review: "Code reviews and related",
  meeting: "Calls, standups, ceremonies",
  operations: "Planning, triage, coordination",
  polishment: "Code polish and refinement",
};

export interface TMetricExplicitAdapterInput {
  entries: TMetricTimeEntry[];
  contractorId: Contractor["id"];
  defaultRoleId: string;
  explicitConfig: ProjectTmetricConfigurationV1;
  /** Shown in configuration errors (e.g. full name). */
  contractorLabel: string;
  /**
   * Tracker project id this batch belongs to. Used to prefix report project ids so
   * {@link mergeGenericReports} cannot merge unrelated explicit configs that reuse
   * the same report project `id` string across different Tracker projects.
   */
  trackerProjectId: number;
  idMaps?: Record<string, SharedIdMap>;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

function extractActivityFromTag(tagName: string): string | null {
  const normalized = normalize(tagName);
  if (normalized.startsWith("activity:")) {
    const activityType = normalized.substring("activity:".length).trim();
    return activityType || null;
  }
  return null;
}

function mapTagActivityToActivityId(tagActivity: string): ActivityId {
  const normalized = normalize(tagActivity);

  if (normalized === "meeting") return "meeting";
  if (normalized === "operations") return "operations";
  if (normalized === "polishment") return "polishment";
  if (normalized === "development" || normalized === "dev")
    return "development";
  if (normalized === "review" || normalized === "code_review")
    return "code_review";

  return "development";
}

/**
 * Activity type: prefers `activity:…` tags, then falls back to note/description heuristics
 * (same behavior as legacy TMetric adapter heuristics).
 */
export function inferActivity(
  description: string | null | undefined,
  tags: TMetricTag[] = [],
): ActivityId {
  for (const tag of tags) {
    if (tag?.name) {
      const activityFromTag = extractActivityFromTag(tag.name);
      if (activityFromTag) {
        return mapTagActivityToActivityId(activityFromTag);
      }
    }
  }

  const d = normalize(description || "");
  if (d.includes("meeting")) return "meeting";
  if (d.includes("review")) return "code_review";
  if (d.includes("ops") || d.includes("operation")) return "operations";

  return "development";
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
 * Builds a GenericReport using explicit client configuration (stable report project ids,
 * per-contractor TMetric project ids and rates).
 *
 * **Project mapping:** each time entry’s TMetric `project.id` is resolved to a report
 * project id via {@link resolveReportProjectIdForTmetricEntry} (contractor-specific
 * explicit configuration — not name-based deduplication). Project type keys and time
 * entry `projectId` use {@link scopeTmetricReportProjectId} so merged reports from
 * different Tracker projects never collide when JSON reuses the same report project `id`.
 *
 * **Activity / task labels:** inferred with the same tag-first + heuristic rules as
 * the legacy TMetric path ({@link inferActivity}, {@link resolveTaskName}).
 */
export function adaptTMetricToGenericFromExplicitConfig(
  input: TMetricExplicitAdapterInput,
): GenericReport {
  const activityIdMap = input.idMaps?.activity ?? new SharedIdMap("a");
  const activityNameToDisplayName: Record<string, string> = {
    development: ACTIVITY_DISPLAY.development,
    code_review: ACTIVITY_DISPLAY.code_review,
    review: ACTIVITY_DISPLAY.review,
    meeting: ACTIVITY_DISPLAY.meeting,
    operations: ACTIVITY_DISPLAY.operations,
    polishment: ACTIVITY_DISPLAY.polishment,
  };

  const taskIdMap = input.idMaps?.task ?? new SharedIdMap("t");

  const taskNameToShortId = new Map<string, string>();
  const activityNameToShortId = new Map<string, string>();

  for (const e of input.entries) {
    const taskName = resolveTaskName(e);
    if (!taskNameToShortId.has(taskName)) {
      taskNameToShortId.set(taskName, taskIdMap.getOrCreateKey(taskName));
    }
    const activityName = inferActivity(e.note, e.tags || []);
    const displayName =
      activityNameToDisplayName[activityName] || activityName;
    if (!activityNameToShortId.has(activityName)) {
      activityNameToShortId.set(
        activityName,
        activityIdMap.getOrCreateKey(displayName),
      );
    }
  }

  const taskTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  for (const [taskName, shortTaskId] of taskNameToShortId.entries()) {
    taskTypes[shortTaskId] = {
      name: taskName,
      description: taskName,
      parameters: {},
    };
  }

  const activityTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  for (const [activityName, shortActivityId] of activityNameToShortId.entries()) {
    const aid = activityName as ActivityId;
    const displayName =
      activityNameToDisplayName[activityName] || activityName;
    activityTypes[shortActivityId] = {
      name: displayName,
      description:
        ACTIVITY_DESCRIPTION[aid] || "Activity type not specified",
      parameters: {},
    };
  }

  const contractorKey = String(input.contractorId);
  const trackerId = input.trackerProjectId;
  const projectTypes: Record<
    string,
    { name: string; description: string; parameters: Record<string, unknown> }
  > = {};
  for (const p of input.explicitConfig.projects) {
    const scopedId = scopeTmetricReportProjectId(trackerId, p.id);
    projectTypes[scopedId] = {
      name: p.name,
      description: p.name,
      parameters: {
        rateSource: REPORT_PROJECT_RATE_SOURCE_EXPLICIT,
        reportProjectId: p.id,
        trackerProjectId: trackerId,
        tmetricProjectIdByContractor:
          buildTmetricProjectIdByContractorForReportProject(p),
      },
    };
  }

  const roleTypes: Record<string, RoleType> = {
    [input.defaultRoleId]: {
      name: input.defaultRoleId,
      description: "Default role",
      rates: [],
    },
  };

  for (const p of input.explicitConfig.projects) {
    const binding = p.contractors[contractorKey];
    if (!binding) continue;
    const cost = parseSimpleRate(binding.costRate);
    const billing = parseSimpleRate(binding.billingRate);
    roleTypes[input.defaultRoleId]!.rates.push({
      billing: "hourly",
      activityTypes: [],
      taskTypes: [],
      projectIds: [scopeTmetricReportProjectId(trackerId, p.id)],
      costRate: cost.rate,
      costCurrency: cost.currency,
      billingRate: billing.rate,
      billingCurrency: billing.currency,
    });
  }

  const timeEntries = input.entries.map((e) => {
    const activityName = inferActivity(e.note, e.tags || []);
    const taskName = resolveTaskName(e);
    const activityId =
      activityNameToShortId.get(activityName) || activityName;
    const taskId = taskNameToShortId.get(taskName) || taskName;
    const localReportProjectId = resolveReportProjectIdForTmetricEntry(
      input.explicitConfig,
      input.contractorId,
      e.project?.id != null ? String(e.project.id) : undefined,
      input.contractorLabel,
    );
    const reportProjectId = scopeTmetricReportProjectId(
      trackerId,
      localReportProjectId,
    );

    let startAt: Date;
    let endAt: Date;
    try {
      startAt = new Date(e.startTime);
      if (isNaN(startAt.getTime())) {
        throw new Error("Invalid start time");
      }
    } catch {
      startAt = new Date();
    }
    try {
      if (e.endTime) {
        endAt = new Date(e.endTime);
        if (isNaN(endAt.getTime())) {
          throw new Error("Invalid end time");
        }
      } else {
        endAt = new Date(Math.max(Date.now(), startAt.getTime()));
      }
    } catch {
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    }

    return {
      id: String(e.id || `entry_${Date.now()}_${Math.random()}`),
      note: null,
      taskId,
      activityId,
      projectId: reportProjectId,
      roleId: input.defaultRoleId,
      contractorId: input.contractorId,
      createdAt: startAt,
      updatedAt: endAt,
      startAt,
      endAt,
    };
  });

  return {
    definitions: {
      taskTypes,
      activityTypes,
      projectTypes,
      roleTypes,
    },
    timeEntries,
  };
}
