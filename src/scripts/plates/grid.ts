import {
  clamp,
  easeInOutCubic,
  initPlate,
  plateCanvases,
  roundedRectPath,
  type PlateController,
  type PlateFrame,
  type PlateRenderer,
} from "./engine";

const COLUMNS = 7;
const ROWS = 5;
const CELL_COUNT = COLUMNS * ROWS;
const POLICY_TILES = new Set([0, 8, 10, 16, 18, 24, 27, 30, 34]);

function createGridRenderer(): PlateRenderer {
  return {
    staticTime: 2.7,
    render(frame: PlateFrame): void {
      const { ctx, width, height, inset, elapsed, intro, colors } = frame;
      const availableWidth = width - inset * 2;
      const availableHeight = height - inset * 2;
      const gap = Math.max(5, Math.min(12, availableWidth * 0.018));
      const tileWidth = (availableWidth - gap * (COLUMNS - 1)) / COLUMNS;
      const tileHeight = (availableHeight - gap * (ROWS - 1)) / ROWS;
      const radius = Math.min(8, tileWidth * 0.18, tileHeight * 0.22);

      const pulseCycle = elapsed % 8.4;
      const pulseTravel = clamp((pulseCycle - 1.2) / 2.8);
      const pulseVisible =
        pulseCycle >= 1.2 && pulseCycle <= 4.7
          ? Math.sin(clamp((pulseCycle - 1.2) / 3.5) * Math.PI)
          : 0;

      ctx.strokeStyle = colors.cobalt;
      ctx.fillStyle = colors.cobalt;
      ctx.lineWidth = 2;

      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          const index = row * COLUMNS + column;
          const staggerStart = (index / (CELL_COUNT - 1)) * 0.48;
          const assembled = easeInOutCubic(
            clamp((intro - staggerStart) / 0.52),
          );
          if (assembled <= 0) {
            continue;
          }

          const x = inset + column * (tileWidth + gap);
          const y = inset + row * (tileHeight + gap);
          const centerX = x + tileWidth / 2;
          const centerY = y + tileHeight / 2;
          const rowDistance = Math.abs(row / (ROWS - 1) - pulseTravel);
          const isPolicyTile = POLICY_TILES.has(index);
          const highlight =
            isPolicyTile && rowDistance < 0.2
              ? pulseVisible * (1 - rowDistance / 0.2)
              : 0;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(0.72 + assembled * 0.28, 0.72 + assembled * 0.28);
          ctx.translate(-centerX, -centerY);
          ctx.globalAlpha = assembled;
          roundedRectPath(ctx, x, y, tileWidth, tileHeight, radius);
          ctx.stroke();

          if (highlight > 0.08) {
            ctx.globalAlpha = assembled * clamp(highlight * 1.35);
            roundedRectPath(
              ctx,
              x + 3,
              y + 3,
              tileWidth - 6,
              tileHeight - 6,
              Math.max(2, radius - 2),
            );
            ctx.fill();
          }
          ctx.restore();
        }
      }
    },
  };
}

export function initGridPlate(canvas: HTMLCanvasElement): PlateController {
  return initPlate(canvas, createGridRenderer());
}

export function initGridPlates(
  root: ParentNode = document,
): PlateController[] {
  return plateCanvases(
    root,
    '[data-plate="grid"], [data-plate-grid]',
  ).map(initGridPlate);
}

