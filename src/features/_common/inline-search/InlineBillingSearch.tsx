import { BillingQuery } from "@/api/billing/billing.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { ClientView } from "@/features/_common/elements/pickers/ClientView.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WorkspaceView } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";

export interface InlineBillingSearchProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithExpressionService,
      WithWorkspaceService,
      WithContractorService,
    ]
  > {
  query: BillingQuery;
  onSelect: (data: { billingId: number; value: LinkValue }) => void;
  maxAmount: CurrencyValue;
  className?: string;
  context: ExpressionContext;
}
type LinkValue = {
  source: number;
  target: number;
  description: string;
};

export function InlineBillingSearch(props: InlineBillingSearchProps) {
  const billings = props.services.reportDisplayService.useBillingView(
    props.query,
  );

  return (
    <div className={props.className}>
      {rd
        .journey(billings)
        .wait(<Skeleton className="h-6" />)
        .catch(renderError)
        .map((billings) => {
          if (billings.entries.length === 0) {
            return <div>No billings found.</div>;
          }

          return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice number</TableHead>
                  <TableHead>Invoice date</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.entries.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell>{billing.id}</TableCell>
                    <TableCell>
                      <WorkspaceView
                        layout="avatar"
                        workspace={rd.of(billing.workspace)}
                      />
                    </TableCell>
                    <TableCell>
                      <ClientView
                        layout="avatar"
                        client={rd.of(billing.client)}
                      />
                    </TableCell>
                    <TableCell>{billing.invoiceNumber}</TableCell>
                    <TableCell>
                      {props.services.formatService.temporal.single.compact(
                        billing.invoiceDate,
                      )}
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        billing.netAmount.amount,
                        billing.netAmount.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      {props.services.formatService.financial.amount(
                        billing.remainingAmount.amount,
                        billing.remainingAmount.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkPopover
                        context={props.context}
                        sourceCurrency={props.maxAmount.currency}
                        targetCurrency={billing.remainingAmount.currency}
                        initialValues={{
                          source: props.maxAmount.amount,
                          target: billing.remainingAmount.amount,
                          description: "",
                        }}
                        services={props.services}
                        onValueChange={(value) =>
                          props.onSelect({
                            billingId: billing.id,
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
