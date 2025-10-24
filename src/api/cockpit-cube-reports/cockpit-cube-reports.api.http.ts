import { SupabaseClient } from "@supabase/supabase-js";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { cockpitCubeReport$ } from "./cockpit-cube-reports.api.http.schema";
import { CockpitCubeReportsApi } from "./cockpit-cube-reports.api";
import { cockpitTable } from "@/api/_common/cockpit-schema";

export function createCockpitCubeReportsApi(
  client: SupabaseClient,
): CockpitCubeReportsApi {
  return {
    listReports: async (tenantId) => {
      const { data, error } = await client
        .from(cockpitTable("cube_reports"))
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

      return (data || []).map((report: any) => ({
        ...report,
        creator_email: report.creator?.email,
        creator_name: report.creator?.full_name,
      }));
    },

    getReport: async (reportId) => {
      const { data, error } = await client
        .from(cockpitTable("cube_reports"))
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

      return {
        ...data,
        creator_email: data.creator?.email,
        creator_name: data.creator?.full_name,
      };
    },

    createReport: async (tenantId, userId, report) => {
      const { data, error } = await client
        .from(cockpitTable("cube_reports"))
        .insert([
          {
            tenant_id: tenantId,
            created_by: userId,
            ...report,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating cube report:", error);
        throw error;
      }

      return parseWithDataError(cockpitCubeReport$, data);
    },

    updateReport: async (reportId, updates) => {
      const { data, error } = await client
        .from(cockpitTable("cube_reports"))
        .update(updates)
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
        .from(cockpitTable("cube_reports"))
        .delete()
        .eq("id", reportId);

      if (error) {
        console.error("Error deleting cube report:", error);
        throw error;
      }
    },

    logAccess: async (tenantId, userId, reportId) => {
      const { error } = await client
        .from(cockpitTable("report_access_logs"))
        .insert([
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
        .from(cockpitTable("report_access_logs"))
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
