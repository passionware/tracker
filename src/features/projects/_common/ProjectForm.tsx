import { ProjectPayload } from "@/api/project/project.api.ts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { WorkspaceArrayPicker } from "@/features/_common/elements/pickers/WorkspaceArrayPicker";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, Loader2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

export interface ProjectFormProps
  extends WithServices<[WithClientService, WithWorkspaceService]> {
  defaultValues?: Partial<ProjectPayload>;
  onSubmit: (
    data: ProjectPayload,
    changes: Partial<ProjectPayload>,
  ) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
  /**
   * Matches entity drawer stack pattern used by `ClientForm` / `WorkspaceForm` (`bulkCostDrawer`).
   */
  layout?: "default" | "bulkCostDrawer";
}

type FormModel = {
  name: string;
  status: "draft" | "active" | "closed";
  description: string;
  clientId: number | null;
  workspaceIds: number[];
};

export function ProjectForm(props: ProjectFormProps) {
  const layout = props.layout ?? "default";
  const isBulk = layout === "bulkCostDrawer";
  const form = useForm<FormModel>({
    defaultValues: {
      name: props.defaultValues?.name ?? "",
      status: props.defaultValues?.status ?? "draft",
      description: props.defaultValues?.description ?? "",
      clientId: props.defaultValues?.clientId ?? null,
      workspaceIds: props.defaultValues?.workspaceIds ?? [],
    },
  });

  const processingPromise = promiseState.useRemoteData<void>();

  function handleSubmit(data: FormModel) {
    const allData: ProjectPayload = {
      name: data.name,
      status: data.status,
      description: data.description || null,
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceIds: maybe.getOrThrow(
        maybe.fromArray(data.workspaceIds),
        "At least one workspace is required",
      ),
    };
    void processingPromise.track(
      props.onSubmit(allData, getDirtyFields(allData, form)),
    );
  }

  const workspaceField = (
    <FormField
      control={form.control}
      name="workspaceIds"
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Workspace
          </FormLabel>
          <FormControl>
            <WorkspaceArrayPicker
              value={field.value}
              onSelect={field.onChange}
              services={props.services}
            />
          </FormControl>
          <FormDescription>Select workspace</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const clientField = (
    <FormField
      control={form.control}
      name="clientId"
      render={({ field }) => (
        <FormItem className={cn(isBulk && "col-span-2 sm:col-span-1")}>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Client
          </FormLabel>
          <FormControl>
            <ClientPicker
              value={field.value}
              onSelect={field.onChange}
              services={props.services}
            />
          </FormControl>
          <FormDescription>Select client</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const nameField = (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Project Name
          </FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>Enter project name</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const statusField = (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Status
          </FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const descriptionField = (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem className="col-span-2">
          <FormLabel className={cn(isBulk && "text-sm font-medium")}>
            Description
          </FormLabel>
          <FormControl>
            <Textarea {...field} />
          </FormControl>
          <FormDescription>Enter description</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const fields = (
    <>
      {workspaceField}
      {clientField}
      {nameField}
      {statusField}
      {descriptionField}
    </>
  );

  const submitLabel =
    props.mode === "create"
      ? "Submit"
      : isBulk
        ? "Save"
        : "Submit";

  const submitIcon = isBulk ? (
    rd.isPending(processingPromise.state) ? (
      <Loader2 className="size-4 animate-spin" />
    ) : null
  ) : (
    rd
      .fullJourney(processingPromise.state)
      .initially(null)
      .wait(<LoaderCircle className="w-5 animate-spin" />)
      .catch(renderSmallError("size-6"))
      .map(() => <CheckCircle2 />)
  );

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      {props.mode === "edit" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={
          rd.isPending(processingPromise.state) || !form.formState.isDirty
        }
      >
        {submitIcon}
        {submitLabel}
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
        className="grid min-w-[20rem] grid-cols-2 gap-4"
      >
        {fields}
        {props.mode === "create" && (
          <Button type="button" variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
        )}
        {props.mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            rd.isPending(processingPromise.state) || !form.formState.isDirty
          }
        >
          {submitIcon}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
