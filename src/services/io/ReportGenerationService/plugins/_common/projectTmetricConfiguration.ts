import type { VariablePayload } from "@/api/variable/variable.api.ts";
import { variableQueryUtils } from "@/api/variable/variable.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { selectEffectiveVariables } from "@/services/front/ExpressionService/_private/selectEffectiveVariables.ts";
import type { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { z } from "zod";

/** Set on `projectType.parameters` when rates and mapping come from explicit config. */
export const REPORT_PROJECT_RATE_SOURCE_EXPLICIT = "explicit" as const;

/** Stable id for merged reports: `${trackerProjectId}\x1f${reportProjectIdFromJson}`. */
export function scopeTmetricReportProjectId(
  trackerProjectId: number,
  reportProjectIdFromConfig: string,
): string {
  return `${trackerProjectId}\x1f${reportProjectIdFromConfig}`;
}

const contractorBindingSchema = z.object({
  tmetricProjectId: z.string().min(1, "tmetricProjectId is required"),
  costRate: z.string().min(1, "costRate is required"),
  billingRate: z.string().min(1, "billingRate is required"),
});

const projectSchema = z.object({
  id: z.string().min(1, "project id is required"),
  name: z.string().min(1, "project name is required"),
  contractors: z.record(z.string(), contractorBindingSchema),
});

export const projectTmetricConfigurationV1Schema = z
  .object({
    version: z.literal(1),
    projects: z.array(projectSchema),
  })
  .superRefine((val, ctx) => {
    if (val.projects.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one report project is required",
        path: ["projects"],
      });
    }
  });

export type ProjectTmetricConfigurationV1 = z.infer<
  typeof projectTmetricConfigurationV1Schema
>;

export function emptyProjectTmetricConfigurationV1(): ProjectTmetricConfigurationV1 {
  return { version: 1, projects: [] };
}

/**
 * Environment variable name (const) for one Tracker project’s TMetric mapping JSON.
 * Scoped by workspace + client like other variables.
 */
export function projectTmetricConfigurationVariableName(
  projectId: number,
): string {
  return `project_${projectId}_tmetric_configuration`;
}

/** Const row shape used for variable resolution (same rules as `vars.*` expressions). */
export type ProjectTmetricConfigurationVariableRow = {
  id: number;
  name: string;
  type: "const" | "expression";
  value: string;
  workspaceId: number | null;
  clientId: number | null;
  contractorId: number | null;
};

/**
 * Picks the effective `project_{id}_tmetric_configuration` const row for the given
 * workspace/client context — same specificity rules as {@link selectEffectiveVariables}
 * (global, then workspace-only, then client-only, then workspace+client).
 */
export function findEffectiveProjectTmetricConfigurationVariable<
  V extends ProjectTmetricConfigurationVariableRow,
>(variables: readonly V[], context: { workspaceId: number; clientId: number; projectId: number }): V | undefined {
  const name = projectTmetricConfigurationVariableName(context.projectId);
  const candidates = variables.filter(
    (v) =>
      v.name === name &&
      v.contractorId == null &&
      v.type === "const",
  );
  if (candidates.length === 0) return undefined;
  const expressionContext: ExpressionContext = {
    workspaceId: context.workspaceId,
    clientId: context.clientId,
    contractorId: idSpecUtils.ofAll(),
  };
  const effective = selectEffectiveVariables(expressionContext, candidates);
  return effective[name];
}

/**
 * Writes validated TMetric mapping JSON to the **same** Environment const row that
 * {@link findEffectiveProjectTmetricConfigurationVariable} would pick for `context`
 * (update by resolved row `id` and preserve its scope). If none exists, creates one
 * at `context.workspaceId` / `context.clientId`.
 */
export async function persistProjectTmetricConfigurationVariable(
  variableService: Pick<
    VariableService,
    "ensureVariables" | "updateVariable" | "createVariable"
  >,
  context: {
    workspaceId: number;
    clientId: number;
    projectId: number;
  },
  validatedConfig: ProjectTmetricConfigurationV1,
): Promise<void> {
  const query = variableQueryUtils.ofDefault(
    context.workspaceId,
    context.clientId,
  );
  const list = await variableService.ensureVariables(query);
  const existing = findEffectiveProjectTmetricConfigurationVariable(
    list,
    context,
  );
  const name = projectTmetricConfigurationVariableName(context.projectId);
  const value = JSON.stringify(validatedConfig);

  if (existing != null) {
    const payload: VariablePayload = {
      name,
      type: "const",
      value,
      workspaceId: existing.workspaceId,
      clientId: existing.clientId,
      contractorId: existing.contractorId,
    };
    await variableService.updateVariable(existing.id, payload);
    return;
  }

  await variableService.createVariable({
    name,
    type: "const",
    value,
    workspaceId: context.workspaceId,
    clientId: context.clientId,
    contractorId: null,
  });
}

/**
 * Parse and validate client JSON. Returns null if missing, non-string, or invalid.
 */
export function tryParseProjectTmetricConfiguration(
  raw: unknown,
): ProjectTmetricConfigurationV1 | null {
  if (raw == null) return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  const r = projectTmetricConfigurationV1Schema.safeParse(value);
  return r.success ? r.data : null;
}

/**
 * Load mapping from Environment variables (`variable` table) for the given
 * workspace, client, and Tracker project id.
 */
export async function loadProjectTmetricConfigurationFromVariables(
  variableService: Pick<VariableService, "ensureVariables">,
  context: {
    workspaceId: number;
    clientId: number;
    projectId: number;
  },
): Promise<ProjectTmetricConfigurationV1 | null> {
  const query = variableQueryUtils.ofDefault(
    context.workspaceId,
    context.clientId,
  );
  const variables = await variableService.ensureVariables(query);
  const row = findEffectiveProjectTmetricConfigurationVariable(
    variables,
    context,
  );
  return tryParseProjectTmetricConfiguration(row?.value ?? null);
}

/**
 * Loads and validates TMetric mapping from Environment variables; throws if missing,
 * invalid, empty `projects`, or (when `contractor` is set) that contractor has no
 * TMetric project id mappings.
 */
export async function ensureProjectTmetricConfigurationFromVariables(
  variableService: Pick<VariableService, "ensureVariables">,
  context: {
    workspaceId: number;
    clientId: number;
    projectId: number;
  },
  contractor?: { contractorId: number; contractorLabel?: string },
): Promise<ProjectTmetricConfigurationV1> {
  const cfg = await loadProjectTmetricConfigurationFromVariables(
    variableService,
    context,
  );
  const varName = projectTmetricConfigurationVariableName(context.projectId);
  if (cfg == null) {
    throw new Error(
      `TMetric mapping is required for this Tracker project. Create const variable "${varName}" (Project → TMetric tab). You may scope it globally, by workspace, by client, or for this workspace and client — the same rules as other Environment variables.`,
    );
  }
  if (contractor != null) {
    const ids = getExplicitTmetricProjectIdsForContractor(
      cfg,
      contractor.contractorId,
    );
    if (ids.length === 0) {
      const label =
        contractor.contractorLabel ??
        `contractor ${contractor.contractorId}`;
      throw new Error(
        `TMetric explicit configuration: no TMetric project ids configured for ${label} (id ${contractor.contractorId}) on Tracker project ${context.projectId}. Add mappings in "${varName}".`,
      );
    }
  }
  return cfg;
}

/** Sorted unique TMetric project ids configured for this contractor (all report projects). */
export function getExplicitTmetricProjectIdsForContractor(
  config: ProjectTmetricConfigurationV1,
  contractorId: number,
): string[] {
  const key = String(contractorId);
  const ids = new Set<string>();
  for (const p of config.projects) {
    const row = p.contractors[key];
    if (row?.tmetricProjectId) {
      ids.add(String(row.tmetricProjectId).trim());
    }
  }
  return [...ids].sort();
}

/** Full map contractorId string -> TMetric project id for one logical report project. */
export function buildTmetricProjectIdByContractorForReportProject(
  project: ProjectTmetricConfigurationV1["projects"][number],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [cid, row] of Object.entries(project.contractors)) {
    if (row.tmetricProjectId) {
      out[cid] = String(row.tmetricProjectId).trim();
    }
  }
  return out;
}

/**
 * Map a TMetric time entry to configured report project `id`.
 * @throws Error if unmapped or ambiguous
 */
export function resolveReportProjectIdForTmetricEntry(
  config: ProjectTmetricConfigurationV1,
  contractorId: number,
  tmetricProjectIdFromEntry: string | undefined,
  contractorLabel: string,
): string {
  const tid = (tmetricProjectIdFromEntry ?? "").trim();
  if (!tid) {
    throw new Error(
      `TMetric explicit configuration: time entry has no TMetric project id (contractor ${contractorLabel}, id ${contractorId}).`,
    );
  }
  const key = String(contractorId);
  const matches: string[] = [];
  for (const p of config.projects) {
    const binding = p.contractors[key];
    if (binding && String(binding.tmetricProjectId).trim() === tid) {
      matches.push(p.id);
    }
  }
  if (matches.length === 0) {
    throw new Error(
      `TMetric explicit configuration: no report project maps TMetric project id "${tid}" for contractor ${contractorLabel} (id ${contractorId}). Add this mapping on the Tracker project's TMetric tab.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `TMetric explicit configuration: TMetric project id "${tid}" matches more than one report project (${matches.join(", ")}) for contractor ${contractorLabel} (id ${contractorId}).`,
    );
  }
  return matches[0]!;
}
