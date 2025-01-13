import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import {
  Summary,
  SummaryEntry,
  SummaryEntryValue,
} from "@/features/_common/Summary.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { useColumns } from "@/features/contractor-reports/ContractorReportsWidget.columns.tsx";
import { ContractorReportsWidgetProps } from "@/features/contractor-reports/ContractorReportsWidget.types.tsx";
import { NewContractorReportWidget } from "@/features/contractor-reports/NewContractorReportWidget.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { maybe, Maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { addDays } from "date-fns";
import { chain, partialRight } from "lodash";
import { Check, Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

export function ContractorReportsWidget(props: ContractorReportsWidgetProps) {
  const [contractorFilter, setContractorFilter] = useState<
    Maybe<Contractor["id"]>
  >(maybe.ofAbsent());
  const reports = props.services.reportDisplayService.useReportView(
    chain(
      contractorReportQueryUtils.ofDefault(props.workspaceId, props.clientId),
    )
      .thru((x) =>
        contractorReportQueryUtils.setFilter(
          x,
          "contractorId",
          maybe.map(contractorFilter, (x) => ({
            operator: "oneOf",
            value: [x],
          })),
        ),
      )
      .value(),
  );

  const addReportState = promiseState.useRemoteData();

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
          <div className="rounded-md border border-slate-300 bg-slate-50 p-2 w-fit flex flex-row gap-1 items-center text-xs text-slate-600">
            Filters:
            <ContractorPicker
              allowClear
              size="xs"
              value={contractorFilter}
              onSelect={setContractorFilter}
              services={props.services}
            />
          </div>
          <InlinePopoverForm
            trigger={
              <Button variant="default" size="sm" className="flex">
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
                <NewContractorReportWidget
                  onCancel={bag.close}
                  defaultWorkspaceId={idSpecUtils.switchAll(
                    props.workspaceId,
                    undefined,
                  )}
                  defaultCurrency={rd.tryMap(
                    reports,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.netAmount
                        .currency,
                  )}
                  defaultContractorId={rd.tryMap(
                    reports,
                    (reports) =>
                      reports.entries[reports.entries.length - 1]?.contractor
                        .id,
                  )}
                  defaultPeriodStart={rd.tryMap(reports, (reports) =>
                    maybe.map(
                      reports.entries[reports.entries.length - 1]?.periodEnd,
                      partialRight(addDays, 1),
                    ),
                  )}
                  defaultPeriodEnd={new Date()}
                  defaultClientId={idSpecUtils.switchAll(
                    props.clientId,
                    undefined,
                  )}
                  services={props.services}
                  onSubmit={(data) =>
                    addReportState.track(
                      props.services.mutationService
                        .createContractorReport(data)
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
        data={rd.map(reports, (r) => r.entries)}
        columns={columns}
        caption={
          <>
            A list of all reported work for given client, matched with billing
            or clarifications.
            {rd.tryMap(reports, (view) => {
              const billingDetails = [
                { label: "Reported", value: view.total.netAmount },
                { label: "Charged", value: view.total.chargedAmount },
                { label: "Reconciled", value: view.total.reconciledAmount },
                { label: "To charge", value: view.total.toChargeAmount },
                { label: "Compensated", value: view.total.compensatedAmount },
                {
                  label: "To compensate",
                  value: view.total.toCompensateAmount,
                },
              ];

              return (
                <>
                  <h3 className="my-3 text-base font-semibold ">Summary</h3>
                  <Summary>
                    {billingDetails.map((item) => (
                      <SummaryEntry key={item.label} label={item.label}>
                        {item.value.map((value, index) => (
                          <SummaryEntryValue key={index}>
                            {props.services.formatService.financial.currency(
                              value,
                            )}
                          </SummaryEntryValue>
                        ))}
                      </SummaryEntry>
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
