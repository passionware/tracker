import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { GetReportPayload } from "../../AbstractPlugin.ts";
import { TMetricAuthConfig, TMetricFetchParams } from "./TmetricSchemas.ts";

export async function resolveTmetricReportPayload(
  services: WithExpressionService,
  payload: GetReportPayload,
): Promise<
  Array<{ fetchParams: TMetricFetchParams; config: TMetricAuthConfig }>
> {
  return Promise.all(
    payload.reports.map(async (contractor) => {
      const expressionContext = {
        clientId: contractor.clientId,
        workspaceId: contractor.workspaceId,
        contractorId: contractor.contractorId,
      };
      return {
        fetchParams: {
          periodStart: contractor.periodStart,
          periodEnd: contractor.periodEnd,
          userIds: String(
            await services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.tmetric_user`,
              {},
            ),
          ).split(","),
          projectIds: String(
            await services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.tmetric_project`,
              {},
            ),
          ).split(","),
        },
        config: {
          baseUrl: String(
            await services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.tmetric_baseurl`,
              {},
            ),
          ),
          token: String(
            await services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.tmetric_token`,
              {},
            ),
          ),
          accountId: String(
            await services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.tmetric_account`,
              {},
            ),
          ),
        },
      };
    }),
  );
}
