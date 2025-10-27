import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta = {
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;

export const Default = {
  render: (props) => (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" {...props} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" {...props} />
        <Skeleton className="h-4 w-[200px]" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Card = {
  render: (props) => (
    <div className="w-80 border rounded-lg p-4">
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" {...props} />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px]" {...props} />
            <Skeleton className="h-3 w-[80px]" {...props} />
          </div>
        </div>
        <Skeleton className="h-4 w-full" {...props} />
        <Skeleton className="h-4 w-3/4" {...props} />
        <Skeleton className="h-4 w-1/2" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const List = {
  render: (props) => (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" {...props} />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" {...props} />
            <Skeleton className="h-3 w-2/3" {...props} />
          </div>
        </div>
      ))}
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Table = {
  render: (props) => (
    <div className="w-full p-4">
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-4 w-full" {...props} />
          <Skeleton className="h-4 w-full" {...props} />
          <Skeleton className="h-4 w-full" {...props} />
          <Skeleton className="h-4 w-full" {...props} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <Skeleton className="h-8 w-full" {...props} />
            <Skeleton className="h-8 w-full" {...props} />
            <Skeleton className="h-8 w-full" {...props} />
            <Skeleton className="h-8 w-full" {...props} />
          </div>
        ))}
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Article = {
  render: (props) => (
    <div className="max-w-2xl p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" {...props} />
          <Skeleton className="h-4 w-1/2" {...props} />
        </div>
        <Skeleton className="h-4 w-full" {...props} />
        <Skeleton className="h-4 w-full" {...props} />
        <Skeleton className="h-4 w-5/6" {...props} />
        <Skeleton className="h-4 w-full" {...props} />
        <Skeleton className="h-4 w-4/5" {...props} />
        <Skeleton className="h-4 w-full" {...props} />
        <Skeleton className="h-4 w-3/4" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const DifferentSizes = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <span className="text-sm font-medium">Small</span>
        <Skeleton className="h-4 w-32" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Medium</span>
        <Skeleton className="h-6 w-48" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Large</span>
        <Skeleton className="h-8 w-64" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Extra Large</span>
        <Skeleton className="h-12 w-80" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;

export const Shapes = {
  render: (props) => (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <span className="text-sm font-medium">Rectangle</span>
        <Skeleton className="h-8 w-32" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Rounded</span>
        <Skeleton className="h-8 w-32 rounded" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Circle</span>
        <Skeleton className="h-8 w-8 rounded-full" {...props} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Square</span>
        <Skeleton className="h-8 w-8" {...props} />
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
