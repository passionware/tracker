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

// Typ wejściowy komponentu (co będzie wierszem w tabeli)
export interface ListViewProps<TData, Query extends SortableQueryBase> {
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
}

export function ListView<TData, Query extends SortableQueryBase>({
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
}: ListViewProps<TData, Query>) {
  // Stan lokalny do sortowania, filtrowania itp.
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});

  // W zależności od tego, czy mamy dane, w tablicy przekazujemy albo puste [],
  // albo wartość z data (jeżeli jest w stanie success).
  const dataWithPlaceholder = rd.useLastWithPlaceholder(data);
  const tableData = rd.getOrElse(dataWithPlaceholder, []);

  // Inicjalizacja tabeli z tanstack react table
  const table = useReactTable({
    data: tableData,
    manualPagination: true,
    columns,
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
  return rd
    .journey(dataWithPlaceholder)
    .wait(() => (
      // Wyświetlamy skeletony
      <div className={cn("rounded-md border overflow-auto", className)}>
        <Table>
          <TableHeader className="sticky top-0 bg-white hover:bg-white z-10 shadow-sm">
            {columnsElement}
          </TableHeader>
          <TableBody className="bg-white">
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

      return (
        <div className={cn("rounded-md border overflow-auto", className)}>
          <Table>
            {/* NAGŁÓWEK */}
            <TableHeader className="sticky top-0 bg-white hover:bg-white z-10 shadow-sm">
              {columnsElement}
            </TableHeader>

            {/* CIAŁO */}
            <TableBody
              className={cn(
                "border-b bg-white",
                getDimmedClasses(rd.isPlaceholderData(dataWithPlaceholder)),
              )}
            >
              {/* Sprawdź, czy mamy wiersze w modelu */}
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <>
                    <TableRow
                      key={row.id}
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

                        onRowClick?.(row.original);
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

                        onRowDoubleClick?.(row.original);
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
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {maybe.map(
                      renderAdditionalData?.(row.original),
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {/* CAPTION */}
            {caption && (
              <TableCaption className="text-sm text-sky-900 text-left bg-sky-50 p-4 rounded-md border border-sky-400 m-4">
                {caption}
              </TableCaption>
            )}
          </Table>
        </div>
      );
    });
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
