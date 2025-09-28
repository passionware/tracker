import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" {...props} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const States = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="unchecked" {...props} />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="checked" checked {...props} />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="indeterminate" checked="indeterminate" {...props} />
        <Label htmlFor="indeterminate">Indeterminate</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled" disabled {...props} />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled checked {...props} />
        <Label htmlFor="disabled-checked">Disabled Checked</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="newsletter" {...props} />
        <Label htmlFor="newsletter">Subscribe to newsletter</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="notifications" {...props} />
        <Label htmlFor="notifications">Email notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" {...props} />
        <Label htmlFor="marketing">Marketing emails</Label>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const FormExample = {
  render: (props) => (
    <div className="space-y-6 p-4 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-4">Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="dark-mode" {...props} />
            <Label htmlFor="dark-mode">Dark mode</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="notifications" {...props} />
            <Label htmlFor="notifications">Push notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="analytics" {...props} />
            <Label htmlFor="analytics">Analytics tracking</Label>
          </div>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const CheckboxGroup = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Select your interests</h3>
      <div className="space-y-2">
        {[
          "Technology",
          "Design",
          "Business",
          "Marketing",
          "Science",
          "Arts",
        ].map((interest) => (
          <div key={interest} className="flex items-center space-x-2">
            <Checkbox id={interest.toLowerCase()} {...props} />
            <Label htmlFor={interest.toLowerCase()}>{interest}</Label>
          </div>
        ))}
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
