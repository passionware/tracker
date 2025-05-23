import { expressionEnv } from "@/services/front/ExpressionService/_private/expressionEnv.ts";
import { VariableContainer } from "@/services/front/ExpressionService/ExpressionService.ts";

export type Expression = {
  type: "const" | "expression";
  /**
   * value. either static value or expression
   * if expression, it should match the pattern:
   *
   * function evaluate(vars, args) {
   *   `<expression>`
   * }
   *
   * or if last line does not contain return statement, it should match the pattern:
   *
   * function evaluate(vars, args) {
   *  return `<expression>`
   * }
   */
  value: string;
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * For given vars, args, and expression, evaluate the expression and return the result.
 * Supports references between variables.
 * @param effectiveVariables Record of variables with their definitions (const or expression).
 * @param argsContext Record of arguments for the evaluation context.
 * @param expression Expression string to evaluate.
 * @returns Evaluated result of the expression.
 */
export async function evaluateExpression(
  effectiveVariables: Record<string, Expression>,
  argsContext: VariableContainer,
  expression: string,
): Promise<string> {
  const cache: Record<string, string> = {};
  const currentlyEvaluating: Set<string> = new Set();

  async function resolveVariable(
    variableName: string,
    rootVariableName: string = variableName,
  ): Promise<string> {
    if (currentlyEvaluating.has(variableName)) {
      throw new Error(
        `Circular reference detected for variable "${rootVariableName}"`,
      );
    }

    if (cache[variableName]) {
      return cache[variableName];
    }

    const variable = effectiveVariables[variableName];
    if (!variable) {
      throw new Error(`Variable "${variableName}" not found`);
    }

    currentlyEvaluating.add(variableName);

    let result: string;

    if (variable.type === "const") {
      result = variable.value;
    } else if (variable.type === "expression") {
      const varsProxy = new Proxy(effectiveVariables, {
        get(target, name: string) {
          if (name in target) {
            return resolveVariable(name as string, rootVariableName);
          }
          throw new Error(`Variable "${name}" is not defined`);
        },
      });

      const argsProxy = new Proxy(argsContext, {
        get(target, name: string) {
          if (name in target) {
            return target[name as string];
          }
          throw new Error(`Argument "${name}" is not defined`);
        },
      });

      const wrappedExpression = wrapExpression(variable.value);

      const fn = new AsyncFunction(
        "vars",
        "args",
        "api",
        wrappedExpression,
      ) as (
        vars: typeof varsProxy,
        args: typeof argsProxy,
        api: typeof expressionEnv,
      ) => string | Promise<string>;

      result = await fn(varsProxy, argsProxy, expressionEnv);
    } else {
      throw new Error(`Unsupported variable type: ${variable.type}`);
    }

    currentlyEvaluating.delete(variableName);
    cache[variableName] = result;
    return result;
  }

  const wrappedExpression = wrapExpression(expression);

  const fn = new AsyncFunction("vars", "args", "api", wrappedExpression) as (
    vars: Record<string, string | undefined>,
    args: VariableContainer,
    api: typeof expressionEnv,
  ) => string | Promise<string>;

  const result = await fn(
    new Proxy(
      // also: consider making proxy on an empty object
      effectiveVariables as unknown as Record<string, string | undefined>,
      {
        get(target, name: string) {
          if (name in target) {
            return resolveVariable(name as string);
          }
          throw new Error(`Variable "${name}" is not defined`);
        },
      },
    ),
    argsContext,
    expressionEnv,
  );
  return result;
}

/**
 * Wraps the given expression into a valid JavaScript function body.
 * Ensures single-line expressions are prefixed with "return", while multi-line expressions
 * are assumed to be correctly formatted by the user.
 *
 * @param expression - The expression to wrap
 * @returns A valid JavaScript function body
 */
export function wrapExpression(expression: string): string {
  const trimmedExpression = expression.trim();
  const lines = trimmedExpression.split("\n").map((line) => line.trim());

  if (lines.length === 1) {
    // For single-line expressions, add "return" if missing
    if (!lines[0].startsWith("return ")) {
      return `return ${trimmedExpression};`;
    }
    return trimmedExpression;
  } else {
    // For multi-line expressions, assume user included proper "return"
    return trimmedExpression;
  }
}
