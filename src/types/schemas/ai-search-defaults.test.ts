import { expect, it } from "vitest";
import { brandLookupInputSchema } from "./ai-search";

it("defaults new brand research to Iran and Persian", () => {
  expect(
    brandLookupInputSchema.parse({ projectId: "p", query: "brand" }),
  ).toMatchObject({ locationCode: 2364, languageCode: "fa" });
});

it("preserves an explicitly selected research market", () => {
  expect(
    brandLookupInputSchema.parse({
      projectId: "p",
      query: "brand",
      locationCode: 2840,
      languageCode: "en",
    }),
  ).toMatchObject({ locationCode: 2840, languageCode: "en" });
});
