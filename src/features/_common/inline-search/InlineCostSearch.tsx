import { CostQuery } from "@/api/cost/cost.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { NumberInput } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ContractorView } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { WorkspaceView } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";

import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { Maybe, rd } from "@passionware/monads";
import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { useForm, Controller } from "react-hook-form";

export interface InlineCostSearchProps
  extends WithServices<
    [WithReportDisplayService, WithFormatService, WithContractorService]
  > {
  query: CostQuery;
  onSelect: (data: { costId: number; value: LinkValue }) => void;
  maxSourceAmount: Maybe<CurrencyValue>;
  showDescription: boolean;
  showTargetValue: boolean;
  className?: string;
}

export function InlineCostSearch(props: InlineCostSearchProps) {
  const costs = props.services.reportDisplayService.useCostView(props.query);

  return (
    <div className={props.className}>
      {rd
        .journey(costs)
        .wait(<Skeleton className="h-6" />)
        .catch(renderError)
        .map((costs) => {
          if (costs.entries.length === 0) {
            return <div>No costs found.</div>;
          }

          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost</TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.entries.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div className="flex flex-row gap-1 items-center">
                        <WorkspaceView
                          layout="avatar"
                          workspace={rd.of(cost.workspace)}
                        />
                        <ChevronRight className="size-3" />
                        {cost.contractor ? (
                          <ContractorView
                            size="xs"
                            contractor={rd.of(cost.contractor)}
                          />
                        ) : (
                          cost.counterparty
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cost.invoiceNumber ?? "N/A"}</TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        cost.netAmount.amount,
                        cost.netAmount.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        cost.remainingAmount.amount,
                        cost.remainingAmount.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button>Select</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit">
                          <EnterValue
                            services={props.services}
                            initialSourceValue={{
                              currency:
                                props.maxSourceAmount?.currency ??
                                cost.remainingAmount.currency,
                              amount: Math.min(
                                props.maxSourceAmount?.amount ?? 0,
                                cost.remainingAmount.amount,
                              ),
                            }}
                            initialDescription={[
                              cost.remainingAmount.currency !==
                              props.maxSourceAmount?.currency
                                ? `Currency exchange, 1 ${cost.remainingAmount.currency} = [...] ${props.maxSourceAmount?.currency}, exchange cost: [...]`
                                : null,
                            ]
                              .filter(Boolean)
                              .join("\n")}
                            initialTargetValue={{
                              ...cost.remainingAmount,
                              amount:
                                props.maxSourceAmount?.currency ===
                                cost.remainingAmount.currency
                                  ? props.maxSourceAmount?.amount
                                  : cost.remainingAmount.amount,
                            }}
                            showDescription={props.showDescription}
                            showTargetValue={props.showTargetValue}
                            onValueChange={(value) =>
                              props.onSelect({
                                costId: cost.id,
                                value,
                              })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          );
        })}
    </div>
  );
}

type LinkValue = {
  source: number;
  target: number;
  description: string;
};

function EnterValue(
  props: WithServices<[WithFormatService]> & {
    initialDescription: string;
    initialSourceValue: CurrencyValue;
    initialTargetValue: CurrencyValue;
    showTargetValue: boolean;
    showDescription: boolean;
    onValueChange: (value: LinkValue) => void;
  },
) {
  const form = useForm({
    defaultValues: {
      source: props.initialSourceValue.amount,
      target: props.initialTargetValue.amount,
      description: props.initialDescription,
    },
  });
  const sourceId = useId();
  const targetId = useId();
  const descriptionId = useId();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={form.handleSubmit((data) =>
        props.onValueChange({
          source: Number(data.source),
          target: Number(data.target),
          description: data.description,
        }),
      )}
    >
      <label htmlFor={sourceId}>
        Enter linked amount (
        {props.services.formatService.financial.currencySymbol(
          props.initialSourceValue.currency,
        )}
        )
      </label>
      <Controller
        name="source"
        control={form.control}
        render={({ field }) => (
          <NumberInput
            id={sourceId}
            {...field}
            formatOptions={{
              style: "currency",
              currency: props.initialSourceValue.currency,
            }}
          />
        )}
      />

      {props.showTargetValue && (
        <>
          <label htmlFor={targetId}>
            Enter target amount (
            {props.services.formatService.financial.currencySymbol(
              props.initialTargetValue.currency,
            )}
            )
          </label>
          <Controller
            name="target"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                id={targetId}
                {...field}
                formatOptions={{
                  style: "currency",
                  currency: props.initialTargetValue.currency,
                }}
              />
            )}
          />
        </>
      )}

      {props.showDescription && (
        <>
          <label htmlFor={descriptionId}>Enter description:</label>
          <Textarea id={descriptionId} {...form.register("description")} />
        </>
      )}

      <Button variant="default" type="submit">
        Submit
      </Button>
    </form>
  );
}
