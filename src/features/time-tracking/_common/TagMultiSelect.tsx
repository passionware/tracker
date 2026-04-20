import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import type { TagSuggestion } from "@/services/io/TimeEntryService/TimeEntryService.ts";
import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

/** Slugs: lowercase start, then alnum / dash / underscore. Matches API. */
const TAG_REGEX = /^[a-z0-9][a-z0-9_-]*$/;
export const TAG_MAX = 16;
const TAG_MAX_LEN = 40;

/**
 * Free-form tag picker used by the EntryEditor and the timeline filter.
 *
 * Shows currently-selected tags as removable chips, plus a popover with
 * contractor-history suggestions. The input below the popover accepts
 * brand new slugs on `Enter`; invalid input (uppercase, spaces, dupes,
 * max-length) is rejected silently so the caller can keep the control
 * compact.
 */
export function TagMultiSelect(props: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: TagSuggestion[];
  disabled?: boolean;
  /** Short label shown under the chips; hidden when false. */
  showHelp?: boolean;
  placeholder?: string;
  max?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const max = props.max ?? TAG_MAX;

  const normalised = draft.trim().toLowerCase();
  const canAdd =
    normalised.length > 0 &&
    normalised.length <= TAG_MAX_LEN &&
    TAG_REGEX.test(normalised) &&
    !props.value.includes(normalised) &&
    props.value.length < max;

  const addTag = (value: string) => {
    const v = value.trim().toLowerCase();
    if (!v || props.value.includes(v)) return;
    if (!TAG_REGEX.test(v)) return;
    if (props.value.length >= max) return;
    props.onChange([...props.value, v]);
    setDraft("");
  };

  const removeTag = (t: string) =>
    props.onChange(props.value.filter((x) => x !== t));

  const selectedSet = useMemo(
    () => new Set(props.value),
    [props.value],
  );

  return (
    <div className={cn("flex flex-col gap-1.5", props.className)}>
      <div className="flex flex-wrap items-center gap-1">
        {props.value.map((t) => (
          <Badge
            key={t}
            tone="secondary"
            variant="neutral"
            className="gap-1 pr-1"
          >
            <span className="font-mono text-[10px]">{t}</span>
            <button
              type="button"
              aria-label={`Remove ${t}`}
              className="rounded-full p-0.5 hover:bg-foreground/10 disabled:opacity-50"
              disabled={props.disabled}
              onClick={() => removeTag(t)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={props.disabled || props.value.length >= max}
              className="h-7 gap-1 px-2"
            >
              <Plus className="size-3" />
              <span className="text-xs">
                {props.value.length === 0 ? "Add tag" : "Add"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={props.placeholder ?? "Type a tag…"}
                value={draft}
                onValueChange={setDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdd) {
                    e.preventDefault();
                    addTag(normalised);
                  }
                }}
              />
              <CommandList>
                {(props.suggestions ?? []).length === 0 &&
                normalised.length === 0 ? (
                  <CommandEmpty>
                    No recent tags. Type one and press Enter.
                  </CommandEmpty>
                ) : null}
                {(props.suggestions ?? []).length > 0 ? (
                  <CommandGroup heading="Your recent tags">
                    {(props.suggestions ?? [])
                      .filter(
                        (s) =>
                          normalised.length === 0 ||
                          s.tag.includes(normalised),
                      )
                      .slice(0, 20)
                      .map((s) => (
                        <CommandItem
                          key={s.tag}
                          value={s.tag}
                          onSelect={() => addTag(s.tag)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-3",
                              selectedSet.has(s.tag)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="font-mono text-xs">{s.tag}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                            {s.count}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                ) : null}
                {canAdd && !(props.suggestions ?? []).some((s) => s.tag === normalised) ? (
                  <CommandGroup heading="Create">
                    <CommandItem
                      value={`__create:${normalised}`}
                      onSelect={() => addTag(normalised)}
                    >
                      <Plus className="mr-2 size-3" />
                      <span className="font-mono text-xs">{normalised}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        new
                      </span>
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {props.showHelp !== false ? (
        <p className="text-[11px] text-muted-foreground">
          Lowercase slugs ({"a-z, 0-9, _, -"}), up to {max}. Your recent
          tags appear as suggestions.
        </p>
      ) : null}
    </div>
  );
}
