import { createServer } from "vite";
import tailwind from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";
// Run from the repository root: node scripts/check-location-select.mjs
const source = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LocationSelect} from '/src/client/components/LocationSelect.tsx';
import {Modal} from '/src/client/components/Modal.tsx';
import {ProjectMarketFields} from '/src/client/features/projects/ProjectMarketFields.tsx';
import '/src/client/styles/app.css';
function App() {
  const [value, setValue] = useState(2364);
  const [market, setMarket] = useState({locationCode: 2364, languageCode: 'fa'});
  if (location.hash === '#project') return <Modal maxWidth="max-w-md">
    <form className="space-y-4" onSubmit={event => event.preventDefault()}>
      <h2>پروژهٔ جدید</h2>
      <label className="flex flex-col gap-1.5 text-sm">نام<input className="input input-bordered w-full"/></label>
      <label className="flex flex-col gap-1.5 text-sm">دامنه<input className="input input-bordered w-full"/></label>
      <ProjectMarketFields value={market} onChange={setMarket}/>
      <button type="button">Other filter</button>
    </form>
  </Modal>;
  const fields = <div className="grid grid-cols-2 gap-2">
    <LocationSelect value={value} onChange={setValue}/><button>Other filter</button>
  </div>;
  return location.hash === '#modal'
    ? <Modal><div className="h-40 shrink-0"/>{fields}<div className="h-40 shrink-0"/></Modal>
    : <main className="p-4 pt-64">{fields}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const server = await createServer({
  configFile: false,
  resolve: { alias: { "@": path.resolve("src") } },
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
  esbuild: { jsx: "automatic" },
  plugins: [
    tailwind(),
    {
      name: "country-harness",
      configureServer(s) {
        s.middlewares.use((req, res, next) => {
          if (req.url === "/") {
            res.setHeader("Content-Type", "text/html");
            res.end(
              '<html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/country.tsx"></script></html>',
            );
          } else next();
        });
      },
      resolveId(id) {
        if (id === "/country.tsx") return id;
      },
      load(id) {
        if (id === "/country.tsx") return source;
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  for (const mode of ["", "#modal", "#project"]) {
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 480 });
      await page.goto("http://127.0.0.1:4198/" + mode);
      if (mode === "#project") {
        await page.getByRole("combobox").selectOption("en");
        await expect(page.getByRole("combobox")).toHaveValue("en");
      }
      await page.locator('[aria-haspopup="listbox"]').click();
      await page.getByPlaceholder("Search countries").waitFor();
      for (const height of [480, 250, 740]) {
        await page.setViewportSize({ width, height });
        await expect(async () => {
          const box = await page
            .getByRole("listbox")
            .locator("..")
            .boundingBox();
          assert(
            box.x >= 0 &&
              box.x + box.width <= width &&
              box.y >= 0 &&
              box.y + box.height <= height,
            "Country menu must fit viewport, including after resize",
          );
        }).toPass();
      }
      await page.getByPlaceholder("Search countries").fill("Canada");
      await page
        .getByRole("option")
        .getByRole("button", { name: "Canada", exact: true })
        .click();
      assert.equal(
        await page.locator('[aria-haspopup="listbox"]').innerText(),
        "Canada",
      );
      await page.locator('[aria-haspopup="listbox"]').click();
      await page.getByPlaceholder("Search countries").press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await page.locator('[aria-haspopup="listbox"]').click();
      await page.getByRole("button", { name: "Other filter" }).click();
      await expect(page.getByRole("listbox")).toHaveCount(0);
    }
  }
  console.log(
    "PASS: country menu bounds, viewport resize and selection on pages, modals and project market fields at 320/390/1280px",
  );
} finally {
  await browser?.close();
  await server.close();
}
