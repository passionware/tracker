import { Billing, BillingPayload } from "@/api/billing/billing.api.ts";
import { Cost, CostPayload } from "@/api/cost/cost.api.ts";
import { LinkCostReportPayload } from "@/api/link-cost-report/link-cost-report.ts";
import {
  ProjectIteration,
  ProjectIterationPayload,
} from "@/api/project-iteration/project-iteration.api.ts";
import { Project, ProjectPayload } from "@/api/project/project.api.ts";
import { Report, ReportPayload } from "@/api/reports/reports.api.ts";
import { LinkBillingReportPayload } from "../link-billing-report/link-billing-report.api";

export interface MutationApi {
  linkReportAndBilling: (payload: LinkBillingReportPayload) => Promise<void>;
  linkCostAndReport: (payload: LinkCostReportPayload) => Promise<void>;
  createReport: (report: ReportPayload) => Promise<{ id: Report["id"] }>;
  createBilling: (billing: BillingPayload) => Promise<{ id: Billing["id"] }>;
  createProject: (project: ProjectPayload) => Promise<{ id: Project["id"] }>;
  createProjectIteration: (
    iteration: ProjectIterationPayload,
  ) => Promise<{ id: ProjectIteration["id"] }>;
  createCost: (cost: CostPayload) => Promise<{ id: Cost["id"] }>;
  deleteBillingReportLink: (linkId: number) => Promise<void>;
  deleteCostReportLink: (linkId: number) => Promise<void>;
  deleteCostReport: (reportId: number) => Promise<void>;
  deleteBilling: (billingId: number) => Promise<void>;
  deleteCost: (costId: number) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;
  updateCostReportLink: (
    linkId: number,
    payload: Partial<LinkCostReportPayload>,
  ) => Promise<void>;
  updateBillingReportLink: (
    linkId: number,
    payload: Partial<LinkBillingReportPayload>,
  ) => Promise<void>;

  editCost: (costId: number, payload: Partial<CostPayload>) => Promise<void>;
  editBilling: (
    billingId: number,
    payload: Partial<BillingPayload>,
  ) => Promise<void>;
  editReport: (
    reportId: number,
    payload: Partial<ReportPayload>,
  ) => Promise<void>;
  editProject: (
    projectId: number,
    payload: Partial<ProjectPayload>,
  ) => Promise<void>;
}
