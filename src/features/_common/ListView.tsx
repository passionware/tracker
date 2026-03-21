import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { ColumnDef, flexRender, Header } from "@tanstack/react-table";
import { get } from "lodash";
import { Info } from "lucide-react";
import * as React from "react";
import { ReactNode } from "react";
import type { SimpleEvent } from "@passionware/simple-event";
import { ListViewTotalsBar } from "./ListViewTotalsBar.tsx";
import { shouldSuppressListViewRowOpen } from "./listViewRowOpenGuard.ts";
import { SelectionLayout } from "./SelectionLayout";
import { useListViewScrollToRow } from "./useListViewScrollToRow.ts";
import { useListViewTable } from "./useListViewTable.ts";

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
  scrollEvent?: SimpleEvent<TId>;
  getRowClassName?: (row: TData) => string | undefined;
  /** When false, header row scrolls with body (use when an outer sticky section title replaces it). Default true. */
  stickyTableHeader?: boolean;
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
    getRowClassName,
    stickyTableHeader = true,
  } = props;

  /**
   * Full-width tfoot is a hit-transparent sticky slot; only ListViewTotalsBar receives clicks
   * and visible surface (bg-popover/90).
   */
  const tableFooterSlotClass =
    "sticky bottom-0 z-20 border-0 bg-transparent pointer-events-none shadow-none";

  const { table, dataWithPlaceholder } = useListViewTable({
    data,
    columns,
    selection,
    onSelectionChange,
    getRowId,
  });

  const itemContainerRef = useListViewScrollToRow(props.scrollEvent);

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
      <div
        className={cn(
          "rounded-md border",
          stickyTableHeader
            ? "overflow-auto"
            : "overflow-x-auto overflow-y-visible",
          className,
        )}
      >
        <Table>
          <TableHeader
            className={cn(
              stickyTableHeader &&
                "sticky top-0 z-10 bg-background shadow-sm hover:bg-background",
            )}
          >
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
            <TableFooter className={tableFooterSlotClass}>
              <TableRow className="pointer-events-none border-0 hover:bg-transparent">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="pointer-events-none p-0 align-top border-0 bg-transparent"
                >
                  <ListViewTotalsBar
                    sticky={false}
                    className="pointer-events-auto bg-popover/90 backdrop-blur-sm supports-[backdrop-filter]:bg-popover/90"
                  >
                    {caption}
                  </ListViewTotalsBar>
                </TableCell>
              </TableRow>
            </TableFooter>
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
          ref={itemContainerRef}
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
                    className={cn(
                      "[--highlight-color:var(--color-highlight)]",
                      getRowClassName?.(row.original as TData),
                    )}
                    aria-selected={maybe.mapOrElse(
                      selection,
                      (selection) =>
                        !!selectionState.isSelected(selection, rowId),
                      false,
                    )}
                    onClick={(e) => {
                      if (shouldSuppressListViewRowOpen(e)) return;
                      onRowClick?.(row.original as TData);
                    }}
                    onDoubleClick={(e) => {
                      if (shouldSuppressListViewRowOpen(e)) return;
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
          className={cn(
            "rounded-md border isolate",
            stickyTableHeader
              ? "overflow-auto"
              : "overflow-x-auto overflow-y-visible",
            className,
          )}
        >
          <Table>
            {/* NAGŁÓWEK */}
            <TableHeader
              className={cn(
                stickyTableHeader &&
                  "sticky top-0 z-10 bg-popover shadow-sm hover:bg-sidebar-accent",
              )}
            >
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
            {(caption || toolbar) && (
              <TableFooter className={tableFooterSlotClass}>
                <TableRow className="pointer-events-none border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="pointer-events-none p-0 align-top border-0 bg-transparent"
                  >
                    <ListViewTotalsBar
                      sticky={false}
                      leftSlot={toolbar}
                      className="pointer-events-auto bg-popover/90 backdrop-blur-sm supports-[backdrop-filter]:bg-popover/85"
                    >
                      {caption ?? null}
                    </ListViewTotalsBar>
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
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
