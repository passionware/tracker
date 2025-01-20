import InlineToast from "@/features/_common/patterns/InlineToast.tsx";
import { cn } from "@/lib/utils.ts";
import { assert } from "@/platform/lang/assert";
import { ErrorMutationData, mt, MutationData } from "@passionware/monads";
import { CheckIcon, Loader2Icon, TriangleAlert } from "lucide-react";
import { ReactNode } from "react";

export function renderSpinnerMutation(
  mutation: MutationData<unknown, unknown>,
  config: {
    idle?: ReactNode;
    spinnerClass?: string;
    renderError?: (error: ErrorMutationData<unknown>) => ReactNode;
    //
    done?:
      | ReactNode
      | typeof renderSpinnerMutation.renderIdle
      | typeof renderSpinnerMutation.renderCheckmark;
  } = {},
) {
  return mt
    .journey(mutation)
    .initially(() => config.idle)
    .during(
      <Loader2Icon
        className={cn("h-5 animate-spin text-primary", config.spinnerClass)}
      />,
    )
    .catch<ReactNode>(
      config.renderError ?? (() => <TriangleAlert className="text-rose-600" />),
    )
    .done(() => {
      const content = config.done ?? renderSpinnerMutation.renderCheckmark;
      switch (content) {
        case renderSpinnerMutation.renderIdle:
          return config.idle;
        case renderSpinnerMutation.renderCheckmark:
          return (
            <InlineToast contentAfter={config.idle} delay={2000}>
              <CheckIcon className="h-5 text-primary" />
            </InlineToast>
          );
        default:
          assert(typeof content !== "symbol");
          return content;
      }
    });
}

renderSpinnerMutation.renderIdle = Symbol("renderIdle");
renderSpinnerMutation.renderCheckmark = Symbol("renderCheckmark");
