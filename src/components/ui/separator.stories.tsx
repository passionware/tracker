import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "./separator";

const meta = {
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="p-4">
      <div>Content above</div>
      <Separator {...props} />
      <div>Content below</div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Horizontal = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div>First section</div>
      <Separator orientation="horizontal" {...props} />
      <div>Second section</div>
      <Separator orientation="horizontal" {...props} />
      <div>Third section</div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Vertical = {
  render: (props) => (
    <div className="flex items-center space-x-4 p-4">
      <div>Left</div>
      <Separator orientation="vertical" {...props} />
      <div>Center</div>
      <Separator orientation="vertical" {...props} />
      <div>Right</div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const InList = {
  render: (props) => (
    <div className="w-64 p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-sm">Profile</div>
        <div className="px-3 py-2 text-sm">Settings</div>
        <div className="px-3 py-2 text-sm">Billing</div>
        <Separator {...props} />
        <div className="px-3 py-2 text-sm">Help</div>
        <div className="px-3 py-2 text-sm">Support</div>
        <Separator {...props} />
        <div className="px-3 py-2 text-sm">Sign out</div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const InCard = {
  render: (props) => (
    <div className="w-80 border rounded-lg p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Card Title</h3>
          <p className="text-sm text-gray-600">Card description</p>
        </div>
        <Separator {...props} />
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Item 1</span>
            <span>$10</span>
          </div>
          <div className="flex justify-between">
            <span>Item 2</span>
            <span>$20</span>
          </div>
        </div>
        <Separator {...props} />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>$30</span>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="p-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator {...props} />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const DifferentStyles = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div>
        <span className="text-sm font-medium">Default</span>
        <Separator {...props} />
      </div>
      <div>
        <span className="text-sm font-medium">Thick</span>
        <Separator className="h-1" {...props} />
      </div>
      <div>
        <span className="text-sm font-medium">Dashed</span>
        <Separator className="border-dashed" {...props} />
      </div>
      <div>
        <span className="text-sm font-medium">Dotted</span>
        <Separator className="border-dotted" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
