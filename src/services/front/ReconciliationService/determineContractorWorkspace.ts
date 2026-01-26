import { Project } from "@/api/project/project.api.ts";
import { WithServices } from "@/platform/typescript/services";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";

/**
 * Determines which workspace should be used for a contractor in the context of a project.
 *
 * Reads the explicit association from link_contractor_project table (workspace_id column).
 *
 * @param config - Configuration containing project, contractorId, and services
 * @returns The workspace ID to use for this contractor
 * @throws Error if project has no workspaces or no explicit workspace association is found
 */
export async function determineContractorWorkspace(
  config: WithServices<[WithProjectService]> & {
    project: Project;
    contractorId: number;
  },
): Promise<number> {
  const { project, contractorId, services } = config;

  // If project has no workspaces, throw error
  if (project.workspaceIds.length === 0) {
    throw new Error("Project has no workspaces");
  }

  // Check explicit association from link_contractor_project table
  const projectContractors =
    await services.projectService.ensureProjectContractors(project.id);
  const contractor = projectContractors.find(
    (pc) => pc.contractor.id === contractorId,
  );

  if (!contractor) {
    throw new Error(
      `Contractor ${contractorId} is not associated with project ${project.id}`,
    );
  }

  if (!contractor.workspaceId) {
    throw new Error(
      `No workspace association found for contractor ${contractorId} in project ${project.id}`,
    );
  }

  return contractor.workspaceId;
}

/**
 * Determines workspace for multiple contractors in the context of a project.
 *
 * @param config - Configuration containing project, contractorIds, and services
 * @returns Map of contractorId to workspaceId
 */
export async function determineContractorWorkspaces(
  config: WithServices<[WithProjectService]> & {
    project: Project;
    contractorIds: number[];
  },
): Promise<Map<number, number>> {
  const { contractorIds } = config;
  const workspaceMap = new Map<number, number>();

  // Determine workspace for each contractor in parallel

  const results = await Promise.all(
    contractorIds.map(async (contractorId) => {
      const workspaceId = await determineContractorWorkspace({
        ...config,
        contractorId,
      });
      return { contractorId, workspaceId };
    }),
  );

  for (const result of results) {
    if (result) {
      workspaceMap.set(result.contractorId, result.workspaceId);
    }
  }

  return workspaceMap;
}
