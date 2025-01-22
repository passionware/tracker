import {
  BillingPayload,
  BillingQuery,
  billingQueryUtils,
} from "@/api/billing/billing.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  BillingList,
  BillingListProps,
} from "@/features/_common/elements/lists/BillingList.tsx";
import { InlineSearchLayout } from "@/features/_common/inline-search/_common/InlineSearchLayout.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { useOpenState } from "@/platform/react/useOpenState.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { Plus } from "lucide-react";
import { useState } from "react";

export interface InlineBillingSearchWidgetProps
  extends WithServices<
    [
      WithReportDisplayService,
      WithFormatService,
      WithClientService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithExpressionService,
      WithPreferenceService,
    ]
  > {
  query: BillingQuery;
  initialNewBillingValues?: Partial<BillingPayload>;
  renderSelect: BillingListProps["renderSelect"];
  className?: string;
  context: ExpressionContext;
}

export function InlineBillingSearch(props: InlineBillingSearchWidgetProps) {
  const [_query, setQuery] = useState<BillingQuery>(props.query);
  const query = billingQueryUtils.narrowContext(_query, props.context);
  const editModalState = useOpenState();

  const billings = props.services.reportDisplayService.useBillingView(query);

  return (
    <>
      <InlineSearchLayout
        className={props.className}
        filters={
          <>
            {/*<BillingQueryBar*/}
            {/*  query={query}*/}
            {/*  onQueryChange={setQuery}*/}
            {/*  context={props.context}*/}
            {/*  services={props.services}*/}
            {/*/>*/}
            TODO TOOLBAR
            <Dialog {...editModalState.dialogProps}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="icon-sm" className="">
                  <Plus strokeWidth={3} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Edit billing</DialogTitle>
                <DialogDescription className="sr-only" />
                <BillingForm
                  onCancel={editModalState.close}
                  defaultValues={props.initialNewBillingValues}
                  services={props.services}
                  onSubmit={(data) =>
                    props.services.mutationService
                      .createBilling(data)
                      .then(editModalState.close)
                  }
                />
              </DialogContent>
            </Dialog>
          </>
        }
      >
        <BillingList
          services={props.services}
          context={props.context}
          data={rd.map(billings, (x) => x.entries)}
          query={query}
          onQueryChange={setQuery}
          renderSelect={props.renderSelect}
        />
      </InlineSearchLayout>
    </>
  );
}
