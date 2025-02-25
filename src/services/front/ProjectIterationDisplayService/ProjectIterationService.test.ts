// @jest-environment jsdom

import { ProjectIterationDetail } from "@/api/project-iteration/project-iteration.api.ts";
import { describe, expect, it } from "vitest";
import { createProjectIterationDisplayService } from "./ProjectIterationDisplayService.impl";

describe("ProjectIterationDisplayService - useComputedEvents", () => {
  it("should correctly compute balance for a single event (one move)", () => {
    // Example: move funds from client to contractor (id: 1)
    const iterationDetail = {
      events: [
        {
          id: "1",
          description: "Test event",
          moves: [
            {
              unit: "h",
              from: { type: "client" },
              to: { type: "contractor", contractorId: 1 },
              amount: 10,
              unitPrice: 5, // 10 * 5 = 50
            },
          ],
        },
      ],
    } satisfies Partial<ProjectIterationDetail>;

    const service = createProjectIterationDisplayService();

    // Use renderHook to call the hook in a proper React environment
    const computedData = service.getComputedEvents(
      iterationDetail as ProjectIterationDetail,
    );

    // Expected balances: client: -50, contractor (id: 1): +50, iteration and cost: 0
    expect(computedData.balances.client.amount).toBe(-50);
    expect(computedData.balances.contractors["1"].amount).toBe(50);
    expect(computedData.balances.iteration.amount).toBe(0);
    expect(computedData.balances.cost.amount).toBe(0);

    // Validate event balances
    expect(computedData.events).toHaveLength(1);
    const eventBalances = computedData.events[0].balances;
    expect(eventBalances.client.amount).toBe(-50);
    expect(eventBalances.contractors["1"].amount).toBe(50);

    // contractorIds should contain only id: 1
    expect(computedData.contractorIds).toEqual([1]);
  });

  it("should correctly compute balances for multiple events and moves", () => {
    // Data with two events:
    // First event:
    //  - Move 1: client to contractor 1: 10 * 5 = 50 (client: -50, contractor1: +50)
    //  - Move 2: contractor 1 to iteration: 2 * 5 = 10 (contractor1: -10, iteration: +10)
    // Totals for first event: client: -50, contractor1: +40, iteration: +10
    //
    // Second event:
    //  - Move: client to contractor 2: 3 * 20 = 60 (client: -60, contractor2: +60)
    //
    // Overall:
    //  - client: -50 + (-60) = -110
    //  - contractor1: +40
    //  - contractor2: +60
    //  - iteration: +10, cost: 0
    const iterationDetail = {
      events: [
        {
          id: "1",
          description: "Test event 1",
          moves: [
            {
              unit: "h",
              from: { type: "client" },
              to: { type: "contractor", contractorId: 1 },
              amount: 10,
              unitPrice: 5,
            },
            {
              unit: "h",
              from: { type: "contractor", contractorId: 1 },
              to: { type: "iteration" },
              amount: 2,
              unitPrice: 5,
            },
          ],
        },
        {
          id: "2",
          description: "Test event 2",
          moves: [
            {
              unit: "h",
              from: { type: "client" },
              to: { type: "contractor", contractorId: 2 },
              amount: 3,
              unitPrice: 20,
            },
          ],
        },
      ],
    } satisfies Partial<ProjectIterationDetail>;

    const service = createProjectIterationDisplayService();

    const computedData = service.getComputedEvents(
      iterationDetail as ProjectIterationDetail,
    );

    // Validate overall balances
    expect(computedData.balances.client.amount).toBe(-110);
    expect(computedData.balances.contractors["1"].amount).toBe(40);
    expect(computedData.balances.contractors["2"].amount).toBe(60);
    expect(computedData.balances.iteration.amount).toBe(10);
    expect(computedData.balances.cost.amount).toBe(0);

    // Validate first event balances
    const event0 = computedData.events[0].balances;
    expect(event0.client.amount).toBe(-50);
    expect(event0.contractors["1"].amount).toBe(40);
    expect(event0.iteration.amount).toBe(10);

    // Validate second event balances
    const event1 = computedData.events[1].balances;
    expect(event1.client.amount).toBe(-60);
    expect(event1.contractors["2"].amount).toBe(60);

    // contractorIds should contain both 1 and 2 (order does not matter)
    expect(new Set(computedData.contractorIds)).toEqual(new Set([1, 2]));
  });

  it("should return empty events and initial balances when there are no events", () => {
    // Scenario: iterationDetail with no events
    const iterationDetail = {
      events: [],
    } satisfies Partial<ProjectIterationDetail>;

    const service = createProjectIterationDisplayService();

    const computedData = service.getComputedEvents(
      iterationDetail as unknown as ProjectIterationDetail,
    );

    // Expect that the events array is empty and the initial balances remain at zero
    expect(computedData.events).toHaveLength(0);
    expect(computedData.contractorIds).toEqual([]);
    expect(computedData.balances.client.amount).toBe(0);
    expect(computedData.balances.iteration.amount).toBe(0);
    expect(computedData.balances.cost.amount).toBe(0);
  });
});
