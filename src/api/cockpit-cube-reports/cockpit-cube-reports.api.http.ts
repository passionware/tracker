import { SupabaseClient } from "@supabase/supabase-js";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { cockpitCubeReport$ } from "./cockpit-cube-reports.api.http.schema";
import { CockpitCubeReportsApi } from "./cockpit-cube-reports.api";

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

      return (data || []).map((report: any) => ({
        ...report,
        creator_email: report.creator?.email,
        creator_name: report.creator?.full_name,
      }));
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

      return {
        ...data,
        creator_email: data.creator?.email,
        creator_name: data.creator?.full_name,
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
      const { data, error } = await client
        .from("cube_reports")
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
        .from("cube_reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        console.error("Error deleting cube report:", error);
        throw error;
      }
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
