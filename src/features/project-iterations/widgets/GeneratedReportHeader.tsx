import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
} from "@/features/_common/ActionMenu.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { FileText, Maximize } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GeneratedReportHeader(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    reportId: GeneratedReportSource["id"];
  },
) {
  const navigate = useNavigate();

  const forIteration = props.services.routingService
    .forWorkspace(props.workspaceId)
    .forClient(props.clientId)
    .forProject(props.projectId.toString())
    .forIteration(props.projectIterationId.toString());

  const generatedReport =
    props.services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(props.reportId),
    );

  return (
    <div className="ml-auto gap-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          {rd
            .journey(generatedReport)
            .wait(<Skeleton className="h-8 w-48" />)
            .catch(renderError)
            .map((report) => (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-600" />
                <h1 className="text-lg ">Generated Report #{report.id}</h1>
                {props.services.formatService.temporal.single.compactWithTime(
                  report.createdAt,
                )}
              </div>
            ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rd
          .journey(generatedReport)
          .wait(<Skeleton className="h-8 w-24" />)
          .catch(renderError)
          .map(() => (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate(
                    forIteration
                      .forGeneratedReport(props.reportId.toString())
                      .standaloneGroupedView(),
                  );
                }}
                className="flex items-center gap-2"
              >
                <Maximize className="h-4 w-4" />
                Full Screen
              </Button>
              <ActionMenu services={props.services}>
                <ActionMenuDeleteItem
                  onClick={async () => {
                    await props.services.generatedReportSourceWriteService.deleteGeneratedReportSource(
                      props.reportId,
                    );
                    navigate(forIteration.generatedReports());
                  }}
                >
                  Delete Report
                </ActionMenuDeleteItem>
              </ActionMenu>
            </>
          ))}
      </div>
    </div>
  );
}

export function GeneratedReportTabs(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    reportId: GeneratedReportSource["id"];
  },
) {
  const navigate = useNavigate();

  const forIteration = props.services.routingService
    .forWorkspace(props.workspaceId)
    .forClient(props.clientId)
    .forProject(props.projectId.toString())
    .forIteration(props.projectIterationId.toString());

  const currentTab =
    props.services.locationService.useCurrentGeneratedReportTab();

  const handleTabChange = (tab: string) => {
    // Navigate back to the generated reports list
    switch (tab) {
      case "basic":
        navigate(
          forIteration.forGeneratedReport(props.reportId.toString()).root(),
        );
        break;
      case "time-entries":
        navigate(
          forIteration
            .forGeneratedReport(props.reportId.toString())
            .timeEntries(),
        );
        break;
      case "grouped-view":
        navigate(
          forIteration
            .forGeneratedReport(props.reportId.toString())
            .groupedView(undefined), // No cube path - start at root
        );
        break;
    }
  };

  return (
    <Tabs
      value={currentTab ?? "basic"}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Information</TabsTrigger>
        <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
        <TabsTrigger value="grouped-view">Grouped View</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
