import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./slider";

const meta = {
  component: Slider,
} satisfies Meta<typeof Slider>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="w-full max-w-sm p-4">
      <Slider defaultValue={[50]} max={100} step={1} {...props} />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Range = {
  render: (props) => (
    <div className="w-full max-w-sm p-4">
      <Slider defaultValue={[20, 80]} max={100} step={1} {...props} />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithSteps = {
  render: (props) => (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Volume (0-100)</label>
        <Slider defaultValue={[30]} max={100} step={1} {...props} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Price Range</label>
        <Slider defaultValue={[20, 80]} max={100} step={5} {...props} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>$0</span>
          <span>$50</span>
          <span>$100</span>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Temperature</label>
        <Slider defaultValue={[25]} max={100} step={1} {...props} />
        <div className="flex justify-between text-sm">
          <span>0°C</span>
          <span>25°C</span>
          <span>100°C</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Brightness</label>
        <Slider defaultValue={[75]} max={100} step={1} {...props} />
        <div className="flex justify-between text-sm">
          <span>0%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Disabled = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Enabled</label>
        <Slider defaultValue={[50]} max={100} step={1} {...props} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Disabled</label>
        <Slider defaultValue={[50]} max={100} step={1} disabled {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Vertical = {
  render: (props) => (
    <div className="flex items-center space-x-4 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Volume</label>
        <Slider
          defaultValue={[50]}
          max={100}
          step={1}
          orientation="vertical"
          className="h-32"
          {...props}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Brightness</label>
        <Slider
          defaultValue={[75]}
          max={100}
          step={1}
          orientation="vertical"
          className="h-32"
          {...props}
        />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const FormExample = {
  render: (props) => (
    <div className="space-y-6 p-4 max-w-md">
      <div className="space-y-2">
        <label className="text-sm font-medium">Age Range</label>
        <Slider defaultValue={[18, 65]} max={100} step={1} {...props} />
        <div className="flex justify-between text-sm text-gray-600">
          <span>18 years</span>
          <span>65 years</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Budget</label>
        <Slider defaultValue={[1000]} max={10000} step={100} {...props} />
        <div className="flex justify-between text-sm text-gray-600">
          <span>$0</span>
          <span>$5,000</span>
          <span>$10,000</span>
        </div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
