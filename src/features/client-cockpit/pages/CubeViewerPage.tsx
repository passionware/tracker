import { WithFrontServices } from "@/core/frontServices.ts";
import { maybe, rd } from "@passionware/monads";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { useParams, useNavigate } from "react-router-dom";
import { CubeViewer } from "@/features/public/CubeViewer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ExternalLink } from "lucide-react";

function getSourceRouteFromCubeData(
  cubeData: Record<string, unknown> | null | undefined,
): string | null {
  if (!cubeData || typeof cubeData !== "object") {
    return null;
  }
  const meta = (cubeData as any).meta;
  const route = meta?.source?.route;
  return typeof route === "string" ? route : null;
}

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

      const dateRangeLabel = props.services.formatService.temporal.range.long(
        report.start_date,
        report.end_date,
      );

      const auth = rd.tryGet(authState);
      const sourceRoute = getSourceRouteFromCubeData(
        report.cube_data as Record<string, unknown>,
      );
      const canOpenOriginal = auth?.role === "admin" && sourceRoute;

      const handleOpenOriginal = () => {
        if (!sourceRoute) {
          return;
        }
        window.open(sourceRoute, "_blank", "noopener,noreferrer");
      };

      const extraActions = canOpenOriginal ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenOriginal}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Original report
        </Button>
      ) : undefined;

      return (
        <CubeViewer
          serializedConfig={serializedConfig}
          title={report.name}
          onBack={handleBack}
          showBackButton
          showJsonView={rd.tryGet(authState)?.role === "admin"}
          showPdfView
          onPdfExport={handlePdfExport}
          dateRangeLabel={dateRangeLabel}
          extraActions={extraActions}
          services={props.services}
        />
      );
    });
}
