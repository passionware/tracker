import { ReportQuery } from "@/api/reports/reports.api.ts";
import { ClientView } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WorkspaceView } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { maybe, rd, RemoteData } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { createColumnHelper } from "@tanstack/react-table";
import { ComponentProps } from "react";

export type InlineReportSearchViewModel = Pick<
  ReportViewEntry,
  "id" | "description" | "contractor" | "workspace" | "client" | "netAmount"
>;

export type ReportListProps = Overwrite<
  ComponentProps<"div">,
  {
    data: RemoteData<InlineReportSearchViewModel[]>;
    query: ReportQuery;
    onQueryChange: (query: ReportQuery) => void;
    context: ExpressionContext;
  }
>;

const columnHelper = createColumnHelper<InlineReportSearchViewModel>();

export function ReportList(props: ReportListProps) {
  return (
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
  );
}
