import {
  clearBillingPaymentMatcherDraft,
  draftScopeMatchesRoute,
  readBillingPaymentMatcherDraft,
  type BillingMatcherRestorePayload,
} from "@/features/billing/billingPaymentMatcherPersistence.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { rd, type RemoteData } from "@passionware/monads";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * After reload, restores the payment-matcher drawer from localStorage when
 * scope and selection still match the current billing view.
 */
export function useRestoreBillingPaymentMatcherDraft<
  TView extends { entries: BillingViewEntry[] },
>(args: {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  finalBillings: RemoteData<TView>;
  onRestored: (
    selectedUnpaidSnapshot: BillingViewEntry[],
    restorePayload: BillingMatcherRestorePayload,
  ) => void;
}): void {
  const { workspaceId, clientId, finalBillings, onRestored } = args;
  const restoreDoneRef = useRef(false);
  const onRestoredRef = useRef(onRestored);
  onRestoredRef.current = onRestored;

  useEffect(() => {
    restoreDoneRef.current = false;
  }, [workspaceId, clientId]);

  useEffect(() => {
    if (restoreDoneRef.current) {
      return;
    }
    const draft = readBillingPaymentMatcherDraft();
    if (!draft) {
      restoreDoneRef.current = true;
      return;
    }
    if (!draftScopeMatchesRoute(draft, workspaceId, clientId)) {
      restoreDoneRef.current = true;
      return;
    }
    const view = rd.tryGet(finalBillings);
    if (!view) {
      return;
    }
    const selected = view.entries.filter((e) =>
      draft.selectedBillingIds.includes(e.id),
    );
    if (selected.length === 0) {
      clearBillingPaymentMatcherDraft();
      restoreDoneRef.current = true;
      return;
    }
    onRestoredRef.current(selected, {
      aiResponse: draft.aiResponse,
      defaultCurrency: draft.defaultCurrency,
      fileName: draft.fileName,
    });
    restoreDoneRef.current = true;
    toast.info("Restored your last AI match — review before applying.");
  }, [finalBillings, workspaceId, clientId]);
}
