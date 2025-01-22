import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { ReportQuery, reportQueryUtils } from "@/api/reports/reports.api.ts";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { ReportQueryBarLayout } from "@/features/_common/elements/query/ReportQueryBar.layout.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentProps } from "react";

export type ReportQueryBarProps = WithServices<
  [WithWorkspaceService, WithClientService, WithContractorService]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      query: ReportQuery;
      onQueryChange: (query: ReportQuery) => void;
      context: ExpressionContext;
    }
  >;

export function ReportQueryBar(props: ReportQueryBarProps) {
  function handleChange<T extends keyof ReportQuery["filters"], X>(
    key: T,
    transform: (value: X) => ReportQuery["filters"][T],
  ): (value: Nullable<X>) => void {
    return (value) =>
      props.onQueryChange(
        reportQueryUtils.setFilter(
          props.query,
          key,
          maybe.map(value, transform),
        ),
      );
  }
  return (
    <ReportQueryBarLayout>
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
      <ContractorPicker
        size="sm"
        allowClear
        disabled={idSpecUtils.isSpecific(props.context.contractorId)}
        layout={
          idSpecUtils.isAll(props.context.contractorId) ? "full" : "avatar"
        }
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
    </ReportQueryBarLayout>
  );
}
