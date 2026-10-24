import { describe, expect, it } from "vitest";
import {
  enqueueNodePage,
  initialNodeCrawlState,
  nodeLeaseAvailable,
} from "./nodeCrawlState";
import { isPublicCrawlAddress } from "@/server/lib/audit/node-fetch";

describe("Node crawl boundaries", () => {
  it("queues only unique same-origin pages and rejects traps", () => {
    const state = initialNodeCrawlState("https://example.com/");
    for (const url of [
      "/page",
      "/page#part",
      "https://other.com/",
      "http://127.0.0.1/",
      "/search?q=1",
      "/photo.jpg",
    ]) {
      enqueueNodePage(state, url, "https://example.com", 1, false);
    }
    expect(state.pending.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/page",
    ]);
  });
  it("isolates state between projects", () => {
    const first = initialNodeCrawlState("https://a.com/");
    const second = initialNodeCrawlState("https://b.com/");
    enqueueNodePage(first, "/private-project-page", "https://a.com", 1, false);
    expect(second.seen).toEqual(["https://b.com/"]);
  });
  it("resumes expired leases but never active or malformed ones", () => {
    const crawl = initialNodeCrawlState("https://example.com/");
    crawl.leaseUntil = 100;
    expect(nodeLeaseAvailable(JSON.stringify({ crawl }), 99)).toBe(false);
    expect(nodeLeaseAvailable(JSON.stringify({ crawl }), 101)).toBe(true);
    expect(nodeLeaseAvailable("{}", 101)).toBe(false);
    expect(nodeLeaseAvailable("broken", 101)).toBe(false);
  });
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
  ])("blocks private address %s", (ip) => {
    expect(isPublicCrawlAddress(ip)).toBe(false);
  });
  it("allows public IP addresses", () => {
    expect(isPublicCrawlAddress("1.1.1.1")).toBe(true);
    expect(isPublicCrawlAddress("2606:4700:4700::1111")).toBe(true);
  });
});
