import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

async function captureAt(href: string) {
  const browser = {
    location: new URL(href),
    history: { state: null, replaceState: vi.fn() },
  };
  vi.stubGlobal("window", browser);
  const errors = await import("./googleLinkError");
  errors.captureGoogleLinkError();
  return { browser, errors };
}

describe("Google link error project scope", () => {
  it("shows a failed callback only in its originating project", async () => {
    const { browser, errors } = await captureAt(
      "https://example.com/p/project-a/settings/integrations?google_link_error=gsc&error=access_denied",
    );

    expect(errors.getGoogleLinkError("gsc", "project-a")).toEqual({
      code: "access_denied",
    });
    expect(errors.getGoogleLinkError("gsc", "project-b")).toBeNull();
    expect(errors.getGoogleLinkError("ga4", "project-a")).toBeNull();
    expect(browser.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      new URL("https://example.com/p/project-a/settings/integrations"),
    );
  });

  it("keeps onboarding errors on onboarding instead of a later project page", async () => {
    const { browser, errors } = await captureAt(
      "https://example.com/onboarding?step=gsc&google_link_error=gsc&error=access_denied",
    );

    expect(errors.getGoogleLinkError("gsc", "project-a")).toEqual({
      code: "access_denied",
    });
    browser.location = new URL("https://example.com/p/project-b");
    expect(errors.getGoogleLinkError("gsc", "project-b")).toBeNull();
  });
});
