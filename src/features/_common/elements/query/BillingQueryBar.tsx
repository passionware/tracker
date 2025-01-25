import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { BillingQuery, billingQueryUtils } from "@/api/billing/billing.api.ts";
import { DateFilterWidget } from "@/features/_common/elements/filters/DateFilterWidget.tsx";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorMultiPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { QueryBarLayout } from "@/features/_common/elements/query/QueryBarLayout.tsx";
import {
  QueryBarSpec,
  queryBarSpecUtils,
} from "@/features/_common/elements/query/QueryBarSpec.tsx";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
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
      spec: QueryBarSpec;
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
      {queryBarSpecUtils.renderIf(
        props.spec.workspace,
        <WorkspacePicker
          size="sm"
          allowClear
          allowUnassigned
          disabled={queryBarSpecUtils.isDisabled(props.spec.workspace)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.workspace)
              ? "avatar"
              : "full"
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
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.client,
        <ClientPicker
          size="sm"
          allowClear
          allowUnassigned
          disabled={queryBarSpecUtils.isDisabled(props.spec.client)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.client) ? "avatar" : "full"
          }
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
        />,
      )}
      {queryBarSpecUtils.renderIf(
        props.spec.contractor,
        <ContractorMultiPicker
          size="sm"
          allowUnassigned
          services={props.services}
          disabled={queryBarSpecUtils.isDisabled(props.spec.contractor)}
          layout={
            queryBarSpecUtils.isDisabled(props.spec.contractor)
              ? "avatar"
              : "full"
          }
          value={
            props.query.filters.contractorId?.value.map(
              unassignedUtils.fromMaybe,
            ) ?? []
          }
          onSelect={handleChange("contractorId", (ids) =>
            maybe.mapOrNull(maybe.fromArray(ids), (ids) => ({
              operator: "oneOf",
              value: ids.map(unassignedUtils.getOrNull),
            })),
          )}
        />,
      )}
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.invoiceDate}
        fieldLabel="Invoice date"
        onUpdate={handleChange("invoiceDate", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
