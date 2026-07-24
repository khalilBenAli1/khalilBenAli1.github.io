import {
  clamp,
  createSeededRandom,
  easeInOutCubic,
  easeOutCubic,
  initPlate,
  plateCanvases,
  roundedRectPath,
  type PlateController,
  type PlateFrame,
  type PlateRenderer,
} from "./engine";

interface SplashParticle {
  offsetX: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  delay: number;
}

function wavePath(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  surfaceY: number,
  bottom: number,
  amplitude: number,
  frequency: number,
  phase: number,
): void {
  const steps = 56;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, surfaceY);

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = left + progress * (right - left);
    const y =
      surfaceY +
      Math.sin(progress * Math.PI * 2 * frequency + phase) * amplitude +
      Math.sin(progress * Math.PI * 4 - phase * 0.65) * amplitude * 0.26;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(right, bottom);
  ctx.closePath();
}

function surfaceStroke(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  surfaceY: number,
  amplitude: number,
  frequency: number,
  phase: number,
): void {
  const steps = 56;
  ctx.beginPath();

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = left + progress * (right - left);
    const y =
      surfaceY +
      Math.sin(progress * Math.PI * 2 * frequency + phase) * amplitude +
      Math.sin(progress * Math.PI * 4 - phase * 0.65) * amplitude * 0.26;
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function createLiquidRenderer(): PlateRenderer {
  const random = createSeededRandom(0x10fca11);
  const particles: SplashParticle[] = Array.from({ length: 11 }, (_, index) => ({
    offsetX: (random() - 0.5) * 15,
    velocityX: (random() - 0.5) * 52,
    velocityY: 42 + random() * 54,
    radius: 1.8 + random() * 1.8,
    delay: index * 0.035 + random() * 0.05,
  }));

  return {
    staticTime: 0.72,
    render(frame: PlateFrame): void {
      const { ctx, width, height, inset, elapsed, intro, colors } = frame;
      const availableWidth = width - inset * 2;
      const availableHeight = height - inset * 2;
      const glassWidth = Math.min(availableWidth * 0.58, availableHeight * 0.66);
      const glassHeight = availableHeight;
      const glassLeft = (width - glassWidth) / 2;
      const glassTop = inset;
      const glassBottom = glassTop + glassHeight;
      const radius = Math.min(22, glassWidth * 0.12);
      const innerLeft = glassLeft + 5;
      const innerRight = glassLeft + glassWidth - 5;
      const innerBottom = glassBottom - 5;

      const eventTime = elapsed % 6;
      let pourLift = 0;
      if (eventTime < 0.85) {
        pourLift = easeInOutCubic(eventTime / 0.85);
      } else if (eventTime < 2.5) {
        pourLift = 1 - easeInOutCubic((eventTime - 0.85) / 1.65) * 0.72;
      } else if (eventTime < 4.8) {
        pourLift = 0.28 * (1 - easeOutCubic((eventTime - 2.5) / 2.3));
      }

      const baselineSurface = glassTop + glassHeight * 0.4;
      const targetSurface = baselineSurface - glassHeight * 0.065 * pourLift;
      const visibleSurface = glassBottom - (glassBottom - targetSurface) * intro;
      const waveScale = clamp(intro * 1.3);
      const phase = elapsed * 1.05;

      ctx.save();
      roundedRectPath(
        ctx,
        glassLeft + 3,
        glassTop + 3,
        glassWidth - 6,
        glassHeight - 6,
        Math.max(4, radius - 3),
      );
      ctx.clip();

      ctx.fillStyle = colors.cobalt;
      ctx.globalAlpha = 0.2;
      wavePath(
        ctx,
        innerLeft,
        innerRight,
        visibleSurface + 8,
        innerBottom,
        7 * waveScale,
        1.35,
        phase + 2.4,
      );
      ctx.fill();

      ctx.globalAlpha = 0.36;
      wavePath(
        ctx,
        innerLeft,
        innerRight,
        visibleSurface + 4,
        innerBottom,
        5.5 * waveScale,
        1.65,
        phase * 0.83 + 1.1,
      );
      ctx.fill();

      ctx.globalAlpha = 1;
      wavePath(
        ctx,
        innerLeft,
        innerRight,
        visibleSurface,
        innerBottom,
        4 * waveScale,
        1.2,
        phase * 0.7,
      );
      ctx.fill();

      const cremaDepth = Math.max(7, glassHeight * 0.035);
      ctx.fillStyle = colors.tint;
      ctx.globalAlpha = 1;
      wavePath(
        ctx,
        innerLeft,
        innerRight,
        visibleSurface,
        Math.min(innerBottom, visibleSurface + cremaDepth),
        3.5 * waveScale,
        1.2,
        phase * 0.7,
      );
      ctx.fill();
      ctx.strokeStyle = colors.cobalt;
      ctx.lineWidth = 2;
      surfaceStroke(
        ctx,
        innerLeft,
        innerRight,
        visibleSurface,
        3.5 * waveScale,
        1.2,
        phase * 0.7,
      );
      ctx.restore();

      if (eventTime < 1.35 && intro > 0.7) {
        const streamProgress = easeOutCubic(clamp(eventTime / 0.28));
        const streamFade = 1 - easeInOutCubic(clamp((eventTime - 0.8) / 0.55));
        ctx.strokeStyle = colors.cobalt;
        ctx.globalAlpha = streamFade;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 + 6, glassTop);
        ctx.quadraticCurveTo(
          width / 2 - 5,
          glassTop + (visibleSurface - glassTop) * 0.46,
          width / 2,
          glassTop + (visibleSurface - glassTop) * streamProgress,
        );
        ctx.stroke();

        particles.forEach((particle) => {
          const age = eventTime - 0.44 - particle.delay;
          if (age <= 0 || age >= 0.82) {
            return;
          }
          const x =
            width / 2 +
            particle.offsetX +
            particle.velocityX * age * 0.52;
          const y =
            visibleSurface -
            particle.velocityY * age +
            92 * age * age;
          ctx.fillStyle = colors.cobalt;
          ctx.globalAlpha = (1 - age / 0.82) * intro;
          ctx.beginPath();
          ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.globalAlpha = intro;
      ctx.strokeStyle = colors.cobalt;
      ctx.lineWidth = 2;
      roundedRectPath(ctx, glassLeft, glassTop, glassWidth, glassHeight, radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(glassLeft + radius * 0.7, glassTop + 6);
      ctx.lineTo(glassLeft + glassWidth - radius * 0.7, glassTop + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}

export function initLiquidPlate(canvas: HTMLCanvasElement): PlateController {
  return initPlate(canvas, createLiquidRenderer());
}

export function initLiquidPlates(
  root: ParentNode = document,
): PlateController[] {
  return plateCanvases(
    root,
    '[data-plate="liquid"], [data-plate-liquid]',
  ).map(initLiquidPlate);
}

