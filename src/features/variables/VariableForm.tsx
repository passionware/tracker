import { VariablePayload } from "@/api/variable/variable.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ClientPicker } from "@/features/_common/inline-search/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

export interface VariableWidgetFormProps
  extends WithServices<
    [WithClientService, WithContractorService, WithWorkspaceService]
  > {
  defaultValues?: Partial<VariablePayload>;
  onSubmit: (
    data: VariablePayload,
    changedFields: Partial<VariablePayload>,
  ) => Promise<void> | void;
  onCancel: () => void;
}

type FormModel = {
  name: string;
  type: "const" | "expression";
  value: string;
  workspaceId: number | null;
  clientId: number | null;
  contractorId: number | null;
};

export function VariableForm(props: VariableWidgetFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      name: props.defaultValues?.name ?? "",
      type: props.defaultValues?.type ?? "const",
      value: props.defaultValues?.value ?? "",
      workspaceId: props.defaultValues?.workspaceId ?? null,
      clientId: props.defaultValues?.clientId ?? null,
      contractorId: props.defaultValues?.contractorId ?? null,
    },
  });

  const processingPromise = promiseState.useRemoteData();

  function handleSubmit(data: FormModel) {
    const transformedData: VariablePayload = {
      name: data.name,
      type: data.type,
      value: data.value,
      workspaceId: data.workspaceId,
      clientId: data.clientId,
      contractorId: data.contractorId,
    };

    void processingPromise.track(
      props.onSubmit(transformedData, getDirtyFields(transformedData, form)) ??
        Promise.resolve(),
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
                  services={props.services}
                  value={field.value}
                  onSelect={field.onChange}
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
                  services={props.services}
                  value={field.value}
                  onSelect={field.onChange}
                />
              </FormControl>
              <FormDescription>Select client</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contractorId"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Contractor</FormLabel>
              <FormControl>
                <ContractorPicker
                  allowClear
                  services={props.services}
                  value={field.value}
                  onSelect={field.onChange}
                />
              </FormControl>
              <FormDescription>Select contractor</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          rules={{ required: "Name is required" }}
          render={({ field }) => (
            <FormItem className="">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter variable name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          rules={{ required: "Type is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex space-x-4"
                >
                  <RadioGroupItem value="const" id="const" />
                  <FormLabel htmlFor="const">Constant</FormLabel>
                  <RadioGroupItem value="expression" id="expression" />
                  <FormLabel htmlFor="expression">Expression</FormLabel>
                </RadioGroup>
              </FormControl>
              <FormDescription>Select variable type</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value"
          rules={{ required: "Value is required" }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormDescription>Enter variable value</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {rd
            .fullJourney(processingPromise.state)
            .initially(null)
            .wait(<LoaderCircle className="w-5 animate-spin" />)
            .catch(() => <span>Error</span>)
            .map(() => (
              <CheckCircle2 />
            ))}
          Submit
        </Button>
      </form>
    </Form>
  );
}
