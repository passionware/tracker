import { describe, it, expect } from "vitest";
import { evaluateExpression } from "./evaluateExpression";

const variablesBase = {
  BASE_URL: { type: "const", value: "https://example.com" },
  FULL_URL: {
    type: "expression",
    value: "`${vars.BASE_URL}/tasks`",
  },
} as const

describe("evaluateExpression", () => {
  it("should evaluate simple expressions with implicit return", () => {
    const variables = {
      ...variablesBase,
    };

    const args = {};

    const result = evaluateExpression(
      variables,
      args,
      variables.FULL_URL.value,
    );
    expect(result).toBe("https://example.com/tasks");
  });


  it("should evaluate multi-line expressions with explicit return", () => {
    const variables = {
      BASE_URL: { type: "const", value: "https://example.com" },
      FULL_URL: {
        type: "expression",
        value: `
          const base = vars.BASE_URL;
          const endpoint = "/tasks";
          return base + endpoint;
        `,
      },
    } as const;

    const args = {};

    const result = evaluateExpression(
      variables,
      args,
      variables.FULL_URL.value,
    );
    expect(result).toBe("https://example.com/tasks");
  });

  it("should evaluate expressions referencing other variables", () => {
    const variables = {
      BASE_URL: { type: "const", value: "https://example.com" },
      USER_PATH: {
        type: "expression",
        value: "`${vars.BASE_URL}/users`",
      },
    } as const;

    const args = {};

    const result = evaluateExpression(
      variables,
      args,
      variables.USER_PATH.value,
    );
    expect(result).toBe("https://example.com/users");
  });

  it("should handle undefined variables in expressions", () => {
    const variables = {
      BROKEN_EXPRESSION: {
        type: "expression",
        value: "undefinedVar + 1",
      },
    }as const;

    const args = {};

    expect(() => {
      evaluateExpression(variables, args, variables.BROKEN_EXPRESSION.value);
    }).toThrow('undefinedVar is not defined');
  });

  it("should evaluate arguments in expressions", () => {
    const variables = {
      REPORT_PATH: {
        type: "expression",
        value: "`/reports?user=${args.user}&range=${args.range}`",
      },
    } as const;

    const args = { user: "user123", range: "2023-01-01_to_2023-01-31" };

    const result = evaluateExpression(
      variables,
      args,
      variables.REPORT_PATH.value,
    );
    expect(result).toBe("/reports?user=user123&range=2023-01-01_to_2023-01-31");
  });

  it("should handle nested variable references", () => {
    const variables = {
      BASE_URL: { type: "const", value: "https://example.com" },
      API_PATH: {
        type: "expression",
        value: "`${vars.BASE_URL}/api`",
      },
      FULL_PATH: {
        type: "expression",
        value: "`${vars.API_PATH}/v1`",
      },
    } as const;

    const args = {};

    const result = evaluateExpression(
      variables,
      args,
      variables.FULL_PATH.value,
    );
    expect(result).toBe("https://example.com/api/v1");
  });

  it("should handle circular references with an error", () => {
    const variables = {
      VAR_A: {
        type: "expression",
        value: "vars.VAR_B",
      },
      VAR_B: {
        type: "expression",
        value: "vars.VAR_A",
      },
    } as const;

    const args = {};

    expect(() => {
      evaluateExpression(variables, args, `"sth"+vars.VAR_A`);
    }).toThrow('Circular reference detected for variable "VAR_A"');
  });

  it("should handle real case scenario", () => {
    const variables = {
      REPORT_URL: {
        type: "expression",
        value:
          "`https://app.tmetric.com/#/reports/${vars.workspaceName}/tasks?range=${args.timeStart}-${args.timeEnd}&group=25205&project=${vars.projectName}&groupby=description&chartvalue=duration&user=${vars.user}`",
      },
      workspaceName: { type: "const", value: "workspace1" },
      projectName: { type: "const", value: "projectw1c1" },
      user: { type: "const", value: "uw1c1" },
    } as const;

    const args = { timeStart: "2023-01-01", timeEnd: "2023-01-31" };

    const result = evaluateExpression(
      variables,
      args,
      variables.REPORT_URL.value,
    );

    expect(result).toBe(
      "https://app.tmetric.com/#/reports/workspace1/tasks?range=2023-01-01-2023-01-31&group=25205&project=projectw1c1&groupby=description&chartvalue=duration&user=uw1c1",
    );
  });
});
