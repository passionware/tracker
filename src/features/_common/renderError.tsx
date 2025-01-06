import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { ErrorMutationData } from "@passionware/monads";
import { ReactNode } from "react";

function getMessage(error: Error) {
  // if (error instanceof TranslatedError) {
  //   return i18n.t(...error.options);
  // }
  return error.message;
}

export const createErrorRenderer = (className: string) => (error: Error) => {
  const message = getMessage(error);
  return (
    <div
      className={cn(
        "min-w-20 w-fit min-h-[1lh] text-red-800 bg-red-100 px-1 text-sm",
        "rounded p-2",
        className,
      )}
    >
      <div>{message}</div>
    </div>
  );
};

export const renderSmallError =
  (className: string, genericContent?: ReactNode) =>
  (error: Error | ErrorMutationData<unknown>) => {
    const message = getMessage("status" in error ? error.error : error);
    return (
      <SimpleTooltip title={message}>
        <div
          className={cn(
            "text-red-800 bg-red-300 border border-red-800 px-1 text-sm h-[1lh]",
            "flex flex-row justify-center items-center",
            "rounded-sm",
            className,
          )}
        >
          {genericContent}
        </div>
      </SimpleTooltip>
    );
  };

export const renderError = createErrorRenderer("");
