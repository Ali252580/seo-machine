import { expect, it } from "vitest";
import { decodeGeneratedImage } from "./generatedImage";

it("checks generated image bytes before a WordPress upload", () => {
  expect(
    decodeGeneratedImage(
      btoa(String.fromCharCode(0xff, 0xd8, 0xff)),
      "image/jpeg",
    ),
  ).toHaveLength(3);
  expect(() => decodeGeneratedImage(btoa("<html>"), "image/jpeg")).toThrow();
  expect(() => decodeGeneratedImage("not-base64", "image/png")).toThrow();
});
