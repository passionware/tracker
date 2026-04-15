import { describe, expect, it, vi } from "vitest";
import { mockTmetricResponse } from "./__test__/mock-tmetric-response.ts";
import type { TMetricAdapterInput } from "./TmetricAdapter.ts";
import { adaptTMetricToGeneric, inferActivity } from "./TmetricAdapter.ts";
import type { TMetricTag, TMetricTimeEntry } from "./TmetricSchemas.ts";

describe("TmetricAdapter", () => {
  const createMockInput = (
    entries: TMetricTimeEntry[] = mockTmetricResponse,
  ): TMetricAdapterInput => ({
    entries,
    defaultRoleId: "developer",
    contractorId: 123,
  });

  describe("adaptTMetricToGeneric", () => {
    it("should transform TMetric entries to generic report format", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      expect(result).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.timeEntries).toBeDefined();
    });

    it("should create task types from unique notes", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      // Check that task types are created from unique notes (keyed by short id)
      const taskTypes = result.definitions.taskTypes;
      expect(Object.keys(taskTypes).length).toBeGreaterThan(0);

      const taskTypeNames = Object.values(taskTypes).map((t) => t.name);
      expect(taskTypeNames).toContain(
        "planning work / task analysis / code review",
      );
      expect(taskTypeNames).toContain("Operations");
      expect(taskTypeNames).toContain("v1-1081-custom-nike-integration-plan");
      expect(taskTypeNames).toContain("tmetric reports generation");

      // Check task type structure
      const taskType = Object.values(taskTypes).find(
        (t) => t.name === "planning work / task analysis / code review",
      );
      expect(taskType).toEqual({
        name: "planning work / task analysis / code review",
        description: "planning work / task analysis / code review",
        parameters: {},
      });
    });

    it("should create all required activity types", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      const activityTypes = result.definitions.activityTypes;
      const byName = Object.fromEntries(
        Object.entries(activityTypes).map(([, a]) => [a.name, a]),
      );

      expect(byName["Development"]).toEqual({
        name: "Development",
        description: "Hands-on implementation work",
        parameters: {},
      });

      expect(byName["Code Review"]).toEqual({
        name: "Code Review",
        description: "PR/MR reviews and related",
        parameters: {},
      });

      expect(byName["Operations"]).toEqual({
        name: "Operations",
        description: "Planning, triage, coordination",
        parameters: {},
      });
    });

    it("should create role types with default configuration", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      const roleTypes = result.definitions.roleTypes;
      expect(roleTypes.developer).toEqual({
        name: "developer",
        description: "Default role",
        rates: [],
      });
    });

    it("should transform time entries correctly", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      const timeEntries = result.timeEntries;
      expect(timeEntries.length).toBe(mockTmetricResponse.length);

      // Check first entry structure (taskId is short id; note is null)
      const firstEntry = timeEntries[0];
      const originalEntry = mockTmetricResponse[0];
      const expectedTaskName = originalEntry.note?.trim() || "Unnamed task";

      expect(firstEntry.id).toBe(String(originalEntry.id));
      expect(firstEntry.note).toBe(null);
      expect(result.definitions.taskTypes[firstEntry.taskId]?.name).toBe(
        expectedTaskName,
      );
      expect(firstEntry.roleId).toBe("developer");
      expect(firstEntry.startAt).toEqual(new Date(originalEntry.startTime));
      expect(firstEntry.endAt).toEqual(new Date(originalEntry.endTime));
      expect(firstEntry.createdAt).toEqual(new Date(originalEntry.startTime));
      expect(firstEntry.updatedAt).toEqual(new Date(originalEntry.endTime));
    });

    it("should handle entries with empty notes", () => {
      const entriesWithEmptyNote: TMetricTimeEntry[] = [
        {
          ...mockTmetricResponse[0],
          note: "",
          project: undefined,
        },
      ];

      const input = createMockInput(entriesWithEmptyNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(result.definitions.taskTypes[timeEntry.taskId]?.name).toBe(
        "Unnamed task",
      );
    });

    it("should handle entries with undefined notes", () => {
      const entriesWithUndefinedNote: TMetricTimeEntry[] = [
        {
          ...mockTmetricResponse[0],
          note: undefined as any,
          project: undefined,
        },
      ];

      const input = createMockInput(entriesWithUndefinedNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(result.definitions.taskTypes[timeEntry.taskId]?.name).toBe(
        "Unnamed task",
      );
    });

    it("should handle entries with null notes", () => {
      const entriesWithNullNote: TMetricTimeEntry[] = [
        {
          ...mockTmetricResponse[0],
          note: null as any,
          project: undefined,
        },
      ];

      const input = createMockInput(entriesWithNullNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(result.definitions.taskTypes[timeEntry.taskId]?.name).toBe(
        "Unnamed task",
      );
    });

    it("should map running timers (null endTime) to endAt at current time", () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2025-10-01T14:00:00.000Z"));

        const running: TMetricTimeEntry[] = [
          {
            ...mockTmetricResponse[0],
            startTime: "2025-10-01T12:00:00.000Z",
            endTime: null,
          },
        ];

        const result = adaptTMetricToGeneric(createMockInput(running));
        const timeEntry = result.timeEntries[0];

        expect(timeEntry.endAt.toISOString()).toBe("2025-10-01T14:00:00.000Z");
        expect(timeEntry.updatedAt.toISOString()).toBe(
          "2025-10-01T14:00:00.000Z",
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("should handle entries with whitespace-only notes", () => {
      const entriesWithWhitespaceNote: TMetricTimeEntry[] = [
        {
          ...mockTmetricResponse[0],
          note: "   ",
          project: undefined,
        },
      ];

      const input = createMockInput(entriesWithWhitespaceNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(result.definitions.taskTypes[timeEntry.taskId]?.name).toBe(
        "Unnamed task",
      );
    });

    it("should use custom default role ID", () => {
      const input = createMockInput();
      input.defaultRoleId = "senior-developer";

      const result = adaptTMetricToGeneric(input);

      expect(result.definitions.roleTypes["senior-developer"]).toBeDefined();
      expect(result.timeEntries[0].roleId).toBe("senior-developer");
    });

    it("should use custom currency", () => {
      const input = createMockInput();

      const result = adaptTMetricToGeneric(input);

      // Currency is passed but not directly used in current implementation
      // This test ensures the parameter is accepted without error
      expect(result).toBeDefined();
    });

    it("should deduplicate task types with identical notes", () => {
      const entriesWithDuplicateNotes = [
        mockTmetricResponse[0], // "planning work / task analysis / code review"
        mockTmetricResponse[6], // "planning work / task analysis / code review"
        mockTmetricResponse[1], // "Operations"
        mockTmetricResponse[2], // "Operations"
      ];

      const input = createMockInput(entriesWithDuplicateNotes);
      const result = adaptTMetricToGeneric(input);

      const taskTypes = result.definitions.taskTypes;
      const taskTypeKeys = Object.keys(taskTypes);
      const taskTypeNames = Object.values(taskTypes).map((t) => t.name);

      // Should have only 2 unique task types despite 4 entries
      expect(taskTypeKeys).toHaveLength(2);
      expect(taskTypeNames).toContain(
        "planning work / task analysis / code review",
      );
      expect(taskTypeNames).toContain("Operations");
    });

    it("should preserve all time entries even with duplicate notes", () => {
      const entriesWithDuplicateNotes = [
        mockTmetricResponse[0], // "planning work / task analysis / code review"
        mockTmetricResponse[6], // "planning work / task analysis / code review"
        mockTmetricResponse[1], // "Operations"
        mockTmetricResponse[2], // "Operations"
      ];

      const input = createMockInput(entriesWithDuplicateNotes);
      const result = adaptTMetricToGeneric(input);

      // Should preserve all 4 time entries
      expect(result.timeEntries).toHaveLength(4);
    });

    it("should handle empty entries array", () => {
      const input = createMockInput([]);
      const result = adaptTMetricToGeneric(input);

      expect(result.timeEntries).toHaveLength(0);
      expect(result.definitions.taskTypes).toEqual({});
      expect(result.definitions.activityTypes).toBeDefined();
      expect(result.definitions.roleTypes).toBeDefined();
    });
  });

  describe("inferActivity", () => {
    const createTag = (name: string): TMetricTag => ({
      id: 1,
      name,
      isWorkType: false,
    });

    it("should infer 'meeting' activity from 'activity:meeting' tag", () => {
      expect(
        inferActivity("daily standup", [createTag("activity:meeting")]),
      ).toBe("meeting");
      expect(inferActivity("discussion", [createTag("activity:meeting")])).toBe(
        "meeting",
      );
      expect(inferActivity("chat", [createTag("activity:meeting")])).toBe(
        "meeting",
      );
    });

    it("should infer 'code_review' activity from 'activity:review' tag", () => {
      expect(inferActivity("code review", [createTag("activity:review")])).toBe(
        "code_review",
      );
      expect(inferActivity("PR review", [createTag("activity:review")])).toBe(
        "code_review",
      );
      expect(
        inferActivity("checking code", [createTag("activity:review")]),
      ).toBe("code_review");
    });

    it("should infer 'operations' activity from 'activity:operations' tag", () => {
      expect(
        inferActivity("dev ops work", [createTag("activity:operations")]),
      ).toBe("operations");
      expect(
        inferActivity("planning", [createTag("activity:operations")]),
      ).toBe("operations");
      expect(
        inferActivity("maintenance", [createTag("activity:operations")]),
      ).toBe("operations");
    });

    it("should infer 'polishment' activity from 'activity:polishment' tag", () => {
      expect(
        inferActivity("code polish", [createTag("activity:polishment")]),
      ).toBe("polishment");
      expect(
        inferActivity("refactoring", [createTag("activity:polishment")]),
      ).toBe("polishment");
    });

    it("should infer 'development' activity from 'activity:development' tag", () => {
      expect(
        inferActivity("implementing feature", [
          createTag("activity:development"),
        ]),
      ).toBe("development");
      expect(
        inferActivity("bug fix", [createTag("activity:development")]),
      ).toBe("development");
    });

    it("should handle case-insensitive tag matching", () => {
      expect(inferActivity("work", [createTag("activity:MEETING")])).toBe(
        "meeting",
      );
      expect(inferActivity("work", [createTag("ACTIVITY:review")])).toBe(
        "code_review",
      );
      expect(inferActivity("work", [createTag("Activity:Operations")])).toBe(
        "operations",
      );
    });

    it("should fallback to description when no activity tag is present", () => {
      expect(inferActivity("daily standup meeting", [])).toBe("meeting");
      expect(inferActivity("code review", [])).toBe("code_review");
      expect(inferActivity("dev ops work", [])).toBe("operations");
      expect(inferActivity("implementing feature", [])).toBe("development");
    });

    it("should default to 'development' when no activity tag and no matching description", () => {
      expect(inferActivity("some work", [])).toBe("development");
      expect(inferActivity("", [])).toBe("development");
      expect(inferActivity(null, [])).toBe("development");
    });

    it("should prioritize activity tag over description", () => {
      expect(
        inferActivity("meeting about ops", [createTag("activity:operations")]),
      ).toBe("operations");
      expect(
        inferActivity("review of ops changes", [
          createTag("activity:operations"),
        ]),
      ).toBe("operations");
    });

    it("should handle multiple tags and use first activity tag found", () => {
      expect(
        inferActivity("work", [
          createTag("other-tag"),
          createTag("activity:meeting"),
          createTag("activity:operations"),
        ]),
      ).toBe("meeting");
    });

    it("should handle tag name variations", () => {
      // "review" tag should map to "code_review"
      expect(inferActivity("work", [createTag("activity:review")])).toBe(
        "code_review",
      );
      // "dev" tag should map to "development"
      expect(inferActivity("work", [createTag("activity:dev")])).toBe(
        "development",
      );
    });
  });

  describe("integration tests with mock data", () => {
    it("should process all mock entries without errors", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      // Verify we processed all entries
      expect(result.timeEntries).toHaveLength(mockTmetricResponse.length);

      const activityNames = new Set(
        Object.values(result.definitions.activityTypes).map((a) => a.name),
      );

      // Verify each entry has required fields (note is null; taskId/activityId are short ids)
      result.timeEntries.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.taskId).toBeDefined();
        expect(entry.activityId).toBeDefined();
        expect(entry.roleId).toBe("developer");
        expect(entry.startAt).toBeInstanceOf(Date);
        expect(entry.endAt).toBeInstanceOf(Date);
        expect(entry.createdAt).toBeInstanceOf(Date);
        expect(entry.updatedAt).toBeInstanceOf(Date);

        // Verify activity inference worked (activityId is short id; check display name)
        const activityName =
          result.definitions.activityTypes[entry.activityId]?.name;
        expect([
          "Development",
          "Code Review",
          "Meeting",
          "Operations",
        ]).toContain(activityName);
        expect(activityNames.has(activityName!)).toBe(true);
      });
    });

    it("should create correct task types for mock data", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      const taskTypeNames = Object.values(result.definitions.taskTypes).map(
        (t) => t.name,
      );

      // Verify specific task types from mock data exist (keyed by short id)
      expect(taskTypeNames).toContain(
        "planning work / task analysis / code review",
      );
      expect(taskTypeNames).toContain("Operations");
      expect(taskTypeNames).toContain(
        "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
      );
      expect(taskTypeNames).toContain("backmerging & fixes");
      expect(taskTypeNames).toContain("v1-1081-custom-nike-integration-plan");
      expect(taskTypeNames).toContain("388-negative-discount-amount-bug");
      expect(taskTypeNames).toContain("v1-1074-run-e2e-test-every-pr");
      expect(taskTypeNames).toContain("tmetric reports generation");
      expect(taskTypeNames).toContain("chat with Scott");
      expect(taskTypeNames).toContain("checkin with Lennart");
      expect(taskTypeNames).toContain(
        "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
      );
    });

    it("should infer correct activity types for mock data", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);
      const { taskTypes, activityTypes } = result.definitions;

      // Find entries by task name (note is null; taskId is short id) and verify activity
      const planningEntry = result.timeEntries.find(
        (e) =>
          taskTypes[e.taskId]?.name ===
          "planning work / task analysis / code review",
      );
      expect(activityTypes[planningEntry!.activityId]?.name).toBe(
        "Code Review",
      );

      const opsEntry = result.timeEntries.find(
        (e) => taskTypes[e.taskId]?.name === "Operations",
      );
      expect(activityTypes[opsEntry!.activityId]?.name).toBe("Operations");

      const chatEntry = result.timeEntries.find(
        (e) => taskTypes[e.taskId]?.name === "chat with Scott",
      );
      // "chat with Scott" has no activity tag; project "Atellio - meetings" does not affect inferActivity (description/note used)
      expect(activityTypes[chatEntry!.activityId]?.name).toBe("Development");

      const devEntry = result.timeEntries.find(
        (e) =>
          taskTypes[e.taskId]?.name === "v1-1081-custom-nike-integration-plan",
      );
      expect(activityTypes[devEntry!.activityId]?.name).toBe("Development");
    });

    it("should handle date parsing correctly", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      // Verify dates are parsed correctly
      const firstEntry = result.timeEntries[0];
      const originalEntry = mockTmetricResponse[0];

      expect(firstEntry.startAt.toISOString()).toBe(
        new Date(originalEntry.startTime).toISOString(),
      );
      expect(firstEntry.endAt.toISOString()).toBe(
        new Date(originalEntry.endTime).toISOString(),
      );
    });

    it("should maintain data integrity", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);
      const { taskTypes } = result.definitions;

      // Verify that all original entry IDs are preserved
      const originalIds = mockTmetricResponse.map((e) => String(e.id));
      const resultIds = result.timeEntries.map((e) => e.id);

      expect(resultIds.sort()).toEqual(originalIds.sort());

      // Verify that all original task names (from notes etc.) are preserved via taskId -> taskTypes
      const originalNotes = mockTmetricResponse.map((e) => e.note || "");
      const resultTaskNames = result.timeEntries.map(
        (e) => taskTypes[e.taskId]?.name ?? "",
      );

      expect(resultTaskNames.sort()).toEqual(originalNotes.sort());
    });
  });

  it("snapshot test for generic report structure", () => {
    const input = createMockInput();
    const result = adaptTMetricToGeneric(input);
    expect(result).toMatchInlineSnapshot(`
      {
        "definitions": {
          "activityTypes": {
            "a1": {
              "description": "PR/MR reviews and related",
              "name": "Code Review",
              "parameters": {},
            },
            "a2": {
              "description": "Planning, triage, coordination",
              "name": "Operations",
              "parameters": {},
            },
            "a3": {
              "description": "Hands-on implementation work",
              "name": "Development",
              "parameters": {},
            },
          },
          "projectTypes": {
            "p1": {
              "description": "Atellio - Operations",
              "name": "Atellio - Operations",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "983057",
                },
              },
            },
            "p2": {
              "description": "Countful - Development",
              "name": "Countful - Development",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "902501",
                },
              },
            },
            "p3": {
              "description": "Atellio - development",
              "name": "Atellio - development",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "761232",
                },
              },
            },
            "p4": {
              "description": "Passionware Internal Development",
              "name": "Passionware Internal Development",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "886046",
                },
              },
            },
            "p5": {
              "description": "Atellio - meetings",
              "name": "Atellio - meetings",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "764393",
                },
              },
            },
            "p6": {
              "description": "Countful - Meetings",
              "name": "Countful - Meetings",
              "parameters": {
                "tmetricProjectIdByContractor": {
                  "123": "937224",
                },
              },
            },
          },
          "roleTypes": {
            "developer": {
              "description": "Default role",
              "name": "developer",
              "rates": [],
            },
          },
          "taskTypes": {
            "t1": {
              "description": "planning work / task analysis / code review",
              "name": "planning work / task analysis / code review",
              "parameters": {},
            },
            "t10": {
              "description": "checkin with Lennart",
              "name": "checkin with Lennart",
              "parameters": {},
            },
            "t11": {
              "description": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
              "name": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
              "parameters": {},
            },
            "t2": {
              "description": "Operations",
              "name": "Operations",
              "parameters": {},
            },
            "t3": {
              "description": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
              "name": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
              "parameters": {},
            },
            "t4": {
              "description": "backmerging & fixes",
              "name": "backmerging & fixes",
              "parameters": {},
            },
            "t5": {
              "description": "v1-1081-custom-nike-integration-plan",
              "name": "v1-1081-custom-nike-integration-plan",
              "parameters": {},
            },
            "t6": {
              "description": "388-negative-discount-amount-bug",
              "name": "388-negative-discount-amount-bug",
              "parameters": {},
            },
            "t7": {
              "description": "v1-1074-run-e2e-test-every-pr",
              "name": "v1-1074-run-e2e-test-every-pr",
              "parameters": {},
            },
            "t8": {
              "description": "tmetric reports generation",
              "name": "tmetric reports generation",
              "parameters": {},
            },
            "t9": {
              "description": "chat with Scott",
              "name": "chat with Scott",
              "parameters": {},
            },
          },
        },
        "timeEntries": [
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-01T08:15:00.000Z,
            "endAt": 2025-10-01T08:26:00.000Z,
            "id": "195778761",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-01T08:15:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-01T08:26:00.000Z,
          },
          {
            "activityId": "a2",
            "contractorId": 123,
            "createdAt": 2025-10-01T09:19:00.000Z,
            "endAt": 2025-10-01T09:33:00.000Z,
            "id": "195786991",
            "note": null,
            "projectId": "p2",
            "roleId": "developer",
            "startAt": 2025-10-01T09:19:00.000Z,
            "taskId": "t2",
            "updatedAt": 2025-10-01T09:33:00.000Z,
          },
          {
            "activityId": "a2",
            "contractorId": 123,
            "createdAt": 2025-10-01T10:00:00.000Z,
            "endAt": 2025-10-01T10:05:00.000Z,
            "id": "195790941",
            "note": null,
            "projectId": "p2",
            "roleId": "developer",
            "startAt": 2025-10-01T10:00:00.000Z,
            "taskId": "t2",
            "updatedAt": 2025-10-01T10:05:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T11:12:00.000Z,
            "endAt": 2025-10-01T12:41:00.000Z,
            "id": "195810623",
            "note": null,
            "projectId": "p2",
            "roleId": "developer",
            "startAt": 2025-10-01T11:12:00.000Z,
            "taskId": "t3",
            "updatedAt": 2025-10-01T12:41:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T12:41:00.000Z,
            "endAt": 2025-10-01T12:48:00.000Z,
            "id": "195811645",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-01T12:41:00.000Z,
            "taskId": "t4",
            "updatedAt": 2025-10-01T12:48:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T12:48:00.000Z,
            "endAt": 2025-10-01T13:29:00.000Z,
            "id": "195817932",
            "note": null,
            "projectId": "p2",
            "roleId": "developer",
            "startAt": 2025-10-01T12:48:00.000Z,
            "taskId": "t3",
            "updatedAt": 2025-10-01T13:29:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-01T13:29:00.000Z,
            "endAt": 2025-10-01T13:44:00.000Z,
            "id": "195820200",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-01T13:29:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-01T13:44:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T13:44:00.000Z,
            "endAt": 2025-10-01T14:42:00.000Z,
            "id": "195828830",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-01T13:44:00.000Z,
            "taskId": "t5",
            "updatedAt": 2025-10-01T14:42:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T16:59:00.000Z,
            "endAt": 2025-10-01T17:39:00.000Z,
            "id": "195848598",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-01T16:59:00.000Z,
            "taskId": "t5",
            "updatedAt": 2025-10-01T17:39:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-01T18:11:00.000Z,
            "endAt": 2025-10-01T20:43:00.000Z,
            "id": "195868218",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-01T18:11:00.000Z,
            "taskId": "t5",
            "updatedAt": 2025-10-01T20:43:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T05:56:00.000Z,
            "endAt": 2025-10-02T06:13:00.000Z,
            "id": "195893316",
            "note": null,
            "projectId": "p2",
            "roleId": "developer",
            "startAt": 2025-10-02T05:56:00.000Z,
            "taskId": "t6",
            "updatedAt": 2025-10-02T06:13:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-02T06:46:00.000Z,
            "endAt": 2025-10-02T06:56:00.000Z,
            "id": "195898342",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-02T06:46:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-02T06:56:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T06:56:00.000Z,
            "endAt": 2025-10-02T07:16:00.000Z,
            "id": "195898784",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-02T06:56:00.000Z,
            "taskId": "t7",
            "updatedAt": 2025-10-02T07:16:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T08:56:00.000Z,
            "endAt": 2025-10-02T09:16:00.000Z,
            "id": "195912375",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T08:56:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T09:16:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T09:16:00.000Z,
            "endAt": 2025-10-02T10:28:00.000Z,
            "id": "195920706",
            "note": null,
            "projectId": "p5",
            "roleId": "developer",
            "startAt": 2025-10-02T09:16:00.000Z,
            "taskId": "t9",
            "updatedAt": 2025-10-02T10:28:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T10:53:00.000Z,
            "endAt": 2025-10-02T11:21:00.000Z,
            "id": "195926864",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-02T10:53:00.000Z,
            "taskId": "t5",
            "updatedAt": 2025-10-02T11:21:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T12:02:00.000Z,
            "endAt": 2025-10-02T12:40:00.000Z,
            "id": "195936652",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T12:02:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T12:40:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T13:47:00.000Z,
            "endAt": 2025-10-02T14:08:00.000Z,
            "id": "195950208",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T13:47:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T14:08:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T18:08:00.000Z,
            "endAt": 2025-10-02T18:46:00.000Z,
            "id": "195979306",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T18:08:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T18:46:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-02T18:46:00.000Z,
            "endAt": 2025-10-02T19:33:00.000Z,
            "id": "195982646",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-02T18:46:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-02T19:33:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T19:33:00.000Z,
            "endAt": 2025-10-02T20:40:00.000Z,
            "id": "195988502",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T19:33:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T20:40:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-02T20:40:00.000Z,
            "endAt": 2025-10-02T21:00:00.000Z,
            "id": "195988507",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-02T20:40:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-02T21:00:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-02T21:00:00.000Z,
            "endAt": 2025-10-02T21:50:00.000Z,
            "id": "195990915",
            "note": null,
            "projectId": "p4",
            "roleId": "developer",
            "startAt": 2025-10-02T21:00:00.000Z,
            "taskId": "t8",
            "updatedAt": 2025-10-02T21:50:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-03T08:00:00.000Z,
            "endAt": 2025-10-03T09:37:00.000Z,
            "id": "196022482",
            "note": null,
            "projectId": "p6",
            "roleId": "developer",
            "startAt": 2025-10-03T08:00:00.000Z,
            "taskId": "t10",
            "updatedAt": 2025-10-03T09:37:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-03T09:46:00.000Z,
            "endAt": 2025-10-03T09:54:00.000Z,
            "id": "196024144",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-03T09:46:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-03T09:54:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-03T16:14:00.000Z,
            "endAt": 2025-10-03T16:33:00.000Z,
            "id": "196069231",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-03T16:14:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-03T16:33:00.000Z,
          },
          {
            "activityId": "a3",
            "contractorId": 123,
            "createdAt": 2025-10-03T16:33:00.000Z,
            "endAt": 2025-10-03T16:48:00.000Z,
            "id": "196070206",
            "note": null,
            "projectId": "p3",
            "roleId": "developer",
            "startAt": 2025-10-03T16:33:00.000Z,
            "taskId": "t11",
            "updatedAt": 2025-10-03T16:48:00.000Z,
          },
          {
            "activityId": "a1",
            "contractorId": 123,
            "createdAt": 2025-10-03T16:48:00.000Z,
            "endAt": 2025-10-03T17:13:00.000Z,
            "id": "196072170",
            "note": null,
            "projectId": "p1",
            "roleId": "developer",
            "startAt": 2025-10-03T16:48:00.000Z,
            "taskId": "t1",
            "updatedAt": 2025-10-03T17:13:00.000Z,
          },
        ],
      }
    `);
  });
});
