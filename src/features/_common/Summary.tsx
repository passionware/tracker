import { cn } from "@/lib/utils";
import { ComponentPropsWithRef, ReactNode } from "react";
import { w } from "windstitch";

export const Summary = w.dl("mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4 ");

export function SummaryEntry({
  label,
  description,
  className,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
} & ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <dt>
        <div className="truncate text-sm font-medium">{label}</div>
        {description && (
          <div className="mt-1 mb-2 text-xs text-sky-800">{description}</div>
        )}
      </dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight flex flex-col gap-2 items-start">
        {children}
      </dd>
    </div>
  );
}

export const SummaryEntryValue = w.div(
  "p-1 border border-slate-200 rounded-lg bg-slate-50 text-right",
);
