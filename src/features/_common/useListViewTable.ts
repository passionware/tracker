import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns";
import { type SelectionState } from "@/platform/lang/SelectionState";
import { rd, type RemoteData } from "@passionware/monads";
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

export type UseListViewTableParams<TData, TId> = {
  data: RemoteData<TData[]>;
  columns: ColumnDef<any, any>[];
  selection?: SelectionState<TId>;
  onSelectionChange?: (selection: SelectionState<TId>) => void;
  getRowId: (row: TData) => TId;
};

export function useListViewTable<TData, TId>({
  data,
  columns,
  selection,
  onSelectionChange,
  getRowId,
}: UseListViewTableParams<TData, TId>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});

  const getIdAsString = React.useCallback(
    (row: TData): string => String(getRowId(row)),
    [getRowId],
  );

  const dataWithPlaceholder = rd.useLastWithPlaceholder(data);
  const tableData = rd.getOrElse(dataWithPlaceholder, [] as TData[]);

  const table = useReactTable<any>({
    data: tableData as any,
    getRowId: (row: any) => getIdAsString(row as TData),
    manualPagination: true,
    columns:
      selection && onSelectionChange
        ? [
            sharedColumns.selection(
              selection as any,
              data as any,
              onSelectionChange as any,
              getRowId,
            ),
            ...columns,
          ]
        : columns,
    manualSorting: true,
    enableSorting: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  return { table, dataWithPlaceholder };
}
