// Isolated UI smoke test: node e2e/mobile-navigation.smoke.mjs (Chrome installed).
import { createServer } from "vite";
import tailwind from "@tailwindcss/vite";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const source = `import React, {useState,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {MobileSidebarDrawer} from '/src/client/layout/AppShellParts.tsx';
import {PortalMenu} from '/src/client/components/PortalMenu.tsx';
import '/src/client/styles/app.css';
function App(){const [open,setOpen]=useState(false); const close=useCallback(()=>setOpen(false),[]);
return <><button onClick={()=>setOpen(true)}>بازکردن منو</button><button>پس‌زمینه</button>
<div style={{position:'fixed',left:0,bottom:0}}><PortalMenu ariaLabel="عملیات لبه">{close=><li><button onClick={close}>گزینهٔ لبه</button></li>}</PortalMenu></div>
<MobileSidebarDrawer open={open} projectId="test-project" onClose={close}/></>}
createRoot(document.getElementById('root')).render(<App/>);`;
// Only sidebar data dependencies are stubbed; drawer and portal behavior are real.
const sidebar = `import React from 'react';
import {PortalMenu} from '/src/client/components/PortalMenu.tsx';
export function Sidebar({onClose}){return <div className="h-full w-60 bg-base-100 p-4">
<button onClick={onClose}>بستن پنل</button><PortalMenu ariaLabel="عملیات داخل منو">{close=><li><button onClick={close}>عملیات پروژه</button></li>}</PortalMenu><button>آخرین گزینه</button></div>}`;
const server = await createServer({
  configFile: false,
  server: { host: "127.0.0.1", port: 0 },
  esbuild: { jsx: "automatic" },
  plugins: [
    tailwind(),
    {
      name: "navigation-smoke-fixture",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== "/") return next();
          res.setHeader("Content-Type", "text/html");
          res.end(
            '<html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>',
          );
        });
      },
      resolveId(id) {
        if (id === "/fixture.tsx") return id;
        if (id === "@/client/components/Sidebar") return "/sidebar-fixture.tsx";
        if (id === "@/client/navigation/items") return "/items-fixture.js";
      },
      load(id) {
        if (id === "/fixture.tsx") return source;
        if (id === "/sidebar-fixture.tsx") return sidebar;
        if (id === "/items-fixture.js")
          return "export const dataforseoHelpLinkOptions={to:'/help'}";
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.goto(server.resolvedUrls.local[0]);
  const open = page.getByRole("button", { name: "بازکردن منو", exact: true });
  const dialog = page.getByRole("dialog", { name: "منوی پروژه" });
  await open.click();
  await dialog.waitFor();
  assert(await dialog.evaluate((el) => el.matches(":modal")));
  await page
    .getByRole("button", { name: "پس‌زمینه", includeHidden: true })
    .evaluate((el) => el.focus());
  assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    // Chromium may move focus to browser chrome between keyboard cycles.
    assert(
      await dialog.evaluate(
        (el) =>
          el.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    );
  }
  await page.getByRole("button", { name: "عملیات داخل منو" }).click();
  const option = page.getByRole("button", {
    name: "عملیات پروژه",
    exact: true,
  });
  await option.waitFor();
  assert(await option.evaluate((el) => !!el.closest("dialog")));
  await page.keyboard.press("Escape");
  assert(await dialog.isVisible());
  assert((await option.count()) === 0);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert(await open.evaluate((el) => el === document.activeElement));
  await open.click();
  await page.mouse.click(10, 350);
  await dialog.waitFor({ state: "hidden" });
  await open.click();
  await page.setViewportSize({ width: 1000, height: 700 });
  await dialog.waitFor({ state: "hidden" });
  for (const width of [320, 390, 1000]) {
    await page.setViewportSize({ width, height: 700 });
    await page.getByRole("button", { name: "عملیات لبه" }).click();
    const menu = page.locator("ul").filter({ hasText: "گزینهٔ لبه" });
    await menu.waitFor();
    const box = await menu.boundingBox();
    assert(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width &&
        box.y + box.height <= 700,
    );
    await page.keyboard.press("Escape");
  }
  console.log(
    "PASS: focus containment/restoration, nested portal, Escape, desktop resize and viewport edges",
  );
} finally {
  await browser?.close();
  await server.close();
}
