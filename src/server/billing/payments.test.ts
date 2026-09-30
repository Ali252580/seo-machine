import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));
import { isValidUsdtTransfer, parseCreditPackage } from "./payments";

describe("billing payments", () => {
  it("accepts only configured packages and an exact TRC20 USDT transfer", () => {
    expect(parseCreditPackage(10).amountCredits).toBe(10_000);
    expect(() => parseCreditPackage(11)).toThrow();
    const transfer = {
      to: "wallet",
      value: "10000000",
      token_info: {
        address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        decimals: 6,
      },
    };
    expect(isValidUsdtTransfer(transfer, "wallet", 10)).toBe(true);
    expect(
      isValidUsdtTransfer({ ...transfer, to: "other" }, "wallet", 10),
    ).toBe(false);
  });
});
