import { cn } from "@/lib/utils.ts";
import { ComponentPropsWithRef, ReactNode } from "react";

export function FilterChip({
  label,
  className,
  children,
}: { label: ReactNode } & ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-slate-300 bg-slate-50 p-2 w-fit flex flex-row gap-1 items-center text-xs text-slate-600",
        className,
      )}
    >
      {label}: {children}
    </div>
  );
}
