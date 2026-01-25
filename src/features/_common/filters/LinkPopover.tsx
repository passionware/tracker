import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { NumberInput } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ExportChooserPopover } from "@/features/_common/ExpressionChooser.tsx";
import { renderSpinnerMutation } from "@/features/_common/patterns/renderSpinnerMutation.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { PopoverContentProps } from "@radix-ui/react-popover";
import { Leaf } from "lucide-react";
import { ReactElement, ReactNode, useState } from "react";
import { useForm } from "react-hook-form";

export type LinkValue = {
  source: number;
  target: number;
  description: string;
  // Optional breakdown fields
  breakdown?: {
    quantity?: number;
    unit?: string;
    sourceUnitPrice?: number;
    targetUnitPrice?: number;
    exchangeRate?: number;
    sourceCurrency?: string;
    targetCurrency?: string;
  };
};

// todo: improve linking, make linking availabe for all tables, and navigable!
// todo: use new admin.atellio service for persistent query params

export type LinkPopoverProps = WithServices<
  [
    WithFormatService,
    WithFormatService,
    WithExpressionService,
    WithWorkspaceService,
    WithClientService,
    WithContractorService,
  ]
> & {
  initialValues?: Partial<LinkValue>;
  onValueChange: (
    value: LinkValue,
    changedFields: Partial<LinkValue>,
  ) => void | Promise<void>;
  sourceCurrency: string;
  targetCurrency: string;
  title?: ReactNode;
  sourceLabel?: string;
  targetLabel?: string;
  descriptionLabel?: string;
  children: ReactElement;
  align?: PopoverContentProps["align"];
  side?: PopoverContentProps["side"];
  context: ExpressionContext;
  showBreakdown?: boolean; // Show detailed breakdown section
};

export function LinkPopover(props: LinkPopoverProps) {
  const form = useForm({
    defaultValues: {
      source: props.initialValues?.source ?? 0,
      target: props.initialValues?.target ?? 0,
      description: props.initialValues?.description ?? "",
      // Breakdown fields
      quantity: props.initialValues?.breakdown?.quantity ?? "",
      unit: props.initialValues?.breakdown?.unit ?? "",
      sourceUnitPrice: props.initialValues?.breakdown?.sourceUnitPrice ?? "",
      targetUnitPrice: props.initialValues?.breakdown?.targetUnitPrice ?? "",
      exchangeRate: props.initialValues?.breakdown?.exchangeRate ?? "",
    },
    mode: "onChange",
  });

  const [open, setOpen] = useState(false);

  const promise = promiseState.useRemoteData<void>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent align={props.align} side={props.side}>
        <Form {...form}>
          <form
            className="flex flex-col gap-2"
            onSubmit={form.handleSubmit(async () => {
              const data = form.getValues();

              // Create breakdown object if fields are provided
              const createBreakdown = () => {
                if (
                  data.quantity ||
                  data.unit ||
                  data.sourceUnitPrice ||
                  data.targetUnitPrice ||
                  data.exchangeRate
                ) {
                  return {
                    quantity: data.quantity ? Number(data.quantity) : undefined,
                    unit: data.unit || undefined,
                    sourceUnitPrice: data.sourceUnitPrice
                      ? Number(data.sourceUnitPrice)
                      : undefined,
                    targetUnitPrice: data.targetUnitPrice
                      ? Number(data.targetUnitPrice)
                      : undefined,
                    exchangeRate: data.exchangeRate
                      ? Number(data.exchangeRate)
                      : undefined,
                    sourceCurrency: props.sourceCurrency,
                    targetCurrency: props.targetCurrency,
                  };
                }
                return undefined;
              };

              const allFields = {
                source: Number(data.source),
                target: Number(data.target),
                description: data.description,
                breakdown: createBreakdown(),
              };
              const formValuesForDirtyCheck = {
                source: data.source,
                target: data.target,
                description: data.description,
                quantity: data.quantity,
                unit: data.unit,
                sourceUnitPrice: data.sourceUnitPrice,
                targetUnitPrice: data.targetUnitPrice,
                exchangeRate: data.exchangeRate,
              };
              const dirtyFields = getDirtyFields(
                formValuesForDirtyCheck,
                form,
              );
              const transformedDirtyFields: Partial<LinkValue> = {};
              if (dirtyFields.source !== undefined) {
                transformedDirtyFields.source = Number(dirtyFields.source);
              }
              if (dirtyFields.target !== undefined) {
                transformedDirtyFields.target = Number(dirtyFields.target);
              }
              if (dirtyFields.description !== undefined) {
                transformedDirtyFields.description = String(
                  dirtyFields.description,
                );
              }
              if (
                dirtyFields.quantity !== undefined ||
                dirtyFields.unit !== undefined ||
                dirtyFields.sourceUnitPrice !== undefined ||
                dirtyFields.targetUnitPrice !== undefined ||
                dirtyFields.exchangeRate !== undefined
              ) {
                transformedDirtyFields.breakdown = {
                  quantity:
                    dirtyFields.quantity !== undefined
                      ? Number(dirtyFields.quantity) || undefined
                      : undefined,
                  unit:
                    dirtyFields.unit !== undefined
                      ? String(dirtyFields.unit) || undefined
                      : undefined,
                  sourceUnitPrice:
                    dirtyFields.sourceUnitPrice !== undefined
                      ? Number(dirtyFields.sourceUnitPrice) || undefined
                      : undefined,
                  targetUnitPrice:
                    dirtyFields.targetUnitPrice !== undefined
                      ? Number(dirtyFields.targetUnitPrice) || undefined
                      : undefined,
                  exchangeRate:
                    dirtyFields.exchangeRate !== undefined
                      ? Number(dirtyFields.exchangeRate) || undefined
                      : undefined,
                  sourceCurrency: props.sourceCurrency,
                  targetCurrency: props.targetCurrency,
                };
              }
              await promise.track(
                props.onValueChange(allFields, transformedDirtyFields) ||
                  Promise.resolve(),
              );
              setOpen(false);
            })}
          >
            <h3 className="text-sky-700 p-2 rounded-md bg-linear-to-br from-sky-100 to-cyan-50 empty:hidden">
              {props.title}
            </h3>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {props.sourceLabel ?? "Enter source amount"}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        {...field}
                        step={0.01}
                        formatOptions={{
                          style: "currency",
                          currency: props.sourceCurrency,
                        }}
                      />
                      <ExportChooserPopover
                        header="Choose variable"
                        services={props.services}
                        context={props.context}
                        defaultArgs={{ input: form.watch("source") }}
                        onChoose={async (_variable, _args, result) => {
                          form.setValue("source", Number(result));
                          form.setFocus("source");
                        }}
                      >
                        <Button variant="accent2" size="icon-xs">
                          <Leaf />
                        </Button>
                      </ExportChooserPopover>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-lime-700 bg-lime-100 text-md p-2 rounded-lg my-2 ">
              Corresponds to
            </div>

            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {props.targetLabel ?? "Enter target amount"}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        {...field}
                        step={0.01}
                        formatOptions={{
                          style: "currency",
                          currency: props.targetCurrency,
                        }}
                      />
                      <ExportChooserPopover
                        header="Choose variable"
                        services={props.services}
                        context={props.context}
                        defaultArgs={{ input: form.watch("target") }}
                        onChoose={async (_variable, _args, result) => {
                          form.setValue("target", Number(result));
                          form.setFocus("target");
                        }}
                      >
                        <Button variant="accent2" size="icon-xs">
                          <Leaf />
                        </Button>
                      </ExportChooserPopover>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Breakdown Section */}
            {props.showBreakdown && (
              <>
                <div className="text-amber-700 bg-amber-100 text-sm p-2 rounded-lg my-2 border">
                  Detailed Breakdown (Optional)
                  <span className="ml-2 text-xs text-muted-foreground block">
                    Add unit, quantity, and rates for enhanced tracking
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="h">Hours</SelectItem>
                              <SelectItem value="d">Days</SelectItem>
                              <SelectItem value="pc">Pieces</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                          <NumberInput
                            {...field}
                            value={field.value === "" ? undefined : Number(field.value) || undefined}
                            step={0.01}
                            placeholder="e.g., 50"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="sourceUnitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Source Rate ({props.sourceCurrency}/
                          {form.watch("unit") || "unit"})
                        </FormLabel>
                        <FormControl>
                          <NumberInput
                            {...field}
                            value={field.value === "" ? undefined : Number(field.value) || undefined}
                            step={0.01}
                            placeholder="e.g., 100"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetUnitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Target Rate ({props.targetCurrency}/
                          {form.watch("unit") || "unit"})
                        </FormLabel>
                        <FormControl>
                          <NumberInput
                            {...field}
                            value={field.value === "" ? undefined : Number(field.value) || undefined}
                            step={0.01}
                            placeholder="e.g., 35"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {props.sourceCurrency !== props.targetCurrency && (
                  <FormField
                    control={form.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Exchange Rate (1 {props.sourceCurrency} = ?{" "}
                          {props.targetCurrency})
                        </FormLabel>
                        <FormControl>
                          <NumberInput
                            {...field}
                            value={field.value === "" ? undefined : Number(field.value) || undefined}
                            step={0.01}
                            placeholder="e.g., 4.20"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Calculated total display */}
                {form.watch("quantity") && form.watch("sourceUnitPrice") && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Source total:{" "}
                    {(
                      Number(form.watch("quantity")) *
                      Number(form.watch("sourceUnitPrice"))
                    ).toFixed(2)}{" "}
                    {props.sourceCurrency}
                    {form.watch("targetUnitPrice") && (
                      <>
                        <br />
                        Target total:{" "}
                        {(
                          Number(form.watch("quantity")) *
                          Number(form.watch("targetUnitPrice"))
                        ).toFixed(2)}{" "}
                        {props.targetCurrency}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {props.descriptionLabel ?? "Enter description"}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button variant="default" type="submit">
              {renderSpinnerMutation(mt.fromRemoteData(promise.state))}
              Submit
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
