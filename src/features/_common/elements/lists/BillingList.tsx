import { BillingQuery } from "@/api/billing/billing.api.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { billingColumns } from "@/features/_common/columns/billing.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  BillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps, ReactElement, ReactNode } from "react";

export type BillingListProps = WithServices<
  [
    WithFormatService,
    WithClientService,
    WithExpressionService,
    WithWorkspaceService,
    WithContractorService,
    WithMutationService,
    WithPreferenceService,
    WithReportDisplayService,
  ]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      data: RemoteData<BillingViewEntry[]>;
      query: BillingQuery;
      onQueryChange: (query: BillingQuery) => void;
      context: Omit<ExpressionContext, "contractorId">;
      renderSelect?: (
        billing: BillingViewEntry,
        button: ReactElement,
        // this will be connected to local promiseState
        track: (promise: Promise<void>) => Promise<void>,
      ) => ReactNode;
    }
  >;

export function BillingList(props: BillingListProps) {
  return (
    <ListView<BillingViewEntry, BillingQuery>
      data={props.data}
      columns={[
        ...billingColumns.getContextual(props.context),
        billingColumns.invoiceNumber,
        billingColumns.invoiceDate(props.services),
        billingColumns.report.linkingStatus.read,
        billingColumns.report.linkedValue(props.services),
        billingColumns.netAmount(props.services),
        billingColumns.report.remainingValue(props.services),
        props.renderSelect &&
          sharedColumns.select<BillingViewEntry>((info, button, track) => {
            const billing = info.row.original;
            return props.renderSelect?.(billing, button, track);
          }),
      ].filter(maybe.isPresent)}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}
