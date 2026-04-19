import type { EventQueueStorage } from "@/api/time-event-queue/event-queue-storage";
import { InMemoryEventQueueStorage } from "@/api/time-event-queue/event-queue-storage.in-memory";
import {
  IndexedDbEventQueueStorage,
  isIndexedDbAvailable,
} from "@/api/time-event-queue/event-queue-storage.indexed-db";

/**
 * Picks the IndexedDB-backed storage when running in a browser, otherwise
 * falls back to the in-memory storage. The DB name embeds the active
 * `time_*` schema so dev / prod queues never share the same physical store
 * (otherwise switching `VITE_APP_TIME_DB_SCHEMA` mid-session could surface
 * dev-only events at prod after a deploy).
 */
export function createConnectedEventQueueStorage(opts?: {
  schemaTag?: string;
}): EventQueueStorage {
  if (!isIndexedDbAvailable()) {
    return new InMemoryEventQueueStorage();
  }
  const schemaTag = opts?.schemaTag ?? "default";
  return new IndexedDbEventQueueStorage({
    dbName: `passionware.time.event-queue.${schemaTag}`,
  });
}
