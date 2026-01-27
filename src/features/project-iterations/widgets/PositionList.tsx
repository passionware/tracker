import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  ProjectIteration,
  ProjectIterationEvent,
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
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { get, sumBy, uniqBy } from "lodash";

const c = createColumnHelper<ProjectIterationPosition>();

export function PositionList(
  props: WithFrontServices & { projectIterationId: ProjectIteration["id"] },
) {
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  const project = props.services.projectService.useProject(
    rd.tryMap(iteration, (i) => i.projectId),
  );
  const isEvent = (x: unknown): x is ProjectIterationPosition =>
    typeof x === "object" && !!x && "order" in x;

  function renderMove(
    move: ProjectIterationEvent["moves"][0] & { direction: "from" | "to" },
  ) {
    return props.services.formatService.financial.amountWithoutCurrency(
      move.amount * move.unitPrice * (move.direction === "from" ? -1 : 1),
    );
  }

  const numberMeta = {
    cellClassName: "text-right",
    headerClassName: "*:block *:text-right *:pr-1 *:justify-items-end",
  };
  return (
    <ListView
      getRowId={() => -1}
      onRowDoubleClick={async (row) => {
        if (!isEvent(row)) return;
        const result =
          await props.services.messageService.editProjectIterationPosition.sendRequest(
            {
              currency: rd.getOrThrow(iteration).currency,
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
      query={{ sort: null, page: paginationUtils.ofDefault() }}
      data={rd.map(iteration, (i) =>
        i.events.flatMap((event) => [
          event,
          ...event.moves.flatMap((move) =>
            (
              [
                { ...move, account: move.from, direction: "from" },
                { ...move, account: move.to, direction: "to" },
              ] as const
            ).reduce(
              (acc, x) => {
                const moveValue = {
                  ...move,
                  direction: x.direction,
                };
                switch (x.account.type) {
                  case "client":
                    return {
                      ...acc,
                      "x-client": moveValue,
                    };
                  case "iteration":
                    return {
                      ...acc,
                      "x-iteration": moveValue,
                    };
                  case "contractor":
                    return {
                      ...acc,
                      [`x-contractor-${x.account.contractorId}`]: moveValue,
                    };
                  case "cost":
                    return { ...acc, "x-cost": moveValue };
                }
              },
              {
                // description: `${move.amount} x ${move.unitPrice}${currency} / ${move.unit} = ${move.amount * move.unitPrice} ${currency}`,
                description: (
                  <div className="flex flex-row gap-0.5 opacity-40 ml-8">
                    <span>
                      {props.services.formatService.financial.amountWithoutCurrency(
                        move.amount,
                      )}
                    </span>
                    <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
                      {move.unit}
                    </span>
                    <span>&times;</span>
                    <span>
                      {props.services.formatService.financial.amountWithoutCurrency(
                        move.unitPrice,
                      )}
                    </span>
                    <span>/</span>
                    <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
                      {move.unit}
                    </span>
                    <span>=</span>
                    <span className="font-extrabold">
                      {props.services.formatService.financial.amountWithoutCurrency(
                        move.amount * move.unitPrice,
                      )}
                    </span>
                  </div>
                ),
              },
            ),
          ),
        ]),
      )}
      onQueryChange={() => {}}
      columns={[
        c.accessor("order", { header: "#" }),
        c.accessor("description", {
          header: "Description",
          cell: (cell) => cell.row.original.description,
        }),
        // @ts-expect-error wrong inference
        c.accessor("x-client", {
          id: "client",
          header: rd.tryMap(project, (p) => (
            <ClientWidget
              layout="avatar"
              size="sm"
              services={props.services}
              clientId={p.clientId}
            />
          )),
          cell: (cell) => {
            const move = get(cell.row.original, "x-client");
            return maybe.map(move, renderMove);
          },
          meta: numberMeta,
        }),
        // @ts-expect-error wrong inference
        c.accessor("x-iteration", {
          id: "iteration",
          header: rd.tryMap(project, (p) =>
            p.workspaceIds.map((workspaceId) => (
              <WorkspaceWidget
                workspaceId={workspaceId}
                services={props.services}
                layout="avatar"
                size="sm"
              />
            )),
          ),
          cell: (cell) => {
            const move = get(cell.row.original, "x-iteration");
            return maybe.map(move, renderMove);
          },
          meta: numberMeta,
        }),
        ...uniqBy(
          (rd.tryGet(iteration)?.events ?? [])
            .flatMap((e) => e.moves)
            .flatMap((move) => [move.from, move.to])
            .filter((x) => x.type === "contractor"),
          (move) => move.contractorId,
        ).map((value) =>
          c.display({
            id: `x-contractor-${value.contractorId}`,
            header: () => (
              <ContractorWidget
                layout="avatar"
                size="sm"
                services={props.services}
                contractorId={value.contractorId}
              />
            ),
            cell: (cell) => {
              const move = get(
                cell.row.original,
                `x-contractor-${value.contractorId}`,
              );
              return maybe.map(move, renderMove);
            },
            meta: numberMeta,
          }),
        ),
        // koszty
        c.display({
          id: "x-cost",
          header: "Cost",
          cell: (cell) => {
            const move = get(cell.row.original, "x-cost");
            return maybe.map(move, renderMove);
          },
          meta: numberMeta,
        }),
        // c.accessor("quantity", {
        //   header: "Quantity",
        //
        //   cell: (cell) => (
        //     <>
        //       {props.services.formatService.financial.amountWithoutCurrency(
        //         cell.row.original.quantity,
        //       )}
        //       <span className="inline-block min-w-8 text-left ml-1">
        //         <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
        //           {cell.row.original.unit}
        //         </span>
        //       </span>
        //     </>
        //   ),
        //   meta: {
        //     cellClassName: "text-right",
        //     headerClassName: "*:block *:text-right *:pr-8",
        //   },
        // }),
        // c.accessor("unitPrice", {
        //   header: `Unit Price (${currency})`,
        //   cell: (cell) => (
        //     <>
        //       {props.services.formatService.financial.amountWithoutCurrency(
        //         cell.row.original.unitPrice,
        //       )}
        //       <span className="inline-block min-w-8 text-left ml-1">
        //         <span className="bg-sky-50 text-sky-900 inline-block p-0.5 -my-0.5 rounded-sm">
        //           / {cell.row.original.unit}
        //         </span>
        //       </span>
        //     </>
        //   ),
        //   meta: {
        //     cellClassName: "text-right",
        //     headerClassName: "*:block *:text-right *:pr-6",
        //   },
        // }),
        // c.display({
        //   id: "total",
        //   header: `Total (${currency})`,
        //   cell: (cell) =>
        //     props.services.formatService.financial.amountWithoutCurrency(
        //       cell.row.original.quantity * cell.row.original.unitPrice,
        //     ),
        //   meta: {
        //     cellClassName: "text-right",
        //     headerClassName: "*:block *:text-right *:pr-2",
        //   },
        // }),
        c.display({
          id: "actions",
          cell: ({ row }) => {
            if (!isEvent(row.original)) return null;
            return (
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
                          currency: rd.getOrThrow(iteration).currency,
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
                          currency: rd.getOrThrow(iteration).currency,
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
            );
          },
        }),
      ]}
      caption={rd.tryMap(iteration, (iteration) => {
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
            <p>
              The balance should be zero. It means that all income and outcome
              positions are balanced. We need to create payroll positions for
              linked reports. If we can't cover all reported work with payroll
              positions, we need to create a debt. Balance will be still "0" and
              we clearly say that the iteration is closed with a debt to
              specific contractor. Also, if the client has paid upfront too
              much, we close the iteration with a debt to the client. Then we
              can insert a debt as a new position in the next iteration.
            </p>
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
