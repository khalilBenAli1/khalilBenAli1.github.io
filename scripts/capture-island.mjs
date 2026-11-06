import { launchCaptureBrowser } from "./capture-browser.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = process.argv[2] || "http://127.0.0.1:4196";
const directory = resolve("docs/island/qa");
await mkdir(directory, { recursive: true });
const browser = await launchCaptureBrowser(process.argv[3]);
const results = [];
const posters = [];
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
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${base}/?view=3d`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-island-root]")?.dataset.sceneStatus ===
        "ready",
      {},
      { timeout: 120000 },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const value=document.querySelector('[data-island-root]')?.getAttribute('data-island-metrics');
      return value && JSON.parse(value).bakedArchitecture === true;
    }, {}, {timeout:120000});
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
    await page.screenshot({
      path: resolve(directory, `${name}-current.png`),
      fullPage: name === "mobile",
    });
    if (errors.length) throw new Error(errors.join("\n"));
    const poster = `public/island/island-${name}.webp`;
    const deliveryBytes = await readFile(delivery);
    posters.push({
      name, delivery: poster, size: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
      bytes: deliveryBytes.length,
      sha256: createHash("sha256").update(deliveryBytes).digest("hex"),
      renderer: data.renderer, metrics: data.metrics,
      method: "Captured live WebGL framebuffer with transparent background and baked architecture.",
    });
    results.push({
      name,
      viewport: [width, height],
      renderer: data.renderer,
      metrics: data.metrics,
      errors,
      poster,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    });
    await context.close();
  }
  await writeFile(
    resolve(directory, "capture-metrics.json"),
    JSON.stringify(results, null, 2),
  );
  await writeFile(resolve("docs/island/SCENE_POSTERS.json"), JSON.stringify({ posters }, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
