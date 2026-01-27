import { ReportQuery } from "@/api/reports/reports.api.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import {
  reportColumns,
  ReportSearchBaseModel,
} from "@/features/_common/columns/report.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps, ReactElement, ReactNode } from "react";

export type ReportListProps = WithServices<
  [
    WithFormatService,
    WithClientService,
    WithExpressionService,
    WithWorkspaceService,
    WithContractorService,
    WithMutationService,
  ]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      data: RemoteData<ReportSearchBaseModel[]>;
      query: ReportQuery;
      onQueryChange: (query: ReportQuery) => void;
      context: ExpressionContext;
      showCostColumns: boolean;
      showBillingColumns: boolean;
      renderSelect?: (
        report: ReportSearchBaseModel,
        button: ReactElement,
        // this will be connected to local promiseState
        track: (promise: Promise<void>) => Promise<void>,
      ) => ReactNode;
    }
  >;

export function ReportList(props: ReportListProps) {
  return (
    <ListView<ReportSearchBaseModel, ReportQuery, number>
      data={props.data}
      columns={[
        ...reportColumns.getContextual(props.context),
        reportColumns.period(props.services),
        reportColumns.billing.linkingStatus.read(props.services),
        reportColumns.cost.immediateLinkingStatus.read(props.services),
        reportColumns.netAmount(props.services),
        props.showBillingColumns
          ? reportColumns.billing.linkedValue(props.services)
          : null,
        props.showBillingColumns
          ? reportColumns.billing.remainingValue(props.services)
          : null,
        props.showCostColumns
          ? reportColumns.cost.linkedValue(props.services)
          : null,
        props.showCostColumns
          ? reportColumns.cost.remainingValue(props.services)
          : null,
        sharedColumns.description,
        reportColumns.commitStatus(props.services),
        props.renderSelect &&
          sharedColumns.select<ReportSearchBaseModel>((info, button, track) => {
            const report = info.row.original;
            return props.renderSelect?.(report, button, track);
          }),
      ].filter(maybe.isPresent)}
      query={props.query}
      onQueryChange={props.onQueryChange}
      getRowId={(x) => x.id}
    />
  );
}
