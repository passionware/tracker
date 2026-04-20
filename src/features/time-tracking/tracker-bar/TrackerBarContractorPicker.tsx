import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { rd } from "@passionware/monads";

/**
 * Picker that decides "which contractor identity is the TrackerBar
 * tracking for?". Persists to PreferenceService — see
 * `useTrackerActiveContractorId`. Until a real `auth.uid() → contractorId`
 * mapping ships this is the only way to pin the bar to a specific person.
 *
 * Surfaces both an idle "track time as…" CTA (when nothing is selected)
 * and a compact <Select> (when one is). The parent decides whether to
 * render this inline (collapsed sidebar footer) or in a popover (when
 * switching identities mid-session).
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
  const activeContractorId =
    props.services.preferenceService.useTrackerActiveContractorId();

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
      const handleChange = (next: string) => {
        const id = next === "__none__" ? null : Number(next);
        void props.services.preferenceService.setTrackerActiveContractorId(id);
      };
      return (
        <div className="flex items-center gap-2">
          <Select
            value={
              activeContractorId === null
                ? "__none__"
                : String(activeContractorId)
            }
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
              <SelectItem value="__none__">— Not tracking —</SelectItem>
              {sorted.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeContractorId !== null ? (
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
