import type { CSSProperties } from "react";

/**
 * Reminder email — same structure & shadows as invoice (`EmailTemplateContent`),
 * hue shifted from blue → violet / indigo. Neutrals and green billing match invoice.
 */

export const reminderEmailPageBgColor = "#f5f3ff";

/** Parallel to invoice cool wash; indigo / violet stops instead of blue. */
export const reminderEmailPageGradient =
  "linear-gradient(165deg, #fafafa 0%, #f3e8ff 38%, #ede9fe 55%, #f5f3ff 100%)";

/** Card / inner blocks that must align with rounded corners */
export const reminderEmailContentCardCornerRadius = "14px";

export const reminderEmailCardShellBase: CSSProperties = {
  width: "100%",
  marginBottom: "18px",
  borderCollapse: "separate",
  borderRadius: reminderEmailContentCardCornerRadius,
};

export const reminderEmailHeaderCardStyle: CSSProperties = {
  ...reminderEmailCardShellBase,
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(145deg, #ffffff 0%, #f8fafc 42%, #f3e8ff 85%, #ede9fe 100%)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow:
    "0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
};

const reminderEmailContentCardVisuals: CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(180deg, #ffffff 0%, #fafbfc 55%, #ffffff 100%)",
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.05)",
};

/** Identical to invoice content card (only the surrounding page/header are hue-shifted). */
export const reminderEmailContentCardStyle: CSSProperties = {
  ...reminderEmailCardShellBase,
  ...reminderEmailContentCardVisuals,
};

/**
 * First body card in reminder — square top-left (flush with header / ribbon), rounded top-right and bottom.
 */
export const reminderEmailContentCardLeadStyle: CSSProperties = {
  width: "100%",
  marginBottom: "18px",
  borderCollapse: "separate",
  borderTopLeftRadius: 0,
  borderTopRightRadius: reminderEmailContentCardCornerRadius,
  borderBottomLeftRadius: reminderEmailContentCardCornerRadius,
  borderBottomRightRadius: reminderEmailContentCardCornerRadius,
  ...reminderEmailContentCardVisuals,
};

export const reminderEmailPrimarySectionDividerStyle: CSSProperties = {
  borderTop: "1px solid #f1f5f9",
};

export const reminderEmailTableRowBorderColor = "#f1f5f9";

/** Was #2563eb on invoice */
export const reminderEmailLinkStyle: CSSProperties = {
  color: "#6d28d9",
  textDecoration: "none",
  fontWeight: 600,
};

/** Same pill shape as invoice CTA; violet gradient. */
export const reminderEmailCtaLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "14px",
  textDecoration: "none",
  color: "#ffffff",
  backgroundColor: "#7c3aed",
  backgroundImage:
    "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 48%, #6d28d9 100%)",
  boxShadow: "0 2px 8px rgba(109, 40, 217, 0.35)",
};

/** Was #1d4ed8 workspace title */
export const reminderEmailWorkspaceTitleColor = "#6d28d9";

/** Summary column accent — was #1d4ed8 */
export const reminderEmailSummaryMetricColor = "#6d28d9";

/** Same as invoice contractor billing */
export const reminderEmailContractorBillingColor = "#16a34a";

/** Footer “Time & Budget Report” line — was #2563eb */
export const reminderEmailFooterAccentColor = "#6d28d9";

/** Was #dbeafe / #1d4ed8 */
export const reminderEmailBrandFallbackBg = "#ede9fe";
export const reminderEmailBrandFallbackFg = "#5b21b6";

/** Shorter names for reminder template */
export const emailPageBgColor = reminderEmailPageBgColor;
export const emailPageGradient = reminderEmailPageGradient;
export const emailCardShellBase = reminderEmailCardShellBase;
export const emailHeaderCardStyle = reminderEmailHeaderCardStyle;
export const emailContentCardStyle = reminderEmailContentCardStyle;
export const emailContentCardLeadStyle = reminderEmailContentCardLeadStyle;
export const emailContentCardCornerRadius =
  reminderEmailContentCardCornerRadius;
export const emailPrimarySectionDividerStyle =
  reminderEmailPrimarySectionDividerStyle;
export const emailTableRowBorderColor = reminderEmailTableRowBorderColor;
export const emailLinkStyle = reminderEmailLinkStyle;
export const emailCtaLinkStyle = reminderEmailCtaLinkStyle;
export const emailWorkspaceTitleColor = reminderEmailWorkspaceTitleColor;
export const emailSummaryMetricColor = reminderEmailSummaryMetricColor;
export const emailContractorBillingColor = reminderEmailContractorBillingColor;
export const emailFooterAccentColor = reminderEmailFooterAccentColor;
export const emailBrandFallbackBg = reminderEmailBrandFallbackBg;
export const emailBrandFallbackFg = reminderEmailBrandFallbackFg;
