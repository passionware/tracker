import { ReactNode, useState } from "react";

export interface OpenStateProps {
  children: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    close: () => void;
  }) => ReactNode;
}

export function OpenState(props: OpenStateProps) {
  const [open, setOpen] = useState(false);
  return props.children({ open, onOpenChange: setOpen, close: () => setOpen(false) });
}
