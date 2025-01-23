import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { CostQuery, costQueryUtils } from "@/api/cost/cost.api.ts";
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

export type CostQueryBarProps = WithServices<
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
      query: CostQuery;
      onQueryChange: (query: CostQuery) => void;
      /**
       * How contextual pickers should behave.
       * If undefined, the pickers will be not be shown.
       * If unassigned.ofAll, the pickers will be shown as usual
       * If unassigned.ofSpecific, the pickers will be shown as disabled
       */
      context: Partial<ExpressionContext>;
    }
  >;

export function CostQueryBar(props: CostQueryBarProps) {
  function handleChange<T extends keyof CostQuery["filters"], X>(
    key: T,
    transform: (value: X) => CostQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        costQueryUtils.setFilter(props.query, key, maybe.map(value, transform)),
      );
  }
  return (
    <QueryBarLayout>
      {maybe.isAbsent(props.context.workspaceId) ? null : (
        <WorkspacePicker
          size="sm"
          allowClear
          allowUnassigned={idSpecUtils.isAll(props.context.workspaceId)}
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
          allowUnassigned={idSpecUtils.isAll(props.context.clientId)}
          disabled={idSpecUtils.isSpecific(props.context.clientId)}
          layout={idSpecUtils.isAll(props.context.clientId) ? "full" : "avatar"}
          services={props.services}
          value={props.query.filters.clientId?.value[0]}
          onSelect={handleChange("clientId", (clientId) =>
            maybe.mapOrNull(clientId, (clientId) => ({
              operator: "oneOf",
              value: [unassignedUtils.getOrElse(clientId, null)],
            })),
          )}
        />
      )}
      {maybe.isAbsent(props.context.contractorId) ? null : (
        <ContractorPicker
          size="sm"
          allowClear
          allowUnassigned={idSpecUtils.isAll(props.context.contractorId)}
          disabled={idSpecUtils.isSpecific(props.context.contractorId)}
          layout={
            idSpecUtils.isAll(props.context.contractorId) ? "full" : "avatar"
          }
          services={props.services}
          value={props.query.filters.contractorId?.value[0]}
          onSelect={handleChange("contractorId", (contractorId) =>
            maybe.mapOrNull(contractorId, (contractorId) => ({
              operator: "oneOf",
              value: [unassignedUtils.getOrElse(contractorId, null)],
            })),
          )}
        />
      )}
      <DateFilterWidget
        services={props.services}
        value={props.query.filters.invoiceDate}
        fieldLabel="Period"
        onUpdate={handleChange("invoiceDate", maybe.getOrNull)}
      />
    </QueryBarLayout>
  );
}
