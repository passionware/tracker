import { ReactNode } from "react";

export interface MountElementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  close: () => void;
}
export type MountElementHandler<T> = (
  api: MountElementProps & T
) => ReactNode;

export interface DialogService {
  show: <T>(handler: MountElementHandler<T>) => void;
}

export interface WithDialogService {
  dialogService: DialogService;
}