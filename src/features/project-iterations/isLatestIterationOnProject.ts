import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";

export function isLatestIterationOnProject(
  iterations: readonly ProjectIteration[],
  iteration: Pick<ProjectIteration, "projectId" | "ordinalNumber">,
): boolean {
  const sameProject = iterations.filter((i) => i.projectId === iteration.projectId);
  if (sameProject.length === 0) return false;
  const maxOrdinal = Math.max(...sameProject.map((i) => i.ordinalNumber));
  return iteration.ordinalNumber === maxOrdinal;
}
