import { cn } from "@/lib/utils";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { ComponentProps, memo } from "react";

const Avatar = memo<ComponentProps<typeof AvatarPrimitive.Root>>(
  ({ className, ...props }) => (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = memo(
  ({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) => (
    <AvatarPrimitive.Image // todo: wait for https://github.com/radix-ui/primitives/issues/2044
      className={cn("aspect-square object-cover h-full w-full", className)}
      {...props}
    />
  ),
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = memo(
  ({
    className,
    ...props
  }: ComponentProps<typeof AvatarPrimitive.Fallback>) => (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800",
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
