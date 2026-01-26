/**
 * We need first to define types that describe reconciliation input.
 * It is declaration of the effect of the reconciliation.
 */

import { BillingPayload } from "@/api/billing/billing.api";
import { CostPayload } from "@/api/cost/cost.api";
import { ReconcileLinkBillingReportPayload } from "@/api/link-billing-report/link-billing-report.api";
import { LinkCostReportPayload } from "@/api/link-cost-report/link-cost-report";
import { ReportPayload } from "@/api/reports/reports.api";

export type FactAction =
  | { type: "ignore" }
  | { type: "create" }
  | { type: "update"; id: number; oldValues?: Record<string, unknown> };

export interface FactBase {
  // whenever we want to adjust specific item base
  uuid: string;
  // Planned action for this fact
  action: FactAction;
}

/**
 * We expect to have a report of a specific contractor for specific project iteration of a specific amount and currency etc
 */
export interface ReportFact extends FactBase {
  type: "report";
  // there are optional fields that are nullable due to historical reasons, we now require all fields to be defined
  payload: Required<ReportPayload>;
}

export interface BillingFact extends FactBase {
  type: "billing";
  payload: Required<BillingPayload>;
}

export interface CostFact extends FactBase {
  type: "cost";
  payload: Required<CostPayload>;
}

export interface LinkCostReportFact extends FactBase {
  type: "linkCostReport";
  payload: Required<LinkCostReportPayload>;
  // Source of truth for cost-report relationships
  // Array of fact UUIDs
  linkedFacts: Fact["uuid"][];
}

export interface LinkBillingReportFact extends FactBase {
  type: "linkBillingReport";
  payload: Required<ReconcileLinkBillingReportPayload>;
  // Source of truth for report-billing relationships
  // Array of fact UUIDs
  linkedFacts: Fact["uuid"][];
}

export type Fact =
  | ReportFact
  | BillingFact
  | CostFact
  | LinkCostReportFact
  | LinkBillingReportFact;

export interface ReconciliationInput {
  // we just describe our expectations here
  facts: Fact[];
}
