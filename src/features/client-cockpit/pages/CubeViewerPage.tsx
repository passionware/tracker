import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { useParams, useNavigate } from "react-router-dom";
import { CubeViewer } from "@/features/public/CubeViewer.tsx";

export function CubeViewerPage(props: WithFrontServices) {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.tryMap(authState, (auth) => auth.tenantId);

  const reports =
    props.services.clientCubeReportService.useCubeReports(tenantId);

  const handleBack = () => {
    if (tenantId) {
      navigate(
        props.services.routingService
          .forClientCockpit()
          .forClient(tenantId)
          .reports(),
      );
    }
  };

  return rd
    .journey(reports)
    .wait(
      <div className="h-full p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>,
    )
    .catch((error) => (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <ErrorMessageRenderer error={error} />
      </div>
    ))
    .map((reportsList) => {
      const report = reportsList.find((r) => r.id === reportId);
      if (!report) {
        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Report Not Found
              </h3>
              <p className="text-gray-600 mb-4">
                The requested report could not be found.
              </p>
              <Button onClick={handleBack}>Back to Reports</Button>
            </div>
          </div>
        );
      }

      // Create serialized cube configuration
      const serializedConfig = {
        config: report.cube_config,
        data: report.cube_data.data,
      };

      return (
        <CubeViewer
          serializedConfig={serializedConfig}
          title={report.name}
          onBack={handleBack}
          showBackButton
          showJsonView={false}
          showPdfView
        />
      );
    });
}
