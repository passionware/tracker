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
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { Maybe, rd } from "@passionware/monads";
import { useId } from "react";
import { useForm } from "react-hook-form";

export interface InlineContractorReportSearchProps
  extends WithServices<[WithReportDisplayService, WithFormatService]> {
  query: ContractorReportQuery;
  onSelect: (data: { contractorReportId: number; value: number }) => void;
  maxAmount: Maybe<number>;
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
          if (reports.length === 0) {
            return <div>No contractor reports found.</div>;
          }

          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Reconciled</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.id}</TableCell>
                    <TableCell>{report.contractor.fullName}</TableCell>
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
                            initialValue={Math.min(
                              report.remainingAmount.amount,
                              props.maxAmount ?? 0,
                            )}
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

function EnterValue(props: {
  initialValue: number;
  onValueChange: (value: number) => void;
}) {
  const form = useForm({ defaultValues: { value: props.initialValue } });
  const valueId = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={form.handleSubmit((data) => props.onValueChange(data.value))}
    >
      <label htmlFor={valueId}>Enter linked amount:</label>
      <Input id={valueId} {...form.register("value")} />
      <Button variant="default" type="submit">
        Submit
      </Button>
    </form>
  );
}
