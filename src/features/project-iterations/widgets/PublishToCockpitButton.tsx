import { Button } from "@/components/ui/button.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { rd, mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Share2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useCallback } from "react";

interface PublishToCockpitButtonProps {
  services: WithFrontServices["services"];
  serializableConfig: any;
  report: any;
  projectId: number;
  disabled?: boolean;
}

export function PublishToCockpitButton({
  services,
  serializableConfig,
  report,
  projectId,
  disabled = false,
}: PublishToCockpitButtonProps) {
  // Get auth info at the top level (hooks must be called at component level)
  const authState = services.authService.useAuth();
  const cockpitAuthState = services.cockpitAuthService.useAuth();

  const publishMutation = promiseState.useMutation(async () => {
    if (!serializableConfig) {
      throw new Error("No configuration available to publish");
    }

    // Get current user info from the state we read at component level
    const authInfo = rd.tryGet(authState);
    if (!authInfo) {
      throw new Error("You must be logged in to publish reports");
    }

    // Get tenant ID from CockpitAuthService
    const cockpitAuthInfo = rd.tryGet(cockpitAuthState);
    if (!cockpitAuthInfo) {
      throw new Error("Cockpit authentication required");
    }

    const tenantId = cockpitAuthInfo.tenantId;

    await services.clientCubeReportService.publishReport({
      tenantId,
      userId: authInfo.id,
      name: `Cube Export - Project ${projectId} - ${new Date().toLocaleDateString()}`,
      description: `Exported cube data from project iteration ${report.projectIterationId} on ${new Date().toLocaleDateString()}`,
      cubeData: serializableConfig.data as unknown as Record<string, unknown>,
      cubeConfig: serializableConfig.config as unknown as Record<
        string,
        unknown
      >,
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
    publishMutation.track(void 0).catch((error: Error) => {
      console.error("Error publishing report:", error);
      toast.error(
        error instanceof Error
          ? `Failed to publish: ${error.message}`
          : "Failed to publish report to cockpit",
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
        disabled={disabled || !serializableConfig}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Publish to Client
      </Button>,
    )
    .catch(() => (
      <Button
        variant="outline"
        onClick={handleLoginToExport}
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        Login to Export
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
