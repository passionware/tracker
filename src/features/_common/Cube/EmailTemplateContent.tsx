import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { deserializeCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization";
import type { CubeDataItem } from "@/features/_common/Cube/CubeService.types";
import { SerializableCubeConfig } from "@/features/_common/Cube/serialization/CubeSerialization.types";
import { FormatService } from "@/services/FormatService/FormatService";

interface EmailTemplateContentProps {
  reportData: CockpitCubeReportWithCreator;
  reportLink?: string;
  formatService: FormatService;
}

// no-op legacy helper removed (we use FormatService instead)

export function EmailTemplateContent({
  reportData,
  reportLink,
  formatService,
}: EmailTemplateContentProps) {
  const cubeConfig = deserializeCubeConfig(
    reportData.cube_config as unknown as SerializableCubeConfig,
    reportData.cube_data.data as CubeDataItem[],
  );
  const measures = cubeConfig.measures;
  const dimensions = cubeConfig.dimensions;
  const currentItems = cubeConfig.data;

  // Date range from data
  const dates = currentItems
    .map((i: any) => i.startAt)
    .filter(Boolean)
    .map((v: any) => new Date(v))
    .filter((d: Date) => !isNaN(d.getTime()))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];
  const from = fromDate ? formatService.temporal.date(fromDate) : "";
  const to = toDate ? formatService.temporal.date(toDate) : "";

  // Totals per measure
  const totals = measures.map((m) => {
    const total = currentItems.reduce((sum: number, item: any) => {
      const v = m.getValue(item);
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
    let formatted: any = m.formatValue ? m.formatValue(total) : String(total);
    if (m.id === "billing") {
      formatted = formatService.financial.amount(total, "EUR");
    } else if (m.id === "hours") {
      formatted = <>{formatService.financial.amountWithoutCurrency(total)} h</>;
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

    const billingFormat = (val: number) =>
      formatService.financial.amount(val, "EUR");

    contractorBreakdown = Array.from(groups.entries())
      .sort((a, b) => b[1].billing - a[1].billing)
      .map(([name, v]) => ({
        name,
        hours: Math.round(v.hours * 100) / 100,
        billing: billingFormat(v.billing),
      }));
  }

  return (
    <div className="text-gray-900 font-sans max-w-xl mx-auto">
      {/* Header */}
      <div className="border-b-2 border-blue-600 pb-4 mb-6 max-w-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-xl font-bold text-blue-600">
              Passionware Consulting
            </h1>
            <p className="text-gray-600 text-sm">Time & Budget Report</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Period Card */}
        <div className="border border-gray-300 rounded-lg p-4 max-w-xl">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Period
          </div>
          <div className="flex items-center gap-2 text-base">
            <span className="font-semibold text-blue-600">{from}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold text-blue-600">{to}</span>
          </div>
        </div>

        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-gray-900 mb-3">Hello,</p>
          <p className="text-gray-700 leading-relaxed">
            Please find below a summary of time & billing for the period{" "}
            <span className="font-semibold text-blue-600">{from}</span> to{" "}
            <span className="font-semibold text-blue-600">{to}</span>.
          </p>
          <p className="text-gray-700 leading-relaxed mt-2">
            If anything needs clarification, reply to this email. Otherwise,
            please confirm so we can issue the invoice(s).
          </p>
        </div>

        {/* Report Link */}
        {reportLink && (
          <div className="border border-blue-300 rounded-lg p-4 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">🔗</span>
              <span className="font-medium text-blue-900">
                Click to view online
              </span>
            </div>
            <a
              href={reportLink}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View interactive report
            </a>
          </div>
        )}

        {/* Summary Section */}
        <div className="border border-gray-300 rounded-lg p-5 max-w-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            <h2 className="text-lg font-bold text-gray-900">Summary</h2>
          </div>

          {/* Total Metrics */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📈</span>
              <h3 className="font-semibold text-gray-800">Total Metrics</h3>
            </div>
            <div className="space-y-2">
              {totals.map((total, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-200 pb-2"
                >
                  <div className="flex items-center gap-2">
                    {total.icon && (
                      <span className="text-sm">{total.icon}</span>
                    )}
                    <span className="font-medium text-gray-700">
                      {total.name}
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">{total.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contractor Breakdown */}
          {contractorBreakdown.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👥</span>
                <h3 className="font-semibold text-gray-800">
                  Breakdown by Contractor
                </h3>
              </div>
              <div className="space-y-2">
                {contractorBreakdown.map((contractor, index) => (
                  <div key={index} className="border-b border-gray-200 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {contractor.name}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {formatService.financial.amountWithoutCurrency(
                            contractor.hours,
                          )}{" "}
                          h
                        </div>
                        <div className="font-semibold text-green-600">
                          {contractor.billing}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-gray-300">
          <p className="text-gray-700 mb-1">Best regards,</p>
          <p className="font-semibold text-gray-900">Passionware Consulting</p>
          <p className="text-sm text-gray-600">Time & Budget Report</p>
          <p className="text-sm text-blue-600">https://passionware.dev</p>
        </div>
      </div>
    </div>
  );
}
