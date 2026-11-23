import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock("./WordPressService", () => ({
  listWordPressPages: mocks.list,
  createWordPressDraft: mocks.create,
}));
import { createKeywordDraft } from "./createKeywordDraft";

beforeEach(() => vi.resetAllMocks());
it("does not create a draft if a matching page appears after the initial check", async () => {
  const existing = { id: 12, kind: "post" };
  mocks.list.mockResolvedValue([existing]);
  expect(
    await createKeywordDraft("p", "بام سبز", "عنوان", "متن", "slug", "post"),
  ).toEqual({ existing: true, page: existing });
  expect(mocks.list).toHaveBeenCalledWith("p", "بام سبز");
  expect(mocks.create).not.toHaveBeenCalled();
});
it("creates a draft only when the keyword check finds no related content", async () => {
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ existing: false, page: { id: 13 } });
  await createKeywordDraft("p", "بام سبز", "عنوان", "متن", "slug", "post");
  expect(mocks.create).toHaveBeenCalledWith(
    "p",
    "عنوان",
    "متن",
    "slug",
    "post",
  );
});
it("does not create a draft if the keyword check fails", async () => {
  mocks.list.mockRejectedValue(new Error("unavailable"));
  await expect(
    createKeywordDraft("p", "بام سبز", "عنوان", "متن", "slug", "post"),
  ).rejects.toThrow("unavailable");
  expect(mocks.create).not.toHaveBeenCalled();
});
