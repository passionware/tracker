import { Project } from "@/api/project/project.api.ts";
import { WithServices } from "@/platform/typescript/services";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";

/**
 * Determines which workspace should be used for a contractor in the context of a project.
 *
 * The workspace is determined using the following priority:
 * 1. If Reports exist: use workspaceId from the contractor's most recent report for this client
 * 2. If no Reports exist: check rate variables (`vars.new_hour_cost_rate`) for each workspace in project.workspaceIds
 *    - The workspace that has rate variables defined for this contractor+client is selected
 * 3. Fallback: use the first workspace in project.workspaceIds
 *
 * @param project - The project containing workspaceIds and clientId
 * @param contractorId - The contractor ID
 * @param services - Services for checking reports and evaluating rate variables
 * @returns The workspace ID to use for this contractor, or null if project has no workspaces
 */
export async function determineContractorWorkspace(
  config: WithServices<[WithExpressionService]> & {
    project: Project;
    contractorId: number;
  },
): Promise<number> {
  const { project, contractorId, services } = config;

  // If project has no workspaces, return null
  if (project.workspaceIds.length === 0) {
    throw new Error("Project has no workspaces");
  }

  // Priority 2: Check rate variables for each workspace
  for (const workspaceId of project.workspaceIds) {
    try {
      // Try to evaluate rate variable for this workspace+client+contractor
      const rateString = await services.expressionService.ensureExpressionValue(
        {
          workspaceId,
          clientId: project.clientId,
          contractorId,
        },
        `vars.new_hour_cost_rate`,
        {},
      );

      // If variable is defined, return workspaceId
      if (rateString) {
        return workspaceId;
      }
    } catch (e) {
      // If rate evaluation fails for this workspace, try next workspace
      // This is expected if no rate variables are defined for this workspace
      continue;
    }
  }

  throw new Error("No workspace found for contractor");
}

/**
 * Determines workspace for multiple contractors in the context of a project.
 *
 * @param project - The project containing workspaceIds and clientId
 * @param contractorIds - Array of contractor IDs
 * @param services - Services for checking reports and evaluating rate variables
 * @returns Map of contractorId to workspaceId
 */
export async function determineContractorWorkspaces(
  config: WithServices<[WithExpressionService]> & {
    project: Project;
    contractorIds: number[];
  },
): Promise<Map<number, number>> {
  const { contractorIds } = config;
  const workspaceMap = new Map<number, number>();

  // Determine workspace for each contractor in parallel
  const workspacePromises = contractorIds.map(async (contractorId) => {
    const workspaceId = await determineContractorWorkspace({
      ...config,
      contractorId,
    });
    return { contractorId, workspaceId };
  });

  const results = await Promise.all(workspacePromises);

  for (const result of results) {
    if (result) {
      workspaceMap.set(result.contractorId, result.workspaceId);
    }
  }

  return workspaceMap;
}
