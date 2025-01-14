import { useCallback, useMemo, useState } from "react";

export function useOpenState() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  return useMemo(
    () => ({
      isOpen,
      toggleOpen,
      close,
      open,
      dialogProps: {
        open: isOpen,
        onOpenChange: toggleOpen,
      },
    }),
    [close, isOpen, open, toggleOpen],
  );
}
