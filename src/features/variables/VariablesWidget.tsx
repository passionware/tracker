import {
  Variable,
  VariableQuery,
  variableQueryUtils,
} from "@/api/variable/variable.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { FilterChip } from "@/features/_common/FilterChip.tsx";
import { ContractorQueryControl } from "@/features/_common/filters/ContractorQueryControl.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  ContractorSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export interface VariablesWidget
  extends WithServices<
    [
      WithVariableService,
      WithContractorService,
      WithClientService,
      WithWorkspaceService,
    ]
  > {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
  contractId: ContractorSpec;
}

const columnHelper = createColumnHelper<Variable>();

export function VariablesWidget(props: VariablesWidget) {
  const [query, setQuery] = useState<VariableQuery>(
    variableQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const variables = props.services.variableService.useVariables(
    variableQueryUtils.ensureDefault(query, props.workspaceId, props.clientId),
  );

  const addVariableState = promiseState.useRemoteData();

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
            content={() => (
              <>
                <PopoverHeader>Add new variable</PopoverHeader>
                TODO: Implement NewVariableWidget
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
        data={variables}
        columns={[
          columnHelper.accessor("name", { header: "Name" }),
          columnHelper.accessor("value", { header: "Value" }),
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
