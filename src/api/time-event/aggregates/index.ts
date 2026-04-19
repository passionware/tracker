/**
 * Public surface of the aggregate layer (reducers + command validators).
 *
 * Pure-TS / immer / Zod-typed input — safe in a Cloudflare Worker, the React
 * frontend, and the equivalence test in CI.
 */

export {
  type ValidationCode,
  type ValidationError,
  type ValidationResult,
  type AggregateContext,
  ok,
  fail,
} from "@/api/time-event/aggregates/types.ts";

export {
  type EntryApprovalState,
  type EntryState,
  type ContractorStreamState,
  type ContractorValidationContext,
  emptyContractorStreamState,
  applyContractorEvent,
  replayContractorStream,
  validateContractorEvent,
} from "@/api/time-event/aggregates/contractor-stream.ts";

export {
  type TaskState,
  type ActivityState,
  type RateState,
  type PeriodLockState,
  type ProjectStreamState,
  emptyProjectStreamState,
  applyProjectEvent,
  replayProjectStream,
  validateProjectEvent,
  isPeriodLockedAt,
  findActiveRate,
} from "@/api/time-event/aggregates/project-stream.ts";
