import { cn } from "@/lib/utils.ts";
import { cf } from "@passionware/component-factory";

export const DimmedContainer = cf.div<{ shouldDim: boolean }>(
  {
    className: (props) =>
      cn(
        "transition duration-400 ease-out",
        {
          "blur-[1px] opacity-80 ease-in": props.shouldDim,
        },
        props.className,
      ),
  },
  ["shouldDim"],
);

export function getDimmedClasses(shouldDim: boolean) {
  return cn("transition duration-400 ease-out", {
    "blur-[1px] opacity-80 ease-in": shouldDim,
  });
}
