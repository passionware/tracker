import {
  DateFilter,
  dateFilterSchema,
} from "@/api/_common/query/filters/DateFilter.ts";
import {
  EnumFilter,
  enumFilterSchema,
} from "@/api/_common/query/filters/EnumFilter.ts";
import {
  NumberFilter,
  numberFilterSchema,
} from "@/api/_common/query/filters/NumberFilter.ts";
import {
  paginationSchema,
  paginationUtils,
} from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Contractor, ContractorBase } from "@/api/contractor/contractor.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { ReportBase } from "@/api/reports/reports.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { CalendarDate } from "@internationalized/date";
import { Maybe } from "@passionware/monads";
import { chain } from "lodash";
import { z } from "zod";

export interface CostPayload {
  invoiceNumber: Maybe<string>;
  counterparty: Maybe<string>;
  description: Maybe<string>;
  invoiceDate: CalendarDate;
  netValue: number;
  grossValue: Maybe<number>;
  contractorId: Maybe<Contractor["id"]>;
  currency: string;
  workspaceId: Workspace["id"];
}

export interface CostBase extends CostPayload {
  id: number;
  createdAt: Date;
}

export interface Cost extends CostBase {
  contractor: Nullable<ContractorBase>;
  linkReports: { link: LinkCostReport; report: ReportBase }[];
}

export type CostQuery = WithSearch &
  WithFilters<{
    workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
    clientId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    /**
     * We want to see costs that are either linked to the client via contractor report, or linked to contractors that have any report linked to the client
     */
    potentialClientId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    linkedRemainder: Nullable<NumberFilter>;
    linkedAmount: Nullable<NumberFilter>;
    invoiceDate: Nullable<DateFilter>;
  }> &
  WithPagination &
  WithSorter<
    | "workspace"
    | "contractor"
    | "counterparty"
    | "invoiceNumber"
    | "invoiceDate"
    | "createdAt"
    | "netValue"
    | "grossValue"
    | "description"
  >;

export const costQueryUtils = withBuilderUtils({
  ...withFiltersUtils<CostQuery>(),
  ...withSorterUtils<CostQuery>(),
  ...withSearchUtils<CostQuery>(),
  ...withPaginationUtils<CostQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): CostQuery =>
    costQueryUtils.ensureDefault(
      {
        search: "",
        filters: {
          workspaceId: null,
          clientId: null,
          contractorId: null,
          linkedRemainder: null,
          linkedAmount: null,
          potentialClientId: null,
          invoiceDate: null,
        },
        page: paginationUtils.ofDefault(),
        sort: { field: "contractor", order: "asc" },
      },
      workspaceId,
      clientId,
    ),
  withEnsureDefault:
    (workspaceId: WorkspaceSpec, clientId: ClientSpec) =>
    (query: CostQuery): CostQuery =>
      costQueryUtils.ensureDefault(query, workspaceId, clientId),
  ensureDefault: (
    // todo builder?
    query: CostQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): CostQuery =>
    chain(query)
      .thru((x) =>
        costQueryUtils.setFilter(
          x,
          "workspaceId",
          idSpecUtils.mapSpecificOrElse(
            workspaceId,
            (x) => ({ operator: "oneOf", value: [x] }),
            query.filters.workspaceId,
          ),
        ),
      )
      .thru((x) =>
        costQueryUtils.setFilter(
          x,
          "clientId",
          idSpecUtils.mapSpecificOrElse(
            clientId,
            (x) => ({ operator: "oneOf", value: [x] }),
            query.filters.clientId,
          ),
        ),
      )
      .value(),
}).setInitialQueryFactory((api) => api.ofDefault);

const strToNull = (str: unknown) => (str === "" ? null : str);

export const costQuerySchema = z
  .object({
    search: z.preprocess((value) => value || "", z.string()).default(""),
    filters: z.object({
      workspaceId: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      clientId: z
        .preprocess(
          strToNull,
          enumFilterSchema(z.coerce.number().nullable()).nullable(),
        )
        .default(null),
      potentialClientId: z
        .preprocess(
          strToNull,
          enumFilterSchema(z.coerce.number().nullable()).nullable(),
        )
        .default(null),
      contractorId: z
        .preprocess(
          strToNull,
          enumFilterSchema(z.coerce.number().nullable()).nullable(),
        )
        .default(null),
      linkedRemainder: z
        .preprocess(strToNull, numberFilterSchema.nullable())
        .default(null),
      linkedAmount: z
        .preprocess(strToNull, numberFilterSchema.nullable())
        .default(null),
      invoiceDate: z
        .preprocess(strToNull, dateFilterSchema.nullable())
        .default(null),
    }),
    page: paginationSchema,
    sort: z
      .preprocess(
        strToNull,
        z
          .object({
            field: z.enum([
              "workspace",
              "contractor",
              "counterparty",
              "invoiceNumber",
              "invoiceDate",
              "createdAt",
              "netValue",
              "grossValue",
              "description",
            ]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch((e) => {
    console.error(e);
    return costQueryUtils.ofDefault(idSpecUtils.ofAll(), idSpecUtils.ofAll());
  });

export interface CostApi {
  getCosts: (query: CostQuery) => Promise<Cost[]>;
  getCost: (id: Maybe<Cost["id"]>) => Promise<Cost>;
}
