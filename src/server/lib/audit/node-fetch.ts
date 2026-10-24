import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { isCrawlableUrl } from "./url-policy";

export function isPublicCrawlAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return false;
  // Only global unicast IPv6; reject mapped/tunnel/local addresses as well.
  if (family === 6 && !/^[23][0-9a-f]{3}:/i.test(address)) return false;
  if (family === 6 && /^(2002:|2001:(0:|db8:))/i.test(address)) return false;
  return isCrawlableUrl(`http://${family === 6 ? `[${address}]` : address}/`);
}

/** Resolve once and connect to the checked IP, so DNS rebinding cannot bypass validation. */
export async function nodeAuditFetch(raw: string): Promise<Response> {
  const url = new URL(raw);
  if (
    !isCrawlableUrl(raw) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443")
  ) {
    throw new Error("Unsafe crawl destination");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await Promise.race([
    lookup(hostname, { all: true }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("DNS timeout")), 5000);
      timer.unref();
    }),
  ]);
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicCrawlAddress(address))
  ) {
    throw new Error("Crawl destination is not public");
  }
  return new Promise((resolve, reject) => {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request(
      {
        hostname: addresses[0].address,
        family: addresses[0].family,
        servername: hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        agent: false,
        headers: {
          Host: url.host,
          "User-Agent": "OpenSEO-Audit/1.0",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) {
            req.destroy(new Error("Crawl response exceeds 2 MiB"));
          } else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (value !== undefined)
              headers.set(
                name,
                Array.isArray(value) ? value.join(", ") : value,
              );
          }
          const status = res.statusCode ?? 502;
          resolve(
            new Response(
              [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
              { status, headers },
            ),
          );
        });
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("Crawl request timeout")),
      15_000,
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}
