import "./motion";
import { initGridPlates } from "./plates/grid";
import { initNodesPlates } from "./plates/nodes";
import { initLiquidPlates } from "./plates/liquid";
import { initScanPlates } from "./plates/scan";
import { initWavePlates } from "./plates/wave";

const controllers = [
  ...initGridPlates(),
  ...initNodesPlates(),
  ...initLiquidPlates(),
  ...initScanPlates(),
  ...initWavePlates(),
];

window.addEventListener(
  "pagehide",
  () => {
    controllers.forEach((controller) => controller.destroy());
  },
  { once: true },
);
