import { Button } from "@/components/ui/button.tsx";
import {
  FormControl,
  FormField,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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
import { Leaf } from "lucide-react";
import { ReactElement, ReactNode, useState } from "react";
import { useForm } from "react-hook-form";

export type LinkValue = {
  source: number;
  target: number;
  description: string;
};

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
  context: ExpressionContext;
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

  const promise = promiseState.useRemoteData<void>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent>
        <Form {...form}>
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
                props.onValueChange(
                  allFields,
                  getDirtyFields(allFields, form),
                ) || Promise.resolve(),
              );
              setOpen(false);
            })}
          >
            <h3 className="text-sky-700 p-2 rounded-md bg-gradient-to-br from-sky-100 to-cyan-50 empty:hidden">
              {props.title}
            </h3>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {props.sourceLabel ?? "Enter source amount"} (
                    {props.services.formatService.financial.currencySymbol(
                      props.sourceCurrency,
                    )}
                    )
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input {...field} />
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

            <div
            className="text-lime-700 bg-lime-100 text-md p-2 rounded-lg my-2 "
            >Corresponds to</div>

            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {props.targetLabel ?? "Enter target amount"} (
                    {props.services.formatService.financial.currencySymbol(
                      props.targetCurrency,
                    )}
                    )
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input {...field} />
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
