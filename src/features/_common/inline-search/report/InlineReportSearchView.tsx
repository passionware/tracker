import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { ReportQuery, reportQueryUtils } from "@/api/reports/reports.api.ts";
import { ClientView } from "@/features/_common/ClientView.tsx";
import { InlineSearchLayout } from "@/features/_common/inline-search/_common/InlineSearchLayout.tsx";
import { ClientPicker } from "@/features/_common/inline-search/ClientPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { createColumnHelper } from "@tanstack/react-table";
import { ComponentProps } from "react";

export type InlineReportSearchViewModel = Pick<
  ReportViewEntry,
  "id" | "description" | "contractor" | "workspace" | "client" | "netAmount"
>;

export type InlineReportSearchViewProps = Overwrite<
  ComponentProps<"div">,
  {
    data: RemoteData<InlineReportSearchViewModel[]>;
    query: ReportQuery;
    onQueryChange: (query: ReportQuery) => void;
    context: ExpressionContext;
  }
> &
  WithServices<[WithWorkspaceService, WithClientService]>;

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
