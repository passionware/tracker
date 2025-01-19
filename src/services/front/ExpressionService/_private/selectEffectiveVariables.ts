import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";

export type ExpressionVariableBase = {
  name: string;
  workspaceId: number | null;
  clientId: number | null;
  contractorId: number | null;
};

/**
 * Selects the most effective variables for the given context.
 * Variables are selected based on specificity:
 * contractor > client > workspace > global.
 */
export function selectEffectiveVariables<E extends ExpressionVariableBase>(
  context: ExpressionContext,
  variables: E[],
): Record<string, E> {
  const effectiveVariables = new Map<string, E>();

  variables.forEach((variable) => {
    const specificity = getSpecificityScore(context, variable);

    // Jeśli zmienna nie pasuje do kontekstu, pomijamy ją
    if (
      (variable.workspaceId !== null &&
        variable.workspaceId !== context.workspaceId) ||
      (variable.clientId !== null && variable.clientId !== context.clientId) ||
      (variable.contractorId !== null &&
        variable.contractorId !== context.contractorId)
    ) {
      return;
    }

    const existing = effectiveVariables.get(variable.name);

    // Zastąp zmienną, jeśli obecna jest bardziej specyficzna
    if (!existing || specificity > getSpecificityScore(context, existing)) {
      effectiveVariables.set(variable.name, variable);
    } else if (specificity === getSpecificityScore(context, existing)) {
      // W przypadku równorzędnej specyficzności, wybierz dowolną
      effectiveVariables.set(variable.name, variable);
    }
  });

  return Object.fromEntries(effectiveVariables);
}

function getSpecificityScore(
  context: ExpressionContext,
  variable: ExpressionVariableBase,
): number {
  let score = 0;
  if (variable.contractorId === context.contractorId) score += 3;
  if (variable.clientId === context.clientId) score += 2;
  if (variable.workspaceId === context.workspaceId) score += 1;
  return score;
}
