import { timeSupabase } from "@/core/timeSupabase.connected";
import { createHttpTimeEventsWorkerClient } from "@/api/time-event-queue/time-events-worker-client.http";
import type { TimeEventsWorkerClient } from "@/api/time-event-queue/time-events-worker-client";

/**
 * Wires the worker client to the deployed `time-events` worker URL
 * (`VITE_TIME_EVENTS_WORKER_URL`) and pulls the access token from the
 * shared Supabase session (`timeSupabase`, which uses the same
 * `sb-main-auth-token` storage key as the rest of the app).
 *
 * If `VITE_TIME_EVENTS_WORKER_URL` is unset (e.g. local checkout without a
 * worker running), submits will return `transient_failure` so the queue
 * keeps the events safely on disk until the URL is configured.
 */
export const myTimeEventsWorkerClient: TimeEventsWorkerClient =
  createHttpTimeEventsWorkerClient({
    baseUrl: import.meta.env.VITE_TIME_EVENTS_WORKER_URL ?? "http://invalid-worker-url.local",
    getAccessToken: async () => {
      const { data } = await timeSupabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
