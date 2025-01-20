import {
  WithPagination,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { Button } from "@/components/ui/button.tsx";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";

export type SortableQueryBase<T = string> = WithSorter<T> & WithPagination;

export interface SorterWidgetProps<T extends SortableQueryBase<Field>, Field> {
  query: T;
  onQueryChange: (query: T, sorter: T["sort"]) => void;
  field: Field;
}

export function SorterWidget<T extends SortableQueryBase<Field>, Field>({
  query,
  onQueryChange,
  field,
}: SorterWidgetProps<T, Field>) {
  const order = sorter.ensureField(query.sort, field)?.order;
  return (
    <Button
      variant="ghost"
      type="button"
      size="icon-xs"
      onClick={() => {
        const newSorter = sorter.next(query.sort, field);
        const newQuery = withSorterUtils<T>().setSort(query, newSorter);
        onQueryChange(newQuery, newSorter);
      }}
      className="inline-flex flex-col gap-0.5 rounded-sm text-slate-400"
    >
      <ChevronUp
        className={clsx("w-4 h-4 -mb-2", order === "asc" && "text-black")}
      />
      <ChevronDown
        className={clsx("w-4 h-4", order === "desc" && "text-black")}
      />
    </Button>
  );
}
