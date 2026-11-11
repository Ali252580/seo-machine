import { Children, isValidElement, type ReactNode } from "react";
import type * as React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ContentClusterMap } from "./ContentClusterMap";
import type { ContentCluster } from "@/shared/contentClusters";

const mocks = vi.hoisted(() => ({
  states: [] as unknown[],
  setters: Array.from({ length: 6 }, () => vi.fn()),
  index: 0,
  data: {
    clusters: [] as ContentCluster[],
    pages: [] as { url: string; title: string }[],
    canManage: true,
  },
  mutate: vi.fn(),
  setQueryData: vi.fn(),
  save: vi.fn(),
  discover: vi.fn(),
  alternatives: [] as { url: string; title: string }[],
  discoveryOptions: null as unknown as {
    queryFn: () => Promise<unknown>;
    enabled: boolean;
  },
  options: null as unknown as {
    mutationFn: (clusters: ContentCluster[]) => Promise<unknown>;
    onSuccess: (result: { clusters: ContentCluster[] }) => void;
  },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useState: () => {
    const index = mocks.index++;
    return [mocks.states[index], mocks.setters[index]];
  },
  useRef: () => ({ current: null }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  useQuery: (options: {
    queryKey: string[];
    queryFn: () => Promise<unknown>;
    enabled: boolean;
  }) => {
    if (options.queryKey[0] === "clusterReplacementPages") {
      mocks.discoveryOptions = options;
      return { data: mocks.alternatives };
    }
    return { data: mocks.data };
  },
  useMutation: (options: typeof mocks.options) => {
    mocks.options = options;
    return { mutate: mocks.mutate, isPending: false };
  },
}));
vi.mock("@/serverFunctions/contentClusters", () => ({
  getContentClusters: vi.fn(),
  saveContentClusters: mocks.save,
  discoverClusterPages: mocks.discover,
}));
vi.mock("./ClusterPageDiscovery", () => ({ ClusterPageDiscovery: () => null }));

const cluster = {
  pillar: { url: "https://example.com/hub", title: "Hub" },
  pages: [{ url: "https://example.com/page", title: "Page" }],
};
beforeEach(() => {
  mocks.index = 0;
  mocks.alternatives = [];
  mocks.data = { clusters: [], pages: [], canManage: true };
  mocks.states = [
    [cluster.pillar, ...cluster.pages],
    cluster.pillar.url,
    null,
    [cluster.pages[0].url],
    null,
    "",
  ];
});

it("loads unfiltered site pages and saves a replacement outside the suggested group", async () => {
  const replacement = {
    url: "https://example.com/another-topic",
    title: "Different topic",
  };
  mocks.alternatives = [replacement];
  mocks.states[3] = [replacement.url];
  const button = findSave(ContentClusterMap({ projectId: "project-a" }));
  expect(mocks.discoveryOptions.enabled).toBe(true);
  await mocks.discoveryOptions.queryFn();
  expect(mocks.discover).toHaveBeenCalledWith({
    data: { projectId: "project-a", source: "sitemap", search: "" },
  });
  button!.onClick();
  expect(mocks.mutate).toHaveBeenCalledWith([
    { pillar: cluster.pillar, pages: [replacement] },
  ]);
});

function findSave(
  node: ReactNode,
  label = "ذخیرهٔ گروه در نقشه",
): { onClick: () => void; disabled: boolean } | undefined {
  if (
    !isValidElement<{
      children?: ReactNode;
      onClick: () => void;
      disabled: boolean;
    }>(node)
  )
    return;
  if (node.type === "button" && node.props.children === label)
    return node.props;
  for (const child of Children.toArray(node.props.children)) {
    const found = findSave(child, label);
    if (found) return found;
  }
}

it("saves the edited group immediately and retains the draft until success", async () => {
  const button = findSave(ContentClusterMap({ projectId: "project-a" }));
  expect(button?.disabled).toBe(false);
  button!.onClick();
  expect(mocks.setters[4]).toHaveBeenCalledWith([cluster]);
  expect(mocks.mutate).toHaveBeenCalledWith([cluster]);
  expect(mocks.setters[1]).not.toHaveBeenCalled();
  await mocks.options.mutationFn([cluster]);
  expect(mocks.save).toHaveBeenCalledWith({
    data: { projectId: "project-a", clusters: [cluster] },
  });
  mocks.options.onSuccess({ clusters: [cluster] });
  expect(mocks.setQueryData).toHaveBeenCalledWith(
    ["contentClusters", "project-a"],
    { canManage: true, clusters: [cluster], pages: [] },
  );
  expect(mocks.setters[4]).toHaveBeenLastCalledWith(null);
  expect(mocks.setters[1]).toHaveBeenCalledWith("");
});

it("blocks a twenty-first group but allows replacing a group in a full map", () => {
  mocks.states[4] = Array.from({ length: 20 }, (_, index) => ({
    ...cluster,
    pillar: { ...cluster.pillar, url: `https://example.com/hub-${index}` },
  }));
  const button = findSave(ContentClusterMap({ projectId: "project-a" }));
  expect(button?.disabled).toBe(false);
  button!.onClick();
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(mocks.setters[5]).toHaveBeenCalledWith(
    expect.stringContaining("۲۰ گروه"),
  );
  mocks.index = 0;
  mocks.states[2] = "https://example.com/hub-0";
  findSave(ContentClusterMap({ projectId: "project-a" }))!.onClick();
  expect(mocks.mutate).toHaveBeenCalledWith(expect.arrayContaining([cluster]));
});

it.each([
  [1, "", "پیلار"],
  [3, [], "حداقل یک"],
])(
  "explains incomplete selection instead of silently disabling save",
  (index, value, message) => {
    mocks.states[index as number] = value;
    const button = findSave(ContentClusterMap({ projectId: "project-a" }));
    expect(button?.disabled).toBe(false);
    button!.onClick();
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.setters[5]).toHaveBeenCalledWith(
      expect.stringContaining(message as string),
    );
  },
);

it("restores the manual picker from persisted pages after reopening", () => {
  mocks.states[0] = [];
  mocks.data.pages = [cluster.pillar, ...cluster.pages];
  findSave(ContentClusterMap({ projectId: "project-a" }))!.onClick();
  expect(mocks.mutate).toHaveBeenCalledWith([cluster]);
});

it("keeps saving disabled for viewers", () => {
  mocks.data.canManage = false;
  expect(
    findSave(ContentClusterMap({ projectId: "project-a" }))?.disabled,
  ).toBe(true);
});

it("saves the pending manual group from the main map save button", () => {
  const button = findSave(
    ContentClusterMap({ projectId: "project-a" }),
    "ذخیرهٔ نقشه",
  );
  expect(button?.disabled).toBe(false);
  button!.onClick();
  expect(mocks.mutate).toHaveBeenCalledWith([cluster]);
});
