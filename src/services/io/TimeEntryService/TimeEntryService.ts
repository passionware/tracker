import type { Contractor } from "@/api/contractor/contractor.api";
import type {
  TimeEntry,
  TimeEntryQuery,
} from "@/api/time-entry/time-entry.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface TimeEntryService {
  /** Imperative fetch — useful for background sync, exports, manual refresh. */
  getEntries: (query: TimeEntryQuery) => Promise<TimeEntry[]>;
  useEntries: (query: TimeEntryQuery) => RemoteData<TimeEntry[]>;
  useEntry: (entryId: Maybe<string>) => RemoteData<TimeEntry | null>;
  /**
   * The currently-running timer for a contractor (the only `stopped_at IS NULL`
   * row). Returns `null` when the contractor has no active entry.
   */
  useActiveEntry: (
    contractorId: Maybe<Contractor["id"]>,
  ) => RemoteData<TimeEntry | null>;
}

export interface WithTimeEntryService {
  timeEntryService: TimeEntryService;
}
