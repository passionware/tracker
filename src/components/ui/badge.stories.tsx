import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { Badge } from "./badge";

const meta = {
  component: Badge,
  args: {
    children: "Badge",
  },
} satisfies Meta<typeof Badge>;

export default meta;

export const Variants = {
  render: (props) => {
    // Definicje możliwych wartości właściwości
    const tones = ["solid", "outline", "secondary"] as const;
    const variants = [
      "primary",
      "secondary",
      "positive",
      "destructive",
      "warning",
      "accent1",
      "accent2",
      "info",
      "success",
      "neutral",
      "purple",
      "indigo",
    ] as const;
    const sizes = ["md", "sm"] as const;

    return (
      <div className="grid grid-cols-13 gap-4 p-4 place-items-center">
        {/* Pusta komórka w lewym górnym rogu */}
        <div />
        {/* Nagłówki kolumn: warianty */}
        {variants.map((variant) => (
          <div key={variant} className="font-semibold text-center">
            {variant}
          </div>
        ))}

        {tones.map((tone) =>
          sizes.map((size) => (
            <Fragment key={`${tone}-${size}`}>
              {/* Nagłówek wiersza: tone i size */}
              <div className="flex flex-col items-center justify-center font-semibold">
                <span>{tone}</span>
                <span className="text-gray-500 text-xs">{size}</span>
              </div>
              {/* Renderowanie Badge dla danego wiersza (tone/size) i każdej kolumny (variant) */}
              {variants.map((variant) => (
                <Badge
                  key={`${tone}-${size}-${variant}`}
                  {...props}
                  tone={tone}
                  size={size}
                  variant={variant}
                >
                  {`${tone} ${variant} ${size}`}
                </Badge>
              ))}
            </Fragment>
          )),
        )}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const NewVariants = {
  render: (props) => {
    const newVariants = [
      "info",
      "success",
      "neutral",
      "purple",
      "indigo",
    ] as const;
    const tones = ["solid", "outline", "secondary"] as const;

    return (
      <div className="space-y-6 p-4">
        <h3 className="text-lg font-semibold">New Badge Variants</h3>
        {newVariants.map((variant) => (
          <div key={variant} className="space-y-2">
            <h4 className="font-medium capitalize">{variant}</h4>
            <div className="flex gap-2 items-center">
              {tones.map((tone) => (
                <Badge
                  key={`${variant}-${tone}`}
                  {...props}
                  tone={tone}
                  variant={variant}
                >
                  {`${tone} ${variant}`}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;
