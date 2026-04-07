import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { FormatService } from "@/services/FormatService/FormatService";
import { differenceInDays, startOfDay } from "date-fns";
import type { CSSProperties } from "react";
import {
  buildEmailImageSlotStyles,
  EMAIL_CLIENT_LOGO_MAX_H_PX,
  EMAIL_CLIENT_LOGO_MAX_W_PX,
  EMAIL_WORKSPACE_LOGO_MAX_H_PX,
  EMAIL_WORKSPACE_LOGO_MAX_W_PX,
} from "./emailTemplateImageSlots";
import {
  emailBrandFallbackBg,
  emailBrandFallbackFg,
  emailCardShellBase,
  emailContentCardCornerRadius,
  emailContentCardLeadStyle,
  emailContentCardStyle,
  emailContractorBillingColor,
  emailCtaLinkStyle,
  emailFooterAccentColor,
  emailHeaderCardStyle,
  emailLinkStyle,
  emailPageBgColor,
  emailPageGradient,
  emailPrimarySectionDividerStyle,
  emailSummaryMetricColor,
  emailTableRowBorderColor,
  emailWorkspaceTitleColor,
} from "./emailReminderTemplateTheme";
import { DEFAULT_EMAIL_REPLY_INVITE_REMINDER } from "./emailReplyInviteCopy";

/** Gmail-safe HTML: inline styles only when pasted; table layout; avoid flex/grid; use `border={0}` on tables. */

interface EmailTemplateReminderContentProps {
  reportData: CockpitCubeReportWithCreator;
  reportLink?: string;
  formatService: FormatService;
  workspaceLogoDataUrl: string;
  workspaceName: string;
  clientDisplayName?: string;
  clientAvatarDataUrl?: string | null;
  dueDate: Date | null;
  /** From published cube meta; when null/empty, default reminder closing paragraph is used. */
  replyInviteMessage?: string | null;
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "PW"
  );
}

export function EmailTemplateReminderContent({
  reportData,
  reportLink,
  formatService,
  workspaceLogoDataUrl,
  workspaceName,
  clientDisplayName,
  clientAvatarDataUrl,
  dueDate,
  replyInviteMessage,
}: EmailTemplateReminderContentProps) {
  const replyInviteLine =
    replyInviteMessage?.trim() || DEFAULT_EMAIL_REPLY_INVITE_REMINDER;
  const cubeConfig = deserializeCubeConfig(
    reportData.cube_config as unknown as SerializableCubeConfig,
    reportData.cube_data.data as CubeDataItem[],
  );
  const measures = cubeConfig.measures;
  const dimensions = cubeConfig.dimensions;
  const currentItems = cubeConfig.data;

  type CubeDataWithDateRange = {
    dateRange?: {
      start?: string | Date;
      end?: string | Date;
    };
  };

  const parseDateValue = (value: unknown) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? null : date;
  };

  const getRangeFromCubeData = () => {
    const dateRange = (
      reportData.cube_data as CubeDataWithDateRange | undefined
    )?.dateRange;
    if (!dateRange) return null;

    const start = parseDateValue(dateRange.start);
    const end = parseDateValue(dateRange.end);
    if (start && end) {
      return { start, end };
    }
    return null;
  };

  const fallbackRangeFromItems = () => {
    const dates = currentItems
      .map((i: any) => i.startAt)
      .filter(Boolean)
      .map((v: any) => new Date(v))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (!dates.length) {
      return null;
    }

    return { start: dates[0], end: dates[dates.length - 1] };
  };

  const explicitRangeFromReport =
    reportData.start_date && reportData.end_date
      ? { start: reportData.start_date, end: reportData.end_date }
      : null;

  const resolvedRange =
    explicitRangeFromReport ||
    getRangeFromCubeData() ||
    fallbackRangeFromItems();

  const from = resolvedRange
    ? formatService.temporal.date(resolvedRange.start)
    : "";
  const to = resolvedRange
    ? formatService.temporal.date(resolvedRange.end)
    : "";

  // Totals per measure
  const currencyFormatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const numberFormatter = new Intl.NumberFormat("de-DE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const totals = measures.map((m) => {
    // Use aggregate function to properly handle weightedAverage and other complex aggregations
    const values = currentItems.map((item: any) => m.getValue(item));
    const total = Number(m.aggregate(values)) || 0;
    let formatted: any = m.formatValue ? m.formatValue(total) : String(total);
    if (m.id === "billing") {
      formatted = currencyFormatter.format(total);
    } else if (m.id === "hours") {
      formatted = `${numberFormatter.format(total)} h`;
    }
    return { name: m.name, value: formatted as any, icon: m.icon };
  });

  // Contractor breakdown
  const contractorDim =
    dimensions.find((d) => d.id === "contractor") ||
    dimensions.find((d) => (d as any).fieldName === "contractorId");

  let contractorBreakdown: Array<{
    name: string;
    hours: number;
    billing: React.ReactNode;
  }> = [];
  if (contractorDim) {
    const hours = measures.find((m) => m.id === "hours");
    const billing = measures.find((m) => m.id === "billing");

    const groups = new Map<string, any[]>();
    // Group items by contractor
    currentItems.forEach((item: any) => {
      const raw = contractorDim.getValue(item);
      const key = String(raw ?? "");
      const disp = contractorDim.formatValue
        ? contractorDim.formatValue(raw)
        : key;
      const id = disp || key;
      if (!groups.has(id)) {
        groups.set(id, []);
      }
      groups.get(id)!.push(item);
    });

    // Calculate aggregated values for each contractor group using aggregate functions
    const contractorBreakdownData = Array.from(groups.entries()).map(
      ([id, items]) => {
        const hoursValue = hours
          ? Number(
              hours.aggregate(items.map((item) => hours.getValue(item))),
            ) || 0
          : 0;
        const billingValue = billing
          ? Number(
              billing.aggregate(items.map((item) => billing.getValue(item))),
            ) || 0
          : 0;
        return { id, items, hours: hoursValue, billing: billingValue };
      },
    );

    const billingFormat = (val: number) => currencyFormatter.format(val);

    contractorBreakdown = contractorBreakdownData
      .sort((a, b) => b.billing - a.billing)
      .map(({ id, hours, billing }) => ({
        name: id,
        hours: Math.round(hours * 100) / 100,
        billing: billingFormat(billing),
      }));
  }

  const workspaceDisplayName = workspaceName;
  const resolvedWorkspaceLogo = workspaceLogoDataUrl;
  const clientName = clientDisplayName || "Client Team";
  const clientAvatarSource = clientAvatarDataUrl || undefined;
  const workspaceInitials = getInitials(workspaceDisplayName);
  const clientInitials = getInitials(clientName);

  const dueDateFormatted = dueDate ? formatService.temporal.date(dueDate) : "";

  // Calculate relative date text (e.g., "tomorrow", "in 2 days")
  const getRelativeDateText = (targetDate: Date | null): string => {
    if (!targetDate) return "";
    const today = startOfDay(new Date());
    const target = startOfDay(targetDate);
    const daysDiff = differenceInDays(target, today);

    if (daysDiff < 0) {
      return "overdue";
    } else if (daysDiff === 0) {
      return "today";
    } else if (daysDiff === 1) {
      return "tomorrow";
    } else {
      return `in ${daysDiff} days`;
    }
  };

  const relativeDateText = dueDate ? getRelativeDateText(dueDate) : "";

  const containerStyle: CSSProperties = {
    fontFamily:
      "'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif",
    color: "#0f172a",
    maxWidth: "640px",
    margin: "0 auto",
    fontSize: "14px",
    lineHeight: "1.55",
    padding: "28px 18px 36px",
    backgroundColor: emailPageBgColor,
    backgroundImage: emailPageGradient,
    WebkitFontSmoothing: "antialiased",
  };
  const headerInnerStyle: CSSProperties = {
    padding: "24px 26px",
  };
  const primaryInnerStyle: CSSProperties = {
    padding: "22px 22px",
  };
  const summaryInnerStyle: CSSProperties = {
    padding: "22px 22px",
  };

  const headingStyle: CSSProperties = {
    fontSize: "19px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: "0 0 12px 0",
    color: "#0f172a",
  };

  const labelStyle: CSSProperties = {
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.08em",
    color: "#64748b",
    marginBottom: "6px",
    fontWeight: 600,
  };

  const brandFallbackStyle: CSSProperties = {
    width: `${EMAIL_WORKSPACE_LOGO_MAX_W_PX}px`,
    height: `${EMAIL_WORKSPACE_LOGO_MAX_H_PX}px`,
    maxWidth: `${EMAIL_WORKSPACE_LOGO_MAX_W_PX}px`,
    maxHeight: `${EMAIL_WORKSPACE_LOGO_MAX_H_PX}px`,
    borderRadius: "8px",
    backgroundColor: emailBrandFallbackBg,
    color: emailBrandFallbackFg,
    fontWeight: 700,
    fontSize: "18px",
    lineHeight: `${EMAIL_WORKSPACE_LOGO_MAX_H_PX}px`,
    textAlign: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  const workspaceImageSlot = buildEmailImageSlotStyles(
    EMAIL_WORKSPACE_LOGO_MAX_W_PX,
    EMAIL_WORKSPACE_LOGO_MAX_H_PX,
  );
  const clientImageSlot = buildEmailImageSlotStyles(
    EMAIL_CLIENT_LOGO_MAX_W_PX,
    EMAIL_CLIENT_LOGO_MAX_H_PX,
  );

  const clientFallbackW = Math.min(72, EMAIL_CLIENT_LOGO_MAX_W_PX);
  const avatarFallbackStyle: CSSProperties = {
    width: `${clientFallbackW}px`,
    height: `${EMAIL_CLIENT_LOGO_MAX_H_PX}px`,
    maxWidth: `${clientFallbackW}px`,
    maxHeight: `${EMAIL_CLIENT_LOGO_MAX_H_PX}px`,
    borderRadius: "8px",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: `${EMAIL_CLIENT_LOGO_MAX_H_PX}px`,
    textAlign: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const rowStyle: CSSProperties = {
    borderBottom: `1px solid ${emailTableRowBorderColor}`,
  };

  const footerStyle: CSSProperties = {
    textAlign: "center",
    marginTop: "8px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.6",
  };

  const reminderPurposeCallout: CSSProperties = {
    backgroundColor: "#f8fafc",
    borderLeft: `4px solid ${emailWorkspaceTitleColor}`,
    padding: "18px 22px",
    margin: 0,
    borderTopRightRadius: emailContentCardCornerRadius,
    overflow: "hidden",
  };

  const reminderPurposeHeadline: CSSProperties = {
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "#0f172a",
    margin: "0 0 8px 0",
    lineHeight: 1.35,
  };

  const reminderPurposeBody: CSSProperties = {
    fontSize: "13px",
    lineHeight: 1.55,
    color: "#64748b",
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <table
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={emailHeaderCardStyle}
      >
        <tbody>
          <tr>
            <td>
              <div style={headerInnerStyle}>
                <table
                  width="100%"
                  border={0}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td
                        width="50%"
                        style={{
                          width: "50%",
                          paddingRight: "12px",
                          verticalAlign: "middle",
                        }}
                      >
                        <table
                          width="100%"
                          border={0}
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ tableLayout: "fixed" }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  width: "80px",
                                  maxWidth: "80px",
                                  paddingRight: "12px",
                                  verticalAlign: "middle",
                                  lineHeight: 0,
                                  fontSize: 0,
                                }}
                              >
                                <table
                                  role="presentation"
                                  border={0}
                                  cellPadding={0}
                                  cellSpacing={0}
                                  style={workspaceImageSlot.table}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        align="center"
                                        valign="middle"
                                        style={workspaceImageSlot.cell}
                                      >
                                        {resolvedWorkspaceLogo ? (
                                          <img
                                            src={resolvedWorkspaceLogo}
                                            alt={`${workspaceDisplayName} logo`}
                                            width={
                                              workspaceImageSlot.imageWidthAttr
                                            }
                                            style={workspaceImageSlot.image}
                                          />
                                        ) : (
                                          <div style={brandFallbackStyle}>
                                            {workspaceInitials}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <div
                                  style={{
                                    fontSize: "22px",
                                    fontWeight: 700,
                                    letterSpacing: "-0.03em",
                                    color: emailWorkspaceTitleColor,
                                  }}
                                >
                                  {workspaceDisplayName}
                                </div>
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontWeight: 500,
                                    marginTop: "6px",
                                    fontSize: "13px",
                                  }}
                                >
                                  Time &amp; Budget Report
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                      <td
                        width="50%"
                        align="right"
                        valign="middle"
                        style={{
                          width: "50%",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        {/* `margin: auto` on nested tables is stripped in Gmail; `align="right"` is reliable */}
                        <table
                          align="right"
                          border={0}
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ width: "auto" }}
                        >
                          <tbody>
                            <tr>
                              <td
                                width={EMAIL_CLIENT_LOGO_MAX_W_PX}
                                valign="middle"
                                style={{
                                  width: `${EMAIL_CLIENT_LOGO_MAX_W_PX}px`,
                                  maxWidth: `${EMAIL_CLIENT_LOGO_MAX_W_PX}px`,
                                  paddingRight: "12px",
                                  verticalAlign: "middle",
                                  lineHeight: 0,
                                  fontSize: 0,
                                }}
                              >
                                <table
                                  role="presentation"
                                  border={0}
                                  cellPadding={0}
                                  cellSpacing={0}
                                  style={clientImageSlot.table}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        align="center"
                                        valign="middle"
                                        style={clientImageSlot.cell}
                                      >
                                        {clientAvatarSource ? (
                                          <img
                                            src={clientAvatarSource}
                                            alt={`${clientName} avatar`}
                                            width={
                                              clientImageSlot.imageWidthAttr
                                            }
                                            style={clientImageSlot.image}
                                          />
                                        ) : (
                                          <div style={avatarFallbackStyle}>
                                            {clientInitials}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td
                                valign="middle"
                                style={{
                                  verticalAlign: "middle",
                                  textAlign: "left",
                                  fontSize: "14px",
                                  lineHeight: 1.45,
                                }}
                              >
                                <div style={labelStyle}>Client</div>
                                <div
                                  style={{ fontWeight: 600, color: "#0f172a" }}
                                >
                                  {clientName}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={emailContentCardLeadStyle}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: 0,
                verticalAlign: "top",
                borderTopRightRadius: emailContentCardCornerRadius,
                overflow: "hidden",
              }}
            >
              <div style={reminderPurposeCallout}>
                <p style={reminderPurposeHeadline}>Payment reminder</p>
                <p style={reminderPurposeBody}>
                  We&apos;re following up on your open invoice. The period
                  summary below is the same one we&apos;ve already shared —
                  included again for convenience.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style={emailPrimarySectionDividerStyle}>
              <div style={primaryInnerStyle}>
                <div style={labelStyle}>Period</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "15px",
                    color: "#0f172a",
                  }}
                >
                  {from} &nbsp;—&nbsp; {to}
                </div>
              </div>
            </td>
          </tr>
          {dueDateFormatted ? (
            <tr>
              <td style={emailPrimarySectionDividerStyle}>
                <div style={primaryInnerStyle}>
                  <div style={labelStyle}>Payment due</div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "15px",
                      color: "#0f172a",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {dueDateFormatted}
                  </div>
                </div>
              </td>
            </tr>
          ) : null}
          <tr>
            <td style={emailPrimarySectionDividerStyle}>
              <div style={primaryInnerStyle}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>Hello,</p>
                <p style={{ margin: "0 0 8px 0" }}>
                  This is a gentle reminder regarding the invoice for the time
                  &amp; billing summary covering the period{" "}
                  <strong>
                    {from} to {to}
                  </strong>
                  .
                </p>
                {dueDateFormatted && (
                  <p style={{ margin: "0 0 8px 0" }}>
                    {relativeDateText === "overdue" ? (
                      <>
                        We would appreciate receiving the payment that was due
                        on <strong>{dueDateFormatted}</strong>.
                      </>
                    ) : relativeDateText ? (
                      <>
                        We would be happy to receive the payment{" "}
                        <strong>{relativeDateText}</strong> ({dueDateFormatted}
                        ).
                      </>
                    ) : (
                      <>
                        We would be happy to receive the payment on{" "}
                        <strong>{dueDateFormatted}</strong>.
                      </>
                    )}
                  </p>
                )}
                <p style={{ margin: "0 0 8px 0" }}>
                  Please find the summary below for your review.
                </p>
                <p style={{ margin: 0 }}>{replyInviteLine}</p>
              </div>
            </td>
          </tr>
          {reportLink && (
            <tr>
              <td style={emailPrimarySectionDividerStyle}>
                <div style={primaryInnerStyle}>
                  <a
                    href={reportLink}
                    style={emailCtaLinkStyle}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View interactive report online
                  </a>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <table
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={emailContentCardStyle}
      >
        <tbody>
          <tr>
            <td>
              <div style={summaryInnerStyle}>
                <div style={headingStyle}>Summary</div>
                <table border={0} cellPadding={0} cellSpacing={0} style={tableStyle}>
                  <tbody>
                    {totals.map((total, index) => (
                      <tr key={index} style={rowStyle}>
                        <td
                          style={{
                            padding: "8px 0",
                            fontWeight: 500,
                            color: "#1e293b",
                          }}
                        >
                          {total.icon ? (
                            <span style={{ marginRight: "6px" }}>
                              {total.icon}
                            </span>
                          ) : null}
                          {total.name}
                        </td>
                        <td
                          style={{
                            padding: "8px 0",
                            textAlign: "right",
                            fontWeight: 600,
                            color: emailSummaryMetricColor,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {total.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          {contractorBreakdown.length > 0 && (
            <tr>
              <td style={emailPrimarySectionDividerStyle}>
                <div style={summaryInnerStyle}>
                  <div style={headingStyle}>Breakdown by Contractor</div>
                  <table border={0} cellPadding={0} cellSpacing={0} style={tableStyle}>
                    <tbody>
                      {contractorBreakdown.map((contractor, index) => (
                        <tr key={index} style={rowStyle}>
                          <td style={{ padding: "8px 0", fontWeight: 500 }}>
                            {contractor.name}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right" }}>
                            <div style={{ color: "#475569" }}>
                              {numberFormatter.format(contractor.hours)} h
                            </div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: emailContractorBillingColor,
                              }}
                            >
                              {contractor.billing}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <table
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={{
          ...emailCardShellBase,
          marginBottom: 0,
          backgroundColor: "transparent",
          backgroundImage: "none",
          border: "none",
          boxShadow: "none",
        }}
      >
        <tbody>
          <tr>
            <td>
              <div
                style={{
                  ...footerStyle,
                  maxWidth: "300px",
                  margin: "0 auto",
                }}
              >
                <p style={{ margin: "0 0 4px 0" }}>Best regards,</p>
                <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
                  Passionware Consulting
                </p>
                <p
                  style={{ margin: "0 0 4px 0", color: emailFooterAccentColor }}
                >
                  Time &amp; Budget Report
                </p>
                <a href="https://passionware.dev" style={emailLinkStyle}>
                  https://passionware.dev
                </a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
