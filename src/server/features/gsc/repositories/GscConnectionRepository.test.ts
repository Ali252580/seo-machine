import { beforeEach, expect, it, vi } from "vitest";
import { GscConnectionRepository } from "./GscConnectionRepository";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => mocks.rows }),
        }),
      }),
    }),
  },
}));

beforeEach(() => {
  mocks.rows = [];
});

it("does not expose an older connection bound to another project's domain", async () => {
  mocks.rows = [
    {
      connection: { siteUrl: "https://first.example/", organizationId: "org" },
      domain: "second.example",
      organizationId: "org",
    },
  ];
  expect(await GscConnectionRepository.getByProjectId("second")).toBeNull();
  mocks.rows = [
    {
      connection: {
        siteUrl: "sc-domain:second.example",
        organizationId: "org",
      },
      domain: "second.example",
      organizationId: "org",
    },
  ];
  expect(await GscConnectionRepository.getByProjectId("second")).toMatchObject({
    siteUrl: "sc-domain:second.example",
  });
});
