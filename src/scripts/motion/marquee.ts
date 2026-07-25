/**
 * Tech marquee: infinite drift that reacts to scroll velocity.
 *
 * The CSS @keyframes in TechMarquee.astro stays put as the no-JS and
 * reduced-motion fallback; when this module runs it kills the CSS animation
 * with an inline style and takes over, because a GSAP timeline is the only way
 * to modulate timeScale and skew per frame.
 *
 * The skew is a physics cue: the strip leans in the direction you scrolled and
 * relaxes back. quickSetter avoids allocating a tween on every frame.
 */
import { gsap, ScrollTrigger } from "./gsap";
import { compact, finePointer, reduced } from "./env";

const SKEW_CAP = 12;
const clampSkew = gsap.utils.clamp(-SKEW_CAP, SKEW_CAP);

export function initMarquee(): void {
  if (reduced) return;

  const track = document.querySelector<HTMLElement>(".marquee__track");
  const frame = track?.closest<HTMLElement>(".marquee");
  if (!track || !frame) return;

  track.style.animation = "none";

  // The track holds two identical copies, so -50% is exactly one loop.
  const loop = gsap.to(track, {
    xPercent: -50,
    duration: compact ? 56 : 40,
    ease: "none",
    repeat: -1,
  });

  const setSkew = gsap.quickSetter(track, "skewX", "deg");
  let velocity = 0;
  let skew = 0;

  ScrollTrigger.create({
    onUpdate: (self) => {
      velocity = self.getVelocity();
    },
  });

  /*
    Hover pause. The CSS `animation-play-state: paused` it replaces did nothing —
    this module kills the keyframes with an inline `animation: none` the moment it
    boots. Ramping timeScale is also the only version that reads as deceleration
    instead of a stall, but it has to be handed the variable exclusively: the
    ticker below writes timeScale every frame and would erase the tween.
  */
  let scrubTimeScale = true;
  const ramp = (to: number): void => {
    scrubTimeScale = false;
    gsap.to(loop, {
      timeScale: to,
      duration: 0.4,
      overwrite: true,
      onComplete: () => {
        scrubTimeScale = to === 1;
      },
    });
  };

  if (finePointer) {
    frame.addEventListener("pointerenter", () => ramp(0));
    frame.addEventListener("pointerleave", () => ramp(1));
  }

  gsap.ticker.add(() => {
    // Decay in the ticker rather than on scroll-stop: onUpdate stops firing the
    // moment scrolling ends, so the skew would otherwise freeze mid-lean.
    velocity *= 0.9;
    skew += (clampSkew(velocity / 400) - skew) * 0.12;
    setSkew(skew);
    if (scrubTimeScale) {
      loop.timeScale(Math.min(2.2, 1 + Math.abs(velocity) / 1200));
    }
  });

  // Don't burn frames on an off-screen strip.
  ScrollTrigger.create({
    trigger: frame,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      if (self.isActive) loop.play();
      else loop.pause();
    },
  });
}
