import { ReactNode } from "react";

export interface DrawerMainInfoItem {
  label: string;
  value: ReactNode;
}

export interface DrawerMainInfoGridProps {
  items: DrawerMainInfoItem[];
}

export function DrawerMainInfoGrid({ items }: DrawerMainInfoGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/40 p-2">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-1 text-xs">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-2"
          >
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="min-w-0 font-medium text-foreground truncate">
              {item.value ?? "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
