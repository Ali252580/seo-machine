import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized, validateInput, validatePage } from "./search-policy.mjs";

test("missing secret never authorizes requests", () => {
  assert.equal(isAuthorized(undefined, undefined), false);
  assert.equal(isAuthorized("secret", "Bearer wrong"), false);
  assert.equal(isAuthorized("secret", "Bearer secret"), true);
});
test("invalid queries, devices, depth and unsupported local targeting are rejected", () => {
  for (const input of [
    null,
    {},
    { query: "x", depth: -1 },
    { query: "x", device: "tablet" },
    { query: "x", location: "Shiraz,Iran" },
  ]) {
    assert.throws(() => validateInput(input));
  }
  assert.equal(validateInput({ query: " سئو ", depth: 20 }).query, "سئو");
});
test("blocked, empty and repeated search pages are not successful rank checks", () => {
  assert.throws(() =>
    validatePage({ status: 429, blocked: false, rows: 10, newRows: 10 }),
  );
  assert.throws(() =>
    validatePage({ status: 200, blocked: true, rows: 0, newRows: 0 }),
  );
  assert.throws(() =>
    validatePage({ status: 200, blocked: false, rows: 0, newRows: 0 }),
  );
  assert.throws(() =>
    validatePage({ status: 200, blocked: false, rows: 10, newRows: 0 }),
  );
  assert.doesNotThrow(() =>
    validatePage({ status: 200, blocked: false, rows: 10, newRows: 10 }),
  );
});
