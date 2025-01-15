import { Meta } from "@storybook/react";

type MakeOnlyFunctionsOptional<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
} & Partial<{
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
}>;

/**
 * Fixes https://github.com/storybookjs/storybook/issues/13747
 */
export type FixedMeta<Args> = Meta<Args> & {
  args: MakeOnlyFunctionsOptional<Args>;
};
