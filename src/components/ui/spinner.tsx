import { cn } from "@/lib/utils.ts";
import { LoaderCircle } from "lucide-react";
import * as React from "react";

const spinnerVariants = "w-5 h-5 animate-spin";

interface LoadingSpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
  className?: string;
}

const LoadingSpinner = React.forwardRef<SVGSVGElement, LoadingSpinnerProps>(
  (props, ref) => {
    const { className, ...rest } = props;
    return (
      <LoaderCircle
        ref={ref}
        className={cn(spinnerVariants, className)}
        {...rest}
      />
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };
