import { generatedReportSourceQueryUtils } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import type { DrawerDescriptorServices } from "@/features/_common/drawers/DrawerDescriptor.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { myRouting } from "@/routing/myRouting.ts";
import type { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import { maybe, rd } from "@passionware/monads";
import { useMemo, useState } from "react";

const PREVIEW_COUNT = 3;

function reportNavigateBase(
  workspaceId: WorkspaceSpec,
  clientId: ClientSpec,
  projectId: number,
  projectIterationId: ProjectIteration["id"],
) {
  return myRouting
    .forWorkspace(workspaceId)
    .forClient(clientId)
    .forProject(projectId.toString())
    .forIteration(projectIterationId.toString());
}

function GeneratedReportRow(props: {
  report: GeneratedReportSource;
  services: DrawerDescriptorServices;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: number;
  projectIterationId: ProjectIteration["id"];
}) {
  const { pushEntityDrawer } = useEntityDrawerContext();
  const base = reportNavigateBase(
    props.workspaceId,
    props.clientId,
    props.projectId,
    props.projectIterationId,
  );
  const fmt = props.services.formatService;
  const entries = props.report.data.timeEntries.length;

  const basicInfo = useMemo(() => {
    try {
      return props.services.generatedReportViewService.getBasicInformationView(
        props.report,
      );
    } catch {
      return null;
    }
  }, [props.report, props.services.generatedReportViewService]);

  const totalBilling = basicInfo?.statistics.totalBillingBudget ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium tabular-nums text-foreground">
          Report #{props.report.id}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmt.temporal.single.compactWithTime(props.report.createdAt)} ·{" "}
          {entries} time {entries === 1 ? "entry" : "entries"}
          {totalBilling.length > 0 ? (
            <>
              {" · "}
              <span className="inline-flex flex-wrap items-center gap-x-1">
                <span>Billing</span>
                <CurrencyValueWidget
                  values={totalBilling}
                  services={props.services}
                  className="text-xs text-muted-foreground"
                />
              </span>
            </>
          ) : basicInfo != null ? (
            <> · Billing —</>
          ) : (
            <> · Billing unavailable</>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            props.services.navigationService.navigate(
              base.forGeneratedReport(props.report.id.toString()).root(),
            )
          }
        >
          View
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            pushEntityDrawer({
              type: "generated-report-reconciliation",
              reportId: props.report.id,
              projectIterationId: props.projectIterationId,
              projectId: props.projectId,
            })
          }
        >
          Reconcile
        </Button>
      </div>
    </div>
  );
}

export function ProjectIterationGeneratedReportsPanel(props: {
  services: DrawerDescriptorServices;
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: number;
  projectIterationId: ProjectIteration["id"];
}) {
  const [showAll, setShowAll] = useState(false);

  const query = generatedReportSourceQueryUtils.getBuilder().build((q) => [
    q.withFilter("projectIterationId", {
      operator: "oneOf",
      value: [props.projectIterationId],
    }),
  ]);

  const reportsRd =
    props.services.generatedReportSourceService.useGeneratedReportSources(
      maybe.of(query),
    );

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Generated reports
      </h4>
      {rd
        .journey(reportsRd)
        .wait(
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>,
        )
        .catch(renderSmallError("w-full"))
        .map((reports) => {
          if (reports.length === 0) {
            return (
              <p className="text-sm text-muted-foreground">
                No generated reports yet. Use “Generate report” to import time
                data for this iteration.
              </p>
            );
          }

          const visible = showAll
            ? reports
            : reports.slice(0, PREVIEW_COUNT);
          const hiddenCount = reports.length - visible.length;

          return (
            <div className="space-y-2">
              <div className="space-y-2">
                {visible.map((report) => (
                  <GeneratedReportRow
                    key={report.id}
                    report={report}
                    services={props.services}
                    workspaceId={props.workspaceId}
                    clientId={props.clientId}
                    projectId={props.projectId}
                    projectIterationId={props.projectIterationId}
                  />
                ))}
              </div>
              {hiddenCount > 0 && !showAll ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowAll(true)}
                >
                  Show all {reports.length} reports
                </Button>
              ) : null}
              {showAll && reports.length > PREVIEW_COUNT ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowAll(false)}
                >
                  Show fewer
                </Button>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
