import { Overwrite } from "@passionware/platform-ts";

export type SwitchProps<
  Props,
  OutProps extends keyof Props,
  InProps,
> = Overwrite<Omit<Props, OutProps>, InProps>;
