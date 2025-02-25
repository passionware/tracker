import {
  AccountSpec,
  ProjectIterationDetail,
} from "@/api/project-iteration/project-iteration.api.ts";
import {
  BalanceData,
  BalanceInfo,
  ComputedEvent,
  ComputedEventData,
  ProjectIterationDisplayService,
} from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import { WithProjectIterationService } from "@/services/io/ProjectIterationService/ProjectIterationService.ts";
import { rd } from "@passionware/monads";
import { get, has, set, uniq } from "lodash";

export function createProjectIterationDisplayService(
  config: WithProjectIterationService,
): ProjectIterationDisplayService {
  function createAccountBuffer() {
    const key = (account: AccountSpec) => {
      switch (account.type) {
        case "client":
          return "client";
        case "contractor":
          return `contractors.${account.contractorId}`;
        case "iteration":
          return "iteration";
        case "cost":
          return "cost";
      }
    };
    const buffer: BalanceInfo = {
      iteration: { amount: 0 },
      cost: { amount: 0 },
      client: { amount: 0 },
      contractors: {},
    };

    return {
      getBalance: (account: AccountSpec): BalanceData => {
        const k = key(account);
        if (!has(buffer, k)) {
          set(buffer, k, { amount: 0 });
        }
        return get(buffer, k);
      },
      setBalance: (account: AccountSpec, value: number) =>
        set(buffer, key(account), value),
      addBalance: (account: AccountSpec, value: number) => {
        const k = key(account);
        if (!has(buffer, k)) {
          set(buffer, k, { amount: 0 });
        }
        const current = get(buffer, k)!;
        set(buffer, k, { amount: current.amount + value });
      },
      get: () => buffer,
    };
  }

  function mapDetail(detail: ProjectIterationDetail): ComputedEventData {
    /*
     * Create buffers for:
     * 1. iteration
     * 2. cost
     * 3. client
     * 4,5,6... contractors
     */
    const contractorIds = uniq(
      detail.events.flatMap((event) =>
        event.moves.flatMap((move) =>
          [move.from, move.to]
            .filter((account) => account.type === "contractor")
            .flatMap((account) => account.contractorId),
        ),
      ),
    );

    const totalBalances = createAccountBuffer();

    const events = detail.events.map((event) => {
      const eventBalances = createAccountBuffer();
      event.moves.forEach((move) => {
        totalBalances.addBalance(move.from, -move.amount * move.unitPrice);
        totalBalances.addBalance(move.to, move.amount * move.unitPrice);
        eventBalances.addBalance(move.from, -move.amount * move.unitPrice);
        eventBalances.addBalance(move.to, move.amount * move.unitPrice);
      });
      return {
        iterationEvent: event,
        balances: eventBalances.get(),
      } satisfies ComputedEvent;
    });

    return {
      balances: totalBalances.get(),
      events,
      contractorIds,
    };
  }

  return {
    useComputedEvents: (iterationId) => {
      const iterationDetail =
        config.projectIterationService.useProjectIterationDetail(iterationId);
      return rd.map(iterationDetail, mapDetail);
    },
  };
}
