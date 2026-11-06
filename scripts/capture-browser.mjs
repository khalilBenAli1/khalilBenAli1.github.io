import { chromium } from "playwright";

/** Keep software captures reproducible, with an explicit opt-in for Apple GPUs. */
export function launchCaptureBrowser(backend = "swiftshader") {
  if (!["metal", "swiftshader"].includes(backend))
    throw new Error("Choose metal or swiftshader for the capture backend.");
  return chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      `--use-angle=${backend}`,
      ...(backend === "swiftshader" ? ["--enable-unsafe-swiftshader"] : []),
    ],
  });
}
