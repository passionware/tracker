import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { ReportQuery, reportQueryUtils } from "@/api/reports/reports.api.ts";
import { ClientView } from "@/features/_common/pickers/ClientView.tsx";
import { InlineSearchLayout } from "@/features/_common/inline-search/_common/InlineSearchLayout.tsx";
import { ClientPicker } from "@/features/_common/pickers/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/pickers/WorkspacePicker.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceView } from "@/features/_common/pickers/WorkspaceView.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { createColumnHelper } from "@tanstack/react-table";
import { ComponentProps } from "react";

export type InlineReportSearchViewModel = Pick<
  ReportViewEntry,
  "id" | "description" | "contractor" | "workspace" | "client" | "netAmount"
>;

export type InlineReportSearchViewProps = WithServices<
  [WithWorkspaceService, WithClientService, WithContractorService]
> &
  Overwrite<
    ComponentProps<"div">,
    {
      data: RemoteData<InlineReportSearchViewModel[]>;
      query: ReportQuery;
      onQueryChange: (query: ReportQuery) => void;
      context: ExpressionContext;
    }
  >;

const columnHelper = createColumnHelper<InlineReportSearchViewModel>();

export function InlineReportSearchView(props: InlineReportSearchViewProps) {
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
    <InlineSearchLayout
      filters={
        <>
          <WorkspacePicker
            size="sm"
            disabled={idSpecUtils.isSpecific(props.context.workspaceId)}
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
            disabled={idSpecUtils.isSpecific(props.context.clientId)}
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
            disabled={idSpecUtils.isSpecific(props.context.contractorId)}
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
        </>
      }
    >
      <ListView
        data={props.data}
        columns={[
          idSpecUtils.isAll(props.context.workspaceId)
            ? columnHelper.accessor("workspace", {
                header: "Issuer",

                cell: (info) => (
                  <WorkspaceView
                    layout="avatar"
                    workspace={rd.of(info.getValue())}
                  />
                ),
                meta: {
                  sortKey: "workspace",
                },
              })
            : null,
          idSpecUtils.isAll(props.context.clientId)
            ? columnHelper.accessor("client", {
                header: "Client",
                cell: (info) => <ClientView client={rd.of(info.getValue())} />,
                meta: {
                  sortKey: "client",
                },
              })
            : null,
        ].filter(maybe.isPresent)}
        query={props.query}
        onQueryChange={props.onQueryChange}
      />
    </InlineSearchLayout>
  );
}
