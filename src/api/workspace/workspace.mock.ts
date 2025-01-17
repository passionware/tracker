import { Workspace } from "@/api/workspace/workspace.api.ts";
import { faker } from "@faker-js/faker";
import { createMockFactory } from "@passionware/entities";

export const workspaceMock = createMockFactory<Workspace>(
  () => ({
    avatarUrl: faker.image.avatar(),
    slug: faker.lorem.slug(),
    name: faker.company.name(),
    id: faker.number.int(),
  }),
  [
    {
      id: 1,
      slug: "passionware",
      name: "Passionware Sp. z o.o.",
      avatarUrl:
        "https://passionware.eu/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.15435745.png&w=256&q=75",
    },
  ],
);
