import { Variable } from "@/api/variable/variable.api.ts";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/ContractorView.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceWidget } from "@/features/_common/WorkspaceView.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";

export interface ExpressionChooserProps
  extends WithServices<
    [
      WithExpressionService,
      WithFormatService,
      WithWorkspaceService,
      WithClientService,
      WithContractorService,
    ]
  > {
  context: ExpressionContext;
}

const columnHelper = createColumnHelper<Variable>();

export function ExpressionChooser({
  services,
  context,
}: ExpressionChooserProps) {
  const vars = rd.useMemoMap(
    services.expressionService.useEffectiveVariables(context),
    (vars) => Object.values(vars),
  );
  return (
    <ListView
      className="w-full"
      data={vars}
      columns={[
        columnHelper.accessor("workspaceId", {
          header: "Workspace",
          cell: (info) => (
            <WorkspaceWidget
              layout="avatar"
              workspaceId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("clientId", {
          header: "Client",
          cell: (info) => (
            <ClientWidget
              layout="avatar"
              clientId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("contractorId", {
          header: "Contractor",
          cell: (info) => (
            <ContractorWidget
              layout="avatar"
              contractorId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("name", { header: "Name" }),
        columnHelper.accessor("value", {
          header: "Value",
          cell: (info) => (
            <OverflowTooltip title={info.getValue()}>
              <div
                className={cn(
                  "p-1 border max-w-[10rem] w-min truncate",
                  {
                    const: "border-sky-800/50 rounded bg-sky-50 text-sky-800",
                    expression:
                      "border-lime-800/50 rounded bg-lime-50 text-lime-900",
                  }[info.row.original.type],
                )}
              >
                {info.getValue()}
              </div>
            </OverflowTooltip>
          ),
        }),
        columnHelper.accessor("type", { header: "Type" }),
        columnHelper.accessor("updatedAt", {
          header: "Last updated",
          cell: (info) =>
            services.formatService.temporal.datetime(info.getValue()),
        }),
      ]}
      caption={
        <>
          <div className="mb-2 font-semibold text-gray-700">
            A list of all variables
          </div>
        </>
      }
    />
  );
}
