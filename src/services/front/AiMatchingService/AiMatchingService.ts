import type { BankMatchAiResponse } from "@/services/front/AiMatchingService/bankMatchAi.schema.ts";
import type { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";

/** Slim billing facts sent to the model (keeps token count low). */
export interface BillingMatchInput {
  id: number;
  clientName: string;
  totalNet: number;
  totalGross: number;
  currency: string;
  /** Invoice issue date YYYY-MM-DD */
  invoiceDate: string;
}

export interface BankDocumentPayload {
  /** Base64-encoded file body (no data: URL prefix). */
  dataBase64: string;
  mimeType: string;
  fileName?: string;
}

export interface AiMatchingService {
  matchBankDocumentToBillings: (
    file: BankDocumentPayload,
    billings: BillingMatchInput[],
    options?: {
      defaultCurrency?: string;
      /**
       * Required when `billings` is non-empty. Loads const variables
       * `GEMINI_API_KEY` / optional `GEMINI_MODEL` for this scope.
       */
      variableContext?: ExpressionContext;
    },
  ) => Promise<BankMatchAiResponse>;
}

export interface WithAiMatchingService {
  aiMatchingService: AiMatchingService;
}
