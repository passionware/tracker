import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { GetReportPayload } from "../../AbstractPlugin.ts";
import { TMetricAuthConfig, TMetricFetchParams } from "./TmetricSchemas.ts";

export async function resolveTmetricReportPayload(
  services: WithExpressionService,
  payload: GetReportPayload,
  explicitTmetricProjectIdsPerReport: ReadonlyArray<readonly string[]>,
): Promise<
  Array<{ fetchParams: TMetricFetchParams; config: TMetricAuthConfig }>
> {
  if (explicitTmetricProjectIdsPerReport.length !== payload.reports.length) {
    throw new Error(
      `TMetric explicit configuration: explicitTmetricProjectIdsPerReport length (${explicitTmetricProjectIdsPerReport.length}) must match reports (${payload.reports.length}).`,
    );
  }
  return Promise.all(
    payload.reports.map(async (contractor, reportIndex) => {
      const expressionContext = {
        clientId: contractor.clientId,
        workspaceId: contractor.workspaceId,
        contractorId: contractor.contractorId,
      };
      const projectIds = [...explicitTmetricProjectIdsPerReport[reportIndex]!];
      if (projectIds.length === 0) {
        throw new Error(
          `TMetric explicit configuration: no tmetricProjectId entries for contractor ${contractor.contractorId}.`,
        );
      }
      const userIds = String(
        await services.expressionService.ensureExpressionValue(
          expressionContext,
          `vars.tmetric_user`,
          {},
        ),
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (userIds.length === 0) {
        throw new Error(
          `vars.tmetric_user must resolve to at least one TMetric user id (contractor ${contractor.contractorId}).`,
        );
      }

      const baseUrl = String(
        await services.expressionService.ensureExpressionValue(
          expressionContext,
          `vars.tmetric_baseurl`,
          {},
        ),
      ).trim();
      const token = String(
        await services.expressionService.ensureExpressionValue(
          expressionContext,
          `vars.tmetric_token`,
          {},
        ),
      ).trim();
      const accountId = String(
        await services.expressionService.ensureExpressionValue(
          expressionContext,
          `vars.tmetric_account`,
          {},
        ),
      ).trim();
      if (!baseUrl) {
        throw new Error("vars.tmetric_baseurl resolved to an empty value.");
      }
      if (!token) {
        throw new Error("vars.tmetric_token resolved to an empty value.");
      }
      if (!accountId) {
        throw new Error("vars.tmetric_account resolved to an empty value.");
      }

      return {
        fetchParams: {
          periodStart: contractor.periodStart,
          periodEnd: contractor.periodEnd,
          userIds,
          projectIds,
        },
        config: {
          baseUrl,
          token,
          accountId,
        },
      };
    }),
  );
}
