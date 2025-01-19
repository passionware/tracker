import { variableQueryUtils } from "@/api/variable/variable.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { evaluateExpression } from "@/services/front/ExpressionService/_private/evaluateExpression.ts";
import { selectEffectiveVariables } from "@/services/front/ExpressionService/_private/selectEffectiveVariables.ts";
import { ExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { rd } from "@passionware/monads";

export function createExpressionService(
  config: WithServices<[WithVariableService]>,
): ExpressionService {
  return {
    useEffectiveVariables: (query) =>
      rd.useMemoMap(
        config.services.variableService.useVariables(
          variableQueryUtils.ofDefault(query.workspaceId, query.clientId),
        ),
        (effectiveVariables) => {
          return selectEffectiveVariables(query, effectiveVariables);
        },
      ),
    useExpressionValue: (context, expression, args) => {
      const effectiveVariables = config.services.variableService.useVariables(
        variableQueryUtils.ofDefault(context.workspaceId, context.clientId),
      );
      return rd.useMemoMap(effectiveVariables, (variableDefinitions) => {
        const effectiveVariables = selectEffectiveVariables(
          context,
          variableDefinitions,
        );
        return evaluateExpression(effectiveVariables, args, expression);
      });
    },
    ensureExpressionValue: async (context, value, args) => {
      const variableDefinitions =
        await config.services.variableService.ensureVariables(
          variableQueryUtils.ofDefault(context.workspaceId, context.clientId),
        );
      const vars = selectEffectiveVariables(context, variableDefinitions);
      return evaluateExpression(vars, args, value);
    },
  };
}
