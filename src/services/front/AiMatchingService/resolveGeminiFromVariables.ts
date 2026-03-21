import { variableQueryUtils } from "@/api/variable/variable.api.ts";
import { selectEffectiveVariables } from "@/services/front/ExpressionService/_private/selectEffectiveVariables.ts";
import type { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_API_KEY_VARIABLE_NAME,
  GEMINI_MODEL_VARIABLE_NAME,
} from "@/services/front/AiMatchingService/geminiVariables.ts";
import type { VariableService } from "@/services/io/VariableService/VariableService.ts";

export async function resolveGeminiFromVariables(
  variableService: VariableService,
  context: ExpressionContext,
): Promise<{ apiKey: string; modelId: string } | undefined> {
  const vars = await variableService.ensureVariables(
    variableQueryUtils.ofDefault(context.workspaceId, context.clientId),
  );
  const effective = selectEffectiveVariables(context, vars);
  const keyEntry = effective[GEMINI_API_KEY_VARIABLE_NAME];
  const apiKey =
    keyEntry?.type === "const" ? keyEntry.value.trim() : undefined;
  if (!apiKey) {
    return undefined;
  }
  const modelEntry = effective[GEMINI_MODEL_VARIABLE_NAME];
  const modelId =
    modelEntry?.type === "const" && modelEntry.value.trim().length > 0
      ? modelEntry.value.trim()
      : DEFAULT_GEMINI_MODEL;
  return { apiKey, modelId };
}
