import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
  component: Textarea,
} satisfies Meta<typeof Textarea>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="space-y-2">
      <Label htmlFor="message">Your message</Label>
      <Textarea placeholder="Type your message here." id="message" {...props} />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabel = {
  render: (props) => (
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        placeholder="Enter a detailed description..."
        {...props}
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Disabled = {
  render: (props) => (
    <div className="space-y-2">
      <Label htmlFor="disabled">Disabled textarea</Label>
      <Textarea
        id="disabled"
        placeholder="This textarea is disabled"
        disabled
        {...props}
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithValue = {
  render: (props) => (
    <div className="space-y-2">
      <Label htmlFor="with-value">With value</Label>
      <Textarea
        id="with-value"
        defaultValue="This textarea has a default value. You can edit this text to see how the component behaves with content."
        {...props}
      />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const DifferentSizes = {
  render: (props) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="small">Small</Label>
        <Textarea
          id="small"
          className="min-h-[60px]"
          placeholder="Small textarea"
          {...props}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="default">Default</Label>
        <Textarea id="default" placeholder="Default textarea" {...props} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="large">Large</Label>
        <Textarea
          id="large"
          className="min-h-[120px]"
          placeholder="Large textarea"
          {...props}
        />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const FormExample = {
  render: (props) => (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <input
          id="title"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Enter title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          placeholder="Write your content here..."
          {...props}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          {...props}
        />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithCharacterCount = {
  render: (props) => (
    <div className="space-y-2">
      <Label htmlFor="limited">Limited textarea</Label>
      <Textarea
        id="limited"
        placeholder="Maximum 100 characters"
        maxLength={100}
        {...props}
      />
      <div className="text-sm text-gray-500">Character count: 0/100</div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
