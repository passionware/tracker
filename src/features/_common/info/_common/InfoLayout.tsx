import { PopoverContent } from "@/components/ui/popover.tsx";
import { ReactNode } from "react";
import { w } from "windstitch";

export interface InfoLayoutProps {
  header: ReactNode;
  children: ReactNode;
}

export function InfoLayout({ header, children }: InfoLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-center gap-4 p-0 text-lg text-slate-700 pm-4 font-light">
        {header}
      </div>
      {children}
    </div>
  );
}

export const InfoPopoverContent = w(PopoverContent, {
  className:
    "w-fit max-h-[calc(-1rem+var(--radix-popover-content-available-height))] overflow-y-auto",
});
