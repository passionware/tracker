import * as _ from "lodash";
import * as dateFns from "date-fns";

const w =
  typeof globalThis !== "undefined"
    ? (globalThis as { window?: Window }).window
    : undefined;
const g = typeof globalThis !== "undefined" ? globalThis : undefined;

export const expressionEnv = {
  _,
  dateFns,
  openWindow: (url: string) => w?.open(url, "_blank"),
  fetch: (w?.fetch?.bind(w) ?? (g as { fetch?: typeof fetch }).fetch ?? (() => Promise.reject(new Error("fetch not available")))) as typeof fetch,
};
