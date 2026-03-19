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
import { money } from "@/platform/lang/money.ts";
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
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Leaf,
} from "lucide-react";
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
  showExchangeRate?: boolean; // Force show/hide exchange rate in breakdown
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
  const sourceValue = Number(form.watch("source"));
  const targetValue = Number(form.watch("target"));
  const quantityValue = Number(form.watch("quantity"));
  const sourceUnitPriceValue = Number(form.watch("sourceUnitPrice"));
  const targetUnitPriceValue = Number(form.watch("targetUnitPrice"));
  const exchangeRateValue = Number(form.watch("exchangeRate"));

  const hasSourceBreakdownTotal =
    Number.isFinite(quantityValue) &&
    quantityValue > 0 &&
    Number.isFinite(sourceUnitPriceValue);
  const hasTargetBreakdownTotal =
    Number.isFinite(quantityValue) &&
    quantityValue > 0 &&
    Number.isFinite(targetUnitPriceValue);

  const sourceBreakdownTotal = hasSourceBreakdownTotal
    ? money.round(quantityValue * sourceUnitPriceValue)
    : null;
  const targetBreakdownTotal = hasTargetBreakdownTotal
    ? money.round(quantityValue * targetUnitPriceValue)
    : null;

  const sourceDivergence =
    sourceBreakdownTotal != null && Number.isFinite(sourceValue)
      ? Math.abs(money.round(sourceBreakdownTotal - sourceValue))
      : 0;
  const targetDivergence =
    targetBreakdownTotal != null && Number.isFinite(targetValue)
      ? Math.abs(money.round(targetBreakdownTotal - targetValue))
      : 0;
  const hasBreakdownMismatch =
    money.compare(sourceDivergence, 0) > 0 ||
    money.compare(targetDivergence, 0) > 0;
  const sameCurrency =
    props.sourceCurrency.toUpperCase() === props.targetCurrency.toUpperCase();
  const showExchangeRate = props.showExchangeRate ?? !sameCurrency;
  const hasExchangeRateValue =
    showExchangeRate &&
    Number.isFinite(exchangeRateValue) &&
    exchangeRateValue > 0;
  const amountFromExchange =
    hasExchangeRateValue && Number.isFinite(targetValue)
      ? money.round(targetValue * exchangeRateValue)
      : null;
  const amountExchangeDivergence =
    amountFromExchange != null && Number.isFinite(sourceValue)
      ? Math.abs(money.round(sourceValue - amountFromExchange))
      : 0;
  const hasAmountExchangeMismatch =
    hasExchangeRateValue &&
    Number.isFinite(sourceValue) &&
    Number.isFinite(targetValue) &&
    money.compare(amountExchangeDivergence, 0) > 0;
  const sourceRateFromExchange =
    hasExchangeRateValue && Number.isFinite(targetUnitPriceValue)
      ? money.round(targetUnitPriceValue * exchangeRateValue)
      : null;
  const sourceRateExchangeDivergence =
    sourceRateFromExchange != null && Number.isFinite(sourceUnitPriceValue)
      ? Math.abs(money.round(sourceUnitPriceValue - sourceRateFromExchange))
      : 0;
  const hasUnitRateExchangeMismatch =
    hasExchangeRateValue &&
    Number.isFinite(sourceUnitPriceValue) &&
    Number.isFinite(targetUnitPriceValue) &&
    money.compare(sourceRateExchangeDivergence, 0) > 0;
  const hasValidationMismatch =
    hasBreakdownMismatch ||
    hasAmountExchangeMismatch ||
    hasUnitRateExchangeMismatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent
        align={props.align}
        side={props.side}
        className="w-[min(96vw,750px)]  overflow-y-auto p-1 md:p-2"
      >
        <Form {...form}>
          <form
            className="flex flex-col gap-3"
            onSubmit={form.handleSubmit(async () => {
              if (hasValidationMismatch) {
                return;
              }
              const data = form.getValues();

              // Create breakdown object if fields are provided (or cross-currency needs a rate)
              const createBreakdown = () => {
                const src = Number(data.source);
                const tgt = Number(data.target);
                let exchangeRate: number | undefined;
                if (data.exchangeRate !== "" && data.exchangeRate != null) {
                  const ex = Number(data.exchangeRate);
                  if (Number.isFinite(ex) && ex > 0) {
                    exchangeRate = ex;
                  }
                }
                if (
                  showExchangeRate &&
                  !sameCurrency &&
                  (exchangeRate === undefined || exchangeRate <= 0) &&
                  tgt > 0 &&
                  Number.isFinite(src)
                ) {
                  exchangeRate = src / tgt;
                }
                if (sameCurrency && showExchangeRate) {
                  exchangeRate = 1;
                }

                const hasExplicitBreakdown =
                  !!data.quantity ||
                  !!data.unit ||
                  (data.sourceUnitPrice !== "" &&
                    data.sourceUnitPrice != null) ||
                  (data.targetUnitPrice !== "" &&
                    data.targetUnitPrice != null) ||
                  (data.exchangeRate !== "" && data.exchangeRate != null);

                const needsCrossCurrencyBreakdown =
                  showExchangeRate &&
                  !sameCurrency &&
                  tgt > 0 &&
                  Number.isFinite(src);

                if (!hasExplicitBreakdown && !needsCrossCurrencyBreakdown) {
                  return undefined;
                }

                return {
                  quantity: data.quantity ? Number(data.quantity) : undefined,
                  unit: data.unit || undefined,
                  sourceUnitPrice: data.sourceUnitPrice
                    ? money.round(Number(data.sourceUnitPrice))
                    : undefined,
                  targetUnitPrice: data.targetUnitPrice
                    ? money.round(Number(data.targetUnitPrice))
                    : undefined,
                  exchangeRate: showExchangeRate
                    ? sameCurrency
                      ? 1
                      : (exchangeRate ?? undefined)
                    : undefined,
                  sourceCurrency: props.sourceCurrency,
                  targetCurrency: props.targetCurrency,
                };
              };

              const breakdown = createBreakdown();

              const allFields = {
                source: money.round(Number(data.source)),
                target: money.round(Number(data.target)),
                description: data.description,
                breakdown,
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
              const dirtyFields = getDirtyFields(formValuesForDirtyCheck, form);
              const transformedDirtyFields: Partial<LinkValue> = {};
              if (dirtyFields.source !== undefined) {
                transformedDirtyFields.source = money.round(
                  Number(dirtyFields.source),
                );
              }
              if (dirtyFields.target !== undefined) {
                transformedDirtyFields.target = money.round(
                  Number(dirtyFields.target),
                );
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
                dirtyFields.exchangeRate !== undefined ||
                (showExchangeRate &&
                  !sameCurrency &&
                  (dirtyFields.source !== undefined ||
                    dirtyFields.target !== undefined))
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
                      ? money.round(Number(dirtyFields.sourceUnitPrice)) ||
                        undefined
                      : undefined,
                  targetUnitPrice:
                    dirtyFields.targetUnitPrice !== undefined
                      ? money.round(Number(dirtyFields.targetUnitPrice)) ||
                        undefined
                      : undefined,
                  exchangeRate:
                    showExchangeRate && dirtyFields.exchangeRate !== undefined
                      ? Number(dirtyFields.exchangeRate) || undefined
                      : showExchangeRate &&
                          !sameCurrency &&
                          (dirtyFields.source !== undefined ||
                            dirtyFields.target !== undefined) &&
                          breakdown?.exchangeRate != null
                        ? breakdown.exchangeRate
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
            <h3 className="text-sky-900 font-semibold px-3 py-1.5 rounded-lg bg-linear-to-br from-sky-100 to-cyan-50 border border-sky-200 empty:hidden">
              {props.title}
            </h3>

            <section className="rounded-xl border border-border/80 bg-card/70 p-2.5 md:p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Link amounts
                </div>
                <div className="text-xs text-muted-foreground">
                  {props.sourceCurrency.toUpperCase()} to{" "}
                  {props.targetCurrency.toUpperCase()}
                </div>
              </div>
              <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
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

                <div className="flex items-center justify-center lg:pb-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-100/80 px-3 py-1.5 text-lime-800 text-xs font-medium">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Corresponds to
                  </div>
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
              </div>
            </section>

            {/* Optional Breakdown Section */}
            {props.showBreakdown && (
              <>
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 md:p-3 space-y-2">
                  <div className="text-amber-900 text-sm flex flex-row gap-1 items-baseline">
                    <span className="font-semibold">
                      Detailed breakdown (optional)
                    </span>
                    <span className="text-xs text-amber-800/80 leading-none">
                      Add unit, quantity, and rates for enhanced tracking
                    </span>
                  </div>

                  <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
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
                              value={
                                field.value === ""
                                  ? undefined
                                  : Number(field.value) || undefined
                              }
                              step={0.01}
                              placeholder="e.g., 50"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {showExchangeRate && (
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
                                value={
                                  field.value === ""
                                    ? undefined
                                    : Number(field.value) || undefined
                                }
                                step={0.01}
                                placeholder="e.g., 4.20"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid gap-1.5 md:grid-cols-2">
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
                              value={
                                field.value === ""
                                  ? undefined
                                  : Number(field.value) || undefined
                              }
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
                              value={
                                field.value === ""
                                  ? undefined
                                  : Number(field.value) || undefined
                              }
                              step={0.01}
                              placeholder="e.g., 35"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Calculated total display */}
                  {hasSourceBreakdownTotal && sourceBreakdownTotal != null && (
                    <div
                      className={[
                        "text-xs p-2 rounded-lg border min-h-[74px]",
                        hasValidationMismatch
                          ? "text-rose-900 bg-rose-100/70 border-rose-300"
                          : "text-emerald-900 bg-emerald-100/60 border-emerald-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 font-medium mb-0.5">
                        {hasValidationMismatch ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {hasValidationMismatch
                          ? "Breakdown mismatch"
                          : "Breakdown aligned"}
                      </div>
                      Source total: {sourceBreakdownTotal.toFixed(2)}{" "}
                      {props.sourceCurrency}
                      {hasTargetBreakdownTotal &&
                        targetBreakdownTotal != null && (
                          <>
                            <br />
                            Target total: {targetBreakdownTotal.toFixed(2)}{" "}
                            {props.targetCurrency}
                          </>
                        )}
                      <div className="mt-0.5">
                        {hasValidationMismatch
                          ? [
                              hasBreakdownMismatch
                                ? "Breakdown totals do not match Source/Target amounts above."
                                : null,
                              hasAmountExchangeMismatch
                                ? `Source amount must equal Target amount × exchange rate (${props.targetCurrency} × rate = ${props.sourceCurrency}).`
                                : null,
                              hasUnitRateExchangeMismatch
                                ? `Source rate must equal Target rate × exchange rate (${props.targetCurrency}/unit × rate = ${props.sourceCurrency}/unit).`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" ")
                          : "\u00A0"}
                      </div>
                    </div>
                  )}
                  {!hasSourceBreakdownTotal &&
                    (hasAmountExchangeMismatch ||
                      hasUnitRateExchangeMismatch) && (
                      <div className="text-xs p-2 rounded-lg border min-h-[74px] text-rose-900 bg-rose-100/70 border-rose-300">
                        <div className="flex items-center gap-2 font-medium mb-0.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Exchange mismatch
                        </div>
                        {[
                          hasAmountExchangeMismatch
                            ? `Source amount must equal Target amount × exchange rate (${props.targetCurrency} × rate = ${props.sourceCurrency}).`
                            : null,
                          hasUnitRateExchangeMismatch
                            ? `Source rate must equal Target rate × exchange rate (${props.targetCurrency}/unit × rate = ${props.sourceCurrency}/unit).`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                    )}
                </div>
              </>
            )}

            <div className="rounded-xl border border-border/80 bg-card/70 p-2.5 md:p-3">
              <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
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
                <Button
                  variant="default"
                  type="submit"
                disabled={hasValidationMismatch}
                  className="lg:self-end"
                >
                  {renderSpinnerMutation(mt.fromRemoteData(promise.state))}
                  Submit
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
