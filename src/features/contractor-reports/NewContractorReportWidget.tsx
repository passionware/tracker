import { LinkPayload } from "@/api/mutation/mutation.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { useForm } from "react-hook-form";

export interface NewContractorReportWidgetProps
  extends WithServices<[WithMutationService]> {
  // initialLink: LinkPayload; todo: think about this
}

export function NewContractorReportWidget(props: NewContractorReportWidgetProps) {
  const form = useForm({
    initialValues: { linkAmount: 0, clarifyJustification: "" },
  });
}
