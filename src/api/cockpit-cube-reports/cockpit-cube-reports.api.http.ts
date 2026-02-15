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
      return parseDate(value);
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

// Helper: get explicit date range from DB row (start_date/end_date columns)
function getStoredDateRange(report: {
  start_date?: string | null;
  end_date?: string | null;
}): { start_date: CalendarDate; end_date: CalendarDate } | null {
  const start = parseToCalendarDate(report.start_date);
  const end = parseToCalendarDate(report.end_date);
  if (start && end) {
    return { start_date: start, end_date: end };
  }
  return null;
}

// Helper function to calculate date range: prefer stored DB columns, then cube_data explicit range, then time entries
function resolveDateRange(
  report: { start_date?: string | null; end_date?: string | null; cube_data?: any },
): { start_date: CalendarDate; end_date: CalendarDate } {
  const stored = getStoredDateRange(report);
  if (stored) return stored;

  const cubeData = report.cube_data;
  const explicitRange = cubeData ? extractExplicitRange(cubeData) : null;
  if (explicitRange) return explicitRange;

  // Fallback: derive from time entries in cube data (can shift if no work on start day)
  return calculateDateRangeFromCubeData(cubeData);
}

// Derive date range from cube data only (time entries or explicit range inside cube_data)
function calculateDateRangeFromCubeData(cubeData: any): {
  start_date: CalendarDate;
  end_date: CalendarDate;
} {
  try {
    const explicitRange = extractExplicitRange(cubeData);
    if (explicitRange) return explicitRange;

    const data = cubeData?.data;
    if (!Array.isArray(data) || data.length === 0) {
      const now = dateToCalendarDate(new Date());
      return { start_date: now, end_date: now };
    }

    const dates = data
      .map((item: any) => {
        if (item.startAt) {
          const date = new Date(item.startAt);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      })
      .filter((date): date is Date => date !== null);

    if (dates.length === 0) {
      const now = dateToCalendarDate(new Date());
      return { start_date: now, end_date: now };
    }

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    return {
      start_date: dateToCalendarDate(minDate),
      end_date: dateToCalendarDate(maxDate),
    };
  } catch (error) {
    console.warn("Failed to calculate date range from cube data:", error);
    const now = dateToCalendarDate(new Date());
    return { start_date: now, end_date: now };
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
      // Use the secure database function instead of direct table insertion
      const { data, error } = await client.rpc("secure_insert_cube_report", {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_client_id: clientId,
        p_name: report.name,
        p_description: report.description || null,
        p_cube_data: report.cube_data,
        p_cube_config: report.cube_config,
        p_start_date: report.start_date?.toString() ?? null,
        p_end_date: report.end_date?.toString() ?? null,
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
      const dbUpdates: Record<string, unknown> = { ...updates };
      if ("start_date" in updates)
        dbUpdates.start_date = updates.start_date?.toString() ?? null;
      if ("end_date" in updates)
        dbUpdates.end_date = updates.end_date?.toString() ?? null;
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
