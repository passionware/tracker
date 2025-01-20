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
import { LoadingSpinner } from "@/components/ui/spinner.tsx";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/ContractorView.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceWidget } from "@/features/_common/WorkspaceView.tsx";
import { cn } from "@/lib/utils.ts";
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
import { rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { createColumnHelper } from "@tanstack/react-table";
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

const columnHelper = createColumnHelper<Variable>();

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
      className={className}
      data={vars}
      columns={[
        columnHelper.accessor("workspaceId", {
          header: "Workspace",
          cell: (info) => (
            <WorkspaceWidget
              layout="avatar"
              workspaceId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("clientId", {
          header: "Client",
          cell: (info) => (
            <ClientWidget
              layout="avatar"
              clientId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("contractorId", {
          header: "Contractor",
          cell: (info) => (
            <ContractorWidget
              layout="avatar"
              contractorId={info.getValue()}
              services={services}
            />
          ),
        }),
        columnHelper.accessor("name", { header: "Name" }),
        columnHelper.accessor("value", {
          header: "Value",
          cell: (info) => {
            const className = cn(
              "p-1 border",
              {
                const: "border-sky-800/50 rounded bg-sky-50 text-sky-800",
                expression:
                  "border-lime-800/50 rounded bg-lime-50 text-lime-900",
              }[info.row.original.type],
            );
            return (
              <OverflowTooltip
                light
                title={
                  <div
                    className={cn(className, "whitespace-pre overflow-auto")}
                  >
                    {info.getValue()}
                  </div>
                }
              >
                <div className={cn(className, "max-w-[10rem] w-min truncate")}>
                  {info.getValue()}
                </div>
              </OverflowTooltip>
            );
          },
        }),
        columnHelper.accessor("type", { header: "Type" }),
        columnHelper.accessor("updatedAt", {
          header: "Last updated",
          cell: (info) =>
            services.formatService.temporal.datetime(info.getValue()),
        }),
        columnHelper.display({
          header: "Select",
          cell: (info) => {
            const evaluatePromise = promiseState.useRemoteData();
            if (info.row.original.type === "const") {
              return (
                <Button
                  onClick={() =>
                    onChoose(
                      info.row.original,
                      defaultArgs,
                      info.row.original.value,
                    )
                  }
                  variant="default"
                >
                  Select
                </Button>
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
          },
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
          {rd
            .fullJourney(props.mutation)
            .initially("Evaluate")
            .wait(<LoadingSpinner />)
            .catch(renderSmallError("w-6 h-4"))
            .map(() => null)}
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
