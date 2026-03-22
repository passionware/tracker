import {
  type ProjectIteration,
  type ProjectIterationDetail,
  ProjectIterationApi,
} from "@/api/project-iteration/project-iteration.api.ts";
import { createBatcher, type Batcher } from "@/platform/lang/batcher.ts";
import { maybe } from "@passionware/monads";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const NO_ITERATION_IDS: ProjectIteration["id"][] = [];

export function createProjectIterationService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: ProjectIterationApi;
  client: QueryClient;
}): ProjectIterationService {
  const iterationDetailBatcher: Batcher<
    ProjectIterationDetail["id"],
    ProjectIterationDetail[],
    ProjectIterationDetail
  > = createBatcher(
    async (ids, signal) => {
      void signal;
      if (ids.length === 0) {
        return [];
      }
      const unique = [...new Set(ids)];
      return await api.getProjectIterationDetailsByIds(unique);
    },
    (response, id) =>
      maybe.getOrThrow(
        response.find((d) => d.id === id),
        `Project iteration with id ${id} not found`,
      ),
  );

  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({
        queryKey: ["project-iteration"],
      });
      request.sendResponse();
    },
  );
  return {
    useProjectIterations: (query) =>
      ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["project-iteration", "list", query],
            queryFn: () => api.getProjectIterations(query!),
            enabled: !!query,
          },
          client,
        ),
      ),
    ensureProjectIterations: (query) =>
      client.ensureQueryData({
        queryKey: ["project-iteration", "list", query],
        queryFn: () => api.getProjectIterations(query),
      }),
    useProjectIterationDetail: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: !!id,
            queryKey: ["project-iteration", "detail", id],
            queryFn: async ({ signal }) => {
              return iterationDetailBatcher.fetch({
                payload: id!,
                signal,
              });
            },
          },
          client,
        ),
      ),
    useProjectIterationById: (ids) =>
      ensureIdleQuery(
        ids,
        useQuery(
          {
            enabled: !!ids && ids.length > 0,
            queryKey: ["project-iteration", "by-ids", ids],
            queryFn: () => api.getProjectIterationsByIds(ids!),
          },
          client,
        ),
      ),
    ensureProjectIterationDetail: (id) =>
      client.ensureQueryData({
        queryKey: ["project-iteration", "detail", id],
        queryFn: async ({ signal }) =>
          iterationDetailBatcher.fetch({ payload: id, signal }),
      }),
    useProjectIterationDetailsByIds: (ids) => {
      const list = maybe.getOrNull(ids) ?? NO_ITERATION_IDS;
      const queries = useQueries(
        {
          queries: list.map((id) => ({
            queryKey: ["project-iteration", "detail", id] as const,
            queryFn: async ({ signal }) =>
              iterationDetailBatcher.fetch({ payload: id, signal }),
            staleTime: 60_000,
          })),
        },
        client,
      );
      return useMemo(() => {
        const m = new Map<ProjectIteration["id"], ProjectIterationDetail>();
        for (let i = 0; i < list.length; i++) {
          const row = queries[i];
          const d = row?.data;
          if (d) m.set(list[i]!, d);
        }
        return m;
      }, [list, queries]);
    },
  };
}
