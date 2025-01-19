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
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { ClientPicker } from "@/features/_common/inline-search/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
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
  periodStart: Date | null;
  periodEnd: Date | null;
  currency: string | null;
  description: string;
  netValue: string;
  workspaceId: number | null;
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
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter net value</FormDescription>
              <SimpleTooltip title="Define `hours_to_report_value` variable to calculate this value automatically. First, enter the expression input in the field above.">
                <Button
                  variant="accent2"
                  onClick={async () => {
                    const hours_to_report_value =
                      await props.services.expressionService.ensureExpressionValue(
                        {
                          workspaceId:
                            form.watch("workspaceId") ?? idSpecUtils.ofAll(),
                          clientId:
                            form.watch("clientId") ?? idSpecUtils.ofAll(),
                          contractorId:
                            form.watch("contractorId") ?? idSpecUtils.ofAll(),
                        },
                        "vars.hours_to_report_value",
                        { input: form.watch("netValue") },
                      );
                    form.setValue("netValue", String(hours_to_report_value));
                  }}
                >
                  Take from `hours_to_report_value`
                </Button>
              </SimpleTooltip>
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
