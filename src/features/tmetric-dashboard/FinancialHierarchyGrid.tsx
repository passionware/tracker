import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronRight } from "lucide-react";

export type FinancialHierarchyGridVariant =
  | "withRates"
  | "amountsOnly"
  | "billingOnly";

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
  billingOnly: {
    gridTemplateColumns:
      "auto 1fr minmax(7rem, auto) minmax(3rem, auto) minmax(4rem, auto) minmax(5rem, auto)",
    columnsCount: 5,
    headerLabels: ["Scope", "Range", "Hours", "Billing rate", "Billing"],
  },
} as const;

const FinancialHierarchyGridContext = createContext<{
  variant: FinancialHierarchyGridVariant;
  spec: (typeof GRID_SPEC)[FinancialHierarchyGridVariant];
} | null>(null);

function useGridContext() {
  const ctx = useContext(FinancialHierarchyGridContext);
  if (!ctx)
    throw new Error(
      "FinancialHierarchyGrid.* must be used inside FinancialHierarchyGrid",
    );
  return ctx;
}

/** Same column template as the main grid, for rows rendered outside the hook (e.g. panel helpers). */
export function getFinancialHierarchyRowStyle(
  variant: FinancialHierarchyGridVariant,
): CSSProperties {
  const spec = GRID_SPEC[variant];
  return {
    display: "grid",
    gridTemplateColumns: spec.gridTemplateColumns,
    columnGap: "1rem",
    rowGap: 0,
    alignItems: "center",
    width: "max-content",
    minWidth: "100%",
  };
}

function useFinancialHierarchyRowStyle(): CSSProperties {
  const { spec } = useGridContext();
  return useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: spec.gridTemplateColumns,
      columnGap: "1rem",
      rowGap: 0,
      alignItems: "center",
      width: "max-content",
      minWidth: "100%",
    }),
    [spec.gridTemplateColumns],
  );
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
  const value = useMemo(() => ({ variant, spec }), [variant, spec]);
  return (
    <FinancialHierarchyGridContext.Provider value={value}>
      <div
        className={`max-w-full min-w-0 shrink-0 overflow-x-auto overflow-y-visible rounded border touch-pan-x ${className}`.trim()}
      >
        <div className="flex w-max min-w-full flex-col pr-2">{children}</div>
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
  const { spec, variant } = useGridContext();
  const rowStyle = useFinancialHierarchyRowStyle();
  const labels = columnLabels ?? spec.headerLabels;
  return (
    <div
      className={`border-b bg-muted/30 text-xs font-medium text-muted-foreground ${className}`.trim()}
      style={rowStyle}
    >
      <span
        className="flex w-8 shrink-0 items-center justify-center py-2"
        style={{ gridColumn: "1 / 2" }}
      />
      {labels.map((label, i) => {
        const leftAlign = i === 0 || (variant === "billingOnly" && i === 1);
        return (
          <span
            key={i}
            className={leftAlign ? "py-2 pl-2" : "py-2 text-right"}
            style={{ gridColumn: `${i + 2} / ${i + 3}` }}
          >
            {label}
          </span>
        );
      })}
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
      className={`min-w-0 ${className}`.trim()}
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
  const rowStyle = useFinancialHierarchyRowStyle();
  const py = size === "sm" ? "py-1.5" : "py-2";
  const pl = size === "sm" ? "pl-4" : "px-2";
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={`group w-full cursor-pointer text-left ${className}`.trim()}
      style={rowStyle}
    >
      <span
        className={`flex w-8 shrink-0 items-center ${pl} ${py}`}
        style={{ gridColumn: "1 / 2" }}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
          style={
            size === "sm"
              ? { width: "0.875rem", height: "0.875rem" }
              : undefined
          }
        />
      </span>
      <span
        className={`flex min-w-0 items-center gap-2 ${py} pl-2 hover:rounded-l hover:bg-muted/50`}
        style={{ gridColumn: "2 / 3" }}
      >
        {label}
      </span>
      {children}
    </div>
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
  const rowStyle = useFinancialHierarchyRowStyle();
  const py = size === "sm" ? "py-1.5" : "py-2";
  return (
    <div className={`w-full text-xs ${className}`.trim()} style={rowStyle}>
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
        <span className={`min-w-0 ${py} pl-2`} style={{ gridColumn: "1 / 3" }}>
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
    <div className={`flex w-full flex-col ${variantClass} ${className}`.trim()}>
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
  const rowStyle = useFinancialHierarchyRowStyle();
  return (
    <div
      className={`w-full border-t bg-muted/30 text-xs font-medium ${className}`.trim()}
      style={rowStyle}
    >
      <span
        className="flex w-8 shrink-0 items-center py-2"
        style={{ gridColumn: "1 / 2" }}
      />
      <span className="min-w-0 py-2 pl-2" style={{ gridColumn: "2 / 3" }}>
        {label}
      </span>
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
