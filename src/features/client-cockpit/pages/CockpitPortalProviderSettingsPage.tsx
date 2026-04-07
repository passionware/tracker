import { WithFrontServices } from "@/core/frontServices.ts";
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
import { ClientLogoField } from "@/features/clients/ClientLogoField.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import {
  pickMainTrackerWorkspaceDisplayName,
  pickMainTrackerWorkspaceLogoUrl,
} from "../cockpitReportBranding.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { ArrowLeft, Briefcase, Copy, Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PortalSettingsAccessDenied,
  PortalSettingsPageSkeleton,
  usePortalTenantSources,
} from "./cockpitPortalSettingsShared";

type ProviderBrandingFormValues = {
  providerName: string;
  providerLogoUrl: string | null;
};

export function CockpitPortalProviderSettingsPage(props: WithFrontServices) {
  const {
    tenantId,
    isAdmin,
    tenantRd,
    clientId,
    mainWorkspacesRd,
    handleBack,
  } = usePortalTenantSources(props);

  const form = useForm<ProviderBrandingFormValues>({
    defaultValues: { providerName: "", providerLogoUrl: null },
  });

  const tenant = rd.tryGet(tenantRd);
  const syncKey =
    tenant == null
      ? ""
      : [
          tenant.id,
          tenant.updatedAt,
          tenant.workspaceName ?? "",
          tenant.workspaceLogoUrl ?? "",
        ].join("\u0001");

  React.useEffect(() => {
    if (!syncKey) return;
    const t = rd.tryGet(tenantRd);
    if (!t) return;
    form.reset({
      providerName: t.workspaceName ?? "",
      providerLogoUrl: t.workspaceLogoUrl ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const processing = promiseState.useRemoteData<void>();

  const copyName = () => {
    const workspaces = rd.tryGet(mainWorkspacesRd);
    if (!workspaces?.length) {
      toast.error(
        "No linked workspaces in the main tracker for this client, or data is still loading.",
      );
      return;
    }
    const name = pickMainTrackerWorkspaceDisplayName(workspaces);
    if (!name) {
      toast.error("Could not resolve a workspace name in the main tracker.");
      return;
    }
    form.setValue("providerName", name, { shouldDirty: true });
    toast.success("Copied provider name from main tracker.");
  };

  const copyLogo = () => {
    const workspaces = rd.tryGet(mainWorkspacesRd);
    if (!workspaces?.length) {
      toast.error(
        "No linked workspaces in the main tracker for this client, or data is still loading.",
      );
      return;
    }
    const url = pickMainTrackerWorkspaceLogoUrl(workspaces);
    if (!url) {
      toast.error("No workspace logo is set in the main tracker.");
      return;
    }
    form.setValue("providerLogoUrl", url, { shouldDirty: true });
    toast.success("Copied provider logo from main tracker.");
  };

  async function onSubmit(data: ProviderBrandingFormValues) {
    if (!tenantId) return;
    await processing.track(
      props.services.cockpitTenantService
        .updateTenantSettings(tenantId, {
          workspaceName: data.providerName.trim() || null,
          workspaceLogoUrl: data.providerLogoUrl,
        })
        .then(() => {
          toast.success("Provider settings saved.");
          form.reset(data);
        }),
    );
  }

  if (!isAdmin) {
    return <PortalSettingsAccessDenied onBack={handleBack} />;
  }

  return rd
    .journey(tenantRd)
    .wait(<PortalSettingsPageSkeleton />)
    .catch((e) => (
      <div className="p-6">
        <ErrorMessageRenderer error={e} />
      </div>
    ))
    .map(() => (
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <header className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Provider</h1>
          <p className="text-sm text-muted-foreground">
            Report issuer: name and logo in the left column of emails and on
            PDF covers. Leave name empty to use "Passionware" in previews.
          </p>
        </header>

        <SurfaceCard className="space-y-4">
          <PanelSectionLabel icon={Briefcase}>Provider</PanelSectionLabel>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder="e.g. Passionware"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      onClick={copyName}
                      disabled={
                        clientId == null || rd.isPending(mainWorkspacesRd)
                      }
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy from main tracker
                    </Button>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="providerLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider logo</FormLabel>
                    <FormControl>
                      <ClientLogoField
                        value={field.value}
                        onChange={field.onChange}
                        title="Provider logo"
                        description="Agency or team mark — PNG, JPG, or SVG."
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      onClick={copyLogo}
                      disabled={
                        clientId == null || rd.isPending(mainWorkspacesRd)
                      }
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy from main tracker
                    </Button>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={!form.formState.isDirty}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.formState.isDirty || rd.isPending(processing.state)
                  }
                >
                  {rd.isPending(processing.state) ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </SurfaceCard>
      </div>
    ));
}
