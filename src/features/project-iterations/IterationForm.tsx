import { ProjectIterationPayload } from "@/api/project-iteration/project-iteration.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
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
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { CalendarDate } from "@internationalized/date";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

export interface ProjectIterationFormProps {
  /** budgetTriggerAmount is form-only (not part of iteration payload); used for "update trigger" log. */
  defaultValues?: Partial<ProjectIterationPayload> & {
    budgetTriggerAmount?: number | null;
  };
  /**
   * When set (create mode), shows a project select. Omit when `defaultValues.projectId` is fixed.
   */
  projectChoices?: ReadonlyArray<{ id: number; label: string }>;
  /** Called when the user picks a project (create + `projectChoices`). */
  onProjectIdChange?: (projectId: number) => void;
  /** Sync suggested ordinal when the parent loads iterations for the selected project (create). */
  hintOrdinalNumber?: number;
  /** Sync suggested budget target from the previous iteration (create). */
  hintBudgetTriggerAmount?: number | null;
  onSubmit: (
    data: ProjectIterationPayload,
    changes: Partial<ProjectIterationPayload>,
    extra?: { budgetTriggerAmount: number | null },
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
  budgetTriggerAmount: string;
};

export function ProjectIterationForm(props: ProjectIterationFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      periodStart:
        props.defaultValues?.periodStart ?? dateToCalendarDate(new Date()),
      periodEnd:
        props.defaultValues?.periodEnd ?? dateToCalendarDate(new Date()),
      status: props.defaultValues?.status ?? "draft",
      description: props.defaultValues?.description ?? "",
      projectId: props.defaultValues?.projectId ?? 0,
      ordinalNumber: props.defaultValues?.ordinalNumber ?? 0,
      currency: props.defaultValues?.currency ?? "eur",
      budgetTriggerAmount:
        props.defaultValues?.budgetTriggerAmount != null
          ? String(props.defaultValues.budgetTriggerAmount)
          : "",
    },
  });

  const { setValue } = form;

  const processingPromise = promiseState.useRemoteData<void>();

  useEffect(() => {
    if (props.mode !== "create" || props.hintOrdinalNumber == null) return;
    setValue("ordinalNumber", props.hintOrdinalNumber);
  }, [props.hintOrdinalNumber, props.mode, setValue]);

  useEffect(() => {
    if (props.mode !== "create") return;
    if (props.hintBudgetTriggerAmount === undefined) return;
    setValue(
      "budgetTriggerAmount",
      props.hintBudgetTriggerAmount != null
        ? String(props.hintBudgetTriggerAmount)
        : "",
    );
  }, [props.hintBudgetTriggerAmount, props.mode, setValue]);

  const projectChoicesForPicker =
    props.mode === "create" &&
    props.projectChoices &&
    props.projectChoices.length > 0
      ? props.projectChoices
      : null;

  function handleSubmit(data: FormModel) {
    const rawBudget =
      props.mode === "create"
        ? data.budgetTriggerAmount.trim() === ""
          ? null
          : Number(data.budgetTriggerAmount)
        : null;
    if (
      props.mode === "create" &&
      rawBudget !== null &&
      (Number.isNaN(rawBudget) || rawBudget < 0)
    ) {
      form.setError("budgetTriggerAmount", {
        message: "Budget target must be a non-negative number",
      });
      return;
    }
    const allData: ProjectIterationPayload = {
      ordinalNumber: data.ordinalNumber || 1,
      periodStart: maybe.getOrThrow(
        data.periodStart,
        "Period start is required",
      ),
      periodEnd: maybe.getOrThrow(data.periodEnd, "Period end is required"),
      status: data.status,
      description: data.description || null,
      projectId: maybe.getOrThrow(data.projectId, "Project is required"),
      currency: data.currency,
    };
    const extra =
      props.mode === "create"
        ? { budgetTriggerAmount: rawBudget ?? null }
        : undefined;
    void processingPromise.track(
      props.onSubmit(allData, getDirtyFields(allData, form), extra),
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-2 gap-4 min-w-[20rem]"
      >
        {projectChoicesForPicker && (
            <FormField
              control={form.control}
              name="projectId"
              rules={{
                validate: (v) =>
                  typeof v === "number" && v > 0 ? true : "Select a project",
              }}
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(v) => {
                        const id = Number(v);
                        field.onChange(id);
                        props.onProjectIdChange?.(id);
                      }}
                      value={field.value > 0 ? String(field.value) : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectChoicesForPicker.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Choose which project this iteration belongs to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        <FormField
          control={form.control}
          name="periodStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period Start</FormLabel>
              <FormControl>
                <DatePicker
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
                <DatePicker
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
          name="ordinalNumber"
          rules={{
            required: "Iteration number is required",
            min: {
              value: 1,
              message: "Iteration must be at least 1",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Iteration</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={1}
                  step={1}
                  onChange={(event) =>
                    field.onChange(Number(event.currentTarget.value))
                  }
                />
              </FormControl>
              <FormDescription>
                Set the ordinal number for this iteration
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {props.mode === "create" && (
          <FormField
            control={form.control}
            name="budgetTriggerAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget target (billing target)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Optional"
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Billing budget target for this iteration (in iteration
                  currency). Update from dashboard or iteration detail after
                  create if needed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
            rd.isPending(processingPromise.state) ||
            (props.mode !== "create" && !form.formState.isDirty)
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
