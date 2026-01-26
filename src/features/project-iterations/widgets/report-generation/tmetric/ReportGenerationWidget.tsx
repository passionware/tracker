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
import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { CalendarDate } from "@internationalized/date";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { ContractorBase } from "@/api/contractor/contractor.api.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { determineContractorWorkspaces } from "@/services/front/ReconciliationService/determineContractorWorkspace.ts";

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
  contractors: ContractorBase[];
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  projectIterationId: number;
  clientId: ClientSpec;
}

export function ReportGenerationWidget({
  services,
  contractors,
  periodStart,
  periodEnd,
  projectIterationId,
  clientId,
  ...props
}: ReportGenerationWidgetProps) {
  const [configuredRates, setConfiguredRates] = useState<PrefilledRateResult>(
    [],
  );
  const [activeTab, setActiveTab] = useState("rates");

  // Get project iteration to access projectId, period, currency
  const iteration =
    services.projectIterationService.useProjectIterationDetail(
      projectIterationId,
    );

  // Get project to access clientId and workspaceIds
  const iterationProjectId = rd.tryMap(iteration, (iter) => iter.projectId);
  const project = services.projectService.useProject(iterationProjectId);

  const initialData = promiseState.useRemoteData<{
    reportData: GenericReport;
    originalData: unknown;
    projects: Array<{ id: string; name: string }>;
    prefilledRates: PrefilledRateResult;
  }>();

  // Extract stable values for dependencies to prevent infinite loops
  const projectIdValue =
    project && rd.isSuccess(project) ? project.data.id : null;
  const contractorsCount = contractors.length;
  const periodStartString = periodStart.toString();
  const periodEndString = periodEnd.toString();

  // Load TMetric data and extract projects for rate configuration
  useEffect(() => {
    // Early return if we don't have the necessary data
    if (contractors.length === 0) return;

    // Wait for iteration and project to be loaded
    if (!rd.isSuccess(iteration)) return;
    if (!project || !rd.isSuccess(project)) return;

    const loadTmetricData = async () => {
      const projData = project.data;

      // Determine workspace for each contractor using rate variables
      const contractorWorkspaceIds = await determineContractorWorkspaces({
        services,
        project: projData,
        contractorIds: contractors.map((c) => c.id),
      });

      // Use the plugin directly with contractor data (no need to create temporary reports)
      const tmetricPlugin = createTmetricPlugin({
        services,
      });

      const result = await tmetricPlugin.getReport({
        reports: contractors.map((contractor) => ({
          contractorId: contractor.id,
          periodStart,
          periodEnd,
          workspaceId: contractorWorkspaceIds.get(contractor.id) ?? 0,
          clientId: projData.clientId,
        })),
      });

      const projects = Object.entries(
        result.reportData.definitions.projectTypes,
      ).map(([projectId, projectType]) => ({
        id: projectId,
        name: projectType.name,
      }));

      // For prefilled rates, we need Report-like objects with workspaceId and clientId
      // The extractPrefilledRatesFromGenericReport only uses these fields
      // For prefilled rates, we only need workspaceId and clientId for expression context
      const contractorContexts = new Map(
        contractors.map((contractor) => {
          const wsId = contractorWorkspaceIds.get(contractor.id) ?? 0;
          return [
            contractor.id,
            {
              workspaceId: wsId,
              clientId: projData.clientId,
            },
          ];
        }),
      );

      const prefilledRates = await extractPrefilledRatesFromGenericReport(
        result.reportData,
        services.expressionService,
        contractorContexts,
      );

      return {
        ...result,
        projects,
        prefilledRates,
      };
    };

    const loadPromise = loadTmetricData();
    if (loadPromise) {
      initialData.track(
        loadPromise.then((result) => {
          if (!result) {
            throw new Error("Failed to load report data");
          }
          return result;
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contractorsCount,
    periodStartString,
    periodEndString,
    projectIterationId,
    projectIdValue,
  ]);

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

      // Get routing information for the toast link
      const projectId = rd.tryMap(iteration, (iter) => iter.projectId);
      // Get workspaceId from the first contractor (they should all be in the same workspace for a project)
      const wsId =
        contractors.length > 0
          ? (
              await services.reportService.ensureReports(
                reportQueryUtils
                  .getBuilder(idSpecUtils.ofAll(), idSpecUtils.ofAll())
                  .build((q) => [
                    q.withFilter("contractorId", {
                      operator: "oneOf",
                      value: [contractors[0].id],
                    }),
                    q.withFilter("clientId", {
                      operator: "oneOf",
                      value: [
                        typeof clientId === "number" ? clientId : undefined,
                      ].filter((id): id is number => id !== undefined),
                    }),
                  ]),
              )
            )[0]?.workspaceId
          : undefined;
      const clId = typeof clientId === "number" ? clientId : undefined;

      if (wsId && clId && projectId) {
        // Generate link to view the report
        const reportUrl = services.routingService
          .forWorkspace(wsId)
          .forClient(clId)
          .forProject(projectId.toString())
          .forIteration(projectIterationId.toString())
          .forGeneratedReport(generatedReportSource.id.toString())
          .root();

        // Show success toast with navigation button
        toast.success("Report generated successfully!", {
          duration: 5000,
          action: {
            label: "View Report",
            onClick: () => {
              services.navigationService.navigate(reportUrl);
            },
          },
        });
      } else {
        // Fallback toast without link if routing info is unavailable
        toast.success("Report generated successfully!");
      }

      // Close the dialog on success
      props.onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
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
                          {contractors.map((contractor) => {
                            const iter = rd.tryGet(iteration);

                            return (
                              <TableRow key={contractor.id}>
                                <TableCell className="font-medium text-primary">
                                  {contractor.fullName}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {`Report for ${iter?.periodStart} to ${iter?.periodEnd}`}
                                </TableCell>
                                <TableCell className="text-xs text-foreground">
                                  {services.formatService.temporal.range.long(
                                    periodStart,
                                    periodEnd,
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
