import { SupabaseClient } from "@supabase/supabase-js";
import { parseDate } from "@internationalized/date";
import type { CalendarDate } from "@internationalized/date";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { dateToCalendarDate } from "@/platform/lang/internationalized-date";
import { cockpitCubeReport$ } from "./cockpit-cube-reports.api.http.schema";
import { CockpitCubeReportsApi } from "./cockpit-cube-reports.api";

function parseToCalendarDate(value: unknown): CalendarDate | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
      return parseDate(dateOnly);
    } catch {
      return null;
    }
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return dateToCalendarDate(value);
  }
  return null;
}

function extractExplicitRange(
  cubeData: any,
): { start_date: CalendarDate; end_date: CalendarDate } | null {
  if (!cubeData) {
    return null;
  }

  const candidates = [
    cubeData?.dateRange,
    cubeData?.meta?.dateRange,
    cubeData?.metadata?.dateRange,
    cubeData?.range,
    {
      start: cubeData?.start_date,
      end: cubeData?.end_date,
    },
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const startValue = candidate.start ?? candidate.from ?? candidate.begin;
    const endValue = candidate.end ?? candidate.to ?? candidate.finish;

    const start = parseToCalendarDate(startValue);
    const end = parseToCalendarDate(endValue);

    if (start && end) {
      return { start_date: start, end_date: end };
    }
  }

  return null;
}

// Fallback when no range can be resolved: use metadata/report timestamps (single day), never "today"
function fallbackRangeFromCreatedAt(report: {
  created_at?: string;
  updated_at?: string;
  cube_config?: Record<string, unknown>;
  cube_data?: Record<string, unknown>;
}): { start_date: CalendarDate; end_date: CalendarDate } {
  const configMeta = report.cube_config?.metadata as
    | Record<string, unknown>
    | undefined;
  const dataMeta = report.cube_data?.meta as
    | Record<string, unknown>
    | undefined;
  const candidates = [
    configMeta?.createdAt,
    dataMeta?.createdAt,
    report.created_at,
    dataMeta?.updatedAt,
    report.updated_at,
  ];
  for (const value of candidates) {
    const date = parseToCalendarDate(value);
    if (date) return { start_date: date, end_date: date };
  }
  // Only if no timestamp is available/parseable (should not happen for DB reports)
  return {
    start_date: parseDate("1970-01-01"),
    end_date: parseDate("1970-01-01"),
  };
}

// Resolve date range: prefer cube_config.dateRange (set on export), then cube_data, then time entries, then created_at
function resolveDateRange(report: {
  created_at?: string;
  cube_config?: Record<string, unknown>;
  cube_data?: Record<string, unknown>;
}): { start_date: CalendarDate; end_date: CalendarDate } {
  const explicitFromConfig = report.cube_config
    ? extractExplicitRange(report.cube_config as Record<string, unknown>)
    : null;
  if (explicitFromConfig) return explicitFromConfig;

  const explicitFromData = report.cube_data
    ? extractExplicitRange(report.cube_data as Record<string, unknown>)
    : null;
  if (explicitFromData) return explicitFromData;

  const fromTimeEntries = calculateDateRangeFromCubeData(
    report.cube_data,
    report,
  );
  if (fromTimeEntries) return fromTimeEntries;

  return fallbackRangeFromCreatedAt(report);
}

// Derive date range from cube data only (time entries or explicit range); returns null when none
function calculateDateRangeFromCubeData(
  cubeData: Record<string, unknown> | undefined,
  report?: { cube_config?: Record<string, unknown> },
): { start_date: CalendarDate; end_date: CalendarDate } | null {
  try {
    const explicitRange = cubeData
      ? extractExplicitRange(cubeData as Record<string, unknown>)
      : null;
    if (explicitRange) return explicitRange;

    const data = cubeData?.data;
    if (!Array.isArray(data) || data.length === 0) return null;

    const dates = data
      .map((item: unknown) => {
        const obj = item as Record<string, unknown>;
        if (obj?.startAt) {
          const date = new Date(obj.startAt as string);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      })
      .filter((date): date is Date => date !== null);

    if (dates.length === 0) return null;

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    return {
      start_date: dateToCalendarDate(minDate),
      end_date: dateToCalendarDate(maxDate),
    };
  } catch (error) {
    console.warn("Failed to calculate date range from cube data:", error);
    const dateRange = cubeData?.dateRange as
      | { start?: string; end?: string }
      | undefined;
    const start = parseToCalendarDate(dateRange?.start);
    const end = parseToCalendarDate(dateRange?.end);
    if (start && end) return { start_date: start, end_date: end };
    const createdAt = (
      report?.cube_config?.metadata as Record<string, unknown> | undefined
    )?.createdAt;
    const day = parseToCalendarDate(createdAt);
    if (day) return { start_date: day, end_date: day };
    return null;
  }
}

export function createCockpitCubeReportsApi(
  client: SupabaseClient,
): CockpitCubeReportsApi {
  return {
    listReports: async (tenantId) => {
      const { data, error } = await client
        .from("cube_reports")
        .select(
          `
          *,
          creator:created_by(email, full_name)
        `,
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cube reports:", error);
        throw error;
      }

      return (data || []).map((report: any) => {
        const dateRange = resolveDateRange(report);
        return {
          ...report,
          creator_email: report.creator?.email,
          creator_name: report.creator?.full_name,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        };
      });
    },

    getReport: async (reportId) => {
      const { data, error } = await client
        .from("cube_reports")
        .select(
          `
          *,
          creator:created_by(email, full_name)
        `,
        )
        .eq("id", reportId)
        .single();

      if (error) {
        console.error("Error fetching cube report:", error);
        throw error;
      }

      const dateRange = resolveDateRange(data);
      return {
        ...data,
        creator_email: data.creator?.email,
        creator_name: data.creator?.full_name,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      };
    },

    createReport: async (tenantId, userId, clientId, report) => {
      const cubeConfig: Record<string, unknown> = {
        ...report.cube_config,
        dateRange: {
          start: report.start_date.toString(),
          end: report.end_date.toString(),
        },
      };
      const { data, error } = await client.rpc("secure_insert_cube_report", {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_client_id: clientId,
        p_name: report.name,
        p_description: report.description || null,
        p_cube_data: report.cube_data,
        p_cube_config: cubeConfig,
      });

      if (error) {
        console.error("Error creating cube report:", error);

        // Enhance error with context
        const enhancedError = new Error(
          `Failed to create cube report: ${error.message || "Unknown error"}`,
        ) as Error & {
          code?: string;
          details?: string;
          hint?: string;
          context?: {
            tenantId: string;
            userId: string;
            clientId: number;
            reportName: string;
          };
        };

        // Preserve original error properties
        if (error.code) enhancedError.code = error.code;
        if (error.details) enhancedError.details = error.details;
        if (error.hint) enhancedError.hint = error.hint;

        // Add context information
        enhancedError.context = {
          tenantId,
          userId,
          clientId,
          reportName: report.name,
        };

        throw enhancedError;
      }

      // Fetch the created report to return full data
      const { data: reportData, error: fetchError } = await client
        .from("cube_reports")
        .select("*")
        .eq("id", data)
        .single();

      if (fetchError) {
        console.error("Error fetching created report:", fetchError);
        throw fetchError;
      }

      return parseWithDataError(cockpitCubeReport$, reportData);
    },

    updateReport: async (reportId, updates) => {
      const { start_date, end_date, ...rest } = updates;
      let cube_config = rest.cube_config as Record<string, unknown> | undefined;

      if (start_date != null && end_date != null) {
        if (cube_config === undefined) {
          const { data: current } = await client
            .from("cube_reports")
            .select("cube_config")
            .eq("id", reportId)
            .single();
          cube_config = (current?.cube_config as Record<string, unknown>) ?? {};
        }
        cube_config = {
          ...cube_config,
          dateRange: { start: start_date.toString(), end: end_date.toString() },
        };
      }

      const dbUpdates =
        cube_config !== undefined ? { ...rest, cube_config } : rest;

      const { data, error } = await client
        .from("cube_reports")
        .update(dbUpdates)
        .eq("id", reportId)
        .select()
        .single();

      if (error) {
        console.error("Error updating cube report:", error);
        throw error;
      }

      return parseWithDataError(cockpitCubeReport$, data);
    },

    deleteReport: async (reportId) => {
      const { error } = await client
        .from("cube_reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        console.error("Error deleting cube report:", error);
        throw error;
      }
    },

    publishReport: async (reportId) => {
      const { data, error } = await client
        .from("cube_reports")
        .update({ is_published: true })
        .eq("id", reportId)
        .select()
        .single();

      if (error) {
        console.error("Error publishing cube report:", error);
        throw error;
      }

      return parseWithDataError(cockpitCubeReport$, data);
    },

    unpublishReport: async (reportId) => {
      const { data, error } = await client
        .from("cube_reports")
        .update({ is_published: false })
        .eq("id", reportId)
        .select()
        .single();

      if (error) {
        console.error("Error unpublishing cube report:", error);
        throw error;
      }

      return parseWithDataError(cockpitCubeReport$, data);
    },

    logAccess: async (tenantId, userId, reportId) => {
      const { error } = await client.from("report_access_logs").insert([
        {
          tenant_id: tenantId,
          user_id: userId,
          report_id: reportId,
        },
      ]);

      if (error) {
        console.warn("Failed to log report access:", error);
      }
    },

    getAccessStats: async (reportId, tenantId) => {
      const { data, error } = await client
        .from("report_access_logs")
        .select("user_id, accessed_at")
        .eq("report_id", reportId)
        .eq("tenant_id", tenantId)
        .order("accessed_at", { ascending: false });

      if (error) {
        console.warn("Failed to get access stats:", error);
        return {
          totalAccesses: 0,
          uniqueUsers: 0,
          lastAccessedAt: null,
        };
      }

      const uniqueUsers = new Set(data.map((log: any) => log.user_id)).size;

      return {
        totalAccesses: data.length,
        uniqueUsers,
        lastAccessedAt: data[0]?.accessed_at || null,
      };
    },
  };
}
