import { AccountSpec } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ExpandButton } from "@/features/project-iterations/widgets/_private/ExpandButton.tsx";
import { HorizontalArrow } from "@/features/project-iterations/widgets/_private/HorizontalArrow.tsx";
import { cn } from "@/lib/utils.ts";
import { ComputedEventData } from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import { rd } from "@passionware/monads";
import { Trash } from "lucide-react";
import { Fragment, useState } from "react";

export interface EventsWidgetProps extends WithFrontServices {
  projectIterationId: number;
  projectId: Project["id"];
}

export function EventsWidget(props: EventsWidgetProps) {
  const events =
    props.services.projectIterationDisplayService.useComputedEvents(
      props.projectIterationId,
    );

  const project = props.services.projectService.useProject(props.projectId);

  return rd
    .journey(rd.combine({ events, project }))
    .wait(<Skeleton className="h-96" />)
    .catch(renderError)
    .map(({ events, project }) => (
      <EventsView
        data={events}
        clientId={project.clientId}
        workspaceId={project.workspaceId}
        services={props.services}
      />
    ));
}

export function EventsView(
  props: {
    data: ComputedEventData;
    clientId: Project["clientId"];
    workspaceId: Project["workspaceId"];
  } & WithFrontServices,
) {
  const { data, clientId, workspaceId } = props;
  let rowOffset = 1;

  const getColumnIndex = (account: AccountSpec) => {
    switch (account.type) {
      case "client":
        return 2;
      case "iteration":
        return 3;
      case "contractor":
        return 4 + data.contractorIds.indexOf(account.contractorId);
      case "cost":
        return 4 + data.contractorIds.length;
    }
  };

  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>(
    {},
  );

  return (
    <div
      className="grid gap-y-3 gap-x-32 pr-16"
      style={{
        gridTemplateColumns: `auto repeat(${3 + data.contractorIds.length}, min-content)`,
      }}
    >
      {/*expand/collapse all button*/}
      <div
        className="row-start-1 col-start-1 z-1 justify-self-end flex flex-row gap-2 items-center"
        style={{
          gridColumn: 1,
        }}
      >
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            setCollapsedItems(
              data.events.reduce(
                (acc, event) => {
                  acc[event.iterationEvent.id] = true;
                  return acc;
                },
                {} as Record<string, boolean>,
              ),
            );
          }}
        >
          Collapse all
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            setCollapsedItems({});
          }}
        >
          Expand all
        </Button>
      </div>
      <div className="row-start-1 col-start-2 z-1 justify-self-center">
        <ClientWidget
          clientId={clientId}
          services={props.services}
          layout="avatar"
          size="sm"
        />
      </div>
      <div className="row-start-1 col-start-3 z-1 justify-self-center">
        <WorkspaceWidget
          workspaceId={workspaceId}
          services={props.services}
          layout="avatar"
          size="sm"
        />
      </div>
      {data.contractorIds.map((contractorId, contractorIndex) => {
        return (
          <div
            className="z-1 justify-self-center"
            style={{
              gridRow: 1,
              gridColumn: 4 + contractorIndex,
            }}
          >
            <ContractorWidget
              contractorId={contractorId}
              layout="avatar"
              size="sm"
              services={props.services}
            />
          </div>
        );
      })}
      <div className="text-xs self-center flex flex-row items-center gap-1 row-start-1 -col-start-2 bg-slate-50 p-1 border border-slate-200 rounded z-1">
        <Trash className="size-3" />
        Cost
      </div>
      {data.events.map((event) => {
        rowOffset += 1;
        const rowOffsetAtStart = rowOffset;

        const isExpanded = !collapsedItems[event.iterationEvent.id];
        return (
          <>
            <div
              className="-mr-20 text-xs text-slate-700 self-center justify-self-end flex flex-row gap-1 items-center"
              style={{
                gridColumn: 1,
                gridRow: rowOffset,
              }}
            >
              <ExpandButton
                isExpanded={isExpanded}
                onClick={() =>
                  setCollapsedItems({
                    ...collapsedItems,
                    [event.iterationEvent.id]: isExpanded,
                  })
                }
              >
                {event.iterationEvent.description}
              </ExpandButton>
            </div>
            {[
              event.balances.client,
              event.balances.iteration,
              ...data.contractorIds.map(
                (contractorId) => event.balances.contractors[contractorId],
              ),
              event.balances.cost,
            ].map((balance, balanceIndex) => {
              if (!balance) return null;
              return (
                <div
                  className={cn(
                    "m-1 z-1 text-xs text-center inline-block rounded p-1",
                    balance.amount > 0 && "bg-green-50 text-green-800",
                    balance.amount < 0 && "bg-rose-50 text-rose-500",
                    balance.amount === 0 && "bg-slate-50 text-slate-700",
                    isExpanded && "opacity-50",
                  )}
                  style={{
                    gridColumn: 2 + balanceIndex,
                    gridRow: rowOffset,
                  }}
                >
                  {balance.amount}
                </div>
              );
            })}
            {isExpanded &&
              event.iterationEvent.moves.map((move, moveIndex) => {
                rowOffset += 1;

                const fromIndex = getColumnIndex(move.from);
                const toIndex = getColumnIndex(move.to);
                const isLeftToRight = fromIndex < toIndex;

                return (
                  <Fragment key={moveIndex}>
                    <div
                      className="-mr-16 m-1 z-2 text-[8pt] flex flex-row items-center justify-end gap-1"
                      style={{
                        gridColumn: 1,
                        gridRow: rowOffset,
                      }}
                    >
                      <div className="flex flex-row gap-0.5 ml-8">
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
                    </div>
                    {/* Starting cell - show the amount */}
                    <div
                      className="m-1 z-2 text-xs font-semibold text-sky-700 bg-sky-50 inline-block rounded p-1 text-center"
                      style={{
                        gridColumn: fromIndex,
                        gridRow: rowOffset,
                      }}
                    >
                      {move.amount * move.unitPrice}
                    </div>

                    {/*
          The arrow "line" itself:
          spans from min to max columns,
          then uses flex to display a line + arrow icon in the correct direction
      */}
                    <div
                      style={{
                        gridRow: rowOffset,
                        // always start at the smaller of the two columns
                        gridColumnStart: Math.min(fromIndex, toIndex),
                        // end at the bigger column + 1 so we occupy that cell boundary
                        gridColumnEnd: Math.max(fromIndex, toIndex) + 1,
                      }}
                      className="z-1 m-1 relative flex items-center px-8"
                    >
                      <HorizontalArrow
                        direction={isLeftToRight ? "to-right" : "to-left"}
                      />
                    </div>
                  </Fragment>
                );
              })}
            {/*   nice bg behind all moves */}
            {isExpanded && (
              <div
                style={{
                  gridColumn: 2,
                  gridColumnEnd: 5 + data.contractorIds.length,
                  gridRowStart: rowOffsetAtStart + 1,
                  gridRowEnd: rowOffset + 1,
                }}
                className="relative z-0 rounded-lg border border-slate-200 shadow-xs"
              ></div>
            )}
          </>
        );
      })}
      {/*   tracks dashed lines for all accounts */}
      {[
        2,
        3,
        ...data.contractorIds.map((_, i) => i + 4),
        // one for cost:
        data.contractorIds.length + 4,
      ].map((col) => (
        <div
          style={{
            gridColumn: col,
            gridRowStart: 1,
            gridRowEnd: rowOffset + 2,
          }}
          className="z-0 justify-self-center py-9"
        >
          <div className="h-full w-px border-l border-dashed border-slate-200"></div>
        </div>
      ))}
      {/* final balances */}
      <div
        className="text-xs self-center justify-self-end flex flex-row items-center gap-1 row-start-1 -col-start-2 z-1 font-semibold"
        style={{
          gridColumn: 1,
          gridRow: rowOffset + 1,
        }}
      >
        Final balances
      </div>
      {/*final balances nice bg */}
      <div
        style={{
          gridColumn: 2,
          gridColumnEnd: 5 + data.contractorIds.length,
          gridRow: rowOffset + 1,
        }}
        className="relative z-0 rounded-lg bg-slate-50 border border-slate-400 shadow-xs"
      ></div>
      {[
        data.balances.client,
        data.balances.iteration,
        ...data.contractorIds.map(
          (contractorId) => data.balances.contractors[contractorId],
        ),
        data.balances.cost,
      ].map((balance, balanceIndex) => {
        if (!balance) return null;
        return (
          <div
            className={cn(
              "m-1 z-1 text-xs text-center inline-block rounded p-1 font-bold",
              balance.amount > 0 && "bg-green-100 text-green-900",
              balance.amount < 0 && "bg-rose-100 text-rose-700",
              balance.amount === 0 && "bg-slate-100 text-slate-700",
            )}
            style={{
              gridColumn: 2 + balanceIndex,
              gridRow: rowOffset + 1,
            }}
          >
            {balance.amount}
          </div>
        );
      })}
    </div>
  );
}
