import {
  AccountSpec,
  ProjectIterationDetail,
  ProjectIterationEvent,
} from "@/api/project-iteration/project-iteration.api.ts";
import {
  BalanceData,
  BalanceInfo,
  ComputedEvent,
  ComputedEventData,
  ProjectIterationDisplayService,
} from "@/services/front/ProjectIterationDisplayService/ProjectIterationDisplayService.ts";
import { get, has, set, uniq } from "lodash";
import { v4 } from "uuid";

export function createProjectIterationDisplayService(): ProjectIterationDisplayService {
  function createAccountBuffer(initial?: BalanceInfo) {
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
      iteration: initial?.iteration || { amount: 0 },
      cost: initial?.cost || { amount: 0 },
      client: initial?.client || { amount: 0 },
      contractors: initial?.contractors || {},
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

  function mapDetail(
    detail: ProjectIterationDetail,
    initialBalance?: BalanceInfo,
  ): ComputedEventData {
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

    const totalBalances = createAccountBuffer(initialBalance);

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
    getComputedEvents: mapDetail,
    updateDetail: (detail, action) => {
      switch (action.type) {
        case "removeEvent":
          return {
            ...detail,
            events: detail.events.filter(
              (event) => event.id !== action.eventId,
            ),
          };
        case "removeMove": {
          const event = detail.events.find(
            (event) => event.id === action.eventId,
          );
          if (!event) {
            return detail;
          }
          const moves = event.moves.filter((_, i) => i !== action.moveIndex);
          return {
            ...detail,
            events: detail.events.map((e) =>
              e.id === action.eventId ? { ...e, moves } : e,
            ),
          };
        }
        case "addMove": {
          const event = detail.events.find(
            (event) => event.id === action.eventId,
          );
          if (!event) {
            return detail;
          }
          const moves = event.moves.concat(action.move);
          return {
            ...detail,
            events: detail.events.map((e) =>
              e.id === action.eventId ? { ...e, moves } : e,
            ),
          };
        }
        case "addEvent": {
          const newEvent: ProjectIterationEvent = {
            id: v4(),
            description: action.description,
            moves: [],
          };
          return {
            ...detail,
            events: detail.events.concat(newEvent),
          };
        }
        case "updateEvent": {
          return {
            ...detail,
            events: detail.events.map((event) =>
              event.id === action.eventId
                ? { ...event, description: action.description }
                : event,
            ),
          };
        }
      }
      return detail;
    },
  };
}
