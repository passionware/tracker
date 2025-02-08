import {
  WithPagination,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";

export type SortableQueryBase<T = string> = WithSorter<T> & WithPagination;

export interface SorterWidgetProps<T extends SortableQueryBase<Field>, Field> {
  query: T;
  onQueryChange: (query: T, sorter: T["sort"]) => void;
  field: Field;
  className?: string;
}

export function SorterWidget<T extends SortableQueryBase<Field>, Field>({
  query,
  onQueryChange,
  field,
  className,
}: SorterWidgetProps<T, Field>) {
  const order = sorter.ensureField(query.sort, field)?.order;
  return (
    <Button
      variant="headless"
      type="button"
      size="icon-xs"
      onClick={() => {
        const newSorter = sorter.next(query.sort, field);
        const newQuery = withSorterUtils<T>().setSort(query, newSorter);
        onQueryChange(newQuery, newSorter);
      }}
      className={cn(
        "inline-flex flex-col gap-1 size-5 rounded-sm text-slate-400 hover:bg-slate-900/10",
        className,
      )}
    >
      <ChevronUp
        className={clsx("size-3! -mb-2", order === "asc" && "text-black")}
      />
      <ChevronDown
        className={clsx("size-3!", order === "desc" && "text-black")}
      />
    </Button>
  );
}
