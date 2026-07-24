import {
  clamp,
  easeOutCubic,
  initPlate,
  plateCanvases,
  type PlateController,
  type PlateFrame,
  type PlateRenderer,
} from "./engine";

const BAR_COUNT = 48;

function spectrumValue(index: number, elapsed: number): number {
  const position = index / (BAR_COUNT - 1);
  const lowBand =
    Math.sin(elapsed * 2.1 + position * Math.PI * 2.4) * 0.24;
  const midBand =
    Math.sin(elapsed * 3.45 - position * Math.PI * 5.1 + 0.8) * 0.18;
  const highBand =
    Math.sin(elapsed * 5.2 + position * Math.PI * 9.2 + 2.2) * 0.1;
  const shape = Math.sin(position * Math.PI) * 0.38 + 0.22;
  return clamp(shape + lowBand + midBand + highBand, 0.09, 0.96);
}

function createWaveRenderer(): PlateRenderer {
  return {
    staticTime: 3.8,
    render(frame: PlateFrame): void {
      const { ctx, width, height, inset, elapsed, intro, colors } = frame;
      const drawingWidth = width - inset * 2;
      const drawingHeight = height - inset * 2;
      const baseline = height - inset;
      const envelope = clamp(
        0.64 +
          Math.sin(elapsed * 1.42) * 0.16 +
          Math.sin(elapsed * 0.54 + 1.7) * 0.1,
        0.38,
        0.9,
      );
      const points: Array<{ x: number; y: number }> = [];

      ctx.strokeStyle = colors.cobalt;
      ctx.fillStyle = colors.cobalt;
      ctx.lineWidth = 2;
      ctx.globalAlpha = clamp(intro * 1.4);
      ctx.beginPath();
      ctx.moveTo(inset, baseline);
      ctx.lineTo(width - inset, baseline);
      ctx.stroke();

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const position = index / (BAR_COUNT - 1);
        const x = inset + position * drawingWidth;
        const barIntro = easeOutCubic(
          clamp(intro * 1.32 - position * 0.32),
        );
        const level = spectrumValue(index, elapsed) * envelope;
        const barHeight =
          Math.max(3, drawingHeight * (0.08 + level * 0.74)) * barIntro;
        const top = baseline - barHeight;

        ctx.globalAlpha = 0.7 + level * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, baseline);
        ctx.lineTo(x, top);
        ctx.stroke();
        points.push({ x, y: top });
      }

      ctx.globalAlpha = clamp(intro * 1.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, index) => {
        const previous = points[Math.max(0, index - 2)] ?? point;
        const compensatedY = point.y * 0.72 + previous.y * 0.28 - 5;
        if (index === 0) {
          ctx.moveTo(point.x, compensatedY);
        } else {
          ctx.lineTo(point.x, compensatedY);
        }
      });
      ctx.stroke();

      const playhead = (elapsed * 0.085) % 1;
      const playheadX = inset + playhead * drawingWidth;
      ctx.globalAlpha = clamp(intro * 1.5);
      ctx.beginPath();
      ctx.arc(playheadX, baseline, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  };
}

export function initWavePlate(canvas: HTMLCanvasElement): PlateController {
  return initPlate(canvas, createWaveRenderer());
}

export function initWavePlates(
  root: ParentNode = document,
): PlateController[] {
  return plateCanvases(
    root,
    '[data-plate="wave"], [data-plate="audio"], [data-plate-wave]',
  ).map(initWavePlate);
}
