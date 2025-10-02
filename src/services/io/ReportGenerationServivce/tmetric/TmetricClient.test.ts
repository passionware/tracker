import { describe, expect, it } from "vitest";
import { createTMetricClient } from "./TmetricClient";

describe("TmetricClient", () => {
  it("should be able to fetch projects", async () => {
    const client = createTMetricClient({
      baseUrl: "https://app.tmetric.com/api",
      // baseUrl: "https://tmetricprx.fl-borovsky.workers.dev/api",
      token: import.meta.env.VITEST_TMETRIC_API_TOKEN,
      accountId: "205657", // replace with the actual account ID
    });

    const projects = await client.listProjects();
    expect(projects).toBeDefined();
    console.log("Projects:", projects);
  });

  it("should be able to fetch time entries", async () => {
    const client = createTMetricClient({
      baseUrl: "https://app.tmetric.com/api",
      token: import.meta.env.VITEST_TMETRIC_API_TOKEN,
      accountId: "205657", // replace with the actual account ID
    });

    const timeEntries = await client.listTimeEntries({
      periodStart: new Date("2025-10-01"),
      periodEnd: new Date("2025-10-31"),
      userIds: ["352387"],
      // projectIds: ["943025", "768260", "761232", "764393", "781493", "983057"],
    });

    expect(timeEntries).toBeDefined();
  });
});
