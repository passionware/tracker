import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { BillingQuery, billingQueryUtils } from "@/api/billing/billing.api.ts";
import { DateFilterWidget } from "@/features/_common/elements/filters/DateFilterWidget.tsx";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { QueryBarLayout } from "@/features/_common/elements/query/QueryBarLayout.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps } from "react";

export type BillingQueryBarProps = WithServices<
  [
    WithWorkspaceService,
    WithClientService,
    WithContractorService,
    WithFormatService,
  ]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      query: BillingQuery;
      onQueryChange: (query: BillingQuery) => void;
      context: Omit<Partial<ExpressionContext>, "contractorId">;
    }
  >;

export function BillingQueryBar(props: BillingQueryBarProps) {
  function handleChange<T extends keyof BillingQuery["filters"], X>(
    key: T,
    transform: (value: X) => BillingQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        billingQueryUtils.setFilter(
          props.query,
          key,
          maybe.map(value, transform),
        ),
      );
  }
  return (
    <QueryBarLayout>
      {maybe.isAbsent(props.context.workspaceId) ? null : (
        <WorkspacePicker
          size="sm"
          allowClear
          disabled={idSpecUtils.isSpecific(props.context.workspaceId)}
          layout={
            idSpecUtils.isAll(props.context.workspaceId) ? "full" : "avatar"
          }
          value={props.query.filters.workspaceId?.value[0]}
          onSelect={handleChange("workspaceId", (workspaceId) =>
            maybe.mapOrNull(
              unassignedUtils.getOrElse(workspaceId, null),
              (workspaceId) => ({
                operator: "oneOf",
                value: [workspaceId],
              }),
            ),
          )}
          services={props.services}
        />
      )}
      {maybe.isAbsent(props.context.clientId) ? null : (
        <ClientPicker
          size="sm"
          allowClear
          disabled={idSpecUtils.isSpecific(props.context.clientId)}
          layout={idSpecUtils.isAll(props.context.clientId) ? "full" : "avatar"}
          services={props.services}
          value={props.query.filters.clientId?.value[0]}
          onSelect={handleChange("clientId", (clientId) =>
            maybe.mapOrNull(
              unassignedUtils.getOrElse(clientId, null),
              (clientId) => ({
                operator: "oneOf",
                value: [clientId],
              }),
            ),
          )}
        />
      )}
      <ContractorPicker
        size="sm"
        allowClear
        layout={"full"}
        services={props.services}
        value={props.query.filters.contractorId?.value[0]}
        onSelect={handleChange("contractorId", (contractorId) =>
          maybe.mapOrNull(
            unassignedUtils.getOrElse(contractorId, null),
            (contractorId) => ({
              operator: "oneOf",
              value: [contractorId],
            }),
          ),
        )}
      />
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.invoiceDate}
        fieldLabel="Invoice date"
        onUpdate={handleChange("invoiceDate", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
