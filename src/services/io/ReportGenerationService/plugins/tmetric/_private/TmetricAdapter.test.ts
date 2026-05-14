import { describe, expect, it } from "vitest";
import { inferActivity } from "./TmetricAdapter.ts";
import type { TMetricTag } from "./TmetricSchemas.ts";

describe("TmetricAdapter", () => {
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

    it("should map unknown activity tag values to development", () => {
      expect(inferActivity("work", [createTag("activity:review")])).toBe(
        "code_review",
      );
      expect(inferActivity("work", [createTag("activity:dev")])).toBe(
        "development",
      );
      expect(inferActivity("work", [createTag("activity:custom")])).toBe(
        "development",
      );
    });
  });
});
