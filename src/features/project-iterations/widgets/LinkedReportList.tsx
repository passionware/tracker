import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { useState } from "react";
import { ReportGenerationWidget } from "./report-generation/tmetric/ReportGenerationWidget";

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

  const unlinkMutation = promiseState.useMutation(async () => {
    const ids = selectionState.getSelectedIds(
      selection,
      rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
    );
    for (const reportId of ids) {
      await props.services.mutationService.editReport(reportId, {
        projectIterationId: null,
      });
    }
    setSelection(selectionState.selectNone());
  });
  const selectedReportIds = selectionState.getSelectedIds(
    selection,
    rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
  );

  async function handleBatchUnlink() {
    if (selectedReportIds.length === 0) return;
    await unlinkMutation.track(void 0);
  }

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
              <Popover>
                <PopoverTrigger asChild>
                  <div>
                    <ListToolbarButton variant="destructive">
                      Delete
                    </ListToolbarButton>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-3">
                    <div className="text-sm text-slate-700">
                      Are you sure you want to unlink {selectedReportIds.length}{" "}
                      selected report(s) from this iteration?
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchUnlink}
                        disabled={mt.isInProgress(unlinkMutation.state)}
                      >
                        {mt.isInProgress(unlinkMutation.state)
                          ? "Deleting..."
                          : "Confirm"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

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
                      // props.services.reportGenerationService.generateReport({
                      //   reportIds: selectionState.getSelectedIds(
                      //     selection,
                      //     rd.tryGet(reports)?.entries.map((e) => e.id) ?? [],
                      //   ),
                      //   sourceType: "tmetric",
                      //   projectIterationId: props.projectIterationId,
                      // });
                      if (!rd.isSuccess(reports)) return;

                      const selectedReports = reports.data.entries.filter((e) =>
                        selectionState.isSelected(selection, e.id),
                      );

                      props.services.dialogService.show((api) => {
                        return (
                          <ReportGenerationWidget
                            {...api}
                            reports={selectedReports.map(
                              (e) => e.originalReport,
                            )}
                            projectIterationId={props.projectIterationId}
                            services={props.services}
                          />
                        );
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
