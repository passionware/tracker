import { ReactNode } from "react";

export interface InfoHeaderSectionProps {
  title: ReactNode;
  status?: ReactNode;
  transfer: ReactNode;
  actions?: ReactNode;
}

export function InfoHeaderSection({
  title,
  status,
  transfer,
  actions,
}: InfoHeaderSectionProps) {
  return (
    <div className="w-full rounded-md border bg-muted/30 p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-base font-medium text-foreground">
          <span>{title}</span>
          {status}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="overflow-x-auto">{transfer}</div>
    </div>
  );
}
