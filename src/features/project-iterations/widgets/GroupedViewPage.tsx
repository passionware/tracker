import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GroupedViewWidget } from "./GroupedViewWidget";
import {
  CubeLayout,
  CubeDimensionExplorer,
  CubeSummary,
  CubeBreakdownControl,
  CubeHierarchicalBreakdown,
  CubeProvider,
} from "@/features/_common/Cube/index.ts";
import { useCubeState } from "@/features/_common/Cube/useCubeState.ts";
import { useCubeDefinitions } from "./CubeDefinitions";

// Separate component to handle cube logic and avoid hooks order issues
function GroupedViewWithCube({
  report,
  services,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
}) {
  // Create shared cube state and definitions at the top level
  const { dimensions, measures, rawDataDimension } = useCubeDefinitions(
    report,
    services,
  );
  const cubeState = useCubeState({
    data: report.data.timeEntries,
    dimensions,
    measures,
    initialGrouping: ["project", "contractor", "task", "activity"],
    includeItems: true,
    rawDataDimension,
  });

  // Create context value
  const contextValue = {
    state: cubeState,
    reportId: String(report.id),
  };

  return (
    <CubeProvider value={contextValue}>
      <CubeLayout
        className="w-full"
        leftSidebar={
          <>
            <div className="p-4 space-y-4 flex-1">
              <CubeSummary />
              <CubeBreakdownControl />
            </div>
            <div className="p-4 pt-0">
              <CubeHierarchicalBreakdown />
            </div>
          </>
        }
        rightSidebar={<CubeDimensionExplorer />}
      >
        <GroupedViewWidget report={report} services={services} />
      </CubeLayout>
    </CubeProvider>
  );
}

interface GroupedViewPageProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: number;
  projectIterationId: ProjectIteration["id"];
  reportId: GeneratedReportSource["id"];
}

export function GroupedViewPage(props: GroupedViewPageProps) {
  const navigate = useNavigate();

  const generatedReport =
    props.services.generatedReportSourceService.useGeneratedReportSource(
      maybe.of(props.reportId),
    );

  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  const handleBackToReport = () => {
    // Navigate back to the basic report view
    const backUrl = props.services.routingService
      .forWorkspace(props.workspaceId)
      .forClient(props.clientId)
      .forProject(props.projectId.toString())
      .forIteration(props.projectIterationId.toString())
      .forGeneratedReport(props.reportId.toString())
      .basic();

    navigate(backUrl);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToReport}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Report
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Cube Analysis
              </h1>
              <p className="text-sm text-slate-600">
                Interactive data exploration and visualization
              </p>
            </div>
          </div>

          {/* Report info */}
          {rd.tryMap(generatedReport, (report) => (
            <div className="text-right text-sm text-slate-600">
              <div className="font-medium">Report #{report.id}</div>
              <div>
                {rd.tryMap(iteration, (iter) => (
                  <span className="*:*:flex-row">
                    {props.services.formatService.temporal.range.compact(
                      iter.periodStart,
                      iter.periodEnd,
                    )}
                  </span>
                )) || <span>Loading...</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content - three columns: left summary, main analysis, right explorer */}
      <div className="flex-1 overflow-hidden flex">
        {rd
          .journey(generatedReport)
          .wait(
            <div className="flex-1 overflow-hidden flex">
              {/* Left sidebar skeleton */}
              <div className="w-80 border-r border-slate-200 bg-white p-4 space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>

              {/* Main content skeleton */}
              <div className="flex-1 bg-white p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </div>

              {/* Right sidebar skeleton */}
              <div className="w-80 border-l border-slate-200 bg-white p-4 space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </div>,
          )
          .catch(() => (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-4">Failed to load report</p>
                <Button onClick={handleBackToReport} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Report
                </Button>
              </div>
            </div>
          ))
          .map((report) => (
            <GroupedViewWithCube
              key={report.id}
              report={report}
              services={props.services}
            />
          ))}
      </div>
    </div>
  );
}
