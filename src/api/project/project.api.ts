import {
  DateFilter,
  dateFilterSchema,
} from "@/api/_common/query/filters/DateFilter.ts";
import {
  EnumFilter,
  enumFilterSchema,
} from "@/api/_common/query/filters/EnumFilter.ts";
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
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { z } from "zod";

export interface ProjectContractor {
  contractor: Contractor;
  workspaceId: Workspace["id"];
}

export interface ProjectPayload {
  name: string;
  status: "draft" | "active" | "closed";
  description: Nullable<string>;
  workspaceIds: Workspace["id"][];
  clientId: Client["id"];
}

export interface ProjectBase extends ProjectPayload {
  id: number;
  createdAt: Date;
}
export type Project = ProjectBase;

export type ProjectQuery = WithFilters<{
  clientId: EnumFilter<Client["id"]>;
  workspaceId: EnumFilter<Workspace["id"]>;
  createdAt: DateFilter;
  status: EnumFilter<"draft" | "active" | "closed">;
}> &
  WithSearch &
  WithPagination &
  WithSorter<"name" | "createdAt" | "status">;

export const projectQueryUtils = withBuilderUtils({
  ...withFiltersUtils<ProjectQuery>(),
  ...withPaginationUtils<ProjectQuery>(),
  ...withSorterUtils<ProjectQuery>(),
  ...withSearchUtils<ProjectQuery>(),
  ofDefault: (): ProjectQuery => ({
    search: "",
    filters: {
      clientId: null,
      workspaceId: null,
      status: null,
      createdAt: null,
    },
    page: paginationUtils.ofDefault(),
    sort: null,
  }),
  ensureDefault: (
    query: ProjectQuery,
    specs: { workspaceId: WorkspaceSpec; clientId: ClientSpec },
  ): ProjectQuery =>
    projectQueryUtils.transform(query).build((x) => [
      idSpecUtils.mapSpecificOrElse(
        specs.workspaceId,
        (id) => x.withFilter("workspaceId", { operator: "oneOf", value: [id] }),
        x.unchanged(),
      ),
      idSpecUtils.mapSpecificOrElse(
        specs.clientId,
        (id) =>
          x.withFilter("clientId", {
            operator: "oneOf",
            value: [id],
          }),
        x.unchanged(),
      ),
    ]),
  withEnsureDefault:
    (specs: { workspaceId: WorkspaceSpec; clientId: ClientSpec }) =>
    (query: ProjectQuery): ProjectQuery =>
      projectQueryUtils.ensureDefault(query, specs),
}).setInitialQueryFactory((q) => q.ofDefault);

const strToNull = (str: unknown) => (str === "" ? null : str);

export const projectQuerySchema = z
  .object({
    search: z.preprocess((value) => value || "", z.string()).default(""),
    filters: z.object({
      clientId: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      workspaceId: z
        .preprocess(strToNull, enumFilterSchema(z.coerce.number()).nullable())
        .default(null),
      createdAt: z
        .preprocess(strToNull, dateFilterSchema.nullable())
        .default(null),
      status: z
        .preprocess(
          strToNull,
          enumFilterSchema(z.enum(["draft", "active", "closed"])).nullable(),
        )
        .default(null),
    }),
    page: paginationSchema,
    sort: z
      .preprocess(
        strToNull,
        z
          .object({
            field: z.enum(["name", "createdAt", "status"]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch((e) => {
    console.error(e);
    return projectQueryUtils.ofDefault();
  });

export interface ProjectApi {
  getProjects: (query: ProjectQuery) => Promise<Project[]>;
  getProject: (id: Project["id"]) => Promise<Project>;
  getProjectContractors: (
    projectId: Project["id"],
  ) => Promise<ProjectContractor[]>;
  getProjectsByIds: (
    ids: Project["id"][],
  ) => Promise<Record<Project["id"], Project>>;
}
