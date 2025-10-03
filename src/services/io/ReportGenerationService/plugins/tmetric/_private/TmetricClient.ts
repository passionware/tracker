import { z } from "zod";
import {
  TMetricAuthConfig,
  TMetricFetchParams,
  TMetricProject,
  TMetricTimeEntry,
  TMetricUser,
  zTMetricEntriesResponse,
  zTMetricProjectsResponse,
  zTMetricUsersResponse,
} from "./TmetricSchemas.ts";

async function get<T>(
  url: string,
  token: string,
  schema: z.ZodType<T>,
): Promise<T> {
  console.log(`TMetric API Request: ${url}`);
  console.log(
    `Authorization: Bearer ${token ? token.substring(0, 10) + "..." : "undefined"}`,
  );

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`TMetric API Error: ${res.status} ${res.statusText}`);
    console.error(`Response: ${errorText}`);
    throw new Error(
      `TMetric GET failed: ${res.status} ${res.statusText} ${errorText}`,
    );
  }

  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `TMetric response validation failed: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

export interface TMetricClient {
  listTimeEntries(params: TMetricFetchParams): Promise<TMetricTimeEntry[]>;
  listProjects(): Promise<TMetricProject[]>;
  listUsers(): Promise<TMetricUser[]>;
}

export function createTMetricClient(config: TMetricAuthConfig): TMetricClient {
  const base = config.baseUrl.replace(/\/$/, "");
  const accountId = config.accountId;

  return {
    listTimeEntries: async ({
      periodStart,
      periodEnd,
      userIds,
      // projectIds,
    }) => {
      // Format dates as yyyy-MM-dd
      function format(date: Date): string {
        // Use toISOString and slice to get yyyy-MM-dd
        return date.toISOString().slice(0, 10);
      }

      const startDate = format(periodStart);
      const endDate = format(periodEnd);

      // Build query parameters using URLSearchParams for proper encoding
      // Match the working curl command format exactly
      const qs = new URLSearchParams();

      if (userIds && userIds.length > 0) {
        qs.set("userId", userIds.join(","));
      }

      qs.set("startDate", startDate);
      qs.set("endDate", endDate);

      // if (projectIds && projectIds.length > 0) {
      //   qs.set("projectId", projectIds.join(","));
      // }

      // Compose the URL for the TMetric API endpoint for time entries
      // Try with account ID in path but simpler parameter names
      const url = `${base}/v3/accounts/${accountId}/timeentries?${qs.toString()}`;

      const data = await get(url, config.token, zTMetricEntriesResponse);

      // Filter out running entries without endTime and normalize note to required string
      return data
        .filter((e) => !!e.endTime)
        .map((e) => ({ ...e, note: e.note ?? "", tags: e.tags ?? [] }));
    },
    listProjects: async () => {
      // Use TMetric API v3 endpoint for projects (as mentioned by user)
      const url = `${base}/v3/accounts/${accountId}/projects`;
      return await get(url, config.token, zTMetricProjectsResponse);
    },
    listUsers: async () => {
      // Use TMetric API v3 endpoint for users
      const url = `${base}/v3/accounts/${accountId}/users`;
      return await get(url, config.token, zTMetricUsersResponse);
    },
  };
}
