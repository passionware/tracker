import { Button } from "@/components/ui/button.tsx";
import {
  pickerCommandGroupClassName,
  pickerOptionRowInnerClassName,
  pickerOptionRowOuterClassName,
} from "@/features/_common/elements/pickers/_common/picker-command-layout.ts";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { ReactElement, useState } from "react";
import { cn } from "@/lib/utils.ts";

export interface CurrencyPickerProps {
  value: string | null;
  onSelect: (currency: string) => void;
  children?: ReactElement;
}

const currencies = [
  { id: "eur", label: "Euro (EUR)" },
  { id: "pln", label: "Polish Zloty (PLN)" },
];

export function CurrencyPicker({ value, onSelect }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredCurrencies = currencies.filter((currency) =>
    currency.label.toLowerCase().includes(query.toLowerCase()),
  );

  const currentCurrency = currencies.find((currency) => currency.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {currentCurrency ? currentCurrency.label : "Select currency..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search currency"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup className={pickerCommandGroupClassName}>
              {filteredCurrencies.map((currency) => {
                const isSelected = value === currency.id;
                return (
                  <CommandItem
                    key={currency.id}
                    value={currency.id}
                    className={pickerOptionRowOuterClassName(false)}
                    onSelect={() => {
                      onSelect(currency.id);
                      setOpen(false);
                    }}
                  >
                    <div
                      className={pickerOptionRowInnerClassName({
                        isSelected,
                        itemsStretch: false,
                      })}
                    >
                      {currency.label}
                      <Check
                        className={cn(
                          "ml-auto shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
