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
    <div className="mt-2 rounded-md border bg-muted/40 p-2">
      <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-2"
          >
            <span className="text-muted-foreground">{item.label}:</span>
            <span className="font-medium text-foreground truncate">
              {item.value ?? "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
