import { Client } from "@/api/clients/clients.api.ts";
import { CreateContractorReportPayload } from "@/api/mutation/mutation.api.ts";
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
import { ClientPicker } from "@/features/_common/inline-search/ClientPicker.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { useForm } from "react-hook-form";

export interface NewContractorReportWidgetProps
  extends WithServices<
    [
      WithMutationService,
      WithClientService,
      WithContractorService,
      WithWorkspaceService,
    ]
  > {
  // initialLink: LinkPayload; todo: think about this
  defaultClientId?: Client["id"];
  defaultWorkspaceId?: number;
  defaultContractorId?: number;
  defaultCurrency?: string;
  defaultPeriodStart?: Date;
  defaultPeriodEnd?: Date;
  onSubmit: (data: CreateContractorReportPayload) => void;
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

export function NewContractorReportWidget(
  props: NewContractorReportWidgetProps,
) {
  const form = useForm<FormModel>({
    defaultValues: {
      contractorId: props.defaultContractorId,
      workspaceId: props.defaultWorkspaceId,
      clientId: props.defaultClientId,
      periodStart: props.defaultPeriodStart,
      periodEnd: props.defaultPeriodEnd,
      currency: props.defaultCurrency,
      description: "",
      netValue: "0",
    },
  });
  function handleSubmit(data: FormModel) {
    props.onSubmit({
      contractorId: maybe.getOrThrow(
        data.contractorId,
        "Contractor is required",
      ),
      netValue: parseFloat(data.netValue),
      description: data.description,
      currency: maybe.getOrThrow(data.currency, "Currency is required"),
      periodEnd: maybe.getOrThrow(data.periodEnd, "Period end is required"),
      periodStart: maybe.getOrThrow(
        data.periodStart,
        "Period start is required",
      ),
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceId: maybe.getOrThrow(data.workspaceId, "Workspace is required"),
    });
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
              <FormDescription>Select client</FormDescription>
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
          name="contractorId"
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Net value</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter net value</FormDescription>
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
        <Button type="submit" className="col-start-2">
          Submit
        </Button>
      </form>
    </Form>
  );
}
