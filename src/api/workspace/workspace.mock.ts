import { Workspace } from "@/api/workspace/workspace.api.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const workspaceMock = createMockFactory<Workspace>(
  () => ({
    avatarUrl: faker.image.avatar(),
    slug: faker.lorem.slug(),
    name: faker.company.name(),
    id: faker.number.int(),
    hidden: false,
  }),
  [
    {
      id: 0,
      slug: "passionware",
      name: "Passionware Sp. z o.o.",
      avatarUrl:
        "https://passionware.eu/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.15435745.png&w=256&q=75",
      hidden: false,
    },
    {
      id: 1,
      slug: "acme",
      name: "Acme Inc.",
      avatarUrl: "https://i.pravatar.cc/50?img=9",
      hidden: false,
    },
    {
      id: 2,
      slug: "codin",
      name: "Code Institute",
      avatarUrl: "https://i.pravatar.cc/50?img=8",
      hidden: false,
    },
    {
      id: 3,
      slug: "microsoft",
      name: "No Avatars LLC",
      avatarUrl: null,
      hidden: false,
    },
  ],
);
