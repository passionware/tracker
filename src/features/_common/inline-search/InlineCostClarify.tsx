import { LinkCostReportPayload } from "@/api/link-cost-report/link-cost-report.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { NumberInput } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { Expand } from "lucide-react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

export interface InlineCostClarifyProps
  extends WithServices<[WithReportDisplayService, WithFormatService]> {
  onSelect: (data: LinkCostReportPayload) => void;
  maxAmount: number;
  currency: string;
  context: { reportId: number } | { costId: number };
}

export function InlineCostClarify(props: InlineCostClarifyProps) {
  const form = useForm({
    defaultValues: { clarifyAmount: props.maxAmount, clarifyJustification: "" },
  });
  const justificationId = useId();
  const amountId = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={form.handleSubmit((data) => {
        switch (true) {
          case "reportId" in props.context:
            props.onSelect({
              costId: null,
              costAmount: 0,
              reportId: props.context.reportId,
              reportAmount: data.clarifyAmount,
              description: data.clarifyJustification,
            });
            break;
          case "costId" in props.context:
            props.onSelect({
              reportId: null,
              reportAmount: 0,
              costId: props.context.costId,
              costAmount: data.clarifyAmount,
              description: data.clarifyJustification,
            });
            break;
        }
      })}
    >
      <label htmlFor={justificationId}>
        Enter justification for the report amount not covered by a cost:
      </label>
      <Textarea
        id={justificationId}
        {...form.register("clarifyJustification")}
      />
      <label htmlFor={amountId}>Enter amount to clarify:</label>
      <Controller
        name="clarifyAmount"
        control={form.control}
        render={({ field }) => (
          <NumberInput
            id={amountId}
            {...field}
            step={0.01}
            formatOptions={{
              style: "currency",
              currency: props.currency,
            }}
          />
        )}
      />

      <Button variant="default" type="submit">
        Submit
      </Button>
      <Alert variant="info">
        <AlertDescription>
          <Collapsible>
            <CollapsibleTrigger>
              <AlertTitle className="flex flex-row gap-2 items-center">
                Example justifications <Expand className="size-4" />
              </AlertTitle>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="list-disc list-outside m-4 space-y-4">
                <li>
                  <strong>Currency conversion:</strong> Report compensation is in
                  one currency (e.g. EUR) while the contractor invoice or payment is
                  in another (e.g. PLN). After linking at the agreed or bank rate,
                  a small remainder is left from rounding the conversion or from
                  using a snapshot rate that does not match every line exactly.
                </li>
                <li>
                  <strong>Rounding:</strong> Per-line or per-invoice rounding when
                  splitting amounts between reports and costs leaves a few cents
                  that should be clarified instead of forcing an artificial extra
                  cost link.
                </li>
                <li>
                  <strong>Payment costs:</strong> Bank fees, card fees, or FX
                  spread absorbed on our side; the report amount is still correct
                  for the client while the net paid to the contractor differs
                  slightly from what maps cleanly to a single cost row.
                </li>
                <li>
                  <strong>Barter or non-cash compensation:</strong> Part of the
                  settlement is goods, credits, or an offset arrangement, so not
                  every unit of report value has a matching monetary cost line.
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </AlertDescription>
      </Alert>
    </form>
  );
}
