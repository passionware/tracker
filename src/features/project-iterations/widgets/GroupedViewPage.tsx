import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GroupedViewWidget } from "./GroupedViewWidget";

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

      {/* Main content - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        {rd
          .journey(generatedReport)
          .wait(
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading report data...</p>
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
            <div className="h-full w-full">
              <GroupedViewWidget report={report} services={props.services} />
            </div>
          ))}
      </div>
    </div>
  );
}
