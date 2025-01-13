import { Badge } from "@/components/ui/badge.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";

export const headers = {
  chargeStatus: (
    <div className="space-y-4">
      <PopoverHeader>Charge status</PopoverHeader>
      <div>
        <Badge variant="positive">Billed</Badge> - We charged the client for the
        entire work value reported by the contractor
      </div>
      <div>
        <Badge variant="warning">Partially billed</Badge> - We charged the
        client for some work, but there is still some work we should charge the
        client for.
      </div>
      <div>
        <Badge variant="destructive">Uncovered</Badge> - We did not charge the
        client for any work reported by the contractor yet.
      </div>
      <div>
        <Badge variant="secondary">Clarified</Badge> - We charged for some work,
        and for the rest of work we didn't charge the client, but we clarified
        the difference, no more charges due to this report is expected.
      </div>
    </div>
  ),
  compensationStatus: (
    <div className="space-y-4">
      <PopoverHeader>Compensation status</PopoverHeader>
      <div>
        <Badge variant="positive">Paid</Badge> - The contractor was paid for the
        value reported by the contractor to the amount charged to the client.
      </div>
      <div>
        <Badge variant="warning">Partially</Badge> - The contractor was
        compensated for some work, but there is still some work we should
        compensate the contractor for.
      </div>
      <div>
        <Badge variant="destructive">Unpaid</Badge> - The contractor was not
        compensated for any work reported by the contractor yet.
      </div>
    </div>
  ),
  fullCompensationStatus: (
    <div className="space-y-4">
      <PopoverHeader>Full compensation status</PopoverHeader>
      <div>
        <Badge variant="positive">Compensated</Badge> - The contractor was
        compensated for the entire work value reported by the contractor
      </div>
      <div>
        <Badge variant="warning">Partially</Badge> - The contractor was
        compensated for some work, but there is still some work we should
        compensate the contractor for.
      </div>
      <div>
        <Badge variant="destructive">Unpaid</Badge> - The contractor was not
        compensated for any work reported by the contractor yet.
      </div>
    </div>
  ),
  amount: "How much the contractor was compensated for reported work",
  toPay: "How much to pay against reported&charged amount",
  toCompensate:
    "How much compensation is remaining to cover the reported amount, no matter how much we actually charged the client. Sometimes we charge the client less for the report, but still the contractor can be compensated, but from different money. In such case we link another cost with this report.",
};
