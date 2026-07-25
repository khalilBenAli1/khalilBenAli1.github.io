/**
 * The uniform objects space.ts writes once per frame and every background
 * material reads. They are shared by reference, not copied, so one write in the
 * tick reaches the traces, the node marks and the wash together — which is what
 * keeps them from drifting out of step during a fade or a scroll burst.
 */
import type { IUniform } from "three";

export interface BgUniforms {
  /** 0..1 presence. Full in the hero, ~0.35 past it. All fading goes here. */
  uFade: IUniform<number>;
  /** 1..1.25 brightness lift from scroll speed. */
  uLift: IUniform<number>;
  /** Seconds since boot, clamped per frame. Drives the wash and the LEDs. */
  uTime: IUniform<number>;
  /** 0..1 lerped document progress. */
  uProg: IUniform<number>;
  /** 0..1 unsigned scroll speed. */
  uSpeed: IUniform<number>;
  /** World-unit Y parallax offset, scaled per vertex by the plane's weight. */
  uDrift: IUniform<number>;
  /** Device pixel ratio, so point sizes stay constant in CSS pixels. */
  uPx: IUniform<number>;
}

export type TraceUniforms = Pick<
  BgUniforms,
  "uFade" | "uLift" | "uTime" | "uDrift" | "uPx"
>;

export type AuroraUniforms = Pick<
  BgUniforms,
  "uFade" | "uTime" | "uProg" | "uSpeed"
>;
