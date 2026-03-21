import {
  ClientCreatePayload,
  ClientUpdatePayload,
} from "@/api/mutation/mutation.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { DrawerFooter } from "@/components/ui/drawer.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ClientLogoField } from "@/features/clients/ClientLogoField.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { promiseState } from "@passionware/platform-react";
import { rd } from "@passionware/monads";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

export interface ClientFormValues {
  name: string;
  senderName: string;
  avatarUrl: string | null;
  workspaceId: number | null;
  hidden: boolean;
}

type ClientFormProps = WithServices<[WithWorkspaceService]> & {
  onCancel: () => void;
  defaultValues?: Partial<ClientFormValues>;
  /**
   * Matches `BulkCreateCostDrawer`: scrollable body (`space-y-4` + 2-col grid) and
   * `DrawerFooter` with actions (entity drawer stack only).
   */
  layout?: "default" | "bulkCostDrawer";
} & (
    | {
        mode: "create";
        /** When set, workspace picker is hidden and this id is used on submit. */
        fixedWorkspaceId?: number;
        onSubmit: (payload: ClientCreatePayload) => Promise<void>;
      }
    | {
        mode: "edit";
        clientId: number;
        onSubmit: (
          clientId: number,
          payload: ClientUpdatePayload,
        ) => Promise<void>;
      }
  );

export function ClientForm(props: ClientFormProps) {
  const layout = props.layout ?? "default";
  const isBulk = layout === "bulkCostDrawer";
  const processing = promiseState.useRemoteData<void>();

  const form = useForm<ClientFormValues>({
    defaultValues: {
      name: props.defaultValues?.name ?? "",
      senderName: props.defaultValues?.senderName ?? "",
      avatarUrl: props.defaultValues?.avatarUrl ?? null,
      workspaceId:
        props.mode === "create"
          ? (props.defaultValues?.workspaceId ?? null)
          : null,
      hidden: props.defaultValues?.hidden ?? false,
    },
  });

  async function handleSubmit(data: ClientFormValues) {
    const senderName =
      data.senderName.trim() === "" ? null : data.senderName.trim();

    if (props.mode === "create") {
      const workspaceId =
        props.fixedWorkspaceId ?? data.workspaceId ?? undefined;
      if (workspaceId === undefined || workspaceId === null) {
        form.setError("workspaceId", { message: "Select a workspace" });
        return;
      }
      await processing.track(
        props.onSubmit({
          workspaceId,
          name: data.name.trim(),
          avatarUrl: data.avatarUrl,
          senderName,
        }),
      );
    } else {
      await processing.track(
        props.onSubmit(props.clientId, {
          name: data.name.trim(),
          avatarUrl: data.avatarUrl,
          senderName,
          hidden: data.hidden,
        }),
      );
    }
  }

  const workspaceField =
    props.mode === "create" && props.fixedWorkspaceId === undefined ? (
      <FormField
        control={form.control}
        name="workspaceId"
        rules={{ required: "Workspace is required" }}
        render={({ field }) => (
          <FormItem className={cn(isBulk && "col-span-2")}>
            <FormLabel className={cn(isBulk && "text-sm font-medium")}>
              Workspace
            </FormLabel>
            <FormControl>
              <WorkspacePicker
                value={field.value}
                onSelect={field.onChange}
                services={props.services}
                placeholder="Select workspace"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ) : null;

  const nameField = (
    <FormField
      control={form.control}
      name="name"
      rules={{ required: "Name is required" }}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Client name
          </FormLabel>
          <FormControl>
            <Input {...field} placeholder="Acme Inc." autoComplete="off" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const senderField = (
    <FormField
      control={form.control}
      name="senderName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Bank sender label (optional)
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder="Expected transfer sender name"
              autoComplete="off"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const avatarField = (
    <FormField
      control={form.control}
      name="avatarUrl"
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2")}>
          {isBulk ? (
            <div className="text-sm font-medium mb-1">Logo</div>
          ) : null}
          <FormControl>
            <ClientLogoField value={field.value} onChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const hiddenField =
    props.mode === "edit" ? (
      <FormField
        control={form.control}
        name="hidden"
        render={({ field }) => (
          <FormItem
            className={cn(
              "flex flex-row items-center justify-between rounded-lg border p-4",
              isBulk && "col-span-2",
            )}
          >
            <div className="space-y-1">
              <FormLabel className="text-base">Hide from selectors</FormLabel>
              <FormDescription>
                When enabled, this client does not appear in the client switcher
                or client pickers. You can still open it from Manage clients.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Hide client from selectors"
              />
            </FormControl>
          </FormItem>
        )}
      />
    ) : null;

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={rd.isPending(processing.state)}>
        {rd.isPending(processing.state) ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        {props.mode === "create" ? "Create client" : "Save"}
      </Button>
    </div>
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          isBulk
            ? "flex min-h-0 flex-1 flex-col"
            : "flex flex-col gap-4 min-w-[20rem] max-w-md",
        )}
      >
        {isBulk ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="grid min-w-[20rem] grid-cols-2 gap-4">
                {workspaceField}
                {nameField}
                {senderField}
                {avatarField}
                {hiddenField}
              </div>
            </div>
            <DrawerFooter className="shrink-0 border-t border-border">
              {actions}
            </DrawerFooter>
          </>
        ) : (
          <>
            {workspaceField}
            {nameField}
            {senderField}
            {avatarField}
            {hiddenField}
            <div className="flex justify-end gap-2 pt-2">{actions}</div>
          </>
        )}
      </form>
    </Form>
  );
}
