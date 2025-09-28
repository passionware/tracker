import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Heart, Settings, Star } from "lucide-react";
import { Button } from "./button";

const meta = {
  component: Button,
  args: {
    children: "Button",
  },
} satisfies Meta<typeof Button>;

export default meta;

export const Default = {
  args: {
    children: "Default Button",
  },
} satisfies StoryObj<typeof meta>;

export const Variants = {
  render: (props) => {
    const variants = [
      "default",
      "destructive",
      "outline-destructive",
      "warning",
      "outline",
      "secondary",
      "ghost",
      "link",
      "accent1",
      "accent2",
    ] as const;

    return (
      <div className="flex flex-wrap gap-4 p-4">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} {...props}>
            {variant}
          </Button>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const Sizes = {
  render: (props) => {
    const sizes = [
      "xs",
      "sm",
      "default",
      "lg",
      "icon",
      "icon-xs",
      "icon-sm",
    ] as const;

    return (
      <div className="flex flex-wrap items-center gap-4 p-4">
        {sizes.map((size) => (
          <Button key={size} size={size} {...props}>
            {size === "icon" || size === "icon-xs" || size === "icon-sm" ? (
              <Settings className="h-4 w-4" />
            ) : (
              size
            )}
          </Button>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithIcons = {
  render: (props) => {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        <Button {...props}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" {...props}>
          <Heart className="mr-2 h-4 w-4" />
          Like
        </Button>
        <Button variant="secondary" {...props}>
          <Star className="mr-2 h-4 w-4" />
          Star
        </Button>
        <Button variant="ghost" size="icon" {...props}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const States = {
  render: (props) => {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        <Button {...props}>Normal</Button>
        <Button disabled {...props}>
          Disabled
        </Button>
        <Button visuallyDisabled {...props}>
          Visually Disabled
        </Button>
        <Button disabled {...props}>
          Loading
        </Button>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const AsChild = {
  render: (props) => {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        <Button asChild {...props}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Link Button
          </a>
        </Button>
        <Button asChild variant="outline" {...props}>
          <span>Span Button</span>
        </Button>
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;
