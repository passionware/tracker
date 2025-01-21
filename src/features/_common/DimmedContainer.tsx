import { cn } from "@/lib/utils.ts";

export function getDimmedClasses(shouldDim: boolean) {
  return cn("transition duration-400 ease-out", {
    "blur-[1px] opacity-80 ease-in": shouldDim,
  });
}
