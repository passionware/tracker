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
  /**
   * Per-contractor tag suggestions derived from recent entries, ordered
   * by usage count (descending). The window is bounded server-side to
   * keep the payload small; callers can further trim with `limit`.
   */
  useContractorTagSuggestions: (
    contractorId: Maybe<Contractor["id"]>,
    options?: { days?: number; limit?: number },
  ) => RemoteData<TagSuggestion[]>;
}

export interface TagSuggestion {
  tag: string;
  count: number;
  lastUsedAt: Date;
}

export interface WithTimeEntryService {
  timeEntryService: TimeEntryService;
}
