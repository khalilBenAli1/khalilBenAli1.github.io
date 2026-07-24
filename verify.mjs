import { chromium } from "playwright";
import { mkdirSync } from "fs";

const SHOTS = new URL("./qa-shots", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:4321";

const browser = await chromium.launch({ channel: "chrome", headless: true });

const viewports = [
  { w: 390, h: 844, name: "mobile" },
  { w: 768, h: 1024, name: "tablet" },
  { w: 1440, h: 900, name: "laptop" },
  { w: 1920, h: 1080, name: "desktop" },
];

for (const v of viewports) {
  const page = await browser.newPage({
    viewport: { width: v.w, height: v.h },
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/home-${v.name}-top.png` });
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += window.innerHeight * 0.7) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 300));
    }
    window.scrollTo({ top: h, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 700));
  });
  await page.screenshot({
    path: `${SHOTS}/home-${v.name}-full.png`,
    fullPage: true,
  });
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  console.log(`${v.name} (${v.w}px): horizontal-scroll=${hasHScroll}`);
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1600);
await page.goto(BASE + "/resume/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${SHOTS}/resume-screen.png`, fullPage: true });
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: "/Users/khalilbenali/portfolio/public/KhalilBenAli-CV.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
});
console.log("CONSOLE ERRORS:", errors.length ? errors : "none");
await browser.close();
