import { Cost } from "@/api/cost/cost.api.ts";
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
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { useForm } from "react-hook-form";

export interface NewCostWidgetProps
  extends WithServices<[WithWorkspaceService, WithContractorService]> {
  defaultWorkspaceId?: number;
  defaultCurrency?: string;
  defaultInvoiceDate?: Date;
  onSubmit: (
    data: Omit<Cost, "createdAt" | "linkReports" | "id" | "contractor">,
  ) => void;
  onCancel: () => void;
}

type FormModel = {
  contractorId: number | null;
  counterparty: string;
  workspaceId: number | null;
  currency: string | null;
  netValue: string;
  grossValue: string;
  invoiceNumber: string;
  invoiceDate: Date | null;
  description: string;
};

export function NewCostWidget(props: NewCostWidgetProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      contractorId: null,
      counterparty: "",
      workspaceId: props.defaultWorkspaceId,
      currency: props.defaultCurrency,
      netValue: "0",
      grossValue: "0",
      invoiceNumber: "",
      invoiceDate: props.defaultInvoiceDate,
      description: "",
    },
  });

  const watchContractorId = form.watch("contractorId");

  function handleSubmit(data: FormModel) {
    props.onSubmit({
      contractorId: data.contractorId,
      counterparty: watchContractorId ? null : data.counterparty,
      workspaceId: maybe.getOrThrow(data.workspaceId, "Workspace is required"),
      currency: maybe.getOrThrow(data.currency, "Currency is required"),
      netValue: parseFloat(data.netValue),
      grossValue: parseFloat(data.grossValue),
      invoiceNumber: data.invoiceNumber,
      invoiceDate: maybe.getOrThrow(
        data.invoiceDate,
        "Invoice date is required",
      ),
      description: data.description,
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
          rules={{ required: "Workspace is required" }}
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
          name="contractorId"
          rules={{ required: "Contractor is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contractor</FormLabel>
              <FormControl>
                <ContractorPicker
                  allowClear
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
          name="counterparty"
          render={({ field }) => (
            <FormItem
              className={maybe.isPresent(watchContractorId) ? "opacity-50" : ""}
            >
              <FormLabel>
                Counterparty
                {maybe.isPresent(watchContractorId) ? " (not needed)" : ""}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter counterparty</FormDescription>
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="netValue"
          rules={{ required: "Net Value is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Net Value</FormLabel>
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
          name="grossValue"
          rules={{ required: "Gross Value is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gross Value</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter gross value</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invoiceNumber"
          rules={{ required: "Invoice Number is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter invoice number</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invoiceDate"
          rules={{ required: "Invoice Date is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick a date"
                />
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
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
