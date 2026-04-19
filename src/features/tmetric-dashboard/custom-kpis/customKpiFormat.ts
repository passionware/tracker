import type { CustomKpiDisplay } from "./customKpi.types";

export function formatKpiValue(
  value: number | null,
  display: CustomKpiDisplay,
  baseCurrency: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  switch (display) {
    case "currency":
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: baseCurrency,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return `${value.toFixed(2)} ${baseCurrency}`;
      }
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "hours":
      return `${value.toFixed(1)}h`;
    case "number":
    default:
      if (Math.abs(value) >= 1000) {
        return new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 0,
        }).format(value);
      }
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
      }).format(value);
  }
}
