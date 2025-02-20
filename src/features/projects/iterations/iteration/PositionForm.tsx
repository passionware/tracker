import { ProjectIterationPositionPayload } from "@/api/project-iteration/project-iteration.api.ts";
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
import { WithFrontServices } from "@/core/frontServices.ts";
import { UnitPicker } from "@/features/_common/elements/pickers/UnitPicker.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

type FormModel = {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  projectIterationId: number;
};

export interface ProjectIterationPositionFormProps extends WithFrontServices {
  defaultValues?: Partial<ProjectIterationPositionPayload>;
  onSubmit: (
    data: ProjectIterationPositionPayload,
    changes: Partial<ProjectIterationPositionPayload>,
  ) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit" | "duplicate";
  currency: string;
}

export function ProjectIterationPositionForm(
  props: ProjectIterationPositionFormProps,
) {
  const form = useForm<FormModel>({
    defaultValues: {
      description: props.defaultValues?.description ?? "",
      quantity: props.defaultValues?.quantity ?? 1,
      unitPrice: props.defaultValues?.unitPrice ?? 0,
      unit: props.defaultValues?.unit ?? "h",
      projectIterationId: props.defaultValues?.projectIterationId,
    },
  });

  const processingPromise = promiseState.useRemoteData<void>();

  function handleSubmit(data: FormModel) {
    void processingPromise.track(
      props.onSubmit(data, getDirtyFields(data, form)),
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-3 gap-4 min-w-[20rem]"
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-3">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <UnitPicker value={field.value} onSelect={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unitPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <FormControl>
                <Input type="number" step={0.01} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="self-center text-right">
          <span className="font-mono text-slate-500">∑&nbsp;</span>
          {props.services.formatService.financial.amount(
            form.watch("quantity") * form.watch("unitPrice"),
            props.currency,
          )}
        </div>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
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
