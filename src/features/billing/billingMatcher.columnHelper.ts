import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import { createColumnHelper } from "@tanstack/react-table";

export const billingMatcherColumnHelper =
  createColumnHelper<BillingMatcherDraftMatch>();
