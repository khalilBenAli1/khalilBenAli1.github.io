/**
 * Capability flags for the motion layer. Read once at boot so every module
 * agrees on the same answer and we never pay for repeated matchMedia calls.
 */

const mq = (query: string): boolean => window.matchMedia(query).matches;

/** User asked for less motion: no Lenis, no preloader, no transforms. */
export const reduced = mq("(prefers-reduced-motion: reduce)");

/** Mouse/trackpad-class pointer. Gates cursor, magnetic and tilt. */
export const finePointer = mq("(hover: hover) and (pointer: fine)");

/** Touch/stylus. The custom cursor must never render here. */
export const coarsePointer = mq("(pointer: coarse)");

/** Nav's own breakpoint. Mobile keeps the motion simpler and slower. */
export const compact = mq("(max-width: 51.25rem)");

/** Scroll choreography (hero exit, [data-parallax]) is desktop-only. */
export const DESKTOP = "(min-width: 821px)";

/** Everything animated shares this trigger point. */
export const REVEAL_START = "top 82%";
