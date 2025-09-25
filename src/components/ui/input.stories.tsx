import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  component: Input,
  args: {
    placeholder: "Enter text...",
  },
  argTypes: {
    onChange: { action: "onChange" },
    onFocus: { action: "onFocus" },
    onBlur: { action: "onBlur" },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof Input>;

export const Default = {} satisfies Story;

export const WithValue = {
  args: {
    value: "Sample text",
  },
} satisfies Story;

export const Disabled = {
  args: {
    disabled: true,
    value: "Disabled input",
  },
} satisfies Story;

export const WithType = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Text Input</label>
        <Input type="text" placeholder="Enter text..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Email Input</label>
        <Input type="email" placeholder="Enter email..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Password Input</label>
        <Input type="password" placeholder="Enter password..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Number Input</label>
        <Input type="number" placeholder="Enter number..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">File Input</label>
        <Input type="file" />
      </div>
    </div>
  ),
} satisfies Story;

export const WithLabel = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Name
        </label>
        <Input id="name" placeholder="Enter your name..." />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <Input id="email" type="email" placeholder="Enter your email..." />
      </div>
    </div>
  ),
} satisfies Story;
