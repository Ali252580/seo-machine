import { createServer } from "node:http";
import { config } from "./config.mjs";
import { closeBrowser, scrapeGoogle } from "./google-scraper.mjs";

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

function isAuthorized(request) {
  return (
    !config.serviceSecret ||
    request.headers.authorization === `Bearer ${config.serviceSecret}`
  );
}

/** Minimal HTTP surface consumed by the Vercel application. */
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, { ok: true });
  }
  if (request.method !== "POST" || request.url !== "/search") {
    return json(response, 404, { error: "Not found" });
  }
  if (!isAuthorized(request)) {
    return json(response, 401, { error: "Unauthorized" });
  }

  try {
    const input = await readJson(request);
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (!query) return json(response, 400, { error: "query is required" });
    const depth = Math.max(
      10,
      Math.min(config.maxDepth, Number(input.depth) || config.maxDepth),
    );
    const result = await scrapeGoogle({
      query,
      depth,
      language: typeof input.language === "string" ? input.language : "fa",
      device: input.device === "mobile" ? "mobile" : "desktop",
    });
    return json(response, 200, result);
  } catch (error) {
    console.error(error);
    return json(response, 503, {
      error: error instanceof Error ? error.message : "Google scraping failed",
    });
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
