import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
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
import { renderError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorReportService } from "@/services/ContractorReportService/ContractorReportService.ts";
import { rd } from "@passionware/monads";
import { format } from "date-fns";

export function ContractorReportsWidget(
  props: { clientId: Client["id"] } & WithServices<
    [WithContractorReportService]
  >,
) {
  const reports = props.services.contractorReportService.useContractorReports(
    contractorReportQueryUtils.setFilter(
      contractorReportQueryUtils.ofEmpty(),
      "clientId",
      { operator: "oneOf", value: [props.clientId] },
    ),
  );
  return (
    <>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                    {report.netValue} {report.currency}
                  </TableCell>
                  <TableCell>
                    {format(report.periodStart, "yyyy-mm-dd")} -{" "}
                    {format(report.periodEnd, "yyyy-mm-dd")}
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
    </>
  );
}
