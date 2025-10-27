import { WithFrontServices } from "@/core/frontServices.ts";
import { maybe, rd } from "@passionware/monads";
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

  const report = props.services.clientCubeReportService.useCubeReport(
    maybe.getOrNull(reportId),
  );

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

  const handlePdfExport = () => {
    if (tenantId && reportId) {
      navigate(
        props.services.routingService
          .forClientCockpit()
          .forClient(tenantId)
          .forReport(reportId)
          .pdfExportBuilder(),
      );
    }
  };

  return rd
    .journey(report)
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
    .map((report) => {
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
          showJsonView={rd.tryGet(authState)?.role === "admin"}
          showPdfView
          onPdfExport={handlePdfExport}
        />
      );
    });
}
