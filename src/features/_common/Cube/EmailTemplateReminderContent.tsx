import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { FormatService } from "@/services/FormatService/FormatService";
import { differenceInDays, startOfDay } from "date-fns";
import type { CSSProperties } from "react";

interface EmailTemplateReminderContentProps {
  reportData: CockpitCubeReportWithCreator;
  reportLink?: string;
  formatService: FormatService;
  workspaceLogoDataUrl: string;
  workspaceName: string;
  clientDisplayName?: string;
  clientAvatarDataUrl?: string | null;
  dueDate: Date | null;
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
}: EmailTemplateReminderContentProps) {
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

  const explicitStart = parseDateValue(reportData.start_date);
  const explicitEnd = parseDateValue(reportData.end_date);
  const explicitRangeFromReport =
    explicitStart && explicitEnd
      ? { start: explicitStart, end: explicitEnd }
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
    const total = currentItems.reduce((sum: number, item: any) => {
      const v = m.getValue(item);
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
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

    const groups = new Map<string, { hours: number; billing: number }>();
    currentItems.forEach((item: any) => {
      const raw = contractorDim.getValue(item);
      const key = String(raw ?? "");
      const disp = contractorDim.formatValue
        ? contractorDim.formatValue(raw)
        : key;
      const id = disp || key;
      const hVal = hours
        ? typeof hours.getValue(item) === "number"
          ? (hours.getValue(item) as number)
          : 0
        : 0;
      const bVal = billing
        ? typeof billing.getValue(item) === "number"
          ? (billing.getValue(item) as number)
          : 0
        : 0;
      const prev = groups.get(id) || { hours: 0, billing: 0 };
      groups.set(id, {
        hours: prev.hours + hVal,
        billing: prev.billing + bVal,
      });
    });

    const billingFormat = (val: number) => currencyFormatter.format(val);

    contractorBreakdown = Array.from(groups.entries())
      .sort((a, b) => b[1].billing - a[1].billing)
      .map(([name, v]) => ({
        name,
        hours: Math.round(v.hours * 100) / 100,
        billing: billingFormat(v.billing),
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
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: "#0f172a",
    maxWidth: "640px",
    margin: "0 auto",
    fontSize: "14px",
    lineHeight: "20px",
  };

  const cardStyle: CSSProperties = {
    width: "100%",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    marginBottom: "16px",
    borderCollapse: "separate",
  };
  const headerInnerStyle: CSSProperties = {
    padding: "16px",
  };
  const primaryInnerStyle: CSSProperties = {
    padding: "20px",
  };
  const summaryInnerStyle: CSSProperties = {
    padding: "20px",
  };

  const headingStyle: CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    margin: "0 0 8px 0",
  };

  const labelStyle: CSSProperties = {
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.05em",
    color: "#64748b",
    marginBottom: "4px",
  };

  const logoImageStyle: CSSProperties = {
    width: "48px",
    height: "48px",
    borderRadius: "8px",
    objectFit: "contain",
    display: "block",
  };

  const brandFallbackStyle: CSSProperties = {
    width: "48px",
    height: "48px",
    borderRadius: "8px",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const avatarWrapperStyle: CSSProperties = {
    width: "150px",
    height: "48px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const avatarImageStyle: CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    objectPosition: "center",
    display: "block",
  };

  const avatarFallbackStyle: CSSProperties = {
    width: "72px",
    height: "48px",
    borderRadius: "8px",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontWeight: 600,
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase",
  };

  const linkStyle: CSSProperties = {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const rowStyle: CSSProperties = {
    borderBottom: "1px solid #e2e8f0",
  };

  const footerStyle: CSSProperties = {
    textAlign: "center",
    marginTop: "24px",
    color: "#475569",
  };

  return (
    <div style={containerStyle}>
      <table width="100%" cellPadding={0} cellSpacing={0} style={cardStyle}>
        <tbody>
          <tr>
            <td>
              <div style={headerInnerStyle}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          width: "50%",
                          paddingRight: "12px",
                          verticalAlign: "middle",
                        }}
                      >
                        <table width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  width: "56px",
                                  paddingRight: "12px",
                                  verticalAlign: "middle",
                                }}
                              >
                                {resolvedWorkspaceLogo ? (
                                  <img
                                    src={resolvedWorkspaceLogo}
                                    alt={`${workspaceDisplayName} logo`}
                                    style={logoImageStyle}
                                    width={48}
                                    height={48}
                                  />
                                ) : (
                                  <div style={brandFallbackStyle}>
                                    {workspaceInitials}
                                  </div>
                                )}
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <div
                                  style={{
                                    fontSize: "22px",
                                    fontWeight: 700,
                                    color: "#2563eb",
                                  }}
                                >
                                  {workspaceDisplayName}
                                </div>
                                <div
                                  style={{
                                    color: "#475569",
                                    fontWeight: 500,
                                    marginTop: "4px",
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
                        style={{
                          width: "50%",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        <table
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ marginLeft: "auto" }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  paddingRight: "12px",
                                  verticalAlign: "middle",
                                }}
                              >
                                <div style={avatarWrapperStyle}>
                                  {clientAvatarSource ? (
                                    <img
                                      src={clientAvatarSource}
                                      alt={`${clientName} avatar`}
                                      style={avatarImageStyle}
                                      width={150}
                                      height={48}
                                    />
                                  ) : (
                                    <div style={avatarFallbackStyle}>
                                      {clientInitials}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td
                                style={{
                                  verticalAlign: "middle",
                                  textAlign: "left",
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
        cellPadding={0}
        cellSpacing={0}
        style={{
          ...cardStyle,
          backgroundColor: "#f8fafc",
          border: "1px solid #cbd5e1",
          marginBottom: "16px",
        }}
      >
        <tbody>
          <tr>
            <td>
              <div
                style={{
                  padding: "16px 20px",
                  textAlign: "center",
                }}
              >
                {dueDateFormatted ? (
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#475569",
                    }}
                  >
                    🚚💰 Reminder about incoming payment:{" "}
                    <strong>{dueDateFormatted}</strong>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#475569",
                    }}
                  >
                    🚚 💰 Reminder about incoming payment
                  </div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table width="100%" cellPadding={0} cellSpacing={0} style={cardStyle}>
        <tbody>
          <tr>
            <td>
              <div style={primaryInnerStyle}>
                <div style={labelStyle}>Period</div>
                <div style={{ fontWeight: 600 }}>
                  {from} &nbsp;—&nbsp; {to}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td>
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
                <p style={{ margin: 0 }}>
                  If you need any clarification or have questions, please don't
                  hesitate to reply to this email. We're here to help.
                </p>
              </div>
            </td>
          </tr>
          {reportLink && (
            <tr>
              <td>
                <div style={primaryInnerStyle}>
                  <a
                    href={reportLink}
                    style={linkStyle}
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

      <table width="100%" cellPadding={0} cellSpacing={0} style={cardStyle}>
        <tbody>
          <tr>
            <td>
              <div style={summaryInnerStyle}>
                <div style={headingStyle}>Summary</div>
                <table style={tableStyle}>
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
                            color: "#2563eb",
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
              <td>
                <div style={summaryInnerStyle}>
                  <div style={headingStyle}>Breakdown by Contractor</div>
                  <table style={tableStyle}>
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
                            <div style={{ fontWeight: 600, color: "#16a34a" }}>
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
        cellPadding={0}
        cellSpacing={0}
        style={{ ...cardStyle, border: 0 }}
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
                <p style={{ margin: "0 0 4px 0", color: "#2563eb" }}>
                  Time &amp; Budget Report
                </p>
                <a href="https://passionware.dev" style={linkStyle}>
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
