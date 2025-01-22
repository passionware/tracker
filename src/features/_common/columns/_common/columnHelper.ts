import { ColumnHelper, createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper();
export const getColumnHelper = <T>() => columnHelper as ColumnHelper<T>;
