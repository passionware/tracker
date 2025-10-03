import {z} from "zod";

// TMetric REST payloads we care about (matching actual API response)
export const zTMetricClient = z.object({
  id: z.number(),
  name: z.string(),
  iconUrl: z.string().optional(),
});

export type TMetricClient = z.infer<typeof zTMetricClient>;

export const zTMetricProject = z.object({
  id: z.number(),
  name: z.string(),
  iconUrl: z.string().optional(),
  client: zTMetricClient,
  status: z.string(),
  isBillable: z.boolean(),
});

export type TMetricProject = z.infer<typeof zTMetricProject>;

export const zTMetricUser = z.object({
  id: z.number(),
  displayName: z.string().optional(),
});

export type TMetricUser = z.infer<typeof zTMetricUser>;

export const zTMetricTimeEntry = z.object({
  id: z.number(),
  project: zTMetricProject,
  note: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isBillable: z.boolean(),
  isInvoiced: z.boolean(),
  startTime: z.string(), // ISO format
  endTime: z.string().nullable(), // ISO format or null if running; we will filter these out
});

export type TMetricTimeEntry = z.infer<typeof zTMetricTimeEntry>;

export const zTMetricEntriesResponse = z.array(zTMetricTimeEntry);

export const zTMetricProjectsResponse = z.array(zTMetricProject);

export const zTMetricUsersResponse = z.array(zTMetricUser);

export interface TMetricAuthConfig {
  baseUrl: string; // e.g. https://app.tmetric.com/api
  token: string; // Bearer token
  accountId: string; // TMetric account ID for v3 API
}

]

export interface TMetricFetchParams {
  periodStart: Date;
  periodEnd: Date;
  userIds: string[]; // optional, overrides whitelist
  projectIds: string[]; // optional, overrides whitelist
}
