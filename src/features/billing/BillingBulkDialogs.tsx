import {
  BulkDeleteAlertDialog,
} from "@/features/_common/bulk/BulkDeleteAlertDialog.tsx";
import type { BillingMatcherRestorePayload } from "@/features/billing/billingPaymentMatcherPersistence.ts";
import { BillingPaymentMatcherDialog } from "@/features/billing/BillingPaymentMatcher.tsx";
import type { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { MarkAsPaidDialog } from "@/features/billing/MarkAsPaidDialog.tsx";
import type { MarkAsPaidConfirmPayload } from "@/features/billing/useMarkAsPaidDialogForm.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import type { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import type { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";

export interface BillingBulkDialogsProps {
  services: BillingWidgetProps["services"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  variableContext: ExpressionContext;
  billingLookupEntries: BillingViewEntry[];
  unpaidBillingsSnapshot: BillingViewEntry[];
  bulkMarkPaidOpen: boolean;
  onBulkMarkPaidOpenChange: (open: boolean) => void;
  paymentMatcherOpen: boolean;
  onPaymentMatcherOpenChange: (open: boolean) => void;
  deleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: (open: boolean) => void;
  selectedBillingIds: number[];
  onBulkMarkPaidConfirm: (
    data: MarkAsPaidConfirmPayload,
  ) => void | Promise<void>;
  deleteInProgress: boolean;
  onBulkDeleteConfirm: () => void | Promise<void>;
  matcherRestorePayload: BillingMatcherRestorePayload | null;
  onMatcherRestoreConsumed?: () => void;
}

export function BillingBulkDialogs({
  services,
  workspaceId,
  clientId,
  variableContext,
  billingLookupEntries,
  unpaidBillingsSnapshot,
  bulkMarkPaidOpen,
  onBulkMarkPaidOpenChange,
  paymentMatcherOpen,
  onPaymentMatcherOpenChange,
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  selectedBillingIds,
  onBulkMarkPaidConfirm,
  deleteInProgress,
  onBulkDeleteConfirm,
  matcherRestorePayload,
  onMatcherRestoreConsumed,
}: BillingBulkDialogsProps) {
  const count = selectedBillingIds.length;

  return (
    <>
      <MarkAsPaidDialog
        open={bulkMarkPaidOpen}
        onOpenChange={onBulkMarkPaidOpenChange}
        bulk
        title="Mark selected invoices as paid"
        onConfirm={onBulkMarkPaidConfirm}
      />
      <BillingPaymentMatcherDialog
        open={paymentMatcherOpen}
        onOpenChange={onPaymentMatcherOpenChange}
        services={services}
        unpaidBillings={unpaidBillingsSnapshot}
        billingLookupEntries={billingLookupEntries}
        variableContext={variableContext}
        workspaceId={workspaceId}
        clientId={clientId}
        restorePayload={matcherRestorePayload}
        onRestoreConsumed={onMatcherRestoreConsumed}
      />
      <BulkDeleteAlertDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmOpenChange}
        title="Delete selected invoices?"
        description={
          <>
            Are you sure you want to delete {count} selected billing(s)? This
            action cannot be undone.
          </>
        }
        deleteInProgress={deleteInProgress}
        onConfirmDelete={onBulkDeleteConfirm}
        deletingLabel="Deleting..."
        confirmLabel="Delete"
      />
    </>
  );
}
