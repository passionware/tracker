import { ReportQuery } from "@/api/reports/reports.api.ts";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import {
  reportColumns,
  ReportSearchBaseModel,
} from "@/features/_common/columns/report.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { delay } from "@/platform/lang/delay.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps } from "react";

export type ReportListProps = WithServices<
  [
    WithFormatService,
    WithClientService,
    WithExpressionService,
    WithWorkspaceService,
    WithContractorService,
  ]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      data: RemoteData<ReportSearchBaseModel[]>;
      query: ReportQuery;
      onQueryChange: (query: ReportQuery) => void;
      context: ExpressionContext;
    }
  >;

export function ReportList(props: ReportListProps) {
  return (
    <ListView<ReportSearchBaseModel, ReportQuery>
      data={props.data}
      columns={[
        idSpecUtils.isAll(props.context.workspaceId)
          ? foreignColumns.workspace
          : null,
        idSpecUtils.isAll(props.context.clientId)
          ? foreignColumns.client
          : null,
        idSpecUtils.isAll(props.context.contractorId)
          ? foreignColumns.contractor
          : null,
        reportColumns.billing.linkingStatus.read(props.services),
        reportColumns.netAmount(props.services),
        reportColumns.billing.linkedValue(props.services),
        reportColumns.billing.remainingValue(props.services),
        foreignColumns.select<ReportSearchBaseModel>((info, button, track) => {
          const report = info.row.original;
          const maxSourceAmount = { amount: 999, currency: "USD" }; // TODO: replace with actual value
          return (
            <LinkPopover
              context={{
                contractorId: report.contractor.id,
                workspaceId: report.workspace.id,
                clientId: report.client.id,
              }}
              side="right"
              align="center"
              services={props.services}
              sourceCurrency={report.remainingAmount.currency}
              title="Link contractor report"
              targetLabel="Report value"
              targetCurrency={
                maxSourceAmount?.currency ?? report.remainingAmount.currency
              }
              initialValues={{
                target: Math.min(
                  maxSourceAmount?.amount ?? 0,
                  report.remainingAmount.amount,
                ),
                source:
                  maxSourceAmount?.currency === report.remainingAmount.currency
                    ? // we have same currency, so probably we don't need to exchange
                      maxSourceAmount?.amount
                    : // this won't be same, so let's assume that cost  = remaining report but in target currency
                      report.remainingAmount.amount,
                description: [
                  report.remainingAmount.currency !== maxSourceAmount?.currency
                    ? `Currency exchange, 1 ${report.remainingAmount.currency} = [...] ${maxSourceAmount?.currency}, exchange cost: [...]`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n"),
              }}
              onValueChange={
                () => {
                  track(delay(1000).then(void 0));
                } // TODO: implement onSelect
                // props.onSelect({
                //   reportId: report.id,
                //   value,
                // })
              }
            >
              {button}
            </LinkPopover>
          );
        }),
      ].filter(maybe.isPresent)}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}
