import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
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
import { CurrencyPicker } from "@/features/_common/inline-search/CurrencyPicker.tsx";
import { WorkspacePicker } from "@/features/_common/inline-search/WorkspacePicker.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { useForm } from "react-hook-form";

export interface NewClientBillingWidgetProps
  extends WithServices<[WithClientService, WithWorkspaceService]> {
  defaultClientId?: number;
  defaultWorkspaceId?: number;
  defaultCurrency?: string;
  defaultInvoiceDate?: Date;
  onSubmit: (
    data: Omit<
      ClientBilling,
      "id" | "createdAt" | "linkBillingReport" | "client"
    >,
  ) => void;
  onCancel: () => void;
}

type FormModel = {
  clientId: number | null;
  workspaceId: number | null;
  currency: string | null;
  totalNet: string;
  totalGross: string;
  invoiceNumber: string;
  invoiceDate: Date | null;
  description: string;
};

export function NewClientBillingWidget(props: NewClientBillingWidgetProps) {
  const form = useForm<FormModel>({
    defaultValues: {
      clientId: props.defaultClientId,
      workspaceId: props.defaultWorkspaceId,
      currency: props.defaultCurrency,
      totalNet: "0",
      totalGross: "0",
      invoiceNumber: "",
      invoiceDate: props.defaultInvoiceDate,
      description: "",
    },
  });

  function handleSubmit(data: FormModel) {
    props.onSubmit({
      clientId: maybe.getOrThrow(data.clientId, "Client is required"),
      workspaceId: maybe.getOrThrow(data.workspaceId, "Workspace is required"),
      currency: maybe.getOrThrow(data.currency, "Currency is required"),
      totalNet: parseFloat(data.totalNet),
      totalGross: parseFloat(data.totalGross),
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
          name="currency"
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
          name="totalNet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Net</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter total net value</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalGross"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Gross</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Enter total gross value</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invoiceNumber"
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
