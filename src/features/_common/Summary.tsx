import { cf } from "@passionware/component-factory";
import { ReactNode } from "react";

export const Summary = cf.dl({
  className: "mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4 ",
});

export const SummaryEntry = cf.div<{
  label: ReactNode;
  description?: ReactNode;
}>({
  className: "overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6",
  children: (props) => (
    <>
      <dt>
        <div className="truncate text-sm font-medium">{props.label}</div>
        {props.description && (
          <div className="mt-1 mb-2 text-xs text-sky-800">
            {props.description}
          </div>
        )}
      </dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight flex flex-col gap-2 items-start">
        {props.children}
      </dd>
    </>
  ),
});

export const SummaryEntryValue = cf.div({
  className: "p-1 border border-slate-200 rounded-lg bg-slate-50 text-right",
});
