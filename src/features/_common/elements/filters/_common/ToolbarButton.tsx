import { Button } from "@/components/ui/button";
import { ComponentPropsWithRef, ReactNode } from "react";

export interface ToolbarButtonProps extends ComponentPropsWithRef<"button"> {
  isActive: boolean;
  icon: ReactNode;
  children?: ReactNode;
  onRemove?: () => void;
  visuallyDisabled?: boolean;
}

export const ToolbarButton = ({
  isActive,
  onRemove,
  icon,
  children,
  visuallyDisabled,
  ...rest
}: ToolbarButtonProps) => {
  return (
    <Button
      disabled={visuallyDisabled}
      variant="outline"
      onPointerDownCapture={(e) => {
        if (e.target instanceof HTMLElement && e.target.querySelector("svg")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDownCapture={(e) => {
        if (visuallyDisabled) return;
        if (e.key === "Backspace" && isActive) {
          onRemove?.();
        }
      }}
      {...rest}
    >
      {icon}
      {children}
      {isActive && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (visuallyDisabled) return;
            onRemove?.();
          }}
          className="group -m-1 p-1"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="fill-current group-hover:fill-countful-black transition-colors"
          >
            <g clipPath="url(#clip0_1_25696)">
              <path d="M12 3C7.023 3 3 7.023 3 12C3 16.977 7.023 21 12 21C16.977 21 21 16.977 21 12C21 7.023 16.977 3 12 3ZM16.5 15.231L15.231 16.5L12 13.269L8.769 16.5L7.5 15.231L10.731 12L7.5 8.769L8.769 7.5L12 10.731L15.231 7.5L16.5 8.769L13.269 12L16.5 15.231Z" />
            </g>
            <defs>
              <clipPath id="clip0_1_25696">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      )}
    </Button>
  );
};
