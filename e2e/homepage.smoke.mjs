// Run with: node e2e/homepage.smoke.mjs (uses installed Chrome, no backend).
import { createServer } from "vite";
import tailwind from "@tailwindcss/vite";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const server = await createServer({
  configFile: false,
  server: { host: "127.0.0.1", port: 0 },
  esbuild: { jsx: "automatic" },
  plugins: [
    tailwind(),
    {
      name: "homepage-fixture",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== "/") return next();
          res.setHeader("Content-Type", "text/html");
          res.end(
            '<html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/home-fixture.tsx"></script></html>',
          );
        });
      },
      resolveId(id) {
        if (id === "/home-fixture.tsx") return id;
      },
      load(id) {
        if (id === "/home-fixture.tsx")
          return `import React from 'react';import {createRoot} from 'react-dom/client';import '/src/client/styles/app.css';import {PublicHomePage} from '/src/client/features/home/PublicHomePage.tsx';createRoot(document.getElementById('root')).render(<PublicHomePage/>);`;
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await mkdir(".playwright-cli", { recursive: true });
  for (const theme of ["light", "dark"])
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(server.resolvedUrls.local[0]);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(
        (theme) => document.documentElement.setAttribute("data-theme", theme),
        theme,
      );
      await page.evaluate(() => document.fonts.ready);
      assert(
        await page
          .locator(".seo-home")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      );
      if (width === 375) {
        await page.locator(".seo-mobile-nav summary").click();
        await page
          .getByRole("navigation", { name: "منوی موبایل" })
          .getByText("از کجا شروع کنم؟")
          .click();
        assert(
          await page.locator(".seo-mobile-nav").evaluate((el) => !el.open),
        );
        await page.locator(".seo-mobile-nav summary").click();
        await page.keyboard.press("Escape");
        assert(
          await page.locator(".seo-mobile-nav").evaluate((el) => !el.open),
        );
      }
      await page
        .getByRole("button", { name: "ردیابی رتبه", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "روند دیده‌شدن صفحات را دنبال کنید" })
        .waitFor();
      await page
        .getByRole("button", { name: "عامل هوشمند SAM", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "داده‌ها را به قدم بعدی تبدیل کنید" })
        .waitFor();
      await page.locator(".seo-home").evaluate((el) => (el.scrollTop = 0));
      await page.screenshot({
        path: `.playwright-cli/home-${theme}-${width}.png`,
      });
    }
  console.log(
    "PASS: mobile menu, Escape, preview switching and no horizontal overflow across 4 sizes / 2 themes",
  );
} finally {
  await browser?.close();
  await server.close();
}
