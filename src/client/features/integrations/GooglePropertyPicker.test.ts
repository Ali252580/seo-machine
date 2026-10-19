import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { GooglePropertyPicker } from "./GooglePropertyPicker";

vi.mock("@/client/features/integrations/GoogleAccountRemovalDialog", () => ({
  GoogleAccountRemovalDialog: () => null,
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    // Open the picker while rendering on the server so its account list is testable.
    useState: (initial: unknown) =>
      typeof initial === "boolean" ? [true, () => {}] : react.useState(initial),
  };
});

const accounts = [
  {
    accountId: "unrelated",
    email: "unrelated@example.com",
    requiresReconnect: false,
    properties: [],
  },
  {
    accountId: "current",
    email: "current@example.com",
    requiresReconnect: false,
    properties: [],
  },
  {
    accountId: "eligible",
    email: "eligible@example.com",
    requiresReconnect: false,
    properties: [
      { id: "site-a", name: "https://site.example/", selectable: true },
    ],
  },
];

function render(selection: { accountId: string; propertyId: string } | null) {
  return renderToStaticMarkup(
    createElement(GooglePropertyPicker, {
      provider: "gsc",
      loading: false,
      error: false,
      accounts,
      selection,
      onSelect: () => {},
      onSave: () => {},
      saving: false,
      onRetry: () => {},
      onReconnect: () => {},
    }),
  );
}

it("hides unrelated empty Google accounts but keeps the selected empty account visible", () => {
  const unselected = render(null);
  expect(unselected).not.toContain(
    'role="group" aria-label="unrelated@example.com"',
  );
  expect(unselected).not.toContain(
    'role="group" aria-label="current@example.com"',
  );
  expect(unselected).toContain(
    'role="group" aria-label="eligible@example.com"',
  );

  const selected = render({ accountId: "current", propertyId: "missing" });
  expect(selected).not.toContain(
    'role="group" aria-label="unrelated@example.com"',
  );
  expect(selected).toContain('role="group" aria-label="current@example.com"');
  expect(selected).toContain("No properties available");
});
