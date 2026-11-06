/** Capture real room poses for the lightweight experience and visual QA. */
import { launchCaptureBrowser } from "./capture-browser.mjs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const base = process.argv[2] || "http://127.0.0.1:4194";
const output = resolve("docs/island/qa");
const rooms = resolve("public/island/rooms");
await mkdir(output, { recursive: true });
await mkdir(rooms, { recursive: true });
const browser = await launchCaptureBrowser(process.argv[3]);
const evidence = [];
try {
  for (const [device, width, height] of [
    ["desktop", 1584, 992],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${base}/?view=3d`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        JSON.parse(
          document
            .querySelector("[data-island-root]")
            ?.getAttribute("data-island-metrics") || "{}",
        ).bakedArchitecture === true,
      {},
      { timeout: 120000 },
    );
    for (const destination of ["work", "about", "experience", "contact"]) {
      await page
        .locator(`nav[aria-label="Primary"] [data-island-nav="${destination}"]`)
        .click();
      await page.waitForFunction(
        ({ destination }) => {
          const root = document.querySelector("[data-island-root]");
          const metrics = JSON.parse(
            root?.getAttribute("data-island-metrics") || "{}",
          );
          return (
            root?.getAttribute("data-destination") === destination &&
            !root.hasAttribute("data-transition") &&
            metrics.cameraMoving === false &&
            (destination !== "about" || metrics.studioPortraitReady)
          );
        },
        { destination },
        { timeout: 30000 },
      );
      const frame = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const stage = document.querySelector("[data-island-stage]");
            stage.addEventListener(
              "island:frame",
              () => {
                const root = document.querySelector("[data-island-root]");
                root.dispatchEvent(new Event("island:inspect"));
                const canvas = document.querySelector("[data-island-canvas]");
                const gl = canvas.getContext("webgl2");
                const info = gl.getExtension("WEBGL_debug_renderer_info");
                resolve({
                  png: canvas.toDataURL("image/png"),
                  renderer: gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
                  metrics: JSON.parse(root.getAttribute("data-island-metrics")),
                });
              },
              { once: true },
            );
          }),
      );
      const webp = resolve(rooms, `${destination}-${device}.webp`);
      execFileSync("python3", [
        "-c",
        "from PIL import Image; import io,sys; Image.open(io.BytesIO(sys.stdin.buffer.read())).save(sys.argv[1],quality=90,method=6)",
        webp,
      ], { input: Buffer.from(frame.png.split(",")[1], "base64") });
      const bytes = await readFile(webp);
      await page.screenshot({
        path: resolve(output, `spatial-${destination}-${device}.png`),
        fullPage: false,
      });
      if (errors.length) throw new Error(errors.join("\n"));
      evidence.push({
        destination,
        device,
        viewport: [width, height],
        poster: `/island/rooms/${destination}-${device}.webp`,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        metrics: frame.metrics,
        errors: [...errors],
        renderer: frame.renderer,
      });
    }
    await context.close();
  }
  await writeFile(
    resolve(output, "spatial-capture.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      evidence.map(({ metrics, ...item }) => ({
        ...item,
        zoom: metrics.cameraZoom,
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
