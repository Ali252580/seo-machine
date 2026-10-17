import { expect, it } from "vitest";
import { gscSiteMatchesProjectDomain as matches } from "./gscProjectSite";

it("accepts this project's URL and domain properties but rejects other sites", () => {
  expect(matches("https://www.example.com/", "example.com")).toBe(true);
  expect(matches("sc-domain:example.com", "example.com")).toBe(true);
  expect(matches("sc-domain:example.com", "blog.example.com")).toBe(false);
  expect(matches("https://other.example/", "example.com")).toBe(false);
  expect(matches("sc-domain:ample.com", "example.com")).toBe(false);
  expect(matches("not a url", "example.com")).toBe(false);
});
