import { Button } from "@/components/ui/button.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CheckCircle2, Loader2, X } from "lucide-react";

export interface DeleteButtonWidgetProps
  extends WithServices<[WithPreferenceService, WithMutationService]> {
  onDelete: () => Promise<void>;
}

export function DeleteButtonWidget(props: DeleteButtonWidgetProps) {
  const { services, onDelete } = props;

  const isDangerMode = services.preferenceService.getIsDangerMode();
  const promise = promiseState.useRemoteData();
  if (!isDangerMode) {
    return null;
  }

  return (
    <Button
      size="xs"
      className="size-6"
      variant="destructive"
      onClick={() => promise.track(onDelete())}
    >
      {rd
        .fullJourney(promise.state)
        .initially(<X />)
        .wait(<Loader2 className="animate-spin" />)
        .catch(renderSmallError("w-2"))
        .map(() => (
          <CheckCircle2 />
        ))}
    </Button>
  );
}
