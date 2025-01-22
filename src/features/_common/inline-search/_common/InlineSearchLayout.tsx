import { cn } from "@/lib/utils.ts";
import { Overwrite } from "@passionware/platform-ts";
import { ComponentPropsWithRef, ReactNode } from "react";

export type InlineSearchLayoutProps = Overwrite<
  ComponentPropsWithRef<"div">,
  {
    filters?: ReactNode;
  }
>;

export function InlineSearchLayout({
  filters,
  children,
  className,
  ...rest
}: InlineSearchLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)} {...rest}>
      {filters && <div className="flex gap-2">{filters}</div>}
      {children}
    </div>
  );
}
