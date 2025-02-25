import React from "react";

type ArrowDirection = "to-left" | "to-right";

interface HorizontalArrowProps {
  direction: ArrowDirection;
  /** Additional class names for styling */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * A full-width horizontal arrow component using inline SVG.
 * It displays a horizontal line with an arrow icon on the appropriate side.
 *
 * - direction "to-right": renders a line on the left and a right-pointing arrow on the right.
 * - direction "to-left": renders a left-pointing arrow on the left and a line on the right.
 */
export function HorizontalArrow({
  direction,
  className,
  style,
}: HorizontalArrowProps) {
  const isToRight = direction === "to-right";

  // Custom inline SVG arrow for right direction.
  const arrowRightSvg = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 5L15 12L8 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Custom inline SVG arrow for left direction.
  const arrowLeftSvg = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 5L9 12L16 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div
      style={style}
      className={`relative w-full flex items-center ${className || ""}`}
    >
      {isToRight ? (
        <>
          <div className="flex-1 h-px bg-slate-700" />
          <div className="-ml-2 text-slate-700">{arrowRightSvg}</div>
        </>
      ) : (
        <>
          <div className="-mr-2 text-slate-700">{arrowLeftSvg}</div>
          <div className="flex-1 h-px bg-slate-700" />
        </>
      )}
    </div>
  );
}
