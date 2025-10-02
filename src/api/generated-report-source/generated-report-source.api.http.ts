import { dateFilterSupabaseUtils } from "@/api/_common/query/filters/DateFilter.supabase.ts";
import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  generatedReportSource$,
  generatedReportSourceFromHttp,
} from "@/api/generated-report-source/generated-report-source.api.http.schema.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { GeneratedReportSourceApi } from "./generated-report-source.api";

export function createGeneratedReportSourceApi(
  client: SupabaseClient,
): GeneratedReportSourceApi {
  return {
    getGeneratedReportSources: async (query) => {
      let request = client.from("generated_report_source").select("*");

      if (query.filters.projectIterationId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.projectIterationId,
          "project_iteration_id",
        );
      }

      if (query.filters.createdAt) {
        request = dateFilterSupabaseUtils.filterBy(
          request,
          query.filters.createdAt,
          "created_at",
        );
      }

      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {
          createdAt: "created_at",
          projectIterationId: "project_iteration_id",
        });
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }

      return parseWithDataError(z.array(generatedReportSource$), data).map(
        generatedReportSourceFromHttp,
      );
    },

    getGeneratedReportSource: async (id) => {
      const { data, error } = await client
        .from("generated_report_source")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return generatedReportSourceFromHttp(
        parseWithDataError(generatedReportSource$, data),
      );
    },

    createGeneratedReportSource: async (payload) => {
      const { data, error } = await client
        .from("generated_report_source")
        .insert({
          project_iteration_id: payload.projectIterationId,
          data: payload.data,
          original_data: payload.originalData,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return generatedReportSourceFromHttp(
        parseWithDataError(generatedReportSource$, data),
      );
    },

    updateGeneratedReportSource: async (id, payload) => {
      const updateData: any = {};
      if (payload.projectIterationId !== undefined) {
        updateData.project_iteration_id = payload.projectIterationId;
      }
      if (payload.data !== undefined) {
        updateData.data = payload.data;
      }
      if (payload.originalData !== undefined) {
        updateData.original_data = payload.originalData;
      }

      const { data, error } = await client
        .from("generated_report_source")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return generatedReportSourceFromHttp(
        parseWithDataError(generatedReportSource$, data),
      );
    },

    deleteGeneratedReportSource: async (id) => {
      const { error } = await client
        .from("generated_report_source")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
    },
  };
}
