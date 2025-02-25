import { Contractor } from "@/api/contractor/contractor.api.ts";
import {
  ProjectIteration,
  ProjectIterationEvent,
} from "@/api/project-iteration/project-iteration.api.ts";
import { RemoteData } from "@passionware/monads";

export interface ProjectIterationDisplayService {
  useComputedEvents: (
    iterationId: ProjectIteration["id"],
  ) => RemoteData<ComputedEventData>;
}
export type BalanceData = {
  amount: number;
};
export type BalanceInfo = {
  iteration: BalanceData;
  cost: BalanceData;
  client: BalanceData;
  contractors: Record<Contractor["id"], BalanceData>;
};

export type ComputedEventData = {
  contractorIds: number[];
  balances: BalanceInfo;
  events: ComputedEvent[];
};

export type ComputedEvent = {
  balances: BalanceInfo;
  iterationEvent: ProjectIterationEvent;
};



export interface WithProjectIterationDisplayService {
  projectIterationDisplayService: ProjectIterationDisplayService;
}
