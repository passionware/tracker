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
    ] as const;
    const sizes = ["md", "sm"] as const;

    return (
      <div className="grid grid-cols-8  gap-4 p-4 place-items-center">
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
