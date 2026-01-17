import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Minus, Plus } from "lucide-react";
import * as React from "react";
import {
  Button,
  Group,
  Input as AriaInput,
  NumberField,
} from "react-aria-components";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-950 placeholder:text-slate-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:file:text-slate-50 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
);

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

// NumberInput component using React Aria NumberField
export interface NumberInputProps
  extends Omit<React.ComponentProps<typeof NumberField>, "children"> {
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  placeholder?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { className, inputClassName, buttonClassName, placeholder, ...props },
    ref,
  ) => {
    return (
      <NumberField className={cn("flex w-full", className)} {...props}>
        <Group className="flex w-full rounded-md border border-slate-200 bg-white ring-offset-white focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-within:ring-slate-300">
          <AriaInput
            ref={ref}
            className={cn(
              "flex h-10 w-full border-0 bg-transparent px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-slate-50 dark:placeholder:text-slate-400",
              inputClassName,
            )}
            placeholder={placeholder}
          />
          <div className="flex shrink-0 flex-col rounded-r-md overflow-hidden border-l border-slate-200 dark:border-slate-700">
            <Button
              slot="increment"
              className={cn(
                "flex h-5 w-10 items-center justify-center border-b border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-tr-md",
                buttonClassName,
              )}
            >
              <Plus size={12} />
            </Button>
            <Button
              slot="decrement"
              className={cn(
                "flex h-5 w-10 items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-br-md",
                buttonClassName,
              )}
            >
              <Minus size={12} />
            </Button>
          </div>
        </Group>
      </NumberField>
    );
  },
);
NumberInput.displayName = "NumberInput";

// NumberInputAsString component that handles string-to-number conversion
export interface NumberInputAsStringProps
  extends Omit<NumberInputProps, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

const NumberInputAsString = React.forwardRef<
  HTMLInputElement,
  NumberInputAsStringProps
>(
  (
    { className, inputClassName, buttonClassName, value, onChange, ...props },
    ref,
  ) => {
    // Convert string to number for NumberInput
    const numericValue = value
      ? isNaN(parseFloat(value))
        ? undefined
        : parseFloat(value)
      : undefined;

    // Convert number back to string for onChange
    const handleChange = (numValue: number) => {
      onChange?.(String(numValue));
    };

    return (
      <NumberInput
        ref={ref}
        className={className}
        inputClassName={inputClassName}
        buttonClassName={buttonClassName}
        value={numericValue}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
NumberInputAsString.displayName = "NumberInputAsString";

export { Input, NumberInput, NumberInputAsString };
