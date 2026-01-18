import { Report } from "@/api/reports/reports.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithFrontServices } from "@/core/frontServices";
import { DialogClose, DialogProps } from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { createTmetricPlugin } from "@/services/io/ReportGenerationService/plugins/tmetric/TmetricPlugin";
import { promiseState } from "@passionware/platform-react";
import { rd } from "@passionware/monads";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import { GenericReport } from "@/services/io/_common/GenericReport";
import { ContractorProjectRateConfiguration } from "../ContractorProjectRateConfiguration";
import {
  extractPrefilledRatesFromGenericReport,
  PrefilledRateResult,
} from "@/services/io/ReportGenerationService/plugins/_common/extractPrefilledRates";
import { uniqBy } from "lodash";
import { ContractorBase } from "@/api/contractor/contractor.api";

/**
 * Applies configured rates to a GenericReport by updating the roleTypes rates.
 * The roleId for each contractor is `contractor_${contractorId}`.
 */
function applyConfiguredRatesToReport(
  report: GenericReport,
  configuredRates: PrefilledRateResult,
): GenericReport {
  // Create a deep copy of the report to avoid mutating the original
  const updatedReport: GenericReport = {
    ...report,
    definitions: {
      ...report.definitions,
      roleTypes: { ...report.definitions.roleTypes },
    },
  };

  // Apply configured rates for each contractor
  for (const contractorRate of configuredRates) {
    const roleId = `contractor_${contractorRate.contractorId}`;
    const roleType = updatedReport.definitions.roleTypes[roleId];

    if (!roleType) {
      console.warn(
        `Role type '${roleId}' not found in report definitions. Skipping rates for contractor ${contractorRate.contractorId}.`,
      );
      continue;
    }

    // Rates are already in RoleRate format, use them directly
    updatedReport.definitions.roleTypes[roleId] = {
      ...roleType,
      rates: contractorRate.rates,
    };
  }

  return updatedReport;
}

export interface ReportGenerationWidgetProps
  extends WithFrontServices,
    DialogProps {
  reports: Report[];
  projectIterationId: number;
}

export function ReportGenerationWidget({
  services,
  reports,
  projectIterationId,
  ...props
}: ReportGenerationWidgetProps) {
  const [configuredRates, setConfiguredRates] = useState<PrefilledRateResult>(
    [],
  );
  const [activeTab, setActiveTab] = useState("rates");

  const initialData = promiseState.useRemoteData<{
    reportData: GenericReport;
    originalData: unknown;
    projects: Array<{ id: string; name: string }>;
    prefilledRates: PrefilledRateResult;
  }>();

  // Extract unique contractors from reports
  const contractors = useMemo(
    () =>
      uniqBy(
        reports.map((r) => r.contractor),
        (c: ContractorBase) => c.id,
      ),
    [reports],
  );

  // Debug: Log contractors being processed
  console.log(
    "Processing contractors:",
    contractors.map((c) => `${c.id}: ${c.fullName}`),
  );

  // Load TMetric data and extract projects for rate configuration
  useEffect(() => {
    if (reports.length === 0) return;

    const loadTmetricData = async () => {
      // Create TMetric plugin instance
      const tmetricPlugin = createTmetricPlugin({
        services,
      });

      const result = await tmetricPlugin.getReport({
        reports: reports.map((trackerReport) => ({
          ...trackerReport,
          reportId: trackerReport.id,
        })),
      });

      // Extract projects from GenericReport
      const projects = Object.entries(
        result.reportData.definitions.projectTypes,
      ).map(([projectId, projectType]) => ({
        id: projectId,
        name: projectType.name,
      }));

      // Extract prefilled rates
      const contractorReportsMap = new Map(
        reports.map((r) => [r.contractor.id, r]),
      );
      const prefilledRates = await extractPrefilledRatesFromGenericReport(
        result.reportData,
        services.expressionService,
        contractorReportsMap,
      );

      return {
        ...result,
        projects,
        prefilledRates,
      };
    };

    initialData.track(loadTmetricData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  const handleGenerateReport = async () => {
    try {
      // Create TMetric plugin instance

      const reportData = rd.getOrThrow(initialData.state, "Report not found");

      // Apply configured rates to the report data
      const reportWithConfiguredRates = applyConfiguredRatesToReport(
        reportData.reportData,
        configuredRates,
      );

      // Save to GeneratedReportSourceService
      const generatedReportSource =
        await services.generatedReportSourceWriteService.createGeneratedReportSource(
          {
            projectIterationId,
            data: reportWithConfiguredRates,
            originalData: reportData.originalData,
          },
        );

      console.log("Report generated:", generatedReportSource);
      // Close the dialog on success
      props.onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };

  return (
    <Dialog {...props}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Detailed Report</DialogTitle>
        </DialogHeader>

        {rd
          .journey(initialData.state)
          .wait(
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  Loading TMetric data and analyzing projects...
                </p>
              </div>
            </div>,
          )
          .catch((error) => (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center">
                <div className="text-red-500 mb-2">⚠️ Error</div>
                <ErrorMessageRenderer error={error} />
              </div>
            </div>
          ))
          .map((data) => (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rates">Configure Rates</TabsTrigger>
                <TabsTrigger value="generate">Generate Report</TabsTrigger>
              </TabsList>

              <TabsContent value="rates" className="space-y-4">
                <ContractorProjectRateConfiguration
                  contractors={contractors}
                  projects={data.projects}
                  prefilledRates={data.prefilledRates}
                  onRatesConfigured={setConfiguredRates}
                />
              </TabsContent>

              <TabsContent value="generate" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Report Generation
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {configuredRates.length > 0
                      ? `${configuredRates.length} custom rate configurations will be applied.`
                      : "Using default rates from expressions."}
                  </p>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-4">Reports to generate:</h4>
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contractor</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Period</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow key={report.id}>
                              <TableCell className="font-medium text-primary">
                                {report.contractor.fullName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {report.description}
                              </TableCell>
                              <TableCell className="text-xs text-foreground">
                                {services.formatService.temporal.range.long(
                                  report.periodStart,
                                  report.periodEnd,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ))}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {rd
            .journey(initialData.state)
            .wait(<></>)
            .catch(() => <></>)
            .map(() => (
              <>
                {activeTab === "rates" && (
                  <Button onClick={() => setActiveTab("generate")}>Next</Button>
                )}
                {activeTab === "generate" && (
                  <Button onClick={handleGenerateReport}>
                    Generate Report
                  </Button>
                )}
              </>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
