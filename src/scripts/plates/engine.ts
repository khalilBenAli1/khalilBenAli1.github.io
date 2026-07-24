export const PLATE_COLORS = {
  cobalt: "#2418F2",
  tint: "#DCDCFF",
  signal: "#FF4D1F",
} as const;

export interface PlateFrame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  inset: number;
  elapsed: number;
  delta: number;
  speed: number;
  intro: number;
  reducedMotion: boolean;
  colors: typeof PLATE_COLORS;
}

export interface PlateRenderer {
  render(frame: PlateFrame): void;
  staticTime?: number;
}

export interface PlateController {
  render(): void;
  destroy(): void;
}

const FRAME_INTERVAL = 1000 / 60;
const MAX_DELTA = 1 / 20;
const INTRO_SECONDS = 1.35;
const HOVER_SPEED = 1.5;

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function easeOutCubic(value: number): number {
  const inverse = 1 - clamp(value);
  return 1 - inverse * inverse * inverse;
}

export function easeInOutCubic(value: number): number {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(Math.max(0, radius), width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

export function initPlate(
  canvas: HTMLCanvasElement,
  renderer: PlateRenderer,
): PlateController {
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      render: () => undefined,
      destroy: () => undefined,
    };
  }

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let reducedMotion = reducedMotionQuery.matches;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let elapsed = reducedMotion ? (renderer.staticTime ?? 4.2) : 0;
  let intro = reducedMotion ? 1 : 0;
  let speed = 1;
  let targetSpeed = 1;
  let inViewport = typeof IntersectionObserver === "undefined";
  let revealed = inViewport;
  let frameRequest = 0;
  let lastTimestamp = 0;
  let destroyed = false;

  canvas.setAttribute("aria-hidden", "true");

  const resize = (): void => {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1));
    height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 1));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (delta = 0): void => {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.setLineDash([]);
    context.clearRect(0, 0, width, height);
    context.fillStyle = PLATE_COLORS.tint;
    context.fillRect(0, 0, width, height);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    renderer.render({
      ctx: context,
      width,
      height,
      inset: Math.min(width, height) * 0.12,
      elapsed,
      delta,
      speed,
      intro: reducedMotion ? 1 : easeOutCubic(intro),
      reducedMotion,
      colors: PLATE_COLORS,
    });
  };

  const requestFrame = (): void => {
    if (
      destroyed ||
      reducedMotion ||
      !inViewport ||
      frameRequest !== 0
    ) {
      return;
    }

    frameRequest = window.requestAnimationFrame(tick);
  };

  const tick = (timestamp: number): void => {
    frameRequest = 0;

    if (destroyed || reducedMotion || !inViewport) {
      lastTimestamp = 0;
      return;
    }

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
      draw(0);
      requestFrame();
      return;
    }

    const frameDuration = timestamp - lastTimestamp;
    if (frameDuration < FRAME_INTERVAL * 0.85) {
      requestFrame();
      return;
    }

    lastTimestamp = timestamp;
    const delta = Math.min(frameDuration / 1000, MAX_DELTA);
    speed = lerp(speed, targetSpeed, 1 - Math.exp(-delta * 7));
    elapsed += delta * speed;
    if (revealed && intro < 1) {
      intro = Math.min(1, intro + delta / INTRO_SECONDS);
    }
    draw(delta);
    requestFrame();
  };

  const onPointerEnter = (): void => {
    targetSpeed = HOVER_SPEED;
  };

  const onPointerLeave = (): void => {
    targetSpeed = 1;
  };

  const onReveal = (): void => {
    if (revealed) {
      return;
    }
    revealed = true;
    lastTimestamp = 0;
    if (reducedMotion) {
      intro = 1;
      draw(0);
    } else {
      requestFrame();
    }
  };

  const onReducedMotionChange = (event: MediaQueryListEvent): void => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      if (frameRequest !== 0) {
        window.cancelAnimationFrame(frameRequest);
        frameRequest = 0;
      }
      elapsed = renderer.staticTime ?? 4.2;
      intro = 1;
      speed = 1;
      targetSpeed = 1;
      draw(0);
      return;
    }

    elapsed = 0;
    intro = revealed ? 1 : 0;
    lastTimestamp = 0;
    requestFrame();
  };

  resize();
  draw(0);

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          resize();
          draw(0);
        });
  resizeObserver?.observe(canvas);

  const intersectionObserver =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            inViewport = Boolean(entry?.isIntersecting);
            if (inViewport) {
              onReveal();
              lastTimestamp = 0;
              if (reducedMotion) {
                draw(0);
              } else {
                requestFrame();
              }
            } else if (frameRequest !== 0) {
              window.cancelAnimationFrame(frameRequest);
              frameRequest = 0;
              lastTimestamp = 0;
            }
          },
          { threshold: 0.08 },
        );
  intersectionObserver?.observe(canvas);

  canvas.addEventListener("pointerenter", onPointerEnter);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("plate:reveal", onReveal);
  reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  requestFrame();

  return {
    render: () => {
      resize();
      draw(0);
    },
    destroy: () => {
      destroyed = true;
      if (frameRequest !== 0) {
        window.cancelAnimationFrame(frameRequest);
      }
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("plate:reveal", onReveal);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
    },
  };
}

export function plateCanvases(
  root: ParentNode,
  selector: string,
): HTMLCanvasElement[] {
  return Array.from(root.querySelectorAll<HTMLCanvasElement>(selector));
}
