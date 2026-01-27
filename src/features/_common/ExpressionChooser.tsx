import { paginationUtils } from "@/api/_common/query/pagination.ts";
import { Variable } from "@/api/variable/variable.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { variable } from "@/features/_common/columns/variable.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import { renderSpinnerMutation } from "@/features/_common/patterns/renderSpinnerMutation.tsx";
import { ensureError } from "@/platform/lang/ensureError.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  VariableContainer,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { mt, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Slot } from "@radix-ui/react-slot";
import { memo, PropsWithChildren, ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";

export interface ExpressionChooserProps
  extends WithServices<
    [
      WithExpressionService,
      WithFormatService,
      WithWorkspaceService,
      WithClientService,
      WithContractorService,
    ]
  > {
  context: ExpressionContext;
  defaultArgs: VariableContainer;
  onChoose: (
    variable: Variable,
    args: VariableContainer,
    result: unknown,
  ) => void;
  className?: string;
}

export const ExpressionChooser = memo(XExpressionChooser);
function XExpressionChooser({
  services,
  context,
  onChoose,
  defaultArgs,
  className,
}: ExpressionChooserProps) {
  const vars = rd.useMemoMap(
    services.expressionService.useEffectiveVariables(context),
    (vars) => Object.values(vars),
  );
  return (
    <ListView
      query={{ sort: null, page: paginationUtils.ofDefault() }}
      onQueryChange={() => void 0}
      className={className}
      data={vars}
      getRowId={(x) => x.id}
      columns={[
        sharedColumns.workspaceId(services),
        sharedColumns.clientId(services),
        sharedColumns.contractorId(services),
        variable.name,
        variable.value,
        variable.type,
        sharedColumns.updatedAt(services),
        sharedColumns.select<Variable>((info, button) => {
          const evaluatePromise = promiseState.useRemoteData();
          if (info.row.original.type === "const") {
            return (
              <Slot
                onClick={() =>
                  onChoose(
                    info.row.original,
                    defaultArgs,
                    info.row.original.value,
                  )
                }
              >
                {button}
              </Slot>
            );
          }

          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="default">Evaluate</Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-4xl w-fit">
                <PopoverHeader>Adjust input</PopoverHeader>
                <AdjustArgs
                  mutation={evaluatePromise.state}
                  args={defaultArgs}
                  onAdjust={async (args) => {
                    const result = await evaluatePromise.track(
                      services.expressionService.ensureExpressionValue(
                        context,
                        info.row.original.value,
                        args,
                      ),
                    );
                    onChoose(info.row.original, args, result);
                  }}
                />
              </PopoverContent>
            </Popover>
          );
        }),
      ]}
      caption={
        <>
          <div className="mb-2 font-semibold text-gray-700">
            A list of all variables
          </div>
        </>
      }
    />
  );
}

function AdjustArgs(props: {
  args: VariableContainer;
  mutation: RemoteData<unknown>;
  onAdjust: (args: VariableContainer) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      args: Object.entries(props.args).map(([key, value]) => ({ key, value })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "args",
  });

  async function handleSubmit(data: {
    args: { key: string; value: unknown }[];
  }) {
    try {
      const args = data.args.reduce(
        (acc, { key, value }) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, unknown>,
      );
      await props.onAdjust(args);
    } catch (e) {
      form.setError("args", { message: ensureError(e).message });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.stopPropagation();
          e.preventDefault();
          form.handleSubmit(handleSubmit)(e);
        }}
        className="grid grid-cols-1 gap-4 min-w-[20rem]"
      >
        {/* Display general error */}
        {form.formState.errors.args && (
          <div className="text-red-500 text-sm">
            {form.formState.errors.args.message}
          </div>
        )}

        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`args.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{form.getValues(`args.${index}.key`)}</FormLabel>
                <FormControl>
                  <Input {...field} value={String(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {/* Submit Button */}
        <Button type="submit" variant="default">
          {renderSpinnerMutation(mt.fromRemoteData(props.mutation))}
          Adjust
        </Button>
      </form>
    </Form>
  );
}

export function ExportChooserPopover({
  children,
  header,
  ...props
}: PropsWithChildren<ExpressionChooserProps> & { header: ReactNode }) {
  return (
    <OpenState>
      {(bag) => (
        <Popover {...bag}>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent className="max-w-4xl w-fit overflow-x-auto">
            <PopoverHeader>{header}</PopoverHeader>
            <ExpressionChooser
              {...props}
              onChoose={(variable, args, result) => {
                bag.close();
                props.onChoose(variable, args, result);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </OpenState>
  );
}
