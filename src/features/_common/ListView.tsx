import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { getDimmedClasses } from "@/features/_common/DimmedContainer.tsx";
import {
  SortableQueryBase,
  SorterWidget,
} from "@/features/_common/filters/SorterWidget.tsx";
import { cn } from "@/lib/utils.ts";
import { selectionState, SelectionState } from "@/platform/lang/SelectionState";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { maybe, rd, RemoteData } from "@passionware/monads";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  Header,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { get } from "lodash";
import { Info } from "lucide-react";
import * as React from "react";
import { ReactNode } from "react";
import { sharedColumns } from "./columns/_common/sharedColumns";
import { SelectionLayout } from "./SelectionLayout";

// Simple approach: make selection props optional and handle at runtime
export type ListViewProps<TData, Query extends SortableQueryBase, TId> = {
  data: RemoteData<TData[]>;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  columns: ColumnDef<any, any>[];
  skeletonRows?: number;
  caption?: React.ReactNode;
  onRowDoubleClick?: (row: NoInfer<TData>) => void;
  onRowClick?: (row: NoInfer<TData>) => void;
  className?: string;
  query: Query;
  onQueryChange: (query: Query, sorter: Query["sort"]) => void;
  renderAdditionalData?: (row: TData) => React.ReactNode;
  // Optional selection props - only works when data has id property
  selection?: SelectionState<TId>;
  onSelectionChange?: (selection: SelectionState<TId>) => void;
  toolbar?: React.ReactNode;
  getRowId: (row: TData) => TId;
};

export function ListView<TData, Query extends SortableQueryBase, TId>(
  props: ListViewProps<TData, Query, TId>,
): React.ReactElement {
  const {
    data,
    columns,
    skeletonRows = 6,
    caption,
    onRowDoubleClick,
    onRowClick,
    className,
    query,
    onQueryChange,
    renderAdditionalData,
    selection,
    onSelectionChange,
    toolbar,
    getRowId,
  } = props;

  // Stan lokalny do sortowania, filtrowania itp.
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Helper to convert TId to string for DOM attributes and TanStack Table
  const getIdAsString = React.useCallback(
    (row: TData): string => {
      return String(getRowId(row));
    },
    [getRowId],
  );

  // W zależności od tego, czy mamy dane, w tablicy przekazujemy albo puste [],
  // albo wartość z data (jeżeli jest w stanie success).
  const dataWithPlaceholder = rd.useLastWithPlaceholder(data);
  const tableData = rd.getOrElse(dataWithPlaceholder, [] as TData[]);

  // Inicjalizacja tabeli z tanstack react table
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

  const columnsElement = table.getHeaderGroups().map((headerGroup) => (
    <TableRow key={headerGroup.id}>
      {headerGroup.headers.map((header) =>
        renderHeaderCell(header, ({ rowSpan }) => {
          const element = flexRender(
            header.column.columnDef.header,
            header.getContext(),
          );
          const tooltip = get(header.column.columnDef.meta, "tooltip");
          const tooltipCompact = get(
            header.column.columnDef.meta,
            "tooltipCompact",
          );
          return (
            <TableHead
              key={header.id}
              colSpan={header.colSpan}
              rowSpan={rowSpan}
              className={cn(
                !header.column.getCanGroup() && "text-center",
                "whitespace-pre",
                get(header.column.columnDef.meta, "headerClassName"),
              )}
              {...(get(header.column.columnDef.meta, "headerProps") as any)?.(
                header.getContext(),
              )}
            >
              <div className="inline-flex flex-row items-center gap-0.5">
                {tooltip ? (
                  <SimpleTooltip title={tooltip}>
                    <div className="cursor-pointer whitespace-pre flex flex-row items-center">
                      {element}{" "}
                      {tooltipCompact ? null : (
                        <Info className="inline size-4" />
                      )}
                    </div>
                  </SimpleTooltip>
                ) : (
                  element
                )}
                {get(header.column.columnDef.meta, "sortKey") && (
                  <SorterWidget // check if this is sortable
                    className="ml-auto"
                    query={query} // we need to know the sorting key somehow
                    field={
                      get(
                        header.column.columnDef.meta,
                        "sortKey",
                      ) as unknown as string
                    } // this is the sorting key
                    onQueryChange={onQueryChange}
                  />
                )}
              </div>
            </TableHead>
          );
        }),
      )}
    </TableRow>
  ));
  // Tu zarządzamy stanem:
  // rd.journey(data) – czekanie, błąd, sukces.
  // Możesz też użyć rd.match lub rd.fold – wedle preferencji.
  const listViewContent = rd
    .journey(dataWithPlaceholder)
    .wait(() => (
      // Wyświetlamy skeletony
      <div className={cn("rounded-md border overflow-auto", className)}>
        <Table>
          <TableHeader className="sticky top-0 bg-background hover:bg-background z-10 shadow-sm">
            {columnsElement}
          </TableHeader>
          <TableBody className="bg-background">
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {table.getVisibleLeafColumns().map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="w-full h-5" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {caption && (
            <TableCaption className="text-sm text-sky-900 text-left bg-sky-50 p-4 rounded-md border border-sky-400">
              {caption}
            </TableCaption>
          )}
        </Table>
      </div>
    ))
    .catch((error) => (
      // Wyświetlamy błąd
      <div className={cn("rounded-md border p-4 text-red-600", className)}>
        <ErrorMessageRenderer error={error} />
      </div>
    ))
    .map(() => {
      // Mamy faktyczne dane – tworzymy UI tabeli
      const tbody = (
        <TableBody
          className={cn(
            "border-b bg-background",
            getDimmedClasses(rd.isPlaceholderData(dataWithPlaceholder)),
          )}
        >
          {/* Sprawdź, czy mamy wiersze w modelu */}
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const rowId = getRowId(row.original as TData);
              return (
                <>
                  <TableRow
                    key={row.id}
                    data-item-id={String(rowId)}
                    aria-selected={maybe.mapOrElse(
                      selection,
                      (selection) =>
                        !!selectionState.isSelected(selection, rowId),
                      false,
                    )}
                    onClick={(e) => {
                      if (e.target instanceof Element) {
                        if (e.target.closest("a, button")) {
                          return;
                        }
                        // check if the click was physically inside, not via react portal:
                        if (!e.currentTarget.contains(e.target)) {
                          return;
                        }
                      }

                      onRowClick?.(row.original as TData);
                    }}
                    onDoubleClick={(e) => {
                      if (e.target instanceof Element) {
                        if (e.target.closest("a, button")) {
                          return;
                        }
                        // check if the click was physically inside, not via react portal:
                        if (!e.currentTarget.contains(e.target)) {
                          return;
                        }
                      }

                      onRowDoubleClick?.(row.original as TData);
                      if (onRowDoubleClick && !e.defaultPrevented) {
                        window.getSelection?.()?.removeAllRanges();
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          get(cell.column.columnDef.meta, "cellClassName"),
                        )}
                        {...(
                          get(cell.column.columnDef.meta, "cellProps") as any
                        )?.(cell.getContext())}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {maybe.map(
                    renderAdditionalData?.(row.original as TData),
                    (additionalData) => (
                      <TableRow>
                        <TableCell
                          colSpan={table.getVisibleLeafColumns().length}
                        >
                          {additionalData}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      );

      return (
        <div
          className={cn("rounded-md border overflow-auto isolate", className)}
        >
          <Table>
            {/* NAGŁÓWEK */}
            <TableHeader className="sticky top-0 bg-popover hover:bg-sidebar-accent z-10 shadow-sm">
              {columnsElement}
            </TableHeader>

            {/* CIAŁO */}
            {selection && onSelectionChange ? (
              <SelectionLayout
                selectedIds={selectionState
                  .getSelectedIds(
                    selection,
                    rd.tryGet(data)?.map((item) => getRowId(item as TData)) ??
                      [],
                  )
                  .map(String)}
                onSelectedIdsChange={(ids) => {
                  // We need to reverse engineer the selection state from the list of selected ids.
                  // The ids we get are strings, but the data's ids may be string or number.
                  // We want to filter the data to only those whose id (as string) is in the ids array.
                  // Then, pass those items' actual ids (not stringified) to selectionState.selectSome.
                  const allData = rd.tryGet(data) ?? [];
                  const selectedIds = new Set(ids);
                  const matchingIds = allData
                    .filter((item) =>
                      selectedIds.has(String(getRowId(item as TData))),
                    )
                    .map((item) => getRowId(item as TData));
                  return onSelectionChange(
                    selectionState.selectSome(matchingIds) as any,
                  );
                }}
              >
                {tbody}
              </SelectionLayout>
            ) : (
              tbody
            )}

            {/* CAPTION */}
            {caption && (
              <TableCaption className="text-sm text-sky-900 text-left bg-sky-50 p-4 rounded-md border border-sky-400 m-4">
                {caption}
              </TableCaption>
            )}
          </Table>
          {toolbar}
        </div>
      );
    });

  return listViewContent;
}

function renderHeaderCell<TData>(
  header: Header<TData, unknown>,
  renderer: (props: { rowSpan: number }) => ReactNode,
) {
  const columnRelativeDepth = header.depth - header.column.depth;

  if (
    !header.isPlaceholder &&
    columnRelativeDepth > 1 &&
    header.id === header.column.id
  ) {
    return null;
  }

  let rowSpan = 1;
  if (header.isPlaceholder) {
    const leafs = header.getLeafHeaders();
    rowSpan = leafs[leafs.length - 1].depth - header.depth;
  }

  return renderer({
    rowSpan,
  });
}
