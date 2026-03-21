import type { WorkspaceUpdatePayload } from "@/api/mutation/mutation.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { DrawerFooter } from "@/components/ui/drawer.tsx";
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
import { cn } from "@/lib/utils.ts";
import { promiseState } from "@passionware/platform-react";
import { rd } from "@passionware/monads";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

export interface WorkspaceFormValues {
  name: string;
  slug: string;
  avatarUrl: string | null;
}

export interface WorkspaceFormProps {
  workspaceId: number;
  defaultValues: Pick<WorkspaceFormValues, "name" | "slug" | "avatarUrl">;
  onCancel: () => void;
  onSubmit: (
    workspaceId: number,
    payload: WorkspaceUpdatePayload,
  ) => Promise<void>;
  /**
   * Matches entity drawer stack pattern used by `ClientForm` (`bulkCostDrawer`).
   */
  layout?: "default" | "bulkCostDrawer";
}

export function WorkspaceForm(props: WorkspaceFormProps) {
  const layout = props.layout ?? "default";
  const isBulk = layout === "bulkCostDrawer";
  const processing = promiseState.useRemoteData<void>();

  const form = useForm<WorkspaceFormValues>({
    defaultValues: {
      name: props.defaultValues.name,
      slug: props.defaultValues.slug,
      avatarUrl: props.defaultValues.avatarUrl,
    },
  });

  async function handleSubmit(data: WorkspaceFormValues) {
    const name = data.name.trim();
    const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) {
      form.setError("name", { message: "Name is required" });
      return;
    }
    if (!slug) {
      form.setError("slug", { message: "Slug is required" });
      return;
    }
    await processing.track(
      props.onSubmit(props.workspaceId, {
        name,
        slug,
        avatarUrl: data.avatarUrl,
      }),
    );
  }

  const fields = (
    <>
      <FormField
        control={form.control}
        name="name"
        rules={{ required: "Name is required" }}
        render={({ field }) => (
          <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
            <FormLabel className={cn(isBulk && "text-sm font-medium")}>
              Name
            </FormLabel>
            <FormControl>
              <Input {...field} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        rules={{ required: "Slug is required" }}
        render={({ field }) => (
          <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
            <FormLabel className={cn(isBulk && "text-sm font-medium")}>
              Slug
            </FormLabel>
            <FormControl>
              <Input {...field} autoComplete="off" className="font-mono text-sm" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="avatarUrl"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormControl>
              <ClientLogoField
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={rd.isPending(processing.state)}>
        {rd.isPending(processing.state) ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        Save
      </Button>
    </div>
  );

  if (isBulk) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid min-w-[20rem] grid-cols-1 gap-4 sm:grid-cols-2">
              {fields}
            </div>
          </div>
          <DrawerFooter className="shrink-0 border-t border-border">
            {actions}
          </DrawerFooter>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex min-w-[20rem] max-w-md flex-col gap-4"
      >
        {fields}
        <div className="flex justify-end gap-2 pt-2">{actions}</div>
      </form>
    </Form>
  );
}
