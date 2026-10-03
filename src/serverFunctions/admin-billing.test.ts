import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail } from "@/server/billing/platform-admin";

describe("platform admin allowlist", () => {
  it("matches comma-separated emails without case or whitespace sensitivity", () => {
    expect(
      isPlatformAdminEmail(
        "Chekad.Company@Gmail.com",
        "owner@example.com, chekad.company@gmail.com ",
      ),
    ).toBe(true);
    expect(isPlatformAdminEmail("other@example.com", undefined)).toBe(false);
  });
});
