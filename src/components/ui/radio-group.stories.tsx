import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;

export const Default = {
  render: (props) => (
    <RadioGroup defaultValue="option-one" {...props}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
    </RadioGroup>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Payment Method</Label>
        <RadioGroup defaultValue="credit-card" className="mt-2" {...props}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="credit-card" id="credit-card" />
            <Label htmlFor="credit-card">Credit Card</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="debit-card" id="debit-card" />
            <Label htmlFor="debit-card">Debit Card</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="paypal" id="paypal" />
            <Label htmlFor="paypal">PayPal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bank-transfer" id="bank-transfer" />
            <Label htmlFor="bank-transfer">Bank Transfer</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Disabled = {
  render: (props) => (
    <RadioGroup defaultValue="option-one" {...props}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" disabled />
        <Label htmlFor="option-two">Option Two (Disabled)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
} satisfies StoryObj<typeof meta>;

export const WithDescriptions = {
  render: (props) => (
    <RadioGroup defaultValue="basic" {...props}>
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="basic" id="basic" className="mt-1" />
          <div className="space-y-1">
            <Label htmlFor="basic" className="text-sm font-medium">
              Basic Plan
            </Label>
            <p className="text-sm text-gray-500">
              Perfect for individuals and small teams. Includes all basic
              features.
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="pro" id="pro" className="mt-1" />
          <div className="space-y-1">
            <Label htmlFor="pro" className="text-sm font-medium">
              Pro Plan
            </Label>
            <p className="text-sm text-gray-500">
              Advanced features for growing businesses. Includes priority
              support.
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="enterprise" id="enterprise" className="mt-1" />
          <div className="space-y-1">
            <Label htmlFor="enterprise" className="text-sm font-medium">
              Enterprise Plan
            </Label>
            <p className="text-sm text-gray-500">
              Full-featured solution for large organizations. Custom
              integrations available.
            </p>
          </div>
        </div>
      </div>
    </RadioGroup>
  ),
} satisfies StoryObj<typeof meta>;

export const FormExample = {
  render: (props) => (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Notification Preferences
        </Label>
        <RadioGroup defaultValue="email" {...props}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="email" id="email" />
            <Label htmlFor="email">Email notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sms" id="sms" />
            <Label htmlFor="sms">SMS notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="push" id="push" />
            <Label htmlFor="push">Push notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none">No notifications</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Horizontal = {
  render: (props) => (
    <RadioGroup defaultValue="option-one" className="flex space-x-6" {...props}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
} satisfies StoryObj<typeof meta>;
