import type { EventQueueStorage } from "@/api/time-event-queue/event-queue-storage";
import type { QueuedEvent } from "@/api/time-event-queue/queued-event.api";

/**
 * IndexedDB-backed implementation of {@link EventQueueStorage}.
 *
 * Database layout (v1):
 *   dbName  : `passionware.time.event-queue` (parametrisable for multi-user)
 *   version : 1
 *   store   : `events`
 *     keyPath  : `seq` (autoIncrement)
 *     indexes  :
 *       - `streamKey`       (non-unique) — fast per-stream FIFO scans
 *       - `status`          (non-unique) — flush loop picks pending rows
 *       - `clientEventId`   (unique)     — submit-time idempotency lookup
 *
 * Stays free of any IDB helper library so the tracker's bundle stays slim.
 *
 * IMPORTANT: every stored value is a structured-clone-able plain object.
 * `QueuedEvent.enqueuedAt` and `QueuedEvent.lastAttemptAt` are `Date`
 * instances — IDB clones them as `Date`, so they round-trip safely.
 */
export class IndexedDbEventQueueStorage implements EventQueueStorage {
  private readonly dbName: string;
  private readonly storeName = "events";
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(opts?: { dbName?: string }) {
    this.dbName = opts?.dbName ?? "passionware.time.event-queue";
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "seq",
            autoIncrement: true,
          });
          store.createIndex("streamKey", "streamKey", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("clientEventId", "envelope.clientEventId", {
            unique: true,
          });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (
      store: IDBObjectStore,
      complete: (value: T) => void,
      fail: (err: unknown) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.getDb();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      let result: T;
      let resolved = false;
      const complete = (value: T) => {
        result = value;
        resolved = true;
      };
      const fail = (err: unknown) => {
        try {
          tx.abort();
        } catch {
          // ignored — abort may throw if tx already finished
        }
        reject(err);
      };
      try {
        run(store, complete, fail);
      } catch (err) {
        fail(err);
        return;
      }
      tx.oncomplete = () => {
        if (resolved) resolve(result);
        else reject(new Error("IndexedDbEventQueueStorage: tx completed without a result"));
      };
      tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
      tx.onerror = () => reject(tx.error);
    });
  }

  async enqueue(input: Omit<QueuedEvent, "seq">): Promise<QueuedEvent> {
    const existing = await this.findByClientEventId(input.envelope.clientEventId);
    if (existing) return existing;
    return this.tx<QueuedEvent>("readwrite", (store, complete, fail) => {
      const req = store.add(input as unknown as QueuedEvent);
      req.onsuccess = () =>
        complete({ ...input, seq: req.result as IDBValidKey as number });
      req.onerror = () => fail(req.error);
    });
  }

  async list(): Promise<QueuedEvent[]> {
    return this.tx<QueuedEvent[]>("readonly", (store, complete, fail) => {
      const req = store.getAll();
      req.onsuccess = () =>
        complete(
          ((req.result as QueuedEvent[]) ?? []).slice().sort((a, b) => a.seq - b.seq),
        );
      req.onerror = () => fail(req.error);
    });
  }

  async listByStream(
    streamKey: QueuedEvent["streamKey"],
    statuses?: ReadonlyArray<QueuedEvent["status"]>,
  ): Promise<QueuedEvent[]> {
    return this.tx<QueuedEvent[]>("readonly", (store, complete, fail) => {
      const idx = store.index("streamKey");
      const req = idx.getAll(IDBKeyRange.only(streamKey));
      req.onsuccess = () => {
        const all = ((req.result as QueuedEvent[]) ?? []).slice().sort(
          (a, b) => a.seq - b.seq,
        );
        complete(statuses ? all.filter((e) => statuses.includes(e.status)) : all);
      };
      req.onerror = () => fail(req.error);
    });
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
    return this.tx<QueuedEvent>("readwrite", (store, complete, fail) => {
      const getReq = store.get(seq);
      getReq.onsuccess = () => {
        const existing = getReq.result as QueuedEvent | undefined;
        if (!existing) {
          fail(new Error(`IndexedDbEventQueueStorage: seq ${seq} not found`));
          return;
        }
        const updated: QueuedEvent = { ...existing, ...patch };
        const putReq = store.put(updated);
        putReq.onsuccess = () => complete(updated);
        putReq.onerror = () => fail(putReq.error);
      };
      getReq.onerror = () => fail(getReq.error);
    });
  }

  async remove(seq: number): Promise<void> {
    await this.tx<true>("readwrite", (store, complete, fail) => {
      const req = store.delete(seq);
      req.onsuccess = () => complete(true);
      req.onerror = () => fail(req.error);
    });
  }

  async findByClientEventId(
    clientEventId: string,
  ): Promise<QueuedEvent | null> {
    return this.tx<QueuedEvent | null>("readonly", (store, complete, fail) => {
      const idx = store.index("clientEventId");
      const req = idx.get(clientEventId);
      req.onsuccess = () => complete((req.result as QueuedEvent) ?? null);
      req.onerror = () => fail(req.error);
    });
  }
}

/**
 * Returns true when a usable IndexedDB API is present (browser); false in
 * Node / Vitest's default environment. The connected factory uses this to
 * fall back to {@link InMemoryEventQueueStorage}.
 */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}
