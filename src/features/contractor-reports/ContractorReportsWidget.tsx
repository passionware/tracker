import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { rd } from "@passionware/monads";

export function ContractorReportsWidget(
  props: { clientId: Client["id"] } & WithServices<
    [WithReportDisplayService, WithFormatService]
  >,
) {
  const reports = props.services.reportDisplayService.useReportView(
    contractorReportQueryUtils.setFilter(
      contractorReportQueryUtils.ofEmpty(),
      "clientId",
      { operator: "oneOf", value: [props.clientId] },
    ),
  );
  return (
    <CommonPageContainer>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Id</TableHead>
            <TableHead>Net value</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rd
            .journey(reports)
            .wait(
              <TableRow>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-32 h-6" />
                </TableCell>
              </TableRow>,
            )
            .catch(renderError)
            .map((invoices) => {
              if (invoices.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={4}>No invoices found.</TableCell>
                  </TableRow>
                );
              }
              return invoices.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-row gap-2 items-center">
                      {props.services.formatService.financial.amount(
                        report.netAmount.amount,
                        report.netAmount.currency,
                      )}
                      <Popover>
                        <PopoverTrigger>
                          <Badge
                            variant={
                              report.status === "billed"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {report.status === "billed"
                              ? "Billed"
                              : "Uncovered"}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="text-green-700">
                            <Badge variant="outline">Reconciled</Badge>{" "}
                            {props.services.formatService.financial.amount(
                              report.reconciledAmount.amount,
                              report.reconciledAmount.currency,
                            )}
                          </div>
                          <div className="text-red-800">
                            <Badge variant="outline">Remaining</Badge>{" "}
                            {props.services.formatService.financial.amount(
                              report.remainingAmount.amount,
                              report.remainingAmount.currency,
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                  <TableCell>
                    {props.services.formatService.temporal.date(
                      report.periodStart,
                    )}{" "}
                    -{" "}
                    {props.services.formatService.temporal.date(
                      report.periodEnd,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.description}
                  </TableCell>
                </TableRow>
              ));
            })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </CommonPageContainer>
  );
}
