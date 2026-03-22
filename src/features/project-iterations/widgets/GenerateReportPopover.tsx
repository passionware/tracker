import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import type { Contractor } from "@/api/contractor/contractor.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ListView } from "@/features/_common/ListView.tsx";
import { ReportGenerationWidget } from "@/features/project-iterations/widgets/report-generation/tmetric/ReportGenerationWidget.tsx";
import {
  selectionState,
  type SelectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { useState } from "react";

const contractorColumnHelper = createColumnHelper<Contractor>();

export function GenerateReportPopover(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    /** e.g. `ml-auto` in iteration tabs; omit in tight drawer headers */
    triggerClassName?: string;
  },
) {
  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectAll(),
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  const projectId = rd.tryMap(iteration, (iter) => iter.projectId);
  const project = props.services.projectService.useProject(projectId);

  const contractorsQuery = props.services.contractorService.useContractors(
    maybe.mapOrNull(projectId, (id) =>
      contractorQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: [id],
        }),
      ]),
    ),
  );

  useSelectionCleanup(
    selection,
    rd.tryMap(contractorsQuery, (contractors) => contractors.map((c) => c.id)),
    setSelection,
  );

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="accent1"
          size="sm"
          className={props.triggerClassName ?? "ml-auto"}
        >
          <FileText />
          Generate report
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-4" align="start">
        {rd
          .journey(
            rd.combine({
              iteration,
              project,
              contractors:
                contractorsQuery || rd.ofError(new Error("No query")),
            }),
          )
          .wait(
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>,
          )
          .catch(() => (
            <div className="text-sm text-destructive">
              Failed to load project data
            </div>
          ))
          .map(({ iteration: iter, contractors }) => {
            if (contractors.length === 0) {
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Generate detailed report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No contractors assigned to this project. Please assign
                      contractors first.
                    </p>
                  </div>
                </div>
              );
            }

            const selectedContractorIds = selectionState.getSelectedIds(
              selection,
              contractors.map((c) => c.id),
            );

            return (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    Generate detailed report
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Select contractors to include in the report generation for
                    the iteration period.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="mb-2 text-xs text-muted-foreground">
                    Period:{" "}
                    {props.services.formatService.temporal.range.long(
                      iter.periodStart,
                      iter.periodEnd,
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-auto rounded-md border">
                    <ListView
                      data={rd.of(contractors)}
                      query={contractorQueryUtils.ofEmpty()}
                      onQueryChange={() => {}}
                      selection={selection}
                      onSelectionChange={setSelection}
                      getRowId={(x) => x.id}
                      columns={[
                        contractorColumnHelper.accessor("name", {
                          header: "Name",
                        }),
                        contractorColumnHelper.accessor("fullName", {
                          header: "Full Name",
                        }),
                      ]}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      {selectedContractorIds.length > 0 ? (
                        <span>
                          {selectedContractorIds.length} contractor(s) selected
                        </span>
                      ) : (
                        <span>No contractors selected</span>
                      )}
                    </div>
                    <Button
                      className="ml-auto"
                      disabled={selectedContractorIds.length === 0}
                      onClick={() => {
                        setPopoverOpen(false);
                        const selectedContractors = contractors.filter((c) =>
                          selectedContractorIds.includes(c.id),
                        );
                        props.services.dialogService.show((api) => {
                          return (
                            <ReportGenerationWidget
                              {...api}
                              contractors={selectedContractors}
                              periodStart={iter.periodStart}
                              periodEnd={iter.periodEnd}
                              projectIterationId={props.projectIterationId}
                              clientId={props.clientId}
                              services={props.services}
                            />
                          );
                        });
                      }}
                    >
                      Generate report
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </PopoverContent>
    </Popover>
  );
}
