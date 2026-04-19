import type {
  SubmitContractorEventInput,
  SubmitEventResult,
  SubmitProjectEventInput,
  TimeEventsWorkerClient,
} from "@/api/time-event-queue/time-events-worker-client";

export interface TimeEventsWorkerClientConfig {
  /**
   * Base URL of the deployed `time-events` worker (e.g.
   * `https://time-events.passionware.workers.dev`). Trailing slash optional.
   */
  baseUrl: string;
  /**
   * Provides the Supabase access token used to authenticate the request.
   * Returns `null` to skip the header (the worker will respond 401, which the
   * queue then surfaces as a transient failure so the user can re-auth).
   */
  getAccessToken: () => Promise<string | null>;
  /** Override fetch in tests. */
  fetchImpl?: typeof fetch;
}

/**
 * `fetch`-based client for the worker. The worker's response shapes
 * (`accepted`, `duplicate`, `validation_failed`, `concurrency_conflict`,
 * `schema_invalid`) map 1:1 onto {@link SubmitEventResult} except that
 * `accepted` is flattened to just the assigned `seq` (consumers usually
 * only need that piece — the projection refresh fills in everything else).
 *
 * Network errors and unexpected status codes (e.g. 5xx, 401) collapse into
 * `{kind: "transient_failure"}` — the queue's flush loop will back off and
 * retry.
 */
export function createHttpTimeEventsWorkerClient(
  config: TimeEventsWorkerClientConfig,
): TimeEventsWorkerClient {
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = config.baseUrl.replace(/\/+$/, "") + "/events";

  async function submit(body: unknown): Promise<SubmitEventResult> {
    let token: string | null = null;
    try {
      token = await config.getAccessToken();
    } catch (err) {
      return {
        kind: "transient_failure",
        message: err instanceof Error ? err.message : "auth token retrieval failed",
      };
    }

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      return {
        kind: "transient_failure",
        message: err instanceof Error ? err.message : "network error",
      };
    }

    let parsed: unknown = undefined;
    try {
      parsed = await res.json();
    } catch {
      // ignore — handled below per status code
    }

    return mapResponse(res.status, parsed);
  }

  return {
    submitContractorEvent: (input: SubmitContractorEventInput) =>
      submit({ stream: "contractor", envelope: input.envelope, payload: input.payload }),
    submitProjectEvent: (input: SubmitProjectEventInput) =>
      submit({ stream: "project", envelope: input.envelope, payload: input.payload }),
  };
}

function mapResponse(status: number, body: unknown): SubmitEventResult {
  if (status === 201 && isObject(body) && body.kind === "accepted") {
    const stream = body.stream as "contractor" | "project";
    const seq = extractSeq(body.event);
    if (seq !== null) return { kind: "accepted", stream, seq };
  }
  if (status === 200 && isObject(body) && body.kind === "duplicate") {
    return {
      kind: "duplicate",
      stream: body.stream as "contractor" | "project",
      existingSeq: Number(body.existingSeq),
    };
  }
  if (status === 422 && isObject(body) && body.kind === "validation_failed") {
    return {
      kind: "validation_failed",
      errors: Array.isArray(body.errors) ? (body.errors as never[]) : [],
    };
  }
  if (status === 409 && isObject(body) && body.kind === "concurrency_conflict") {
    return {
      kind: "concurrency_conflict",
      details: (body.details as { expected: number; actual: number }) ?? {
        expected: -1,
        actual: -1,
      },
    };
  }
  if (status === 400) {
    return { kind: "schema_invalid", details: body };
  }
  return {
    kind: "transient_failure",
    httpStatus: status,
    message: `unexpected response ${status}`,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractSeq(event: unknown): number | null {
  if (!isObject(event)) return null;
  const seq = event.seq;
  return typeof seq === "number" ? seq : null;
}
