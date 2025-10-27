import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./progress";

const meta = {
  component: Progress,
} satisfies Meta<typeof Progress>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="w-full max-w-sm">
      <Progress value={33} {...props} />
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Variants = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>0%</span>
        </div>
        <Progress value={0} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>25%</span>
        </div>
        <Progress value={25} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>50%</span>
        </div>
        <Progress value={50} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>75%</span>
        </div>
        <Progress value={75} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>100%</span>
        </div>
        <Progress value={100} {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const WithLabels = {
  render: (props) => (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Storage Used</span>
          <span>7.2 GB of 10 GB</span>
        </div>
        <Progress value={72} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Project Completion</span>
          <span>85%</span>
        </div>
        <Progress value={85} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Download Progress</span>
          <span>45%</span>
        </div>
        <Progress value={45} {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Animated = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Loading...</span>
          <span>33%</span>
        </div>
        <Progress value={33} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Processing...</span>
          <span>66%</span>
        </div>
        <Progress value={66} {...props} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Almost done...</span>
          <span>90%</span>
        </div>
        <Progress value={90} {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const DifferentSizes = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <span className="text-sm">Small</span>
        <Progress value={50} className="h-2" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm">Default</span>
        <Progress value={50} {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm">Large</span>
        <Progress value={50} className="h-6" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const CustomColors = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <span className="text-sm">Success</span>
        <Progress value={100} className="[&>div]:bg-green-500" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm">Warning</span>
        <Progress value={75} className="[&>div]:bg-yellow-500" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm">Error</span>
        <Progress value={25} className="[&>div]:bg-red-500" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
