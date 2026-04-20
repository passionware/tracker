/**
 * Rate snapshot schema — the shape persisted on every time entry and on every
 * `RateSet` event. Time tracking intentionally carries only the "what did the
 * contractor agree to be paid per unit of work" shape; the downstream
 * reports/billing system (see `src/api/reports/**`) layers its own
 * cost-to-billing, FX, and invoice-currency concerns on top, so we do *not*
 * duplicate them here. Keeping this narrow means a time entry never has to
 * answer "what does this mean in EUR?" — reports do that when they need to.
 *
 * Two related shapes:
 *   - `rateDefinitionSchema`  — per-unit pricing only (used in `rate_current`
 *                                and the `RateSet` event payload). No
 *                                quantity or net value.
 *   - `rateSnapshotSchema`    — extends the definition with the realised
 *                                `quantity` and `netValue`. Used on the
 *                                `entry` read model and inside `EntryStarted`.
 *                                Both quantity and netValue are optional at
 *                                start time; the projection fills them when
 *                                the entry stops (timer entries) or when the
 *                                user enters them manually (piece entries).
 *
 * Pure Zod, no transformations, no I/O — safe to import from a Cloudflare
 * Worker, the React app, or a Node test runner.
 */

import { z } from "zod";

// ISO 4217 currency code. We don't bind to an exhaustive enum — projects in
// the wild use private codes (e.g. "INTERNAL") — but we do enforce 3-letter
// upper-case canonicalisation at the schema boundary.
const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "expected ISO 4217 currency code, e.g. PLN / EUR / USD");

// Free-form unit. The frontend treats "h" / "d" / "pc" specially (hours /
// days / pieces) but the schema accepts any non-empty short string so we do
// not have to schema-evolve every time someone adds a unit.
const rateUnitSchema = z
  .string()
  .trim()
  .min(1, "unit must be a non-empty string")
  .max(16, "unit must be ≤ 16 chars (e.g. 'h', 'd', 'pc', 'session')");

export const rateDefinitionSchema = z.object({
  unit: rateUnitSchema,
  unitPrice: z
    .number()
    .nonnegative("unit price must be ≥ 0")
    .finite(),
  currency: currencyCodeSchema,
});

export type RateDefinition = z.infer<typeof rateDefinitionSchema>;

export const rateSnapshotSchema = rateDefinitionSchema.extend({
  // Realised quantity. Optional at start (timer entries fill it when stopped).
  quantity: z.number().nonnegative().finite().optional(),
  // Computed = quantity * unitPrice. Optional at start; filled in the same
  // moment as quantity. Stored explicitly so analytics can SUM without
  // recomputing per-row.
  netValue: z.number().nonnegative().finite().optional(),
});

export type RateSnapshot = z.infer<typeof rateSnapshotSchema>;

/**
 * Helper: compute netValue from quantity + unitPrice with 2-decimal rounding.
 * Mirrors `ReportValidation.calculateNetValueFromBreakdown`.
 */
export function computeNetValue(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Helper: derive the realised quantity from a duration when the unit is
 * time-based. Returns `undefined` for non-time units (the caller must supply
 * a manual quantity).
 */
export function quantityFromDuration(
  unit: RateDefinition["unit"],
  durationSeconds: number,
): number | undefined {
  switch (unit) {
    case "h":
      return Math.round((durationSeconds / 3600) * 10000) / 10000;
    case "d":
      return Math.round((durationSeconds / 86400) * 10000) / 10000;
    default:
      return undefined;
  }
}
