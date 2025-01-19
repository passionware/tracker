import { CreateReportPayload } from "@/api/mutation/mutation.api.ts";
import { ReportQuery } from "@/api/reports/reports.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { ClientView } from "@/features/_common/ClientView.tsx";
import {
  LinkPopover,
  LinkValue,
} from "@/features/_common/filters/LinkPopover.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { ReportWidgetForm } from "@/features/reports/ReportWidgetForm.tsx";
import { useOpenState } from "@/platform/react/useOpenState.ts";
import { WithServices } from "@/platform/typescript/services.ts";

import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Maybe, rd } from "@passionware/monads";
import { ChevronRight } from "lucide-react";

export interface InlineReportSearchProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
    ]
  > {
  query: ReportQuery;
  initialNewReportValues?: Partial<CreateReportPayload>;
  onSelect: (data: { reportId: number; value: LinkValue }) => void;
  maxSourceAmount: Maybe<CurrencyValue>;
  showDescription: boolean;
  showTargetValue: boolean;
  className?: string;
}

export function InlineReportSearch(props: InlineReportSearchProps) {
  const reports = props.services.reportDisplayService.useReportView(
    props.query,
  );

  const editModalState = useOpenState();

  return (
    <div className={props.className}>
      <Dialog {...editModalState.dialogProps}>
        <DialogTrigger asChild>
          <Button variant="accent1" size="xs" className="float-right my-1 mr-1">
            Create new report
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit report</DialogTitle>
          <DialogDescription className="sr-only" />
          <ReportWidgetForm
            onCancel={editModalState.close}
            defaultValues={props.initialNewReportValues}
            services={props.services}
            onSubmit={(data) =>
              props.services.mutationService
                .createReport(data)
                .then(editModalState.close)
            }
          />
        </DialogContent>
      </Dialog>
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
                        <ChevronRight className="size-3" />
                        <ClientView
                          layout="avatar"
                          size="xs"
                          client={rd.of(report.client)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        report.remainingAmount.amount,
                        report.remainingAmount.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkPopover
                        services={props.services}
                        sourceCurrency={report.remainingAmount.currency}
                        title="Link contractor report"
                        targetLabel="Report value"
                        targetCurrency={
                          props.maxSourceAmount?.currency ??
                          report.remainingAmount.currency
                        }
                        initialValues={{
                          target: Math.min(
                            props.maxSourceAmount?.amount ?? 0,
                            report.remainingAmount.amount,
                          ),
                          source:
                            props.maxSourceAmount?.currency ===
                            report.remainingAmount.currency
                              ? // we have same currency, so probably we don't need to exchange
                                props.maxSourceAmount?.amount
                              : // this won't be same, so let's assume that cost  = remaining report but in target currency
                                report.remainingAmount.amount,
                          description: [
                            report.remainingAmount.currency !==
                            props.maxSourceAmount?.currency
                              ? `Currency exchange, 1 ${report.remainingAmount.currency} = [...] ${props.maxSourceAmount?.currency}, exchange cost: [...]`
                              : null,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        }}
                        onValueChange={(value) =>
                          props.onSelect({
                            reportId: report.id,
                            value,
                          })
                        }
                      >
                        <Button>Select</Button>
                      </LinkPopover>
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
