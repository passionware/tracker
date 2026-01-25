import { WithFrontServices } from "@/core/frontServices.ts";
import { rd } from "@passionware/monads";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import {
  BarChart3,
  Calendar,
  User,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";
import { useNavigate } from "react-router-dom";
import { promiseState } from "@passionware/platform-react";
import { toast } from "sonner";
import { useCallback } from "react";
import { mt } from "@passionware/monads";

export function CubeReportsPage(props: WithFrontServices) {
  const navigate = useNavigate();
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.tryMap(authState, (auth) => auth.tenantId);
  const reports =
    props.services.clientCubeReportService.useCubeReports(tenantId);

  const handleReportClick = (reportId: string) => {
    // Navigate to cube viewer with the report data
    navigate(
      props.services.routingService
        .forClientCockpit()
        .forClient(rd.tryMap(authState, (auth) => auth.tenantId))
        .forReport(reportId)
        .cubeViewer(),
    );
  };

  // Delete report mutation
  const deleteMutation = promiseState.useMutation(async (reportId: string) => {
    await props.services.clientCubeReportService.deleteReport(reportId);
    toast.success("Report deleted successfully");
  });

  // Publish report mutation
  const publishMutation = promiseState.useMutation(async (reportId: string) => {
    await props.services.clientCubeReportService.setReportPublished(reportId);
    toast.success("Report published successfully");
  });

  // Unpublish report mutation
  const unpublishMutation = promiseState.useMutation(
    async (reportId: string) => {
      await props.services.clientCubeReportService.setReportUnpublished(reportId);
      toast.success("Report unpublished successfully");
    },
  );

  const handleDeleteReport = useCallback(
    (reportId: string) => {
      deleteMutation.track(reportId).catch((error) => {
        console.error("Error deleting report:", error);
        toast.error("Failed to delete report");
      });
    },
    [deleteMutation],
  );

  const handlePublishReport = useCallback(
    (reportId: string) => {
      publishMutation.track(reportId).catch((error) => {
        console.error("Error publishing report:", error);
        toast.error("Failed to publish report");
      });
    },
    [publishMutation],
  );

  const handleUnpublishReport = useCallback(
    (reportId: string) => {
      unpublishMutation.track(reportId).catch((error) => {
        console.error("Error unpublishing report:", error);
        toast.error("Failed to unpublish report");
      });
    },
    [unpublishMutation],
  );

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cube Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze your data reports
          </p>
        </div>
      </div>

      {/* Reports Content */}
      {rd
        .journey(reports)
        .wait(
          <div className="space-y-8">
            {/* Hero Section Skeleton */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-12 w-32" />
            </div>

            {/* Past Reports Skeleton */}
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-4 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>,
        )
        .catch((error) => (
          <div className="flex items-center justify-center min-h-[400px]">
            <ErrorMessageRenderer error={error} />
          </div>
        ))
        .map((reportsList) => {
          if (reportsList.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-20 h-20 mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No reports available
                </h3>
                <p className="text-muted-foreground max-w-md">
                  There are currently no cube reports to display. Reports will
                  appear here once they are created.
                </p>
              </div>
            );
          }

          // Sort reports by end date (newest first)
          const sortedReports = [...reportsList].sort((a, b) => {
            const endDateA = a.end_date;
            const endDateB = b.end_date;
            return endDateB.getTime() - endDateA.getTime();
          });

          const latestReport = sortedReports[0];
          const pastReports = sortedReports.slice(1);

          return (
            <div className="space-y-8">
              {/* Hero Section - Latest Report */}
              <LatestReportHero
                report={latestReport}
                onViewReport={() => handleReportClick(latestReport.id)}
                onDeleteReport={handleDeleteReport}
                onPublishReport={handlePublishReport}
                onUnpublishReport={handleUnpublishReport}
                isAdmin={rd.tryMap(authState, (auth) => auth.role) === "admin"}
                isDeleting={mt.isInProgress(deleteMutation.state)}
                isPublishing={mt.isInProgress(publishMutation.state)}
                isUnpublishing={mt.isInProgress(unpublishMutation.state)}
                services={props.services}
              />

              {/* Past Reports Section */}
              {pastReports.length > 0 && (
                <div className="">
                  <div className="flex  items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Past Reports</h2>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pastReports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onClick={() => handleReportClick(report.id)}
                        onDeleteReport={handleDeleteReport}
                        onPublishReport={handlePublishReport}
                        onUnpublishReport={handleUnpublishReport}
                        isAdmin={
                          rd.tryMap(authState, (auth) => auth.role) === "admin"
                        }
                        isDeleting={mt.isInProgress(deleteMutation.state)}
                        isPublishing={mt.isInProgress(publishMutation.state)}
                        isUnpublishing={mt.isInProgress(unpublishMutation.state)}
                        services={props.services}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// Confirmation Popover Component
function DeleteConfirmationPopover({
  reportName,
  onConfirm,
  isDeleting,
  children,
}: {
  reportName: string;
  onConfirm: () => void;
  isDeleting: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Delete Report</h3>
              <p className="text-sm text-gray-600">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-medium">"{reportName}"</span>?
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="outline-destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onConfirm();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface LatestReportHeroProps extends WithFrontServices {
  report: CockpitCubeReportWithCreator;
  onViewReport: () => void;
  onDeleteReport?: (reportId: string) => void;
  onPublishReport?: (reportId: string) => void;
  onUnpublishReport?: (reportId: string) => void;
  isAdmin?: boolean;
  isDeleting?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
}

function LatestReportHero({
  report,
  onViewReport,
  onDeleteReport,
  onPublishReport,
  onUnpublishReport,
  isAdmin = false,
  isDeleting = false,
  isPublishing = false,
  isUnpublishing = false,
  services,
}: LatestReportHeroProps) {
  // Use API-provided date range
  const dateRange = { start: report.start_date, end: report.end_date };

  return (
    <div className="max-w-5xl">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {report.name}
              </h2>
              <Badge variant="accent1" className="ml-auto">
                <TrendingUp className="w-3 h-3 mr-1" />
                Latest Report
              </Badge>
              {isAdmin && (
                <Badge
                  variant={report.is_published ? "success" : "secondary"}
                  className="ml-2"
                >
                  {report.is_published ? (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Published
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Not Published
                    </>
                  )}
                </Badge>
              )}
            </div>

            {report.description && (
              <p className="text-gray-600 mb-6 max-w-2xl">
                {report.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Creator Info */}
              {(report.creator_email || report.creator_name) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="truncate">
                    {report.creator_name || report.creator_email}
                  </span>
                </div>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {services.formatService.temporal.range.long(
                    dateRange.start,
                    dateRange.end,
                  )}
                </span>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>
                  Created{" "}
                  {formatDistanceToNow(new Date(report.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Ended Date */}
              {dateRange && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Started{" "}
                    {formatDistanceToNow(dateRange.start, { addSuffix: true })}
                  </span>
                  <span className="font-bold text-gray-400">·</span>
                  <span>
                    ended{" "}
                    {formatDistanceToNow(dateRange.end, { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={onViewReport}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                View Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {isAdmin && (
                <>
                  {report.is_published && onUnpublishReport && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpublishReport(report.id);
                      }}
                      disabled={isUnpublishing || isPublishing}
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      {isUnpublishing ? "Unpublishing..." : "Unpublish"}
                    </Button>
                  )}
                  {!report.is_published && onPublishReport && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublishReport(report.id);
                      }}
                      disabled={isUnpublishing || isPublishing}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isPublishing ? "Publishing..." : "Publish"}
                    </Button>
                  )}
                  {onDeleteReport && (
                    <DeleteConfirmationPopover
                      reportName={report.name}
                      onConfirm={() => onDeleteReport(report.id)}
                      isDeleting={isDeleting}
                    >
                      <Button
                        variant="outline-destructive"
                        size="lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </DeleteConfirmationPopover>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReportCardProps extends WithFrontServices {
  report: CockpitCubeReportWithCreator;
  onClick: () => void;
  onDeleteReport?: (reportId: string) => void;
  onPublishReport?: (reportId: string) => void;
  onUnpublishReport?: (reportId: string) => void;
  isAdmin?: boolean;
  isDeleting?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
}

function ReportCard({
  report,
  onClick,
  onDeleteReport,
  onPublishReport,
  onUnpublishReport,
  isAdmin = false,
  isDeleting = false,
  isPublishing = false,
  isUnpublishing = false,
  services,
}: ReportCardProps) {
  // Use API-provided date range
  const dateRange = { start: report.start_date, end: report.end_date };
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-300 group hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors truncate">
                {report.name}
              </CardTitle>
            </div>
          </div>
          {isAdmin && (
            <Badge
              variant={report.is_published ? "success" : "secondary"}
              className="ml-2"
            >
              {report.is_published ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Published
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Not Published
                </>
              )}
            </Badge>
          )}
        </div>
        {report.description && (
          <CardDescription className="line-clamp-2 mt-3 text-xs">
            {report.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {/* Creator Info */}
          {(report.creator_email || report.creator_name) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="truncate">
                {report.creator_name || report.creator_email}
              </span>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="truncate">
              {services.formatService.temporal.range.long(
                dateRange.start,
                dateRange.end,
              )}
            </span>
            <Clock className="w-3 h-3" />
            <span>
              ended {formatDistanceToNow(dateRange.end, { addSuffix: true })}
            </span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span className="truncate">
              Created{" "}
              {formatDistanceToNow(new Date(report.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <Badge variant="secondary" className="text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Cube Data
        </Badge>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate">
            Updated{" "}
            {formatDistanceToNow(new Date(report.updated_at), {
              addSuffix: true,
            })}
          </span>

          {isAdmin && (
            <>
              {report.is_published && onUnpublishReport && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpublishReport(report.id);
                  }}
                  variant="outline"
                  size="icon-xs"
                  disabled={isUnpublishing || isPublishing}
                  title="Unpublish report"
                >
                  <EyeOff className="w-3 h-3" />
                </Button>
              )}
              {!report.is_published && onPublishReport && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublishReport(report.id);
                  }}
                  variant="outline"
                  size="icon-xs"
                  disabled={isUnpublishing || isPublishing}
                  title="Publish report"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}
              {onDeleteReport && (
                <DeleteConfirmationPopover
                  reportName={report.name}
                  onConfirm={() => onDeleteReport(report.id)}
                  isDeleting={isDeleting}
                >
                  <Button
                    onClick={(e) => e.stopPropagation()}
                    variant="outline-destructive"
                    size="icon-xs"
                  >
                    <Trash2 />
                  </Button>
                </DeleteConfirmationPopover>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
