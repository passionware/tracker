import { ContractorReportBase } from "@/api/contractor-reports/contractor-reports.api.ts";
import { CostBase } from "@/api/cost/cost.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export type LinkCostReportBase = {
  id: number;
  createdAt: Date;
  costAmount: number;
  reportAmount: number;
  description: string;
  costId: Nullable<number>;
  contractorReportId: Nullable<number>;
};

export interface LinkCostReport extends LinkCostReportBase {
  cost: CostBase | null;
  report: ContractorReportBase | null;
}
