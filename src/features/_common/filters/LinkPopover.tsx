import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { renderSpinnerMutation } from "@/features/_common/patterns/renderSpinnerMutation.tsx";
import { getDirtyFields } from "@/platform/react/getDirtyFields.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { ReactElement, ReactNode, useId, useState } from "react";
import { useForm } from "react-hook-form";

export type LinkValue = {
  source: number;
  target: number;
  description: string;
};

export type LinkPopoverProps = WithServices<[WithFormatService]> & {
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
};

export function LinkPopover(props: LinkPopoverProps) {
  const form = useForm({
    defaultValues: {
      source: props.initialValues?.source ?? 0,
      target: props.initialValues?.target ?? 0,
      description: props.initialValues?.description ?? "",
    },
    mode: "onChange",
  });

  const [open, setOpen] = useState(false);

  const sourceId = useId();
  const targetId = useId();
  const descriptionId = useId();

  const promise = promiseState.useRemoteData<void>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent>
        <form
          className="flex flex-col gap-2"
          onSubmit={form.handleSubmit(async () => {
            const data = form.getValues();

            const allFields = {
              source: Number(data.source),
              target: Number(data.target),
              description: data.description,
            };
            await promise.track(
              props.onValueChange(allFields, getDirtyFields(allFields, form)) ||
                Promise.resolve(),
            );
            setOpen(false);
          })}
        >
          <h3 className="text-sky-700 p-2 rounded-md bg-gradient-to-br from-sky-100 to-cyan-50">
            {props.title}
          </h3>

          <label htmlFor={sourceId}>
            {props.sourceLabel ?? "Enter source amount"} (
            {props.services.formatService.financial.currencySymbol(
              props.sourceCurrency,
            )}
            )
          </label>
          <Input id={sourceId} {...form.register("source")} />

          <label htmlFor={targetId}>
            {props.targetLabel ?? "Enter target amount"} (
            {props.services.formatService.financial.currencySymbol(
              props.targetCurrency,
            )}
            )
          </label>
          <Input id={targetId} {...form.register("target")} />

          <label htmlFor={descriptionId}>
            {props.descriptionLabel ?? "Enter description"}:
          </label>
          <Textarea id={descriptionId} {...form.register("description")} />

          <Button variant="default" type="submit">
            {renderSpinnerMutation(mt.fromRemoteData(promise.state))}
            Submit
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
