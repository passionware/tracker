import {
  Variable,
  VariableQuery,
  variableQueryUtils,
} from "@/api/variable/variable.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { ClientWidget } from "@/features/_common/pickers/ClientView.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ContractorWidget } from "@/features/_common/pickers/ContractorView.tsx";
import { FilterChip } from "@/features/_common/FilterChip.tsx";
import { ContractorQueryControl } from "@/features/_common/filters/ContractorQueryControl.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WorkspaceWidget } from "@/features/_common/pickers/WorkspaceView.tsx";
import { VariableForm } from "@/features/variables/VariableForm.tsx";
import { ActionMenu } from "@/features/variables/VariableWidget.menu.tsx";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export interface VariableWidgetProps
  extends WithServices<
    [
      WithVariableService,
      WithContractorService,
      WithClientService,
      WithWorkspaceService,
      WithFormatService,
      WithPreferenceService,
      WithMessageService,
    ]
  > {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

const columnHelper = createColumnHelper<Variable>();

export function VariableWidget(props: VariableWidgetProps) {
  const [query, setQuery] = useState<VariableQuery>(
    variableQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const variables = props.services.variableService.useVariables(
    variableQueryUtils.ensureDefault(query, props.workspaceId, props.clientId),
  );

  const addVariableState = promiseState.useRemoteData<void>();

  return (
    <CommonPageContainer
      tools={
        <>
          <FilterChip label="Contractor">
            <ContractorQueryControl
              allowClear
              allowUnassigned
              filter={query.filters.contractorId}
              onFilterChange={(x) =>
                setQuery(variableQueryUtils.setFilter(query, "contractorId", x))
              }
              services={props.services}
            />
          </FilterChip>
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addVariableState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add variable
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new variable</PopoverHeader>
                <VariableForm
                  services={props.services}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(props.workspaceId, null),
                    contractorId:
                      query.filters.contractorId?.operator === "oneOf"
                        ? idSpecUtils.switchAll(
                            query.filters.contractorId.value[0],
                            null,
                          )
                        : null,
                    clientId: idSpecUtils.switchAll(props.clientId, null),
                  }}
                  onCancel={() => addVariableState.reset()}
                  onSubmit={(data) =>
                    addVariableState.track(
                      props.services.variableService
                        .createVariable(data)
                        .then(() => void bag.close()),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Client Invoices</BreadcrumbPage>,
      ]}
    >
      <ListView
        query={query}
        onQueryChange={setQuery}
        data={variables}
        onRowDoubleClick={async (row) => {
          const result =
            await props.services.messageService.editVariable.sendRequest({
              defaultValues: row,
            });
          switch (result.action) {
            case "confirm": {
              await props.services.variableService.updateVariable(
                row.id,
                result.changes,
              );
              break;
            }
          }
        }}
        columns={[
          columnHelper.accessor("workspaceId", {
            header: "Workspace",
            cell: (info) => (
              <WorkspaceWidget
                layout="avatar"
                workspaceId={info.getValue()}
                services={props.services}
              />
            ),
          }),
          columnHelper.accessor("clientId", {
            header: "Client",
            cell: (info) => (
              <ClientWidget
                layout="avatar"
                clientId={info.getValue()}
                services={props.services}
              />
            ),
          }),
          columnHelper.accessor("contractorId", {
            header: "Contractor",
            cell: (info) => (
              <ContractorWidget
                layout="avatar"
                contractorId={info.getValue()}
                services={props.services}
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
                    "p-1 border max-w-xl w-min truncate",
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
              props.services.formatService.temporal.datetime(info.getValue()),
          }),
          columnHelper.display({
            id: "actions",
            cell: (info) => (
              <ActionMenu entry={info.row.original} services={props.services} />
            ),
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
    </CommonPageContainer>
  );
}
