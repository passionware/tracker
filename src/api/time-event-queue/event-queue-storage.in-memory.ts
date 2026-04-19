import type { EventQueueStorage } from "@/api/time-event-queue/event-queue-storage";
import type { QueuedEvent } from "@/api/time-event-queue/queued-event.api";

/**
 * In-memory implementation of {@link EventQueueStorage}. Used by tests and
 * by environments where IndexedDB isn't available (Node SSR, jsdom by
 * default). Loses data on reload — durability is the IDB implementation's
 * job.
 *
 * Operations are not concurrency-safe across multiple awaits because the
 * service serialises submissions per stream key; the assumption matches
 * production usage.
 */
export class InMemoryEventQueueStorage implements EventQueueStorage {
  private nextSeq = 1;
  private readonly rows = new Map<number, QueuedEvent>();
  private readonly byClientEventId = new Map<string, number>();

  async enqueue(input: Omit<QueuedEvent, "seq">): Promise<QueuedEvent> {
    const existingSeq = this.byClientEventId.get(input.envelope.clientEventId);
    if (existingSeq !== undefined) {
      return this.rows.get(existingSeq)!;
    }
    const seq = this.nextSeq++;
    const row: QueuedEvent = { ...input, seq };
    this.rows.set(seq, row);
    this.byClientEventId.set(input.envelope.clientEventId, seq);
    return row;
  }

  async list(): Promise<QueuedEvent[]> {
    return [...this.rows.values()].sort((a, b) => a.seq - b.seq);
  }

  async listByStream(
    streamKey: QueuedEvent["streamKey"],
    statuses?: ReadonlyArray<QueuedEvent["status"]>,
  ): Promise<QueuedEvent[]> {
    const all = await this.list();
    return all.filter(
      (e) =>
        e.streamKey === streamKey &&
        (statuses === undefined || statuses.includes(e.status)),
    );
  }

  async update(
    seq: number,
    patch: Partial<
      Pick<
        QueuedEvent,
        | "status"
        | "attempts"
        | "lastAttemptAt"
        | "confirmedSeq"
        | "lastError"
      >
    >,
  ): Promise<QueuedEvent> {
    const existing = this.rows.get(seq);
    if (!existing) throw new Error(`InMemoryEventQueueStorage: seq ${seq} not found`);
    const updated: QueuedEvent = { ...existing, ...patch };
    this.rows.set(seq, updated);
    return updated;
  }

  async remove(seq: number): Promise<void> {
    const existing = this.rows.get(seq);
    if (!existing) return;
    this.rows.delete(seq);
    this.byClientEventId.delete(existing.envelope.clientEventId);
  }

  async findByClientEventId(
    clientEventId: string,
  ): Promise<QueuedEvent | null> {
    const seq = this.byClientEventId.get(clientEventId);
    if (seq === undefined) return null;
    return this.rows.get(seq) ?? null;
  }
}
