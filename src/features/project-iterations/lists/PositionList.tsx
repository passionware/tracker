import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  ProjectIterationDetail,
  ProjectIterationPosition,
} from "@/api/project-iteration/project-iteration.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { sumBy } from "lodash";

const c = createColumnHelper<ProjectIterationPosition>();

export function PositionList(
  props: WithFrontServices & { iteration: ProjectIterationDetail },
) {
  const { iteration } = props;
  const currency = props.services.formatService.financial.currencySymbol(
    iteration.currency,
  );
  return (
    <ListView
      onRowDoubleClick={async (row) => {
        const result =
          await props.services.messageService.editProjectIterationPosition.sendRequest(
            {
              currency,
              operatingMode: "edit",
              defaultValues: row,
            },
          );
        switch (result.action) {
          case "confirm":
            await props.services.mutationService.editProjectIterationPosition(
              row.id,
              result.changes,
            );
            break;
        }
      }}
      data={rd.of(iteration.positions)}
      query={{ sort: null, page: paginationUtils.ofDefault() }}
      onQueryChange={() => {}}
      columns={[
        c.accessor("order", { header: "#" }),
        c.accessor("description", { header: "Description" }),
        c.accessor("quantity", {
          header: "Quantity",

          cell: (cell) => (
            <>
              {props.services.formatService.financial.amountWithoutCurrency(
                cell.row.original.quantity,
              )}
              <span className="inline-block min-w-8 text-left ml-1">
                <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
                  {cell.row.original.unit}
                </span>
              </span>
            </>
          ),
          meta: {
            cellClassName: "text-right",
            headerClassName: "*:block *:text-right *:pr-8",
          },
        }),
        c.accessor("unitPrice", {
          header: `Unit Price (${currency})`,
          cell: (cell) => (
            <>
              {props.services.formatService.financial.amountWithoutCurrency(
                cell.row.original.unitPrice,
              )}
              <span className="inline-block min-w-8 text-left ml-1">
                <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
                  / {cell.row.original.unit}
                </span>
              </span>
            </>
          ),
          meta: {
            cellClassName: "text-right",
            headerClassName: "*:block *:text-right *:pr-6",
          },
        }),
        c.display({
          id: "total",
          header: `Total (${currency})`,
          cell: (cell) =>
            props.services.formatService.financial.amountWithoutCurrency(
              cell.row.original.quantity * cell.row.original.unitPrice,
            ),
          meta: {
            cellClassName: "text-right",
            headerClassName: "*:block *:text-right *:pr-2",
          },
        }),
        c.display({
          id: "actions",
          cell: ({ row }) => (
            <ActionMenu services={props.services}>
              <ActionMenuDeleteItem
                onClick={() => {
                  void props.services.mutationService.deleteProjectIterationPosition(
                    row.original.id,
                  );
                }}
              >
                Delete position
              </ActionMenuDeleteItem>
              <ActionMenuEditItem
                onClick={async () => {
                  const result =
                    await props.services.messageService.editProjectIterationPosition.sendRequest(
                      {
                        currency,
                        operatingMode: "edit",
                        defaultValues: row.original,
                      },
                    );
                  switch (result.action) {
                    case "confirm":
                      await props.services.mutationService.editProjectIterationPosition(
                        row.original.id,
                        result.changes,
                      );
                      break;
                  }
                }}
              >
                Edit position
              </ActionMenuEditItem>
              <ActionMenuDuplicateItem
                onClick={async () => {
                  const result =
                    await props.services.messageService.editProjectIterationPosition.sendRequest(
                      {
                        currency,
                        operatingMode: "duplicate",
                        defaultValues: row.original,
                      },
                    );
                  switch (result.action) {
                    case "confirm":
                      await props.services.mutationService.createProjectIterationPosition(
                        result.payload,
                      );
                      break;
                  }
                }}
              >
                Duplicate position
              </ActionMenuDuplicateItem>
              <ActionMenuCopyItem copyText={row.original.id.toString()}>
                Copy position ID
              </ActionMenuCopyItem>
            </ActionMenu>
          ),
        }),
      ]}
      caption={maybe.map(iteration, (iteration) => {
        const details = [
          {
            label: "Income",
            value: sumBy(
              iteration.positions.filter((p) => p.quantity > 0),
              (p) => p.quantity * p.unitPrice,
            ),
            className: "text-green-600",
          },
          {
            label: "Outcome",
            value: sumBy(
              iteration.positions.filter((p) => p.quantity < 0),
              (p) => p.quantity * p.unitPrice,
            ),
            className: "text-red-600",
          },
          {
            label: "Balance",
            value: sumBy(iteration.positions, (p) => p.quantity * p.unitPrice),
            className: "text-gray-600",
          },
        ];

        return (
          <div>
            <h3 className="my-3 text-base font-semibold ">
              Summary ({iteration.positions.length} positions)
            </h3>
            <Summary>
              {details.map((item) => (
                <SummaryEntry key={item.label} label={item.label}>
                  <SummaryEntryValue>
                    {props.services.formatService.financial.amount(
                      item.value,
                      iteration.currency,
                    )}
                  </SummaryEntryValue>
                </SummaryEntry>
              ))}
            </Summary>
          </div>
        );
      })}
    />
  );
}
