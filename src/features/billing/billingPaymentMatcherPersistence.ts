import type { BankMatchAiResponse } from "@/services/front/AiMatchingService/bankMatchAi.schema.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { z } from "zod";

const STORAGE_KEY = "billing-payment-matcher-ai-draft";

const scopePart = z.union([z.literal("all"), z.number().int()]);

const bankMatchAiResponseSchema = z.object({
  matches: z.array(
    z.object({
      billingId: z.number().int(),
      paidAt: z.string(),
      paymentTitle: z.string().optional().default(""),
      paymentAmount: z.number().nullable().optional(),
      paymentSummary: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      justification: z.string(),
    }),
  ),
  unmatchedBillingIds: z.array(z.number().int()),
  unmatchedPaymentHints: z.array(z.string()),
});

const persistedSchema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  workspace: scopePart,
  client: scopePart,
  selectedBillingIds: z.array(z.number().int()),
  aiResponse: bankMatchAiResponseSchema,
  defaultCurrency: z.string(),
  fileName: z.string().optional(),
});

export type BillingPaymentMatcherPersistedDraft = z.infer<
  typeof persistedSchema
>;

/** Subset passed into the matcher UI when restoring after reload. */
export type BillingMatcherRestorePayload = Pick<
  BillingPaymentMatcherPersistedDraft,
  "aiResponse" | "defaultCurrency" | "fileName"
>;

function serializeScope(
  workspaceId: WorkspaceSpec,
  clientId: ClientSpec,
): { workspace: "all" | number; client: "all" | number } {
  return {
    workspace: idSpecUtils.isAll(workspaceId) ? "all" : workspaceId,
    client: idSpecUtils.isAll(clientId) ? "all" : clientId,
  };
}

export function draftScopeMatchesRoute(
  draft: BillingPaymentMatcherPersistedDraft,
  workspaceId: WorkspaceSpec,
  clientId: ClientSpec,
): boolean {
  const s = serializeScope(workspaceId, clientId);
  return draft.workspace === s.workspace && draft.client === s.client;
}

export function saveBillingPaymentMatcherDraft(input: {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  selectedBillingIds: number[];
  aiResponse: BankMatchAiResponse;
  defaultCurrency: string;
  fileName?: string;
}): void {
  const scope = serializeScope(input.workspaceId, input.clientId);
  const payload: BillingPaymentMatcherPersistedDraft = {
    version: 1,
    savedAt: Date.now(),
    workspace: scope.workspace,
    client: scope.client,
    selectedBillingIds: input.selectedBillingIds,
    aiResponse: input.aiResponse,
    defaultCurrency: input.defaultCurrency,
    fileName: input.fileName,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readBillingPaymentMatcherDraft(): BillingPaymentMatcherPersistedDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = persistedSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearBillingPaymentMatcherDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
