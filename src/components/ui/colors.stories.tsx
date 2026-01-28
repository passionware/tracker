import type { Meta, StoryObj } from "@storybook/react";

const ColorSwatch = ({
  name,
  variable,
  foregroundVariable,
}: {
  name: string;
  variable: string;
  foregroundVariable?: string;
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--border)",
      }}
    >
      {foregroundVariable ? (
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            width: "100%",
            height: "80px",
            borderRadius: "0.25rem",
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: `var(${variable})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: `var(${foregroundVariable})`,
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            {name}
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: `var(${foregroundVariable})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: `var(${variable})`,
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            Foreground
          </div>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "80px",
            backgroundColor: `var(${variable})`,
            borderRadius: "0.25rem",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--foreground)",
            fontWeight: 500,
          }}
        >
          {name}
        </div>
      )}
      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
        <div>{variable}</div>
        {foregroundVariable && <div>{foregroundVariable}</div>}
      </div>
    </div>
  );
};

const ColorShowcase = () => {
  const colorGroups = [
    {
      title: "Base Colors",
      colors: [
        { name: "Background", variable: "--background" },
        { name: "Foreground", variable: "--foreground" },
        { name: "Card", variable: "--card", foreground: "--card-foreground" },
        {
          name: "Popover",
          variable: "--popover",
          foreground: "--popover-foreground",
        },
      ],
    },
    {
      title: "Primary & Secondary",
      colors: [
        {
          name: "Primary",
          variable: "--primary",
          foreground: "--primary-foreground",
        },
        {
          name: "Secondary",
          variable: "--secondary",
          foreground: "--secondary-foreground",
        },
        {
          name: "Muted",
          variable: "--muted",
          foreground: "--muted-foreground",
        },
        {
          name: "Accent",
          variable: "--accent",
          foreground: "--accent-foreground",
        },
        {
          name: "Highlight",
          variable: "--highlight",
          foreground: "--highlight-foreground",
        },
      ],
    },
    {
      title: "Semantic Colors",
      colors: [
        {
          name: "Destructive",
          variable: "--destructive",
          foreground: "--destructive-foreground",
        },
        { name: "Border", variable: "--border" },
        { name: "Input", variable: "--input" },
        { name: "Ring", variable: "--ring" },
      ],
    },
    {
      title: "Chart Colors",
      colors: [
        { name: "Chart 1", variable: "--chart-1" },
        { name: "Chart 2", variable: "--chart-2" },
        { name: "Chart 3", variable: "--chart-3" },
        { name: "Chart 4", variable: "--chart-4" },
        { name: "Chart 5", variable: "--chart-5" },
      ],
    },
    {
      title: "Sidebar Colors",
      colors: [
        {
          name: "Sidebar",
          variable: "--sidebar",
          foreground: "--sidebar-foreground",
        },
        {
          name: "Sidebar Primary",
          variable: "--sidebar-primary",
          foreground: "--sidebar-primary-foreground",
        },
        {
          name: "Sidebar Accent",
          variable: "--sidebar-accent",
          foreground: "--sidebar-accent-foreground",
        },
        { name: "Sidebar Border", variable: "--sidebar-border" },
        { name: "Sidebar Ring", variable: "--sidebar-ring" },
      ],
    },
    {
      title: "Timeline Colors",
      colors: [
        { name: "Timeline Lane", variable: "--timeline-lane" },
        { name: "Timeline Lane Alt", variable: "--timeline-lane-alt" },
        { name: "Timeline Grid", variable: "--timeline-grid" },
        { name: "Timeline Marker", variable: "--timeline-marker" },
      ],
    },
  ];

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: 600 }}>
        Color Palette
      </h1>

      {colorGroups.map((group) => (
        <div key={group.title} style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              marginBottom: "1rem",
              fontSize: "1.5rem",
              fontWeight: 500,
            }}
          >
            {group.title}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {group.colors.map((color) => (
              <ColorSwatch
                key={color.variable}
                name={color.name}
                variable={color.variable}
                foregroundVariable={color.foreground}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const meta = {
  title: "Design System/Colors",
  component: ColorShowcase,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ColorShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};
