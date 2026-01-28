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
  "flex h-10 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
        <Group className="flex w-full rounded-md border border-border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <AriaInput
            ref={ref}
            className={cn(
              "flex h-10 w-full border-0 bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              inputClassName,
            )}
            placeholder={placeholder}
          />
          <div className="flex shrink-0 flex-col rounded-r-md overflow-hidden border-l border-border">
            <Button
              slot="increment"
              className={cn(
                "flex h-5 w-10 items-center justify-center border-b border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 rounded-tr-md",
                buttonClassName,
              )}
            >
              <Plus size={12} />
            </Button>
            <Button
              slot="decrement"
              className={cn(
                "flex h-5 w-10 items-center justify-center bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 rounded-br-md",
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
  placeholder?: string;
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
