import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = process.argv[2] || "http://127.0.0.1:4196";
const directory = resolve("docs/island/qa");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1584, 992],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/?view=3d`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-island-root]")?.dataset.sceneStatus ===
        "ready",
      {},
      { timeout: 120000 },
    );
    await page.evaluate(() => document.fonts.ready);
    const data = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const root = document.querySelector("[data-island-root]");
          const stage = document.querySelector("[data-island-stage]");
          stage.addEventListener(
            "island:frame",
            () => {
              const canvas = document.querySelector("[data-island-canvas]");
              const gl = canvas.getContext("webgl2");
              const debug = gl.getExtension("WEBGL_debug_renderer_info");
              root.dispatchEvent(new Event("island:inspect"));
              resolve({
                png: canvas.toDataURL("image/png"),
                metrics: JSON.parse(root.dataset.islandMetrics),
                renderer: debug
                  ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                  : gl.getParameter(gl.RENDERER),
              });
            },
            { once: true },
          );
        }),
    );
    const bytes = Buffer.from(data.png.split(",")[1], "base64");
    const png = resolve(directory, `scene-${name}.png`);
    await writeFile(png, bytes);
    const delivery = resolve(`public/island/island-${name}.webp`);
    execFileSync("python3", [
      "-c",
      "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2],quality=90,method=6)",
      png,
      delivery,
    ]);
    await page.locator("[data-island-motion]").click();
    await page.screenshot({
      path: resolve(directory, `${name}-current.png`),
      fullPage: name === "mobile",
    });
    results.push({
      name,
      viewport: [width, height],
      renderer: data.renderer,
      metrics: data.metrics,
      errors,
      poster: `public/island/island-${name}.webp`,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    });
    await context.close();
  }
  await writeFile(
    resolve(directory, "capture-metrics.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
