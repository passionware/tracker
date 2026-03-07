import {
  ReportPayload,
  ReportQuery,
  reportQueryUtils,
} from "@/api/reports/reports.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer.tsx";
import {
  ReportList,
  ReportListProps,
} from "@/features/_common/elements/lists/ReportList.tsx";
import { ReportQueryBar } from "@/features/_common/elements/query/ReportQueryBar.tsx";
import { InlineSearchLayout } from "@/features/_common/inline-search/_common/InlineSearchLayout.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { useOpenState } from "@/platform/react/useOpenState.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { Plus } from "lucide-react";
import { useState } from "react";

export interface InlineReportSearchWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithExpressionService,
    ]
  > {
  query: ReportQuery;
  initialNewReportValues?: Partial<ReportPayload>;
  renderSelect: ReportListProps["renderSelect"];
  className?: string;
  context: ExpressionContext;
  showBillingColumns: boolean;
  showCostColumns: boolean;
}

export function InlineReportSearch(props: InlineReportSearchWidgetProps) {
  const [_query, setQuery] = useState<ReportQuery>(props.query);
  const query = reportQueryUtils.narrowContext(_query, props.context);
  const editModalState = useOpenState();

  const reports = props.services.reportDisplayService.useReportView(query);

  return (
    <>
      <InlineSearchLayout
        className={props.className}
        filters={
          <>
            <ReportQueryBar
              query={query}
              onQueryChange={setQuery}
              spec={{
                workspace: idSpecUtils.takeOrElse(
                  props.context.workspaceId,
                  "disable",
                  "show",
                ),
                client: idSpecUtils.takeOrElse(
                  props.context.clientId,
                  "disable",
                  "show",
                ),
                contractor: idSpecUtils.takeOrElse(
                  props.context.contractorId,
                  "disable",
                  "show",
                ),
              }}
              services={props.services}
            />
            <DrawerNestedRoot {...editModalState.dialogProps} direction="right">
              <DrawerTrigger asChild>
                <Button variant="secondary" size="icon-sm" className="">
                  <Plus strokeWidth={3} />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
                <DrawerHeader>
                  <DrawerTitle>Create report</DrawerTitle>
                  <DrawerDescription className="sr-only" />
                </DrawerHeader>
                <div className="px-4 pb-4 overflow-y-auto flex-1">
                  <ReportForm
                    onCancel={editModalState.close}
                    defaultValues={props.initialNewReportValues}
                    services={props.services}
                    onSubmit={(data) =>
                      props.services.mutationService
                        .createReport(data)
                        .then(editModalState.close)
                    }
                  />
                </div>
              </DrawerContent>
            </DrawerNestedRoot>
          </>
        }
      >
        <ReportList
          services={props.services}
          context={props.context}
          data={rd.map(reports, (x) => x.entries)}
          query={query}
          onQueryChange={setQuery}
          renderSelect={props.renderSelect}
          showBillingColumns={props.showBillingColumns}
          showCostColumns={props.showCostColumns}
        />
      </InlineSearchLayout>
    </>
  );
}
