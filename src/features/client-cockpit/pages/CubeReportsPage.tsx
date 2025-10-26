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
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { BarChart3, Calendar, User, FileText, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api.ts";

export function CubeReportsPage(props: WithFrontServices) {
  const authState = props.services.cockpitAuthService.useAuth();
  const tenantId = rd.tryMap(authState, (auth) => auth.tenantId);
  const reports =
    props.services.clientCubeReportService.useCubeReports(tenantId);

  const handleReportClick = (reportId: string) => {
    // TODO: Navigate to report detail view
    console.log("Report clicked:", reportId);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cube Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze your data reports
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      {rd
        .journey(reports)
        .wait(
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

          return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reportsList.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => handleReportClick(report.id)}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}

interface ReportCardProps {
  report: CockpitCubeReportWithCreator;
  onClick: () => void;
}

function ReportCard({ report, onClick }: ReportCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-300 group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors truncate">
                {report.name}
              </CardTitle>
            </div>
          </div>
        </div>
        {report.description && (
          <CardDescription className="line-clamp-2 mt-2">
            {report.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Creator Info */}
          {(report.creator_email || report.creator_name) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="truncate">
                {report.creator_name || report.creator_email}
              </span>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
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
        <span className="text-xs text-muted-foreground">
          Updated{" "}
          {formatDistanceToNow(new Date(report.updated_at), {
            addSuffix: true,
          })}
        </span>
      </CardFooter>
    </Card>
  );
}
