import {
  AiMatchingService,
  BillingMatchInput,
  BankDocumentPayload,
} from "@/services/front/AiMatchingService/AiMatchingService.ts";
import {
  parseBankMatchAiJson,
  type BankMatchAiResponse,
} from "@/services/front/AiMatchingService/bankMatchAi.schema.ts";
import { GEMINI_API_KEY_VARIABLE_NAME } from "@/services/front/AiMatchingService/geminiVariables.ts";
import { resolveGeminiFromVariables } from "@/services/front/AiMatchingService/resolveGeminiFromVariables.ts";
import { VariableService } from "@/services/io/VariableService/VariableService.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_RETRIES_429 = 5;

function trimBillingsForPrompt(billings: BillingMatchInput[]): BillingMatchInput[] {
  return billings.map((b) => ({
    ...b,
    clientName:
      b.clientName.length > 100 ? `${b.clientName.slice(0, 100)}…` : b.clientName,
  }));
}

function buildDocumentPrompt(
  billings: BillingMatchInput[],
  defaultCurrency: string,
  fileName?: string,
): string {
  const billingsCompact = trimBillingsForPrompt(billings).map((b) => ({
    id: b.id,
    client: b.clientName,
    net: b.totalNet,
    gross: b.totalGross,
    currency: b.currency,
    issuedDate: b.invoiceDate,
  }));
  const bJson = JSON.stringify(billingsCompact);
  const nameHint = fileName ? `File name: ${fileName}\n` : "";
  return `You are given an attached bank statement or export (${nameHint}PDF, CSV, or plain text). Below is a JSON array of unpaid client invoices for the same business.

INVOICES (unpaid) — each item is { id, client, net, gross, currency, issuedDate }:
${bJson}

Default currency hint when comparing: "${defaultCurrency}"

GROUNDING (critical — read first)
- You MUST only output matches backed by **real content in the attached file**. Never invent bank lines, counterparty names, amounts, or dates from the invoice list alone.
- If the file is empty, unreadable, contains only headers, or has **no usable incoming payment rows** (e.g. CSV rows with empty amount/value cells, no numeric amounts, no meaningful description), return **"matches": []** and list **every** invoice id in **unmatchedBillingIds**. Do not fabricate matches to “complete” the task.
- CSV / spreadsheet: **ignore** rows where amount columns are blank, whitespace-only, or non-numeric; do not infer payment amounts from invoice data. Empty cells mean “no transaction here”.
- **One bank line → one invoice:** do not reuse the same underlying file line for multiple invoices unless the file truly contains one line that can only correspond to one invoice (default: one line, one match).
- **paymentTitle** and **paymentSummary** must be copied or tightly paraphrased from text that **actually appears** in the attached file (same counterparty fragments, same numbers, same date tokens). If you cannot point to such text, **do not** create a match — leave the invoice in **unmatchedBillingIds**.
- **justification** must briefly cite what you saw **in the file** (e.g. date + amount + title fragment), not generic wording copied from the invoice JSON alone.

TASK
- Read payment/transfer lines from the attached file (dates, amounts, titles, references, counterparty names).
- **Incoming only:** Match invoices only to **incoming** movements — money **received** by this account (credits, incoming transfers, incoming domestic/SEPA/SWIFT receipts, “Wpływy”, “Uznanie”, positive amounts in a “credit” column, etc.). **Do not** use outgoing payments, debits, sent transfers, card charges, fees, direct debits, or any line that represents money **leaving** the account — never attach an invoice to an outflow.
- Match each invoice id to at most ONE **incoming** bank line. Each bank line can match at most ONE invoice.
- Prefer amount alignment (compare gross or net vs the **incoming** payment amount; use absolute value only for comparing magnitudes once you have identified the line as an incoming receipt).
- Use transfer titles / remittance text heavily when they appear **in the file**: fill paymentTitle from that line and treat a clear invoice reference in the title as strong evidence for the match.

OUTPUT
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "matches": [
    {
      "billingId": number,
      "paidAt": "YYYY-MM-DD",
      "paymentTitle": string,
      "paymentAmount": number | null,
      "paymentSummary": string,
      "confidence": "high" | "medium" | "low",
      "justification": string
    }
  ],
  "unmatchedBillingIds": number[],
  "unmatchedPaymentHints": string[]
}

- paidAt: booking/settlement date of the matched payment (YYYY-MM-DD).
- paymentTitle: text taken from the **attached file** (transfer / remittance / description). Concise; must reflect real file content, not the invoice list alone.
- paymentAmount: numeric absolute amount of the **incoming** payment as shown **in the file** (same currency as the invoice unless the file clearly shows otherwise). Use **null** if the file row has no readable amount — in that case you usually must **not** match.
- paymentSummary: one compact line copied from or built only from the **actual** bank row (date + amount + counterparty fragment). If there is no such row, do not output a match.
- confidence: use **high** only when file evidence is strong (clear amount + date + title/REF alignment). Use **low** or omit the match when evidence is thin. Never assign **high** if you are guessing.
- unmatchedBillingIds: must list **every** invoice id from the input that has **no** grounded match in the file (if in doubt, leave unmatched).
- unmatchedPaymentHints: short free-text lines for notable **incoming** movements you could not match (can be empty array).
`;
}

function normalizeMimeType(file: BankDocumentPayload): string {
  if (file.mimeType && file.mimeType.length > 0) {
    return file.mimeType;
  }
  const n = file.fileName?.toLowerCase() ?? "";
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".csv")) return "text/csv";
  if (n.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function retryDelayMsFromError(err: unknown): number {
  const text =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : JSON.stringify(err);

  const inline = text.match(/retry in ([\d.]+)s/i);
  if (inline) {
    return Math.min(120_000, Math.ceil(parseFloat(inline[1]) * 1000) + 500);
  }
  try {
    const parsed = JSON.parse(text) as { error?: { details?: unknown[] } };
    const details = parsed?.error?.details;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (
          d &&
          typeof d === "object" &&
          "@type" in d &&
          String((d as { "@type": string })["@type"]).includes("RetryInfo")
        ) {
          const delay = (d as { retryDelay?: string }).retryDelay;
          if (delay && /^\d+s$/.test(delay)) {
            return Math.min(
              120_000,
              (parseInt(delay, 10) || 32) * 1000 + 500,
            );
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return 10_000;
}

function isRateLimitError(err: unknown): boolean {
  const text =
    err instanceof Error ? err.message : JSON.stringify(err ?? "");
  return (
    text.includes("429") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.includes("quota") ||
    text.includes("Quota exceeded")
  );
}

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES_429; attempt++) {
    try {
      const result = await model.generateContent(parts);
      return result.response.text();
    } catch (e) {
      lastErr = e;
      if (!isRateLimitError(e) || attempt === MAX_RETRIES_429 - 1) {
        throw e;
      }
      const wait = retryDelayMsFromError(e);
      await sleep(wait);
    }
  }
  throw lastErr;
}

export function createAiMatchingService(config: {
  variableService: VariableService;
}): AiMatchingService {
  return {
    matchBankDocumentToBillings: async (file, billings, options) => {
      if (billings.length === 0) {
        return {
          matches: [],
          unmatchedBillingIds: [],
          unmatchedPaymentHints: [],
        };
      }
      const ctx = options?.variableContext;
      if (!ctx) {
        throw new Error("variableContext is required for AI bank matching.");
      }
      const resolved = await resolveGeminiFromVariables(
        config.variableService,
        ctx,
      );
      if (!resolved) {
        throw new Error(
          `Missing Gemini API key: add a const variable named "${GEMINI_API_KEY_VARIABLE_NAME}" under Variables for this workspace/client.`,
        );
      }
      const { apiKey, modelId } = resolved;
      const defaultCurrency = options?.defaultCurrency ?? "PLN";
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });
      const prompt = buildDocumentPrompt(
        billings,
        defaultCurrency,
        file.fileName,
      );
      const mimeType = normalizeMimeType(file);
      const parts: Parameters<typeof generateContentWithRetry>[1] = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: file.dataBase64,
          },
        },
      ];
      const text = await generateContentWithRetry(model, parts);
      const parsed = parseBankMatchAiJson(text);
      return reconcileBankMatchResponse(parsed, billings);
    },
  };
}

/** Drop invalid / ungrounded matches and fix unmatchedBillingIds vs known billings. */
function reconcileBankMatchResponse(
  parsed: BankMatchAiResponse,
  billings: BillingMatchInput[],
): BankMatchAiResponse {
  const allowedIds = new Set(billings.map((b) => b.id));

  const grounded = parsed.matches.filter((m) => {
    if (!allowedIds.has(m.billingId)) {
      return false;
    }
    const title = m.paymentTitle.trim();
    const summary = m.paymentSummary.trim();
    if (title.length === 0 && summary.length === 0) {
      return false;
    }
    return true;
  });

  const onePerInvoice = new Map<number, BankMatchAiResponse["matches"][number]>();
  for (const m of grounded) {
    if (!onePerInvoice.has(m.billingId)) {
      onePerInvoice.set(m.billingId, m);
    }
  }

  const seenLine = new Set<string>();
  const deduped: BankMatchAiResponse["matches"] = [];
  for (const m of onePerInvoice.values()) {
    const key = `${m.paymentTitle.trim()}|${m.paymentSummary.trim()}`;
    if (seenLine.has(key)) {
      continue;
    }
    seenLine.add(key);
    deduped.push(m);
  }

  const matchedIds = new Set(deduped.map((m) => m.billingId));
  const unmatchedBillingIds = billings
    .map((b) => b.id)
    .filter((id) => !matchedIds.has(id));

  return {
    matches: deduped,
    unmatchedBillingIds,
    unmatchedPaymentHints: parsed.unmatchedPaymentHints ?? [],
  };
}
