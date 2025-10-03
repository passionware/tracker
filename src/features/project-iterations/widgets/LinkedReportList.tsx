import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WithFrontServices } from "@/core/frontServices.ts";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { reportColumns } from "@/features/_common/columns/report.tsx";
import {
  ListToolbar,
  ListToolbarButton,
} from "@/features/_common/ListToolbar.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  selectionState,
  SelectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { useState } from "react";

export function LinkedReportList(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const query = reportQueryUtils
    .getBuilder(props.workspaceId, props.clientId)
    .build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: [props.projectIterationId],
      }),
    ]);
  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectNone(),
  );
  const reports = props.services.reportDisplayService.useReportView(query);
  useSelectionCleanup(
    selection,
    rd.tryMap(reports, (r) => r.entries.map((e) => e.id)),
    setSelection,
  );

  return (
    <ListView
      data={rd.map(reports, (r) => r.entries)}
      selection={selection}
      onSelectionChange={setSelection}
      query={query}
      onQueryChange={() => {}}
      columns={[
        reportColumns.contractor.withAdjacency,
        reportColumns.billing.linkingStatus.read(props.services),
        reportColumns.cost.immediateLinkingStatus.read(props.services),
        reportColumns.cost.linkingStatus.read,
        reportColumns.netAmount(props.services),
        reportColumns.billing.linkedValue(props.services),
        reportColumns.billing.remainingValue(props.services),
        reportColumns.cost.immediateRemainingValue(props.services),
        reportColumns.cost.remainingValue(props.services),
        reportColumns.cost.linkedValue(props.services),
        reportColumns.period(props.services),
        sharedColumns.description,
      ]}
      caption={
        <>
          <p>A list of all reported work for this iteration.</p>
          <p>
            The goal is to link these reports to positions in the iteration.
          </p>
          <p>
            It can happen that not all reports are fully linked to positions, so
            we create a debt that needs to be resolved later.
          </p>
        </>
      }
      toolbar={
        selectionState.getTotalSelected(
          selection,
          rd.tryGet(reports)?.entries.length ?? 0,
        ) > 0 ? (
          <ListToolbar>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectionState.getTotalSelected(
                  selection,
                  rd.tryGet(reports)?.entries.length ?? 0,
                )}{" "}
                selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ListToolbarButton variant="destructive">
                Delete
              </ListToolbarButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ListToolbarButton variant="default">
                    Actions
                  </ListToolbarButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/*
                    This will open a dialog where you can fill data from external source -> ie. tmetric
                    It is important that the linked report is somehow mapped to the report billing and cost amounts
                    After importing, you can correct the data freely.
                    Then you can save the new version of the report.
                    Then you can view the report (specific version) in the interactive preview that provides useful analysis.
                    This also should be a public view that is queried by ID. This should be carefully exposed using RLS for anonymous users.
                    */}
                  <DropdownMenuItem
                    onSelect={() => {
                      props.services.reportGenerationService.generateReport({
                        reportIds: selectionState.getSelectedIds(
                          selection,
                          rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
                        ),
                        sourceType: "tmetric",
                      });
                    }}
                  >
                    Generate Detailed Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ListToolbar>
        ) : null
      }
    />
  );
}
