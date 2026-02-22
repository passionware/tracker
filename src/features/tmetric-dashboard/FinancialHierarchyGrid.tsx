import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type FinancialHierarchyGridVariant = "withRates" | "amountsOnly";

const GRID_SPEC = {
  withRates: {
    gridTemplateColumns:
      "auto 1fr minmax(3rem, auto) minmax(4rem, auto) minmax(4rem, auto) minmax(5rem, auto) minmax(5rem, auto) minmax(5rem, auto)",
    columnsCount: 8,
    headerLabels: [
      "Scope",
      "Hours",
      "Cost rate",
      "Billing rate",
      "Cost",
      "Billing",
      "Profit",
    ],
  },
  amountsOnly: {
    gridTemplateColumns:
      "auto 1fr minmax(3rem, auto) minmax(5rem, auto) minmax(5rem, auto) minmax(5rem, auto)",
    columnsCount: 6,
    headerLabels: ["Scope", "Hours", "Cost", "Billing", "Profit"],
  },
} as const;

const FinancialHierarchyGridContext = createContext<{
  variant: FinancialHierarchyGridVariant;
  spec: (typeof GRID_SPEC)[FinancialHierarchyGridVariant];
} | null>(null);

function useGridContext() {
  const ctx = useContext(FinancialHierarchyGridContext);
  if (!ctx) throw new Error("FinancialHierarchyGrid.* must be used inside FinancialHierarchyGrid");
  return ctx;
}

export interface FinancialHierarchyGridProps {
  variant: FinancialHierarchyGridVariant;
  children: ReactNode;
  className?: string;
}

export function FinancialHierarchyGrid({
  variant,
  children,
  className = "",
}: FinancialHierarchyGridProps) {
  const spec = GRID_SPEC[variant];
  const value = useMemo(
    () => ({ variant, spec }),
    [variant, spec],
  );
  return (
    <FinancialHierarchyGridContext.Provider value={value}>
      <div
        className={`rounded border ${className}`.trim()}
        style={{
          display: "grid",
          gridTemplateColumns: spec.gridTemplateColumns,
          gap: "0 1rem",
          rowGap: 0,
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </FinancialHierarchyGridContext.Provider>
  );
}

export interface FinancialHierarchyGridHeaderProps {
  /** Optional: override column labels (length must match variant) */
  columnLabels?: string[];
  className?: string;
}

export function FinancialHierarchyGridHeader({
  columnLabels,
  className = "",
}: FinancialHierarchyGridHeaderProps) {
  const { spec } = useGridContext();
  const labels = columnLabels ?? spec.headerLabels;
  return (
    <div
      className={`contents text-xs font-medium text-muted-foreground border-b bg-muted/30 ${className}`.trim()}
    >
      <span className="px-2 py-2 w-8" />
      {labels.map((label, i) => (
        <span
          key={i}
          className={i === 0 ? "py-2" : "py-2 text-right"}
          style={{ gridColumn: `${i + 2} / ${i + 3}` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** Data cell position for the grid (1-based column index for data columns). */
export function FinancialHierarchyGridCell({
  col,
  children,
  className = "",
  style: styleProp,
}: {
  col: number;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const start = col + 2;
  const end = start + 1;
  return (
    <span
      className={className}
      style={{ gridColumn: `${start} / ${end}`, ...styleProp }}
    >
      {children}
    </span>
  );
}

export interface FinancialHierarchyGridExpandableRowProps {
  open: boolean;
  onToggle: () => void;
  label: ReactNode;
  children: ReactNode;
  /** Row padding: "sm" (py-1.5) or "md" (py-2). Default "md". */
  size?: "sm" | "md";
  className?: string;
}

export function FinancialHierarchyGridExpandableRow({
  open,
  onToggle,
  label,
  children,
  size = "md",
  className = "",
}: FinancialHierarchyGridExpandableRowProps) {
  const py = size === "sm" ? "py-1.5" : "py-2";
  const pl = size === "sm" ? "pl-4" : "px-2";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`contents group text-left ${className}`.trim()}
    >
      <span
        className={`flex items-center w-8 shrink-0 ${pl} ${py}`}
        style={{ gridColumn: "1 / 2" }}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
          style={size === "sm" ? { width: "0.875rem", height: "0.875rem" } : undefined}
        />
      </span>
      <span
        className={`flex min-w-0 items-center gap-2 ${py} hover:bg-muted/50 rounded-l ${size === "sm" ? "pl-2" : ""}`}
        style={{ gridColumn: "2 / 3" }}
      >
        {label}
      </span>
      {children}
    </button>
  );
}

/** Non-expandable row (e.g. leaf row or footer). Renders label slot + children as data cells. */
export function FinancialHierarchyGridRow({
  label,
  children,
  labelColSpan = 2,
  size = "sm",
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  labelColSpan?: 1 | 2;
  size?: "sm" | "md";
  className?: string;
}) {
  const py = size === "sm" ? "py-1.5" : "py-2";
  return (
    <div className={`contents text-xs ${className}`.trim()}>
      {labelColSpan === 2 ? (
        <>
          <span className="w-8 shrink-0" style={{ gridColumn: "1 / 2" }} />
          <span
            className={`min-w-0 ${py} ${size === "sm" ? "pl-2" : "pl-2"}`}
            style={{ gridColumn: "2 / 3" }}
          >
            {label}
          </span>
        </>
      ) : (
        <span
          className={`min-w-0 ${py} pl-2`}
          style={{ gridColumn: "1 / 3" }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

export interface FinancialHierarchyGridSubgridProps {
  children: ReactNode;
  className?: string;
  /** "nested" for inner subgrids (e.g. contractor list under iteration) */
  variant?: "default" | "nested";
}

export function FinancialHierarchyGridSubgrid({
  children,
  className = "",
  variant = "default",
}: FinancialHierarchyGridSubgridProps) {
  const variantClass =
    variant === "nested"
      ? "bg-background border-t border-border/30"
      : "border-t border-border/50 bg-muted/20";
  return (
    <div
      className={`col-span-full grid ${variantClass} ${className}`.trim()}
      style={{
        gridTemplateColumns: "subgrid",
        gridColumn: "1 / -1",
      }}
    >
      {children}
    </div>
  );
}

/** Footer row (e.g. totals). Uses full row; label in column 2, data cells follow. */
export function FinancialHierarchyGridFooter({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`contents border-t bg-muted/30 text-xs font-medium ${className}`.trim()}
    >
      <span className="px-2 py-2 w-8" />
      <span className="py-2">{label}</span>
      {children}
    </div>
  );
}

FinancialHierarchyGrid.Header = FinancialHierarchyGridHeader;
FinancialHierarchyGrid.Cell = FinancialHierarchyGridCell;
FinancialHierarchyGrid.ExpandableRow = FinancialHierarchyGridExpandableRow;
FinancialHierarchyGrid.Row = FinancialHierarchyGridRow;
FinancialHierarchyGrid.Subgrid = FinancialHierarchyGridSubgrid;
FinancialHierarchyGrid.Footer = FinancialHierarchyGridFooter;
