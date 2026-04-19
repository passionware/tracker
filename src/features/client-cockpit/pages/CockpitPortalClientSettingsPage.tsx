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
import { MobileSidebarTrigger } from "@/features/_common/MobileSidebarTrigger.tsx";
import { PanelSectionLabel } from "@/features/_common/patterns/PanelSectionLabel.tsx";
import { SurfaceCard } from "@/features/_common/patterns/SurfaceCard.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { ArrowLeft, Building2, Copy, Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PortalSettingsAccessDenied,
  PortalSettingsPageSkeleton,
  usePortalTenantSources,
} from "./cockpitPortalSettingsShared";

type ClientBrandingFormValues = {
  clientName: string;
  clientLogoUrl: string | null;
};

export function CockpitPortalClientSettingsPage(props: WithFrontServices) {
  const {
    tenantId,
    isAdmin,
    tenantRd,
    clientId,
    mainClientRd,
    handleBack,
  } = usePortalTenantSources(props);

  const form = useForm<ClientBrandingFormValues>({
    defaultValues: { clientName: "", clientLogoUrl: null },
  });

  const tenant = rd.tryGet(tenantRd);
  const syncKey =
    tenant == null
      ? ""
      : [tenant.id, tenant.updatedAt, tenant.name, tenant.clientLogoUrl ?? ""].join(
          "\u0001",
        );

  React.useEffect(() => {
    if (!syncKey) return;
    const t = rd.tryGet(tenantRd);
    if (!t) return;
    form.reset({
      clientName: t.name,
      clientLogoUrl: t.clientLogoUrl ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const processing = promiseState.useRemoteData<void>();

  const copyName = () => {
    const client = rd.tryGet(mainClientRd);
    const name = client?.name?.trim();
    if (!name) {
      toast.error(
        "No client name in the main tracker, or client data is still loading.",
      );
      return;
    }
    form.setValue("clientName", name, { shouldDirty: true });
    toast.success("Copied client name from main tracker.");
  };

  const copyLogo = () => {
    const client = rd.tryGet(mainClientRd);
    const url = client?.avatarUrl?.trim();
    if (!url) {
      toast.error(
        "No client logo in the main tracker, or client data is still loading.",
      );
      return;
    }
    form.setValue("clientLogoUrl", url, { shouldDirty: true });
    toast.success("Copied client logo from main tracker.");
  };

  async function onSubmit(data: ClientBrandingFormValues) {
    if (!tenantId) return;
    const trimmed = data.clientName.trim();
    if (!trimmed) {
      form.setError("clientName", { message: "Client name is required" });
      return;
    }
    await processing.track(
      props.services.cockpitTenantService
        .updateTenantSettings(tenantId, {
          name: trimmed,
          clientLogoUrl: data.clientLogoUrl,
        })
        .then(() => {
          toast.success("Client settings saved.");
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
          <MobileSidebarTrigger />
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <header className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Client</h1>
          <p className="text-sm text-muted-foreground">
            Name and logo for the organization using this portal (cockpit
            chrome and the client column in report emails).
          </p>
        </header>

        <SurfaceCard className="space-y-4">
          <PanelSectionLabel icon={Building2}>Client</PanelSectionLabel>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientName"
                rules={{ required: "Client name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="organization"
                        placeholder="e.g. Acme Corp"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      onClick={copyName}
                      disabled={clientId == null || rd.isPending(mainClientRd)}
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
                name="clientLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client logo</FormLabel>
                    <FormControl>
                      <ClientLogoField
                        value={field.value}
                        onChange={field.onChange}
                        title="Client logo"
                        description="Organization mark — PNG, JPG, or SVG."
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-fit"
                      onClick={copyLogo}
                      disabled={clientId == null || rd.isPending(mainClientRd)}
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
