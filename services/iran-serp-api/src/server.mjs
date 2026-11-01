import { createServer } from "node:http";
import { config } from "./config.mjs";
import { closeBrowser, scrapeGoogle } from "./google-scraper.mjs";
import { isAuthorized, validateInput } from "./search-policy.mjs";

if (!config.serviceSecret) throw new Error("SERVICE_SECRET is required");
let activeSearches = 0;

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Minimal HTTP surface consumed by the Vercel application. */
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, { ok: true });
  }
  if (request.method !== "POST" || request.url !== "/search") {
    return json(response, 404, { error: "Not found" });
  }
  if (!isAuthorized(config.serviceSecret, request.headers.authorization)) {
    return json(response, 401, { error: "Unauthorized" });
  }

  let input;
  try {
    input = validateInput(await readJson(request));
  } catch {
    return json(response, 400, {
      error:
        "Invalid search parameters; use Iran/Tehran, desktop or mobile and depth 10-100",
    });
  }
  if (activeSearches >= 2) {
    response.setHeader("Retry-After", "30");
    return json(response, 429, {
      error: "Search capacity reached; retry later",
    });
  }
  activeSearches += 1;
  try {
    const result = await scrapeGoogle(input);
    return json(response, 200, result);
  } catch (error) {
    console.error(error);
    return json(response, 503, {
      error: "Google results could not be verified; retry later",
    });
  } finally {
    activeSearches -= 1;
  }
}).listen(config.port, "0.0.0.0", () => {
  console.log(`Iran SERP API listening on ${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await closeBrowser();
    process.exit(0);
  });
}
