import { ReportQuery } from "@/api/reports/reports.api.ts";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import {
  reportColumns,
  ReportSearchBaseModel,
} from "@/features/_common/columns/report.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
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
import { ComponentProps, ReactElement, ReactNode } from "react";

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
        props.renderSelect &&
          foreignColumns.select<ReportSearchBaseModel>(
            (info, button, track) => {
              const report = info.row.original;
              return props.renderSelect?.(report, button, track);
            },
          ),
      ].filter(maybe.isPresent)}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}
