import { chromium } from "playwright";
import { config } from "./config.mjs";

let browserPromise;

function getBrowser() {
  browserPromise ??= chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
    proxy: config.proxy,
  });
  return browserPromise;
}

function normalizeDigits(value) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

/** Scrapes Google result pages from a browser located in Iran. */
export async function scrapeGoogle({ query, language, device, depth }) {
  const browser = await getBrowser();
  const mobile = device === "mobile";
  const context = await browser.newContext({
    locale: language === "fa" ? "fa-IR" : language,
    timezoneId: "Asia/Tehran",
    geolocation: { latitude: 35.69439, longitude: 51.42151 },
    permissions: ["geolocation"],
    viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 },
    userAgent: mobile
      ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": `${language || "fa"},fa;q=0.9,en;q=0.7`,
    },
  });
  await context.addCookies([
    { name: "CONSENT", value: "YES+cb", domain: ".google.com", path: "/" },
  ]);

  const page = await context.newPage();
  const organicResults = [];
  const seen = new Set();
  const features = new Set(["organic"]);
  let totalResults;
  let pagesUsed = 0;

  try {
    for (let start = 0; start < depth; start += 10) {
      const url = new URL("https://www.google.com/search");
      url.searchParams.set("q", query);
      url.searchParams.set("hl", language || "fa");
      url.searchParams.set("gl", "ir");
      url.searchParams.set("num", "10");
      url.searchParams.set("start", String(start));
      url.searchParams.set("pws", "0");
      url.searchParams.set("filter", "0");

      await page.goto(url.toString(), {
        waitUntil: "domcontentloaded",
        timeout: 40_000,
      });
      pagesUsed += 1;
      const blocked = await page
        .locator("#captcha-form, form[action*='sorry']")
        .count();
      if (blocked) {
        throw new Error(
          "Google blocked this browser IP; configure an Iranian proxy",
        );
      }

      const pageData = await page.evaluate(() => {
        const rows = [];
        for (const anchor of document.querySelectorAll("#search a")) {
          const heading = anchor.querySelector("h3");
          if (!heading || !anchor.href) continue;
          rows.push({
            title: heading.textContent?.trim() || "",
            link: anchor.href,
          });
        }
        return {
          rows,
          stats: document.querySelector("#result-stats")?.textContent || "",
          ads: document.querySelectorAll("[data-text-ad], [data-rw]").length,
          shopping: document.querySelectorAll("[data-docid][data-pcu]")
            .length,
          local: document.querySelectorAll(
            "[data-local-attribute], [data-cid]",
          ).length,
          questions: document.querySelectorAll("[jsname='Cpkphb']").length,
        };
      });

      if (pageData.ads) features.add("ads");
      if (pageData.shopping) features.add("shopping");
      if (pageData.local) features.add("local");
      if (pageData.questions) features.add("people_also_ask");
      if (totalResults === undefined && pageData.stats) {
        const digits = normalizeDigits(pageData.stats).replace(/[^0-9]/g, "");
        if (digits) totalResults = Number(digits);
      }

      let newRows = 0;
      for (const row of pageData.rows) {
        if (seen.has(row.link)) continue;
        seen.add(row.link);
        organicResults.push({
          position: organicResults.length + 1,
          title: row.title,
          link: row.link,
        });
        newRows += 1;
        if (organicResults.length >= depth) break;
      }
      if (organicResults.length >= depth || newRows === 0) break;
    }
  } finally {
    await context.close();
  }

  return {
    search_metadata: { status: "Success" },
    search_information: { total_results: totalResults },
    organic_results: organicResults,
    serp_features: [...features],
    pages_used: pagesUsed,
  };
}

/** Closes Chromium during a graceful container shutdown. */
export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
}
