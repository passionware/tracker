import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { generateSmartReportName } from "@/features/project-iterations/widgets/reportNameUtils.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { LogIn, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
  const clientName =
    rd.tryMap(clientData, (client) => client.name) || `Client ${clientId}`;

  const defaultPublishValues = useMemo(() => {
    return {
      name: generateSmartReportName({
        clientName,
        report,
        fallback: `${clientName} - Project - ${
          rd.tryMap(
            projectIterationData,
            (iteration) => iteration.ordinalNumber,
          ) || `Iteration ${report.projectIterationId}`
        }`,
      }),
      description: `Exported cube data from project iteration ${report.projectIterationId} on ${new Date().toLocaleDateString()}`,
    };
  }, [
    clientName,
    projectIterationData,
    report,
    report.projectIterationId,
  ]);

  const publishMutation = promiseState.useMutation(
    async ({ name, description }: PublishFormValues) => {
      if (!serializableConfig) {
        throw new Error("No configuration available to publish");
      }

      // Get tenant ID from CockpitAuthService
      const cockpitAuthInfo = rd.tryGet(cockpitAuthState);
      if (!cockpitAuthInfo) {
        throw new Error("Cockpit authentication required");
      }

      const tenantId = cockpitAuthInfo.tenantId;

      await services.clientCubeReportService.publishReport({
        tenantId,
        userId: cockpitAuthInfo.id, // Use cockpit auth user ID, not main app auth ID
        clientId, // Pass the client ID for validation
        name,
        description,
        cubeData: { data: serializableConfig.data } as Record<
          string,
          unknown
        >,
        cubeConfig: serializableConfig.config as Record<string, unknown>,
      });

      // Show success toast with link to cockpit
      const cockpitUrl = services.routingService
        .forClientCockpit()
        .forClient(tenantId)
        .reports();

      toast.success(
        <div className="flex flex-col gap-2">
          <div className="font-semibold">
            Report published to Client Cockpit!
          </div>
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
    },
  );

  const showPublishError = useCallback((error: any) => {
    console.error("Error publishing report:", error);

    let errorMessage = "Failed to publish report to cockpit";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

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

    if (error?.context) {
      const context = error.context;
      errorDetails += errorDetails
        ? ` | Context: Tenant=${context.tenantId}, Client=${context.clientId}`
        : `Context: Tenant=${context.tenantId}, Client=${context.clientId}`;
    }

    toast.error(
      <div className="flex flex-col gap-1">
        <div className="font-semibold">{errorMessage}</div>
        {errorDetails && (
          <div className="text-sm text-gray-600">{errorDetails}</div>
        )}
      </div>,
      {
        duration: 8000,
      },
    );
  }, []);

  const handlePublishSubmit = useCallback(
    async (values: PublishFormValues) => {
      try {
        await publishMutation.track(values);
        return true;
      } catch (error) {
        showPublishError(error);
        return false;
      }
    },
    [publishMutation, showPublishError],
  );

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
      <InlinePopoverForm
        trigger={
          <Button
            variant="outline"
            disabled={
              disabled ||
              !serializableConfig ||
              mt.isInProgress(publishMutation.state)
            }
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Publish to Client
          </Button>
        }
        content={({ close }) =>
          serializableConfig ? (
            <>
              <PopoverHeader>Publish to Client</PopoverHeader>
              <PublishReportForm
                defaultValues={defaultPublishValues}
                submitting={mt.isInProgress(publishMutation.state)}
                onCancel={close}
                onSubmit={async (formValues) => {
                  const success = await handlePublishSubmit(formValues);
                  if (success) {
                    close();
                  }
                }}
              />
            </>
          ) : (
            <div className="p-4 text-sm text-slate-600">
              Configure the export before publishing.
            </div>
          )
        }
      />
    ));
}

type PublishFormValues = {
  name: string;
  description: string;
};

interface PublishReportFormProps {
  defaultValues: PublishFormValues;
  onSubmit: (values: PublishFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

function PublishReportForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting,
}: PublishReportFormProps) {
  const form = useForm<PublishFormValues>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = (values: PublishFormValues) => onSubmit(values);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 w-[360px]"
      >
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Report name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Report Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Client - Project - Iteration" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          rules={{ required: "Description is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe the cube export"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
