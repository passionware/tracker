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
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { ContractorWidget } from "@/features/_common/ContractorView.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { WorkspaceWidget } from "@/features/_common/WorkspaceView.tsx";
import { cn } from "@/lib/utils.ts";
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
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { useForm } from "react-hook-form";

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
}

const columnHelper = createColumnHelper<Variable>();

export function ExpressionChooser({
  services,
  context,
  onChoose,
  defaultArgs,
}: ExpressionChooserProps) {
  const vars = rd.useMemoMap(
    services.expressionService.useEffectiveVariables(context),
    (vars) => Object.values(vars),
  );
  return (
    <ListView
      className="w-full"
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
                <PopoverContent>
                  <PopoverHeader>Adjust input</PopoverHeader>
                  <AdjustArgs
                    args={defaultArgs}
                    onAdjust={async (args) => {
                      const result =
                        await services.expressionService.ensureExpressionValue(
                          context,
                          info.row.original.value,
                          args,
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
  onAdjust: (args: VariableContainer) => void;
}) {
  const form = useForm({
    defaultValues: {
      args: JSON.stringify(props.args, null, 2),
    },
  });

  function handleSubmit(data: { args: string }) {
    try {
      const args = JSON.parse(data.args);
      props.onAdjust(args);
    } catch (e) {
      form.setError("args", {
        type: "manual",
        message: "Invalid JSON",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-1 gap-4 min-w-[20rem]"
      >
        {/* Textarea Field */}
        <FormField
          control={form.control}
          name="args"
          rules={{ required: "This field is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Textarea</FormLabel>
              <FormControl>
                <Textarea
                  rows={10}
                  {...field}
                  placeholder="Enter your text here..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" variant="default">
          Adjust
        </Button>
      </form>
    </Form>
  );
}
