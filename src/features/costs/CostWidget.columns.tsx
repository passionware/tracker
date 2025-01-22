import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { costColumns } from "@/features/_common/columns/cost.tsx";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<CostEntry>();

export function useColumns(props: PotentialCostWidgetProps) {
  return [
    ...foreignColumns.getContextual({
      workspaceId: props.workspaceId,
      contractorId: idSpecUtils.ofAll(),
    }),
    costColumns.counterparty,
    costColumns.invoiceNumber,
    costColumns.invoiceDate(props.services),
    costColumns.netAmount(props.services),
    costColumns.grossAmount(props.services),
    costColumns.report.linkStatus.allowModify(
      props.services,
      props.clientId,
      props.workspaceId,
    ),
    costColumns.report.linkedValue(props.services),
    costColumns.report.remainingValue(props.services),
    foreignColumns.description,
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <ActionMenu entry={info.row.original} services={props.services} />
      ),
    }),
  ];
}

function ActionMenu(
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithMessageService,
    ]
  > & {
    entry: CostEntry;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {isDangerMode && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  void props.services.mutationService.deleteCost(
                    props.entry.id,
                  );
                }}
              >
                <Trash2 />
                Delete Cost
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onClick={async () => {
              const result =
                await props.services.messageService.editCost.sendRequest({
                  defaultValues: props.entry.originalCost,
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.editCost(
                    props.entry.id,
                    result.changes,
                  );
                  break;
                case "cancel":
                  break;
              }
            }}
          >
            <Pencil />
            Edit Cost
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(props.entry.id.toString())
            }
          >
            Copy cost ID
          </DropdownMenuItem>
          {/*<DropdownMenuSeparator />*/}
          {/*<DropdownMenuItem>View customer</DropdownMenuItem>*/}
          {/*<DropdownMenuItem>View payment details</DropdownMenuItem>*/}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
