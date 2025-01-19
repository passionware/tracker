import { Variable } from "@/api/variable/variable.api.ts";
import { describe, expect, it } from "vitest";
import { selectEffectiveVariables } from "./selectEffectiveVariables";

describe("selectEffectiveVariables", () => {
  const context = {
    workspaceId: 1,
    clientId: 101,
    contractorId: 1001,
  };

  it("should prioritize contractor > client > workspace > global", () => {
    const variables = [
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      { name: "API_URL", workspaceId: 1, clientId: null, contractorId: null },
      { name: "API_URL", workspaceId: 1, clientId: 101, contractorId: null },
      { name: "API_URL", workspaceId: 1, clientId: 101, contractorId: 1001 },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: 1,
        clientId: 101,
        contractorId: 1001,
      },
    });
  });

  it("should fallback to client if contractor-level variable is missing", () => {
    const variables = [
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      { name: "API_URL", workspaceId: 1, clientId: null, contractorId: null },
      { name: "API_URL", workspaceId: 1, clientId: 101, contractorId: null },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: 1,
        clientId: 101,
        contractorId: null,
      },
    });
  });

  it("should fallback to workspace if client-level variable is missing", () => {
    const variables = [
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      { name: "API_URL", workspaceId: 1, clientId: null, contractorId: null },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: 1,
        clientId: null,
        contractorId: null,
      },
    });
  });

  it("should fallback to global if workspace-level variable is missing", () => {
    const variables = [
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
    });
  });

  it("should handle multiple variables independently", () => {
    const variables = [
      { name: "API_URL", workspaceId: 1, clientId: 101, contractorId: 1001 },
      {
        name: "DISCOUNT",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: 1,
        clientId: 101,
        contractorId: 1001,
      },
      DISCOUNT: {
        name: "DISCOUNT",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
    });
  });

  it("should return an empty object if no variables are provided", () => {
    const variables: Variable[] = [];
    const result = selectEffectiveVariables(context, variables);
    expect(result).toEqual({});
  });

  it.skip("should correctly handle variables with partial matches", () => {
    const variables = [
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      { name: "API_URL", workspaceId: null, clientId: 101, contractorId: null },
      {
        name: "API_URL",
        workspaceId: null,
        clientId: null,
        contractorId: 1001,
      },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({
      API_URL: {
        name: "API_URL",
        workspaceId: null,
        clientId: 101,
        contractorId: null,
      },
    });
  });

  it("should not select a variable if none match the context", () => {
    const variables = [
      { name: "API_URL", workspaceId: 2, clientId: null, contractorId: null },
      { name: "API_URL", workspaceId: 2, clientId: 102, contractorId: null },
      { name: "API_URL", workspaceId: 2, clientId: 102, contractorId: 1002 },
    ];

    const result = selectEffectiveVariables(context, variables);

    expect(result).toEqual({});
  });
  it("should resolve variables in a realistic scenario with nested contexts", () => {
    const variables = [
      {
        name: "report_url",
        type: "expression",
        value:
          "`https://app.tmetric.com/#/reports/${vars.workspaceName}/tasks?range=${args.timeStart}-${args.timeEnd}&group=25205&project=${vars.projectName}&groupby=description&chartvalue=duration&user=${vars.user}`",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      {
        name: "workspaceName",
        type: "const",
        value: "workspace1",
        workspaceId: 1,
        clientId: null,
        contractorId: null,
      },
      {
        name: "workspaceName",
        type: "const",
        value: "workspace2",
        workspaceId: 2,
        clientId: null,
        contractorId: null,
      },
      {
        name: "projectName",
        type: "const",
        value: "projectw1c1",
        workspaceId: 1,
        clientId: 101,
        contractorId: null,
      },
      {
        name: "projectName",
        type: "const",
        value: "projectw2c1",
        workspaceId: 2,
        clientId: 101,
        contractorId: null,
      },
      {
        name: "user",
        type: "const",
        value: "uw1c1",
        workspaceId: 1,
        clientId: null,
        contractorId: 1001,
      },
      {
        name: "user",
        type: "const",
        value: "userc2",
        workspaceId: null,
        clientId: null,
        contractorId: 1002,
      },
    ];

    const contextWorkspace1 = {
      workspaceId: 1,
      clientId: 101,
      contractorId: 1001,
    };
    const contextWorkspace2 = {
      workspaceId: 2,
      clientId: 101,
      contractorId: 1002,
    };

    const selectedVariablesWorkspace1 = selectEffectiveVariables(
      contextWorkspace1,
      variables,
    );
    const selectedVariablesWorkspace2 = selectEffectiveVariables(
      contextWorkspace2,
      variables,
    );

    // Sprawdzamy, czy dla workspace 1 wszystkie zmienne zostały poprawnie wybrane
    expect(selectedVariablesWorkspace1).toEqual({
      report_url: {
        name: "report_url",
        type: "expression",
        value:
          "`https://app.tmetric.com/#/reports/${vars.workspaceName}/tasks?range=${args.timeStart}-${args.timeEnd}&group=25205&project=${vars.projectName}&groupby=description&chartvalue=duration&user=${vars.user}`",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      workspaceName: {
        name: "workspaceName",
        type: "const",
        value: "workspace1",
        workspaceId: 1,
        clientId: null,
        contractorId: null,
      },
      projectName: {
        name: "projectName",
        type: "const",
        value: "projectw1c1",
        workspaceId: 1,
        clientId: 101,
        contractorId: null,
      },
      user: {
        name: "user",
        type: "const",
        value: "uw1c1",
        workspaceId: 1,
        clientId: null,
        contractorId: 1001,
      },
    });

    // Sprawdzamy, czy dla workspace 2 wszystkie zmienne zostały poprawnie wybrane
    expect(selectedVariablesWorkspace2).toEqual({
      report_url: {
        name: "report_url",
        type: "expression",
        value:
          "`https://app.tmetric.com/#/reports/${vars.workspaceName}/tasks?range=${args.timeStart}-${args.timeEnd}&group=25205&project=${vars.projectName}&groupby=description&chartvalue=duration&user=${vars.user}`",
        workspaceId: null,
        clientId: null,
        contractorId: null,
      },
      workspaceName: {
        name: "workspaceName",
        type: "const",
        value: "workspace2",
        workspaceId: 2,
        clientId: null,
        contractorId: null,
      },
      projectName: {
        name: "projectName",
        type: "const",
        value: "projectw2c1",
        workspaceId: 2,
        clientId: 101,
        contractorId: null,
      },
      user: {
        name: "user",
        type: "const",
        value: "userc2",
        workspaceId: null,
        clientId: null,
        contractorId: 1002,
      },
    });
  });
});
