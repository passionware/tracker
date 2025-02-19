import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  ProjectIteration,
  ProjectIterationPosition,
} from "@/api/project-iteration/project-iteration.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { sumBy } from "lodash";

const c = createColumnHelper<ProjectIterationPosition>();

export function IterationWidget(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    projectIterationId: ProjectIteration["id"];
  },
) {
  const projectIteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  return (
    <div>
      {rd
        .journey(projectIteration)
        .wait("Loading...")
        .catch(renderError)
        .map((x) => (
          <div>
            <div>{x.description}</div>
            <ListView
              data={rd.of(x.positions)}
              query={{ sort: null, page: paginationUtils.ofDefault() }}
              onQueryChange={() => {}}
              columns={[
                c.accessor("order", { header: "#" }),
                c.accessor("description", { header: "Description" }),
                c.accessor("quantity", { header: "Quantity" }),
                c.accessor("unit", { header: "Unit" }),
                c.accessor("unitPrice", { header: "Unit price" }),
                c.display({
                  header: "Total",
                  cell: (cell) =>
                    props.services.formatService.financial.amount(
                      cell.row.original.quantity * cell.row.original.unitPrice,
                      x.currency,
                    ),
                  meta: { cellClassName: "text-right" },
                }),
              ]}
            />
            <div className="inline-flex float-right mt-4 flex-col items-end  gap-6 p-4 bg-white rounded-md border border-slate-200 text-sm">
              {[
                {
                  label: "Balance",
                  value: sumBy(x.positions, (p) => p.quantity * p.unitPrice),
                  className: "text-gray-600",
                },
                {
                  label: "Income",
                  value: sumBy(
                    x.positions.filter((p) => p.quantity > 0),
                    (p) => p.quantity * p.unitPrice,
                  ),
                  className: "text-green-600",
                },
                {
                  label: "Outcome",
                  value: sumBy(
                    x.positions.filter((p) => p.quantity < 0),
                    (p) => p.quantity * p.unitPrice,
                  ),
                  className: "text-red-600",
                },
              ].map(({ label, value, className }) => (
                <div key={label} className="flex items-center space-x-1">
                  <span className={`font-semibold ${className}`}>{label}:</span>
                  <span className="text-gray-900">
                    {props.services.formatService.financial.amount(value, x.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
