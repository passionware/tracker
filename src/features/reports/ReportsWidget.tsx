import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ReportQueryBar } from "@/features/_common/elements/query/ReportQueryBar.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { Summary } from "@/features/_common/Summary.tsx";
import { SummaryCurrencyGroup } from "@/features/_common/SummaryCurrencyGroup.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";
import { useColumns } from "@/features/reports/ReportsWidget.columns.tsx";
import { ReportsWidgetProps } from "@/features/reports/ReportsWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { addDays } from "date-fns";
import { chain, partialRight } from "lodash";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export function ReportsWidget(props: ReportsWidgetProps) {
  const [_query, setQuery] = useState(
    reportQueryUtils.ofDefault(props.workspaceId, props.clientId),
  );
  const query = chain(_query)
    .thru((x) =>
      reportQueryUtils.ensureDefault(x, props.workspaceId, props.clientId),
    )
    .value();

  const reports = props.services.reportDisplayService.useReportView(query);

  const addReportState = promiseState.useRemoteData<void>();

  const columns = useColumns(props);

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbPage>Reported work</BreadcrumbPage>,
      ]}
      tools={
        <>
          <ReportQueryBar
            spec={{
              contractor: "show",
              client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
              workspace: idSpecUtils.takeOrElse(
                props.workspaceId,
                "disable",
                "show",
              ),
            }}
            query={query}
            onQueryChange={setQuery}
            services={props.services}
          />
          <InlinePopoverForm
            trigger={
              <Button variant="accent1" size="sm" className="flex">
                {rd
                  .fullJourney(addReportState.state)
                  .initially(<PlusCircle />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-6"))
                  .map(() => (
                    <Check />
                  ))}
                Add report
              </Button>
            }
            content={(bag) => (
              <>
                <PopoverHeader>Add new contractor report</PopoverHeader>
                <ReportForm
                  onCancel={bag.close}
                  defaultValues={{
                    workspaceId: idSpecUtils.switchAll(
                      props.workspaceId,
                      undefined,
                    ),
                    currency: rd.tryMap(
                      reports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.netAmount
                          .currency,
                    ),
                    contractorId: rd.tryMap(
                      reports,
                      (reports) =>
                        reports.entries[reports.entries.length - 1]?.contractor
                          .id,
                    ),
                    periodStart: rd.tryMap(reports, (reports) =>
                      maybe.map(
                        reports.entries[reports.entries.length - 1]?.periodEnd,
                        partialRight(addDays, 1),
                      ),
                    ),
                    periodEnd: new Date(),
                    clientId: idSpecUtils.switchAll(props.clientId, undefined),
                  }}
                  services={props.services}
                  onSubmit={(data) =>
                    addReportState.track(
                      props.services.mutationService
                        .createReport(data)
                        .then(bag.close),
                    )
                  }
                />
              </>
            )}
          />
        </>
      }
    >
      <ListView
        query={query}
        onQueryChange={setQuery}
        data={rd.map(reports, (r) => r.entries)}
        onRowDoubleClick={async (row) => {
          const result =
            await props.services.messageService.editReport.sendRequest({
              defaultValues: row.originalReport,
              operatingMode: "edit",
            });
          switch (result.action) {
            case "confirm": {
              await props.services.mutationService.editReport(
                row.id,
                result.changes,
              );
            }
          }
        }}
        columns={columns}
        caption={
          <>
            A list of all reported work for given client, matched with billing
            or clarifications.
            {rd.tryMap(reports, (view) => {
              const billingDetails = [
                {
                  label: "Reported",
                  description: "Total value of reported work",
                  value: view.total.netAmount,
                },
                {
                  label: "Billed",
                  description: "How much billed value is linked to reports",
                  value: view.total.chargedAmount,
                },
                {
                  label: "To link",
                  description:
                    "Report amount that is not yet linked to any billing",
                  value: view.total.toChargeAmount,
                },
                { label: "To pay", value: view.total.toCompensateAmount },
                { label: "Paid", value: view.total.compensatedAmount },
                {
                  label: "To compensate",
                  value: view.total.toFullyCompensateAmount,
                },
              ];

              return (
                <>
                  <h3 className="my-3 text-base font-semibold ">
                    Summary ({view.entries.length} reports)
                  </h3>
                  <Summary>
                    {billingDetails.map((item) => (
                      <SummaryCurrencyGroup
                        key={item.label}
                        label={item.label}
                        description={item.description}
                        group={item.value}
                        services={props.services}
                      />
                    ))}
                  </Summary>
                </>
              );
            })}
          </>
        }
      />
    </CommonPageContainer>
  );
}
