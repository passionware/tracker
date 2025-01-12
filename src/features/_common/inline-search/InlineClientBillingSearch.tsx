import { ClientBillingQuery } from "@/api/client-billing/client-billing.api.ts";
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
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import { useId } from "react";
import { useForm } from "react-hook-form";

export interface InlineBillingSearchProps
  extends WithServices<
    [WithReportDisplayService, WithFormatService, WithClientService]
  > {
  query: ClientBillingQuery;
  onSelect: (data: { billingId: number; value: number }) => void;
  maxAmount: number;
  className?: string;
}

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
                      <ClientWidget
                        layout="avatar"
                        clientId={billing.clientId}
                        services={props.services}
                      />
                    </TableCell>
                    <TableCell>{billing.invoiceNumber}</TableCell>
                    <TableCell>
                      {props.services.formatService.temporal.date(
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
                      <Popover>
                        <PopoverTrigger>
                          <Button>Select</Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-4 space-y-2">
                          <EnterValue
                            initialValue={
                              Math.min(
                                props.maxAmount,
                                billing.remainingAmount.amount,
                              ) || 0
                            }
                            onValueChange={(value) =>
                              props.onSelect({
                                billingId: billing.id,
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
