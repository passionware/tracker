import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta = {
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;

export const Default = {
  render: (props) => (
    <Avatar {...props}>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
} satisfies StoryObj<typeof meta>;

export const WithFallback = {
  render: (props) => (
    <Avatar {...props}>
      <AvatarImage src="https://broken-link.com/image.png" alt="Broken" />
      <AvatarFallback>FB</AvatarFallback>
    </Avatar>
  ),
} satisfies StoryObj<typeof meta>;

export const OnlyFallback = {
  render: (props) => (
    <Avatar {...props}>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
} satisfies StoryObj<typeof meta>;

export const Sizes = {
  render: (props) => {
    const sizes = [
      { size: "h-6 w-6", label: "Small" },
      { size: "h-10 w-10", label: "Default" },
      { size: "h-16 w-16", label: "Large" },
      { size: "h-24 w-24", label: "Extra Large" },
    ];

    return (
      <div className="flex items-center gap-4 p-4">
        {sizes.map(({ size, label }) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <Avatar className={size} {...props}>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const MultipleAvatars = {
  render: (props) => {
    const users = [
      {
        name: "John Doe",
        initials: "JD",
        image: "https://github.com/shadcn.png",
      },
      {
        name: "Jane Smith",
        initials: "JS",
        image: "https://broken-link.com/image.png",
      },
      { name: "Bob Johnson", initials: "BJ", image: null },
      { name: "Alice Brown", initials: "AB", image: null },
    ];

    return (
      <div className="flex -space-x-2 p-4">
        {users.map((user, index) => (
          <Avatar key={index} className="border-2 border-white" {...props}>
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;

export const WithStatus = {
  render: (props) => (
    <div className="flex items-center gap-4 p-4">
      <div className="relative">
        <Avatar {...props}>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
      </div>
      <div className="relative">
        <Avatar {...props}>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 border-2 border-white"></div>
      </div>
      <div className="relative">
        <Avatar {...props}>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></div>
      </div>
    </div>
  ),
} satisfies StoryObj<typeof meta>;
