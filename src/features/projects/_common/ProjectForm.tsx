import { ProjectPayload } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
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
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
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
}

type FormModel = {
  name: string;
  status: "draft" | "active" | "closed";
  description: string;
  clientId: number | null;
  workspaceId: number | null;
};

export function ProjectForm(props: ProjectFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      name: props.defaultValues?.name ?? "",
      status: props.defaultValues?.status ?? "draft",
      description: props.defaultValues?.description ?? "",
      clientId: props.defaultValues?.clientId ?? null,
      workspaceId: props.defaultValues?.workspaceId ?? null,
    },
  });

  const processingPromise = promiseState.useRemoteData<void>();

  function handleSubmit(data: FormModel) {
    const allData: ProjectPayload = {
      name: data.name,
      status: data.status,
      description: data.description || null,
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceId: maybe.getOrThrow(data.workspaceId, "Workspace is required"),
    };
    void processingPromise.track(
      props.onSubmit(allData, getDirtyFields(allData, form)),
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-2 gap-4 min-w-[20rem]"
      >
        <FormField
          control={form.control}
          name="workspaceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace</FormLabel>
              <FormControl>
                <WorkspacePicker
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
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter project name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormDescription>Enter description</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {props.mode === "create" && (
          <Button type="button" variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
        )}
        {props.mode === "edit" && (
          <Button type="button" variant="outline" onClick={()=>form.reset({})}>
            Reset
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            rd.isPending(processingPromise.state) || !form.formState.isDirty
          }
        >
          {rd
            .fullJourney(processingPromise.state)
            .initially(null)
            .wait(<LoaderCircle className="w-5 animate-spin" />)
            .catch(renderSmallError("size-6"))
            .map(() => (
              <CheckCircle2 />
            ))}
          Submit
        </Button>
      </form>
    </Form>
  );
}
