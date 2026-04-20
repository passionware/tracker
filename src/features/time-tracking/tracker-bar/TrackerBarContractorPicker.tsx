import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { useCurrentContractor } from "@/features/time-tracking/_common/useCurrentContractor.ts";
import { rd } from "@passionware/monads";

/**
 * Picker that decides "which contractor identity is the TrackerBar
 * tracking for?".
 *
 * Identity resolution is handled by {@link useCurrentContractor}:
 *   - If the signed-in user is paired with a contractor, the bar defaults
 *     to that contractor implicitly. No preference is stored; switching to
 *     the user's own row clears the override.
 *   - Admins can pick a different contractor from the list to impersonate
 *     (e.g. to start a timer on behalf of a teammate who forgot to press
 *     start). That writes the preference, which {@link useCurrentContractor}
 *     surfaces as `isImpersonating: true` so the tracker bar can show a
 *     badge + a "back to me" action.
 *   - Unpaired users (no `contractor.user_id` row) see the picker as the
 *     only way to pin the bar to someone, matching the legacy behavior.
 */
export interface TrackerBarContractorPickerProps extends WithFrontServices {
  variant?: "inline" | "compact";
}

export function TrackerBarContractorPicker(
  props: TrackerBarContractorPickerProps,
) {
  const variant = props.variant ?? "inline";
  const contractors = props.services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  const { contractorId, authContractorId, isImpersonating } =
    useCurrentContractor(props.services);

  return rd
    .journey(contractors)
    .wait(<Skeleton className="h-9 w-full" />)
    .catch(renderError)
    .map((list) => {
      const sorted = [...list].sort((a, b) =>
        a.fullName.localeCompare(b.fullName),
      );
      if (sorted.length === 0) {
        return (
          <div className="text-xs text-muted-foreground">
            No contractors yet.
          </div>
        );
      }
      /**
       * - Picking the auth-paired contractor clears the override (regular
       *   users never need to store a preference).
       * - Picking anyone else writes the override (impersonation).
       * - `__none__` is only available to unpaired users so they can
       *   deliberately un-pin the bar; paired users can't "unpick" their
       *   own identity.
       */
      const handleChange = (next: string) => {
        if (next === "__none__") {
          void props.services.preferenceService.setTrackerActiveContractorId(
            null,
          );
          return;
        }
        const id = Number(next);
        const override = id === authContractorId ? null : id;
        void props.services.preferenceService.setTrackerActiveContractorId(
          override,
        );
      };
      return (
        <div className="flex items-center gap-2">
          <Select
            value={contractorId === null ? "__none__" : String(contractorId)}
            onValueChange={handleChange}
          >
            <SelectTrigger
              className={
                variant === "compact"
                  ? "h-8 max-w-[12rem] text-xs"
                  : "h-9 text-sm"
              }
            >
              <SelectValue placeholder="Track time as…" />
            </SelectTrigger>
            <SelectContent>
              {authContractorId === null ? (
                <SelectItem value="__none__">— Not tracking —</SelectItem>
              ) : null}
              {authContractorId !== null ? (
                <>
                  <SelectItem value={String(authContractorId)}>
                    {
                      sorted.find((c) => c.id === authContractorId)?.fullName
                    }{" "}
                    (you)
                  </SelectItem>
                  <SelectSeparator />
                </>
              ) : null}
              {sorted
                .filter((c) => c.id !== authContractorId)
                .map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {isImpersonating ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => handleChange(String(authContractorId))}
              title="Switch back to your own contractor"
            >
              Back to me
            </Button>
          ) : contractorId !== null && authContractorId === null ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => handleChange("__none__")}
            >
              Stop tracking
            </Button>
          ) : null}
        </div>
      );
    });
}
