import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { rd, RemoteData } from "@passionware/monads";
import { ComponentProps, ReactNode } from "react";

export interface ColumnDefinition<T> {
  width?: string;
  label: string;
  headerProps?: Partial<ComponentProps<typeof TableCell>>;
  cellProps?:
    | Partial<ComponentProps<typeof TableCell>>
    | ((item: T) => Partial<ComponentProps<typeof TableCell>>);
  cellRenderer: (
    item: T,
    indexes: { row: number; column: number },
  ) => ReactNode;
  headerRenderer?: (
    defaultContent: ReactNode,
    indexes: { column: number },
  ) => ReactNode;
}

export interface ListViewProps<T> {
  data: RemoteData<T[]>;
  columns: ColumnDefinition<T>[];
  skeletonRows?: number;
  caption?: ReactNode;
}

export function ListView<T>({
  data,
  columns,
  skeletonRows = 6,
  caption,
}: ListViewProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, colIndex) => (
            <TableCell
              key={colIndex}
              style={{ width: col.width }}
              {...col.headerProps}
            >
              {col.headerRenderer
                ? col.headerRenderer(col.label, { column: colIndex })
                : col.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rd
          .journey(data)
          .wait(() =>
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="w-full h-5" />
                  </TableCell>
                ))}
              </TableRow>
            )),
          )
          .catch((error) => (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                Error: {error.message}
              </TableCell>
            </TableRow>
          ))
          .map((data) =>
            data.length > 0 ? (
              data.map((item, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      {...(typeof col.cellProps === "function"
                        ? col.cellProps(item)
                        : col.cellProps)}
                    >
                      {col.cellRenderer(item, {
                        row: rowIndex,
                        column: colIndex,
                      })}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No data available.
                </TableCell>
              </TableRow>
            ),
          )}
      </TableBody>
      <TableCaption className="text-sm text-sky-900 text-left bg-sky-50 p-4 rounded-md border border-sky-400">
        {caption}
      </TableCaption>
    </Table>
  );
}
