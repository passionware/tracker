import { ReactNode } from "react";

export type QueryBarSpecPresence = "hide" | "disable" | "show";
export type QueryBarSpec = {
  workspace: QueryBarSpecPresence;
  client: QueryBarSpecPresence;
  contractor: QueryBarSpecPresence;
};

export const queryBarSpecUtils = {
  renderIf: (spec: QueryBarSpecPresence, children: ReactNode) => {
    switch (spec) {
      case "hide":
        return null;
      case "disable":
      case "show":
        return children;
    }
  },
  isDisabled: (spec: QueryBarSpecPresence) => spec === "disable",
};
