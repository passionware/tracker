import { ContractorReportQuery } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { CurrencyValue } from "@/services/CurrencyService/CurrencyService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { Maybe, rd } from "@passionware/monads";
import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";

export interface InlineContractorReportSearchProps
  extends WithServices<
    [WithReportDisplayService, WithFormatService, WithClientService]
  > {
  query: ContractorReportQuery;
  onSelect: (data: { contractorReportId: number; value: LinkValue }) => void;
  maxSourceAmount: Maybe<CurrencyValue>;
  showDescription: boolean;
  showTargetValue: boolean;
}

export function InlineContractorReportSearch(
  props: InlineContractorReportSearchProps,
) {
  const reports = props.services.reportDisplayService.useReportView(
    props.query,
  );

  return (
    <div>
      {rd
        .journey(reports)
        .wait(<Skeleton className="h-6" />)
        .catch(renderError)
        .map((reports) => {
          if (reports.entries.length === 0) {
            return <div>No contractor reports found.</div>;
          }

          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Reconciled</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.entries.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.id}</TableCell>
                    <TableCell>
                      <WorkspaceView
                        layout="avatar"
                        workspace={rd.of(report.workspace)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.contractor.fullName}
                        {report.links.length > 0 && (
                          <ChevronRight className="size-2" />
                        )}
                        <ClientWidget
                          layout="avatar"
                          size="xs"
                          clientId={report.clientId}
                          services={props.services}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        report.reconciledAmount.amount,
                        report.reconciledAmount.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        report.remainingAmount.amount,
                        report.remainingAmount.currency,
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
                                report.remainingAmount.currency,
                              amount: Math.min(
                                props.maxSourceAmount?.amount ?? 0,
                                report.remainingAmount.amount,
                              ),
                            }}
                            initialDescription={[
                              report.remainingAmount.currency !==
                              props.maxSourceAmount?.currency
                                ? `Currency exchange, 1 ${report.remainingAmount.currency} = [...] ${props.maxSourceAmount?.currency}, exchange cost: [...]`
                                : null,
                            ]
                              .filter(Boolean)
                              .join("\n")}
                            initialTargetValue={{
                              ...report.remainingAmount,
                              amount:
                                props.maxSourceAmount?.currency ===
                                report.remainingAmount.currency
                                  ? // we have same currency, so probably we don't need to exchange
                                    props.maxSourceAmount?.amount
                                  : // this won't be same, so let's assume that cost  = remaining report but in target currency
                                    report.remainingAmount.amount,
                            }}
                            showDescription={props.showDescription}
                            showTargetValue={props.showTargetValue}
                            onValueChange={(value) =>
                              props.onSelect({
                                contractorReportId: report.id,
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
      <Input id={sourceId} {...form.register("source")} />

      {props.showTargetValue && (
        <>
          <label htmlFor={targetId}>
            Enter target amount (
            {props.services.formatService.financial.currencySymbol(
              props.initialTargetValue.currency,
            )}
            )
          </label>
          <Input id={targetId} {...form.register("target")} />
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
