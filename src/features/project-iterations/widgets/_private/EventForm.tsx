import { ProjectIterationEventPayload } from "@/api/project-iteration/project-iteration.api.ts";
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
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

type FormModel = {
  description: string;
};

export interface EventFormProps extends WithFrontServices {
  defaultValues?: Partial<ProjectIterationEventPayload>;
  onSubmit: (
    data: ProjectIterationEventPayload,
    changes: Partial<ProjectIterationEventPayload>,
  ) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit" | "duplicate";
}

export function EventForm(props: EventFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      description: props.defaultValues?.description ?? "",
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
