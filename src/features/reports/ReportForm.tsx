import { ReportPayload } from "@/api/reports/reports.api.ts";
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
} from "@/components/ui/form";
import { NumberInputAsString } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ClientPicker } from "@/features/_common/elements/pickers/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/elements/pickers/ContractorPicker.tsx";
import { WorkspacePicker } from "@/features/_common/elements/pickers/WorkspacePicker.tsx";
import { ExportChooserPopover } from "@/features/_common/ExpressionChooser.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { CalendarDate } from "@internationalized/date";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

export interface ReportWidgetFormProps
  extends WithServices<
    [
      WithClientService,
      WithContractorService,
      WithWorkspaceService,
      WithExpressionService,
      WithFormatService,
    ]
  > {
  defaultValues?: Partial<ReportPayload>;
  onSubmit: (
    data: ReportPayload,
    changedFields: Partial<ReportPayload>,
  ) => Promise<void> | void;
  onCancel: () => void;
}

type FormModel = {
  contractorId: number | null;
  clientId: number | null;
  periodStart: CalendarDate | null;
  periodEnd: CalendarDate | null;
  currency: string | null;
  description: string;
  netValue: string;
  workspaceId: number | null;
  projectIterationId: number | null;
};

export function ReportForm(props: ReportWidgetFormProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      contractorId: props.defaultValues?.contractorId,
      workspaceId: props.defaultValues?.workspaceId,
      clientId: props.defaultValues?.clientId,
      periodStart: props.defaultValues?.periodStart,
      periodEnd: props.defaultValues?.periodEnd,
      currency: props.defaultValues?.currency,
      description: props.defaultValues?.description ?? "",
      netValue: props.defaultValues?.netValue?.toString() ?? "",
      projectIterationId: props.defaultValues?.projectIterationId,
    },
  });

  const processingPromise = promiseState.useRemoteData();

  function handleSubmit(data: FormModel) {
    const transformedData = {
      contractorId: maybe.getOrThrow(
        data.contractorId,
        "Contractor is required",
      ),
      netValue: parseFloat(data.netValue),
      description: data.description,
      currency: maybe.getOrThrow(data.currency, "Currency is required"), // somehow ensure dates are correct against timezones// then check why gaps is not rendered as alert triangle
      periodEnd: maybe.getOrThrow(data.periodEnd, "Period end is required"),
      periodStart: maybe.getOrThrow(
        data.periodStart,
        "Period start is required",
      ),
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceId: maybe.getOrThrow(data.workspaceId, "Workspace is required"),
      projectIterationId: data.projectIterationId,
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
          rules={{ required: "Workspace is required" }}
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
              <FormDescription>Select client</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientId"
          rules={{ required: "Client is required" }}
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
          name="contractorId"
          rules={{ required: "Contractor is required" }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Contractor</FormLabel>
              <FormControl>
                <ContractorPicker
                  value={field.value}
                  onSelect={field.onChange}
                  services={props.services}
                />
              </FormControl>
              <FormDescription>Select contractor</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="periodStart"
          rules={{ required: "Start date is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period start</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                />
              </FormControl>
              <FormDescription>Period start</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="periodEnd"
          rules={{ required: "End date is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period end</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                />
              </FormControl>
              {/*<FormDescription>Period end</FormDescription>*/}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          rules={{ required: "Currency is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <CurrencyPicker value={field.value} onSelect={field.onChange} />
              </FormControl>
              {/*<FormDescription>Currency</FormDescription>*/}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="netValue"
          rules={{ required: "Net value is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Net value</FormLabel>
              <FormControl>
                <NumberInputAsString
                  {...field}
                  step={0.01}
                  formatOptions={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    ...maybe.map(form.watch("currency"), (currency) => ({
                      style: "currency" as const,
                      currency,
                    })),
                  }}
                />
              </FormControl>
              <FormDescription>Enter net value</FormDescription>
              <ExportChooserPopover
                header="Choose variable"
                services={props.services}
                context={{
                  workspaceId: form.watch("workspaceId") ?? idSpecUtils.ofAll(),
                  clientId: form.watch("clientId") ?? idSpecUtils.ofAll(),
                  contractorId:
                    form.watch("contractorId") ?? idSpecUtils.ofAll(),
                }}
                defaultArgs={{
                  input: form.getValues("netValue"),
                  reportStart: form.getValues("periodStart"),
                  reportEnd: form.getValues("periodEnd"),
                }}
                onChoose={async (_variable, _args, result) => {
                  // remember - expression can call side effect for now
                  // in the future we will define `procedures` (for plugin system)F so the are expected to be have side effects
                  const affectedFields =
                    typeof result === "object" && result !== null
                      ? result
                      : {
                          netValue: String(result),
                        };

                  for (const field of Object.keys(affectedFields)) {
                    form.setValue(
                      field as keyof FormModel,
                      String(
                        affectedFields[field as keyof typeof affectedFields],
                      ),
                      { shouldDirty: true },
                    );
                  }
                  form.setFocus(
                    Object.keys(affectedFields)[0] as keyof FormModel,
                  );
                }}
              >
                <Button variant="accent2" size="xs">
                  Variables
                </Button>
              </ExportChooserPopover>
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
        <Button type="submit">
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
