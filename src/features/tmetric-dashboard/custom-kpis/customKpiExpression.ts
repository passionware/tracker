/**
 * Custom KPI formula engine.
 *
 * Parsing is delegated to `jsep` (a tiny JS expression parser); we only walk
 * the resulting AST and enforce a restricted grammar:
 *
 *   expr   := term (("+" | "-") term)*
 *   term   := unary (("*" | "/") unary)*
 *   unary  := ("-" | "+")? atom
 *   atom   := number | identifier | "(" expr ")"
 *
 * Anything jsep would otherwise accept (call expressions, member access,
 * comparison/logical operators, conditional, strings, arrays, etc.) is
 * rejected at evaluation time.
 *
 * Identifiers must be present in the supplied variable map at evaluation time;
 * unknown identifiers fail validation. Division by zero yields `null` (not an
 * error) and `null` propagates through subsequent arithmetic, so KPIs render
 * as "—" when their denominator is 0.
 */

import jsep from "jsep";

// Original hand-written grammar only allowed `_` (no `$`) inside identifiers.
// jsep treats `$` as an identifier character by default; remove it so character
// like `$` is reported as an unexpected token instead of becoming an identifier.
jsep.removeIdentifierChar("$");

export type EvaluateOk = { ok: true; value: number | null };
export type EvaluateErr = { ok: false; error: string; position: number };
export type EvaluateResult = EvaluateOk | EvaluateErr;

const ALLOWED_BINARY_OPS = new Set(["+", "-", "*", "/"]);
const ALLOWED_UNARY_OPS = new Set(["+", "-"]);

class EvalError extends Error {
  constructor(message: string, public readonly position: number) {
    super(message);
  }
}

/** Best-effort character position of an identifier inside the original formula. */
function findIdentifierPosition(formula: string, name: string): number {
  const re = new RegExp(`(^|[^A-Za-z0-9_])(${escapeRegExp(name)})(?![A-Za-z0-9_])`);
  const match = re.exec(formula);
  if (!match) return 0;
  return match.index + match[1].length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evalNode(
  node: jsep.Expression,
  vars: Record<string, number>,
  knownNames: ReadonlySet<string> | null,
  formula: string,
): number | null {
  switch (node.type) {
    case "Literal": {
      const lit = node as jsep.Literal;
      if (typeof lit.value !== "number") {
        throw new EvalError(
          `Unsupported literal "${lit.raw}"`,
          0,
        );
      }
      return lit.value;
    }
    case "Identifier": {
      const id = node as jsep.Identifier;
      const name = id.name;
      if (knownNames && !knownNames.has(name)) {
        throw new EvalError(
          `Unknown variable "${name}"`,
          findIdentifierPosition(formula, name),
        );
      }
      const v = vars[name];
      return v === undefined ? 0 : v;
    }
    case "UnaryExpression": {
      const un = node as jsep.UnaryExpression;
      if (!ALLOWED_UNARY_OPS.has(un.operator)) {
        throw new EvalError(
          `Unsupported operator "${un.operator}"`,
          0,
        );
      }
      const value = evalNode(un.argument, vars, knownNames, formula);
      if (value === null) return null;
      return un.operator === "-" ? -value : value;
    }
    case "BinaryExpression": {
      const bin = node as jsep.BinaryExpression;
      if (!ALLOWED_BINARY_OPS.has(bin.operator)) {
        throw new EvalError(
          `Unsupported operator "${bin.operator}"`,
          0,
        );
      }
      const left = evalNode(bin.left, vars, knownNames, formula);
      const right = evalNode(bin.right, vars, knownNames, formula);
      if (left === null || right === null) return null;
      switch (bin.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? null : left / right;
        default:
          throw new EvalError(
            `Unsupported operator "${bin.operator}"`,
            0,
          );
      }
    }
    case "Compound":
      // jsep produces this for whitespace-separated expressions like "1 2".
      throw new EvalError("Unexpected token", 0);
    default:
      throw new EvalError(`Unsupported expression "${node.type}"`, 0);
  }
}

function runParser(
  formula: string,
  vars: Record<string, number>,
  knownNames: ReadonlySet<string> | null,
): EvaluateResult {
  if (formula.trim().length === 0) {
    return { ok: false, error: "Empty formula", position: 0 };
  }
  let ast: jsep.Expression;
  try {
    ast = jsep(formula);
  } catch (e) {
    const description =
      typeof e === "object" && e !== null && "description" in e
        ? String((e as { description: unknown }).description)
        : e instanceof Error
          ? e.message
          : String(e);
    const index =
      typeof e === "object" && e !== null && "index" in e
        ? Number((e as { index: unknown }).index)
        : 0;
    return { ok: false, error: description, position: index };
  }
  try {
    const value = evalNode(ast, vars, knownNames, formula);
    return { ok: true, value };
  } catch (e) {
    if (e instanceof EvalError) {
      return { ok: false, error: e.message, position: e.position };
    }
    throw e;
  }
}

export function evaluateKpi(
  formula: string,
  vars: Record<string, number>,
): EvaluateResult {
  return runParser(formula, vars, null);
}

/**
 * Validate a formula's syntax and check that every identifier is in `knownNames`.
 * Returns the parse result; numeric value is meaningless (uses zeros for variables)
 * — only the `ok`/`error`/`position` fields are intended for callers.
 */
export function validateKpi(
  formula: string,
  knownNames: ReadonlySet<string>,
): EvaluateResult {
  return runParser(formula, {}, knownNames);
}
