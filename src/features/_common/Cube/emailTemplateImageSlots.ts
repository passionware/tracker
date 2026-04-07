import type { CSSProperties } from "react";

export const EMAIL_WORKSPACE_LOGO_MAX_W_PX = 48;
export const EMAIL_WORKSPACE_LOGO_MAX_H_PX = 48;
export const EMAIL_CLIENT_LOGO_MAX_W_PX = 96;
export const EMAIL_CLIENT_LOGO_MAX_H_PX = 48;

/**
 * Gmail-safe logo slot: never set both fixed `width`+`height` on `<img>` — Gmail often ignores
 * `object-fit` and stretches. Use max bounds + `width`/`height: auto` and only `width` HTML attr
 * (no `height` attr) so aspect ratio is preserved while Gmail caps display width.
 */
export function buildEmailImageSlotStyles(
  maxW: number,
  maxH: number,
): {
  table: CSSProperties;
  cell: CSSProperties;
  image: CSSProperties;
  imageWidthAttr: number;
} {
  return {
    table: {
      width: `${maxW}px`,
      height: `${maxH}px`,
      maxWidth: `${maxW}px`,
      maxHeight: `${maxH}px`,
      borderCollapse: "collapse",
      borderSpacing: 0,
      margin: 0,
      padding: 0,
      lineHeight: 0,
    },
    cell: {
      width: `${maxW}px`,
      height: `${maxH}px`,
      maxWidth: `${maxW}px`,
      maxHeight: `${maxH}px`,
      padding: 0,
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: 0,
      fontSize: 0,
      borderRadius: "8px",
      /* `overflow: hidden` here clipped logos against rounded header cards + subpixel layout */
      overflow: "visible",
    },
    image: {
      display: "block",
      margin: "0 auto",
      border: 0,
      outline: "none",
      textDecoration: "none",
      maxWidth: `${maxW}px !important`,
      maxHeight: `${maxH}px !important`,
      width: "auto !important",
      height: "auto !important",
      objectFit: "contain",
      objectPosition: "center",
      verticalAlign: "middle",
    },
    imageWidthAttr: maxW,
  };
}
