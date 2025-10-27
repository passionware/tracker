import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import { Button } from "@/components/ui/button.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { LogIn, Share2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface PublishToCockpitButtonProps {
  services: WithFrontServices["services"];
  serializableConfig: any;
  report: GeneratedReportSource;
  projectId: number;
  clientId: number;
  disabled?: boolean;
}

export function PublishToCockpitButton({
  services,
  serializableConfig,
  report,
  clientId,
  disabled = false,
}: PublishToCockpitButtonProps) {
  // Get cockpit auth info at the top level (hooks must be called at component level)
  const cockpitAuthState = services.cockpitAuthService.useAuth();

  // Get client and project iteration details for better naming
  const clientData = services.clientService.useClient(clientId);
  const projectIterationData =
    services.projectIterationService.useProjectIterationDetail(
      report.projectIterationId,
    );

  const publishMutation = promiseState.useMutation(async () => {
    if (!serializableConfig) {
      throw new Error("No configuration available to publish");
    }

    // Get tenant ID from CockpitAuthService
    const cockpitAuthInfo = rd.tryGet(cockpitAuthState);
    if (!cockpitAuthInfo) {
      throw new Error("Cockpit authentication required");
    }

    const tenantId = cockpitAuthInfo.tenantId;

    // Generate better report name using client and project iteration data
    const generateReportName = () => {
      const clientName =
        rd.tryMap(clientData, (client) => client.name) || `Client ${clientId}`;
      const iterationName =
        rd.tryMap(
          projectIterationData,
          (iteration) => iteration.ordinalNumber,
        ) || `Iteration ${report.projectIterationId}`;

      return `${clientName} - Project - ${iterationName}`;
    };

    await services.clientCubeReportService.publishReport({
      tenantId,
      userId: cockpitAuthInfo.id, // Use cockpit auth user ID, not main app auth ID
      clientId, // Pass the client ID for validation
      name: generateReportName(),
      description: `Exported cube data from project iteration ${report.projectIterationId} on ${new Date().toLocaleDateString()}`,
      cubeData: { data: serializableConfig.data } as Record<string, unknown>,
      cubeConfig: serializableConfig.config as Record<string, unknown>,
    });

    // Show success toast with link to cockpit
    const cockpitUrl = services.routingService
      .forClientCockpit()
      .forClient(tenantId)
      .reports();

    toast.success(
      <div className="flex flex-col gap-2">
        <div className="font-semibold">Report published to Client Cockpit!</div>
        <a
          href={cockpitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          Open in Client Cockpit →
        </a>
      </div>,
      {
        duration: 5000,
      },
    );

    return tenantId;
  });

  const handlePublishToCockpit = useCallback(() => {
    publishMutation.track(void 0).catch((error: any) => {
      console.error("Error publishing report:", error);

      // Extract detailed error information
      let errorMessage = "Failed to publish report to cockpit";
      let errorDetails = "";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Check for Supabase/PostgreSQL specific errors
      if (error?.code) {
        errorDetails = `Error Code: ${error.code}`;
      }

      if (error?.details) {
        errorDetails += errorDetails
          ? ` | Details: ${error.details}`
          : `Details: ${error.details}`;
      }

      if (error?.hint) {
        errorDetails += errorDetails
          ? ` | Hint: ${error.hint}`
          : `Hint: ${error.hint}`;
      }

      // Add context information if available
      if (error?.context) {
        const context = error.context;
        errorDetails += errorDetails
          ? ` | Context: Tenant=${context.tenantId}, Client=${context.clientId}`
          : `Context: Tenant=${context.tenantId}, Client=${context.clientId}`;
      }

      // Show detailed error toast
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">{errorMessage}</div>
          {errorDetails && (
            <div className="text-sm text-gray-600">{errorDetails}</div>
          )}
        </div>,
        {
          duration: 8000, // Show longer for detailed errors
        },
      );
    });
  }, [publishMutation]);

  const handleLoginToExport = useCallback(() => {
    // Navigate to cockpit login
    window.open("/c/login", "_blank");
  }, []);

  return rd
    .journey(cockpitAuthState)
    .wait(
      <Button
        variant="outline"
        onClick={handleLoginToExport}
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        Login to Publish
      </Button>,
    )
    .catch(() => (
      <Button
        variant="outline"
        onClick={handleLoginToExport}
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        Login to Publish
      </Button>
    ))
    .map(() => (
      <Button
        variant="outline"
        onClick={handlePublishToCockpit}
        disabled={
          disabled ||
          !serializableConfig ||
          mt.isInProgress(publishMutation.state)
        }
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        {mt.isInProgress(publishMutation.state)
          ? "Publishing..."
          : "Publish to Client"}
      </Button>
    ));
}
