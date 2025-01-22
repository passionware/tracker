import { Variable } from "@/api/variable/variable.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  ClientSpec,
  ContractorSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { RemoteData } from "@passionware/monads";

/**
 * Todo: promote to a system level concept
 * Context for expression calculation.
 * Different context may result in different effective variables.
 */
export type ExpressionContext = {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  contractorId: ContractorSpec;
};

export const expressionContextUtils = {
  ofGlobal: () => {
    const context: ExpressionContext = {
      workspaceId: idSpecUtils.ofAll(),
      clientId: idSpecUtils.ofAll(),
      contractorId: idSpecUtils.ofAll(),
    };

    const setWorkspace = (workspaceId: WorkspaceSpec) => {
      context.workspaceId = workspaceId;
      return api;
    };

    const setClient = (clientId: ClientSpec) => {
      context.clientId = clientId;
      return api;
    };

    const setContractor = (contractorId: ContractorSpec) => {
      context.contractorId = contractorId;
      return api;
    };

    const build = (): ExpressionContext => {
      return {
        workspaceId: context.workspaceId,
        clientId: context.clientId,
        contractorId: context.contractorId,
      };
    };

    const api = {
      setWorkspace,
      setClient,
      setContractor,
      build,
    };

    return api;
  },
};

export type VariableContainer = Record<string, unknown>;

/**
 * A service to calculate the value of an expression.
 * Expression should be written in typescript.
 * It can be a simple expression like "1 + 2" or a complex one like "variable1 + variable2 * 3"
 * It should contain return statement, so it can be a multiline code.
 * If doesn't contain return statement, it will be added automatically by checking how many non blank lines are there.
 * The expression will have access to
 *  - `context:ExpressionContext`,
 *  - `vars:Record<string, unknown>` that are passed to it.
 *  - `args:Record<string, unknown>` that are passed to it by the application, like {startDate, endDate} from report custom buttons.
 * So, to calculate tmetric report url, the expression can be like:
 * ```
 * const { workspaceId, clientId, contractorId } = context;
 *
 * return `https://app.tmetric.com/#/reports/205657/detailed?range=${args.startDate}-${args.endDate}&user={${vars.tmetricUserId}&project=${vars.tmetricprojectIds}&client=${vars.clientId}&groupby=description`;
 * ```
 */
export interface ExpressionService {
  /**
   * For given workspace, client and contractor, return all effective variables that should be used
   * @param query
   */
  useEffectiveVariables: (
    context: ExpressionContext,
  ) => RemoteData<Record<string, Variable>>;
  /**
   * For given context, evaluate the expression and return the result
   * For now, we don't expect it to be reactive.
   */
  useExpressionValue: (
    context: ExpressionContext,
    expression: string,
    args: VariableContainer,
  ) => RemoteData<string>;
  /**
   * Ensure that the expression value is calculated and return the result
   * @param context
   * @param expression
   */
  ensureExpressionValue: (
    context: ExpressionContext,
    expression: string,
    args: VariableContainer,
  ) => Promise<unknown>;
}

export interface WithExpressionService {
  expressionService: ExpressionService;
}
