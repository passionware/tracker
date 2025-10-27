/**
 * JsonTreeViewer Stories
 */

import type { Meta, StoryObj } from "@storybook/react";
import { JsonTreeViewer } from "./JsonTreeViewer";

const meta: Meta<typeof JsonTreeViewer> = {
  title: "Common/JsonTreeViewer",
  component: JsonTreeViewer,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    initiallyExpanded: {
      control: "boolean",
    },
    maxDepth: {
      control: { type: "number", min: 1, max: 10 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof JsonTreeViewer>;

// Sample data for stories
const sampleConfig = {
  metadata: {
    version: "1.0.0",
    createdAt: "2025-01-19T13:34:27.679Z",
    modifiedAt: "2025-01-19T13:34:27.679Z",
    name: "Cube Configuration",
  },
  dataSchema: {
    fields: [
      { name: "id", type: "string", nullable: false },
      { name: "note", type: "string", nullable: false },
      { name: "taskId", type: "string", nullable: false },
      { name: "activityId", type: "string", nullable: false },
      { name: "projectId", type: "string", nullable: false },
      { name: "roleId", type: "string", nullable: false },
      { name: "contractorId", type: "number", nullable: false },
      { name: "createdAt", type: "dateTime", nullable: false },
      { name: "updatedAt", type: "dateTime", nullable: false },
      { name: "startAt", type: "dateTime", nullable: false },
      { name: "endAt", type: "dateTime", nullable: false },
    ],
  },
  dimensions: [
    {
      id: "project",
      name: "Project",
      icon: "🏗️",
      fieldName: "projectId",
      keyFieldName: "custom",
      labelMapping: {
        "Countful - Review": "Countful - Review",
        "Countful - Meetings": "Countful - Meetings",
        "Countful - Rebranding": "Countful - Rebranding",
        "Countful - Development": "Countful - Development",
      },
    },
    {
      id: "contractor",
      name: "Contractor",
      icon: "👤",
      fieldName: "contractorId",
      keyFieldName: "custom",
      labelMapping: {
        "1": "Adam Witzberg",
        "2": "Passionware Adam Borowski",
      },
    },
  ],
  measures: [
    {
      id: "hours",
      name: "Hours",
      icon: "⏱️",
      fieldName: "startAt",
      aggregationFunction: "sum",
      formatFunction: { type: "number" },
      sidebarOptions: { mode: "percentage" },
    },
    {
      id: "billing",
      name: "Billing",
      icon: "💳",
      fieldName: "roleId",
      aggregationFunction: "sum",
      formatFunction: { type: "currency" },
      sidebarOptions: { mode: "absolute" },
    },
  ],
  breakdownMap: {
    "": "project",
    "project:*": "task",
    "project:*|task:*": "contractor",
    "project:*|task:*|contractor:*": "activity",
  },
  initialGrouping: ["project", "task", "contractor", "activity"],
  filters: [],
};

const simpleData = {
  name: "John Doe",
  age: 30,
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    country: "USA",
  },
  hobbies: ["reading", "swimming", "coding"],
  isActive: true,
  metadata: null,
};

const complexData = {
  users: [
    {
      id: 1,
      name: "Alice",
      profile: {
        bio: "Software developer",
        skills: ["JavaScript", "TypeScript", "React"],
        social: {
          twitter: "@alice",
          github: "alice-dev",
        },
      },
    },
    {
      id: 2,
      name: "Bob",
      profile: {
        bio: "Designer",
        skills: ["Figma", "Photoshop", "Illustrator"],
        social: {
          twitter: "@bob",
          dribbble: "bob-design",
        },
      },
    },
  ],
  settings: {
    theme: "dark",
    notifications: {
      email: true,
      push: false,
      sms: true,
    },
    preferences: {
      language: "en",
      timezone: "UTC",
      currency: "USD",
    },
  },
};

export const Default: Story = {
  args: {
    data: simpleData,
    title: "Simple Data",
    initiallyExpanded: true,
  },
};

export const CubeConfiguration: Story = {
  args: {
    data: sampleConfig,
    title: "Cube Configuration",
    initiallyExpanded: true,
  },
};

export const ComplexData: Story = {
  args: {
    data: complexData,
    title: "Complex Data Structure",
    initiallyExpanded: false,
  },
};

export const Collapsed: Story = {
  args: {
    data: sampleConfig,
    title: "Initially Collapsed",
    initiallyExpanded: false,
  },
};

export const LimitedDepth: Story = {
  args: {
    data: complexData,
    title: "Limited Depth (3 levels)",
    initiallyExpanded: true,
    maxDepth: 3,
  },
};

export const NoTitle: Story = {
  args: {
    data: simpleData,
    initiallyExpanded: true,
  },
};

export const EmptyObject: Story = {
  args: {
    data: {},
    title: "Empty Object",
    initiallyExpanded: true,
  },
};

export const ArrayData: Story = {
  args: {
    data: [
      { name: "Item 1", value: 100 },
      { name: "Item 2", value: 200 },
      { name: "Item 3", value: 300 },
    ],
    title: "Array Data",
    initiallyExpanded: true,
  },
};
