import { cn } from "@/lib/utils.ts";
import type { TaskBurndownPoint } from "@/services/io/TaskDefinitionService/TaskDefinitionService.ts";
import { useMemo } from "react";

/**
 * Compact cumulative-actual-vs-estimate sparkline for a single task.
 *
 * The Y axis is shared between the actual curve and the estimate target
 * line so the visual "cross" happens at the same pixel no matter the
 * unit — we convert the estimate to seconds upstream.
 *
 * Empty series (no activity in the window) render a thin dashed baseline
 * instead of the curve so the row height stays stable.
 */
export function TaskBurndownSparkline(props: {
  points: TaskBurndownPoint[];
  estimateSeconds: number | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const { points, estimateSeconds } = props;
  const width = props.width ?? 96;
  const height = props.height ?? 24;
  const padX = 1;
  const padY = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const { pathD, areaD, yMax, lastY, overage } = useMemo(() => {
    const cumulative = points.map((p) => p.cumulativeSeconds);
    const lastActual = cumulative.length > 0 ? cumulative[cumulative.length - 1]! : 0;
    const yMaxCandidate = Math.max(
      lastActual,
      estimateSeconds ?? 0,
      1, // avoid /0 when everything is zero
    );
    const n = Math.max(points.length, 1);
    const stepX = n > 1 ? innerW / (n - 1) : innerW;
    const pathParts: string[] = [];
    const areaParts: string[] = [];
    points.forEach((p, i) => {
      const x = padX + i * stepX;
      const y = padY + innerH - (p.cumulativeSeconds / yMaxCandidate) * innerH;
      pathParts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
      areaParts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    });
    if (points.length > 0) {
      areaParts.push(
        `L ${(padX + innerW).toFixed(2)} ${(padY + innerH).toFixed(2)}`,
        `L ${padX.toFixed(2)} ${(padY + innerH).toFixed(2)}`,
        "Z",
      );
    }
    const lastY =
      points.length > 0
        ? padY + innerH - (lastActual / yMaxCandidate) * innerH
        : padY + innerH;
    const overage =
      estimateSeconds !== null && estimateSeconds > 0
        ? lastActual / estimateSeconds
        : null;
    return {
      pathD: pathParts.join(" "),
      areaD: areaParts.join(" "),
      yMax: yMaxCandidate,
      lastY,
      overage,
    };
  }, [points, estimateSeconds, innerW, innerH, padX, padY]);

  const estimateY =
    estimateSeconds !== null && estimateSeconds > 0
      ? padY + innerH - (estimateSeconds / yMax) * innerH
      : null;

  const strokeColour =
    overage === null
      ? "stroke-sky-600"
      : overage > 1.1
        ? "stroke-red-600"
        : overage > 0.85
          ? "stroke-amber-600"
          : "stroke-emerald-600";
  const fillColour =
    overage === null
      ? "fill-sky-500/10"
      : overage > 1.1
        ? "fill-red-500/10"
        : overage > 0.85
          ? "fill-amber-500/10"
          : "fill-emerald-500/10";

  if (points.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("overflow-visible", props.className)}
        role="img"
        aria-label="No activity in window"
      >
        <line
          x1={padX}
          y1={padY + innerH / 2}
          x2={padX + innerW}
          y2={padY + innerH / 2}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", props.className)}
      role="img"
      aria-label={
        overage !== null
          ? `${Math.round(overage * 100)}% of estimate`
          : "Cumulative actual"
      }
    >
      {estimateY !== null ? (
        <line
          x1={padX}
          y1={estimateY}
          x2={padX + innerW}
          y2={estimateY}
          className="stroke-muted-foreground/60"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      ) : null}
      <path d={areaD} className={cn("stroke-none", fillColour)} />
      <path
        d={pathD}
        className={cn("fill-none", strokeColour)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={padX + innerW} cy={lastY} r={1.5} className={cn(strokeColour, "fill-current")} />
    </svg>
  );
}
