import { LinkPayload } from "@/api/mutation/mutation.api.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { Expand } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";

export interface InlineClarifyProps
  extends WithServices<[WithReportDisplayService, WithFormatService]> {
  onSelect: (data: LinkPayload) => void;
  maxAmount: number;
  context: { contractorReportId: number } | { clientBillingId: number };
}

export function InlineBillingClarify(props: InlineClarifyProps) {
  const form = useForm({
    defaultValues: { clarifyAmount: props.maxAmount, clarifyJustification: "" },
  });
  const justificationId = useId();
  const amountId = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={form.handleSubmit((data) =>
        props.onSelect({
          ...props.context,
          type: "clarify",
          linkAmount: data.clarifyAmount,
          clarifyJustification: data.clarifyJustification,
        }),
      )}
    >
      <label htmlFor={justificationId}>
        Enter justification for uncovered report:
      </label>
      <Textarea
        id={justificationId}
        {...form.register("clarifyJustification")}
      />
      <label htmlFor={amountId}>Enter amount to clarify:</label>
      <Input
        id={amountId}
        {...form.register("clarifyAmount", {
          valueAsNumber: true,
          required: true,
          max: props.maxAmount,
        })}
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
                  Flat rate for services. We charged less because of the
                  agreement, and we can't fully cover the cost of a contractor
                  that charges more than the agreed rate. We will cover the
                  difference internally but the client should not be charged
                  more just because.
                  <br />
                  <strong>Important:</strong> We don't forget about the
                  contractor, it will be shown as uncovered part when displaying
                  reports against contractor costs, but here situation between
                  reports and client is considered as handled.
                </li>
                <li>
                  We applied some discounts to the invoice, and we can't fully
                  cover the cost of a contractor that charges more than the
                  agreed rate. We will cover the difference internally but the
                  client should not be charged more just because.
                </li>
                <li>
                  <strong>Client billing clarification:</strong>
                  Overhead we apply for given services.
                </li>
                <li>
                  <strong>Client billing clarification:</strong>
                  Reversed cost (ie we have another developer that comes from
                  the client, but for its convenience we invoice him not the
                  client).
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </AlertDescription>
      </Alert>
    </form>
  );
}
