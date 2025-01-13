import { cf } from "@passionware/component-factory";
import { ReactNode } from "react";

export const FilterChip = cf.div<{ label: ReactNode }>({
  className:
    "rounded-md border border-slate-300 bg-slate-50 p-2 w-fit flex flex-row gap-1 items-center text-xs text-slate-600",
  children: ({ label, children }) => (
    <>
      {label}: {children}
    </>
  ),
});
