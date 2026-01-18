import { describe, expect, it } from "vitest";
import { mockTmetricResponse } from "./__test__/mock-tmetric-response.ts";
import type { TMetricAdapterInput } from "./TmetricAdapter.ts";
import { adaptTMetricToGeneric, inferActivity } from "./TmetricAdapter.ts";
import type { TMetricTag } from "./TmetricSchemas.ts";

describe("TmetricAdapter", () => {
  const createMockInput = (
    entries = mockTmetricResponse,
  ): TMetricAdapterInput => ({
    entries,
    defaultRoleId: "developer",
    currency: "USD",
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

      // Check that task types are created from unique notes
      const taskTypes = result.definitions.taskTypes;
      expect(Object.keys(taskTypes).length).toBeGreaterThan(0);

      // Verify some specific task types from mock data
      expect(
        taskTypes["planning work / task analysis / code review"],
      ).toBeDefined();
      expect(taskTypes["Operations"]).toBeDefined();
      expect(taskTypes["v1-1081-custom-nike-integration-plan"]).toBeDefined();
      expect(taskTypes["tmetric reports generation"]).toBeDefined();

      // Check task type structure
      const taskType = taskTypes["planning work / task analysis / code review"];
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

      expect(activityTypes.development).toEqual({
        name: "Development",
        description: "Hands-on implementation work",
        parameters: {},
      });

      expect(activityTypes.code_review).toEqual({
        name: "Code Review",
        description: "PR/MR reviews and related",
        parameters: {},
      });

      expect(activityTypes.meeting).toEqual({
        name: "Meeting",
        description: "Calls, standups, ceremonies",
        parameters: {},
      });

      expect(activityTypes.operations).toEqual({
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

      // Check first entry structure
      const firstEntry = timeEntries[0];
      const originalEntry = mockTmetricResponse[0];

      expect(firstEntry.id).toBe(String(originalEntry.id));
      expect(firstEntry.note).toBe(null);
      expect(firstEntry.taskId).toBe(
        originalEntry.note?.trim() || "Unnamed task",
      );
      expect(firstEntry.roleId).toBe("developer");
      expect(firstEntry.startAt).toEqual(new Date(originalEntry.startTime));
      expect(firstEntry.endAt).toEqual(new Date(originalEntry.endTime));
      expect(firstEntry.createdAt).toEqual(new Date(originalEntry.startTime));
      expect(firstEntry.updatedAt).toEqual(new Date(originalEntry.endTime));
    });

    it("should handle entries with empty notes", () => {
      const entriesWithEmptyNote = [
        {
          ...mockTmetricResponse[0],
          note: "",
        },
      ];

      const input = createMockInput(entriesWithEmptyNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(timeEntry.taskId).toBe("Unnamed task");
    });

    it("should handle entries with undefined notes", () => {
      const entriesWithUndefinedNote = [
        {
          ...mockTmetricResponse[0],
          note: undefined as any,
        },
      ];

      const input = createMockInput(entriesWithUndefinedNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe(null);
      expect(timeEntry.taskId).toBe("Unnamed task");
    });

    it("should handle entries with null notes", () => {
      const entriesWithNullNote = [
        {
          ...mockTmetricResponse[0],
          note: null as any,
        },
      ];

      const input = createMockInput(entriesWithNullNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe("");
      expect(timeEntry.taskId).toBe("Unnamed task");
    });

    it("should handle entries with whitespace-only notes", () => {
      const entriesWithWhitespaceNote = [
        {
          ...mockTmetricResponse[0],
          note: "   ",
        },
      ];

      const input = createMockInput(entriesWithWhitespaceNote);
      const result = adaptTMetricToGeneric(input);

      const timeEntry = result.timeEntries[0];
      expect(timeEntry.note).toBe("   ");
      expect(timeEntry.taskId).toBe("Unnamed task");
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
      input.currency = "EUR";

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

      // Should have only 2 unique task types despite 4 entries
      expect(taskTypeKeys).toHaveLength(2);
      expect(
        taskTypes["planning work / task analysis / code review"],
      ).toBeDefined();
      expect(taskTypes["Operations"]).toBeDefined();
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
      expect(
        inferActivity("discussion", [createTag("activity:meeting")]),
      ).toBe("meeting");
      expect(
        inferActivity("chat", [createTag("activity:meeting")]),
      ).toBe("meeting");
    });

    it("should infer 'code_review' activity from 'activity:review' tag", () => {
      expect(
        inferActivity("code review", [createTag("activity:review")]),
      ).toBe("code_review");
      expect(
        inferActivity("PR review", [createTag("activity:review")]),
      ).toBe("code_review");
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
      expect(
        inferActivity("work", [createTag("activity:MEETING")]),
      ).toBe("meeting");
      expect(
        inferActivity("work", [createTag("ACTIVITY:review")]),
      ).toBe("code_review");
      expect(
        inferActivity("work", [createTag("Activity:Operations")]),
      ).toBe("operations");
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
      expect(
        inferActivity("work", [createTag("activity:review")]),
      ).toBe("code_review");
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

      // Verify each entry has required fields
      result.timeEntries.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.note).toBeDefined();
        expect(entry.taskId).toBeDefined();
        expect(entry.activityId).toBeDefined();
        expect(entry.roleId).toBe("developer");
        expect(entry.startAt).toBeInstanceOf(Date);
        expect(entry.endAt).toBeInstanceOf(Date);
        expect(entry.createdAt).toBeInstanceOf(Date);
        expect(entry.updatedAt).toBeInstanceOf(Date);

        // Verify activity inference worked
        expect([
          "development",
          "code_review",
          "meeting",
          "operations",
        ]).toContain(entry.activityId);
      });
    });

    it("should create correct task types for mock data", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      const taskTypes = result.definitions.taskTypes;

      // Verify specific task types from mock data exist
      expect(
        taskTypes["planning work / task analysis / code review"],
      ).toBeDefined();
      expect(taskTypes["Operations"]).toBeDefined();
      expect(
        taskTypes[
          "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income"
        ],
      ).toBeDefined();
      expect(taskTypes["backmerging & fixes"]).toBeDefined();
      expect(taskTypes["v1-1081-custom-nike-integration-plan"]).toBeDefined();
      expect(taskTypes["388-negative-discount-amount-bug"]).toBeDefined();
      expect(taskTypes["v1-1074-run-e2e-test-every-pr"]).toBeDefined();
      expect(taskTypes["tmetric reports generation"]).toBeDefined();
      expect(taskTypes["chat with Scott"]).toBeDefined();
      expect(taskTypes["checkin with Lennart"]).toBeDefined();
      expect(
        taskTypes[
          "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown"
        ],
      ).toBeDefined();
    });

    it("should infer correct activity types for mock data", () => {
      const input = createMockInput();
      const result = adaptTMetricToGeneric(input);

      // Find entries by their notes to verify activity inference
      const planningEntry = result.timeEntries.find(
        (e) => e.note === "planning work / task analysis / code review",
      );
      expect(planningEntry?.activityId).toBe("code_review");

      const opsEntry = result.timeEntries.find((e) => e.note === "Operations");
      expect(opsEntry?.activityId).toBe("operations");

      const meetingEntry = result.timeEntries.find(
        (e) => e.note === "chat with Scott",
      );
      expect(meetingEntry?.activityId).toBe("meeting");

      const devEntry = result.timeEntries.find(
        (e) => e.note === "v1-1081-custom-nike-integration-plan",
      );
      expect(devEntry?.activityId).toBe("development");
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

      // Verify that all original entry IDs are preserved
      const originalIds = mockTmetricResponse.map((e) => String(e.id));
      const resultIds = result.timeEntries.map((e) => e.id);

      expect(resultIds.sort()).toEqual(originalIds.sort());

      // Verify that all original notes are preserved
      const originalNotes = mockTmetricResponse.map((e) => e.note || "");
      const resultNotes = result.timeEntries.map((e) => e.note);

      expect(resultNotes.sort()).toEqual(originalNotes.sort());
    });
  });

  it("snapshot test for generic report structure", () => {
    const input = createMockInput();
    const result = adaptTMetricToGeneric(input);
    expect(result).toMatchInlineSnapshot(`
      {
        "definitions": {
          "activityTypes": {
            "code_review": {
              "description": "PR/MR reviews and related",
              "name": "Code Review",
              "parameters": {},
            },
            "development": {
              "description": "Hands-on implementation work",
              "name": "Development",
              "parameters": {},
            },
            "meeting": {
              "description": "Calls, standups, ceremonies",
              "name": "Meeting",
              "parameters": {},
            },
            "operations": {
              "description": "Planning, triage, coordination",
              "name": "Operations",
              "parameters": {},
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
            "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income": {
              "description": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
              "name": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
              "parameters": {},
            },
            "388-negative-discount-amount-bug": {
              "description": "388-negative-discount-amount-bug",
              "name": "388-negative-discount-amount-bug",
              "parameters": {},
            },
            "Operations": {
              "description": "Operations",
              "name": "Operations",
              "parameters": {},
            },
            "backmerging & fixes": {
              "description": "backmerging & fixes",
              "name": "backmerging & fixes",
              "parameters": {},
            },
            "chat with Scott": {
              "description": "chat with Scott",
              "name": "chat with Scott",
              "parameters": {},
            },
            "checkin with Lennart": {
              "description": "checkin with Lennart",
              "name": "checkin with Lennart",
              "parameters": {},
            },
            "planning work / task analysis / code review": {
              "description": "planning work / task analysis / code review",
              "name": "planning work / task analysis / code review",
              "parameters": {},
            },
            "tmetric reports generation": {
              "description": "tmetric reports generation",
              "name": "tmetric reports generation",
              "parameters": {},
            },
            "v1-1074-run-e2e-test-every-pr": {
              "description": "v1-1074-run-e2e-test-every-pr",
              "name": "v1-1074-run-e2e-test-every-pr",
              "parameters": {},
            },
            "v1-1081-custom-nike-integration-plan": {
              "description": "v1-1081-custom-nike-integration-plan",
              "name": "v1-1081-custom-nike-integration-plan",
              "parameters": {},
            },
            "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown": {
              "description": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
              "name": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
              "parameters": {},
            },
          },
        },
        "timeEntries": [
          {
            "activityId": "code_review",
            "createdAt": 2025-10-01T08:15:00.000Z,
            "endAt": 2025-10-01T08:26:00.000Z,
            "id": "195778761",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-01T08:15:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-01T08:26:00.000Z,
          },
          {
            "activityId": "operations",
            "createdAt": 2025-10-01T09:19:00.000Z,
            "endAt": 2025-10-01T09:33:00.000Z,
            "id": "195786991",
            "note": "Operations",
            "roleId": "developer",
            "startAt": 2025-10-01T09:19:00.000Z,
            "taskId": "Operations",
            "updatedAt": 2025-10-01T09:33:00.000Z,
          },
          {
            "activityId": "operations",
            "createdAt": 2025-10-01T10:00:00.000Z,
            "endAt": 2025-10-01T10:05:00.000Z,
            "id": "195790941",
            "note": "Operations",
            "roleId": "developer",
            "startAt": 2025-10-01T10:00:00.000Z,
            "taskId": "Operations",
            "updatedAt": 2025-10-01T10:05:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T11:12:00.000Z,
            "endAt": 2025-10-01T12:41:00.000Z,
            "id": "195810623",
            "note": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
            "roleId": "developer",
            "startAt": 2025-10-01T11:12:00.000Z,
            "taskId": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
            "updatedAt": 2025-10-01T12:41:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T12:41:00.000Z,
            "endAt": 2025-10-01T12:48:00.000Z,
            "id": "195811645",
            "note": "backmerging & fixes",
            "roleId": "developer",
            "startAt": 2025-10-01T12:41:00.000Z,
            "taskId": "backmerging & fixes",
            "updatedAt": 2025-10-01T12:48:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T12:48:00.000Z,
            "endAt": 2025-10-01T13:29:00.000Z,
            "id": "195817932",
            "note": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
            "roleId": "developer",
            "startAt": 2025-10-01T12:48:00.000Z,
            "taskId": "387-cancellation-invoices-cannot-be-connected-for-outgoing-invoices-income",
            "updatedAt": 2025-10-01T13:29:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-01T13:29:00.000Z,
            "endAt": 2025-10-01T13:44:00.000Z,
            "id": "195820200",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-01T13:29:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-01T13:44:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T13:44:00.000Z,
            "endAt": 2025-10-01T14:42:00.000Z,
            "id": "195828830",
            "note": "v1-1081-custom-nike-integration-plan",
            "roleId": "developer",
            "startAt": 2025-10-01T13:44:00.000Z,
            "taskId": "v1-1081-custom-nike-integration-plan",
            "updatedAt": 2025-10-01T14:42:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T16:59:00.000Z,
            "endAt": 2025-10-01T17:39:00.000Z,
            "id": "195848598",
            "note": "v1-1081-custom-nike-integration-plan",
            "roleId": "developer",
            "startAt": 2025-10-01T16:59:00.000Z,
            "taskId": "v1-1081-custom-nike-integration-plan",
            "updatedAt": 2025-10-01T17:39:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-01T18:11:00.000Z,
            "endAt": 2025-10-01T20:43:00.000Z,
            "id": "195868218",
            "note": "v1-1081-custom-nike-integration-plan",
            "roleId": "developer",
            "startAt": 2025-10-01T18:11:00.000Z,
            "taskId": "v1-1081-custom-nike-integration-plan",
            "updatedAt": 2025-10-01T20:43:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T05:56:00.000Z,
            "endAt": 2025-10-02T06:13:00.000Z,
            "id": "195893316",
            "note": "388-negative-discount-amount-bug",
            "roleId": "developer",
            "startAt": 2025-10-02T05:56:00.000Z,
            "taskId": "388-negative-discount-amount-bug",
            "updatedAt": 2025-10-02T06:13:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-02T06:46:00.000Z,
            "endAt": 2025-10-02T06:56:00.000Z,
            "id": "195898342",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-02T06:46:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-02T06:56:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T06:56:00.000Z,
            "endAt": 2025-10-02T07:16:00.000Z,
            "id": "195898784",
            "note": "v1-1074-run-e2e-test-every-pr",
            "roleId": "developer",
            "startAt": 2025-10-02T06:56:00.000Z,
            "taskId": "v1-1074-run-e2e-test-every-pr",
            "updatedAt": 2025-10-02T07:16:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T08:56:00.000Z,
            "endAt": 2025-10-02T09:16:00.000Z,
            "id": "195912375",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T08:56:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T09:16:00.000Z,
          },
          {
            "activityId": "meeting",
            "createdAt": 2025-10-02T09:16:00.000Z,
            "endAt": 2025-10-02T10:28:00.000Z,
            "id": "195920706",
            "note": "chat with Scott",
            "roleId": "developer",
            "startAt": 2025-10-02T09:16:00.000Z,
            "taskId": "chat with Scott",
            "updatedAt": 2025-10-02T10:28:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T10:53:00.000Z,
            "endAt": 2025-10-02T11:21:00.000Z,
            "id": "195926864",
            "note": "v1-1081-custom-nike-integration-plan",
            "roleId": "developer",
            "startAt": 2025-10-02T10:53:00.000Z,
            "taskId": "v1-1081-custom-nike-integration-plan",
            "updatedAt": 2025-10-02T11:21:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T12:02:00.000Z,
            "endAt": 2025-10-02T12:40:00.000Z,
            "id": "195936652",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T12:02:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T12:40:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T13:47:00.000Z,
            "endAt": 2025-10-02T14:08:00.000Z,
            "id": "195950208",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T13:47:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T14:08:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T18:08:00.000Z,
            "endAt": 2025-10-02T18:46:00.000Z,
            "id": "195979306",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T18:08:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T18:46:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-02T18:46:00.000Z,
            "endAt": 2025-10-02T19:33:00.000Z,
            "id": "195982646",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-02T18:46:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-02T19:33:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T19:33:00.000Z,
            "endAt": 2025-10-02T20:40:00.000Z,
            "id": "195988502",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T19:33:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T20:40:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-02T20:40:00.000Z,
            "endAt": 2025-10-02T21:00:00.000Z,
            "id": "195988507",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-02T20:40:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-02T21:00:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-02T21:00:00.000Z,
            "endAt": 2025-10-02T21:50:00.000Z,
            "id": "195990915",
            "note": "tmetric reports generation",
            "roleId": "developer",
            "startAt": 2025-10-02T21:00:00.000Z,
            "taskId": "tmetric reports generation",
            "updatedAt": 2025-10-02T21:50:00.000Z,
          },
          {
            "activityId": "meeting",
            "createdAt": 2025-10-03T08:00:00.000Z,
            "endAt": 2025-10-03T09:37:00.000Z,
            "id": "196022482",
            "note": "checkin with Lennart",
            "roleId": "developer",
            "startAt": 2025-10-03T08:00:00.000Z,
            "taskId": "checkin with Lennart",
            "updatedAt": 2025-10-03T09:37:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-03T09:46:00.000Z,
            "endAt": 2025-10-03T09:54:00.000Z,
            "id": "196024144",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-03T09:46:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-03T09:54:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-03T16:14:00.000Z,
            "endAt": 2025-10-03T16:33:00.000Z,
            "id": "196069231",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-03T16:14:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-03T16:33:00.000Z,
          },
          {
            "activityId": "development",
            "createdAt": 2025-10-03T16:33:00.000Z,
            "endAt": 2025-10-03T16:48:00.000Z,
            "id": "196070206",
            "note": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
            "roleId": "developer",
            "startAt": 2025-10-03T16:33:00.000Z,
            "taskId": "v1-1138-bookings-with-status-first_hold-or-others-are-not-shown",
            "updatedAt": 2025-10-03T16:48:00.000Z,
          },
          {
            "activityId": "code_review",
            "createdAt": 2025-10-03T16:48:00.000Z,
            "endAt": 2025-10-03T17:13:00.000Z,
            "id": "196072170",
            "note": "planning work / task analysis / code review",
            "roleId": "developer",
            "startAt": 2025-10-03T16:48:00.000Z,
            "taskId": "planning work / task analysis / code review",
            "updatedAt": 2025-10-03T17:13:00.000Z,
          },
        ],
      }
    `);
  });
});
