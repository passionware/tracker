import { Contractor } from "@/api/contractor/contractor.api.ts";
import {
  AccountSpec,
  ProjectIterationDetail,
  ProjectIterationEvent,
} from "@/api/project-iteration/project-iteration.api.ts";

export interface ProjectIterationDisplayService {
  getComputedEvents: (
    iteration: ProjectIterationDetail,
    initialBalance?: BalanceInfo,
  ) => ComputedEventData;
  updateDetail: (
    detail: ProjectIterationDetail,
    action: UpdateAction,
  ) => ProjectIterationDetail;
}

export type UpdateAction =
  | {
      type: "removeEvent";
      eventId: ProjectIterationEvent["id"];
    }
  | {
      type: "removeMove";
      eventId: ProjectIterationEvent["id"];
      moveIndex: number;
    }
  | {
      type: "addMove";
      eventId: ProjectIterationEvent["id"];
      move: {
        from: AccountSpec;
        to: AccountSpec;
        amount: number;
        unitPrice: number;
        unit: string;
      };
    };

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
