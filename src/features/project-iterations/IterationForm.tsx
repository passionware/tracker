import { ProjectIterationPayload } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker2 } from "@/components/ui/date-picker-2.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { CalendarDate } from "@internationalized/date";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

export interface ProjectIterationFormProps {
  defaultValues?: Partial<ProjectIterationPayload>;
  onSubmit: (
    data: ProjectIterationPayload,
    changes: Partial<ProjectIterationPayload>,
  ) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
}

type FormModel = {
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  status: "draft" | "active" | "closed";
  description: string;
  projectId: number;
  ordinalNumber: number;
  currency: string;
};

export function ProjectIterationForm(props: ProjectIterationFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      periodStart: props.defaultValues?.periodStart ?? dateToCalendarDate(new Date()),
      periodEnd: props.defaultValues?.periodEnd ?? dateToCalendarDate(new Date()),
      status: props.defaultValues?.status ?? "draft",
      description: props.defaultValues?.description ?? "",
      projectId: props.defaultValues?.projectId ?? 0,
      ordinalNumber: props.defaultValues?.ordinalNumber ?? 0,
      currency: props.defaultValues?.currency ?? "eur",
    },
  });

  const processingPromise = promiseState.useRemoteData<void>();

  function handleSubmit(data: FormModel) {
    const allData: ProjectIterationPayload = {
      ordinalNumber: 1,
      periodStart: maybe.getOrThrow(data.periodStart, "Period start is required"),
      periodEnd: maybe.getOrThrow(data.periodEnd, "Period end is required"),
      status: data.status,
      description: data.description || null,
      projectId: maybe.getOrThrow(data.projectId, "Project is required"),
      currency: data.currency,
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
          name="periodStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period Start</FormLabel>
              <FormControl>
                <DatePicker2
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                />
              </FormControl>
              <FormDescription>Select start date</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="periodEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period End</FormLabel>
              <FormControl>
                <DatePicker2
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                />
              </FormControl>
              <FormDescription>Select end date</FormDescription>
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
