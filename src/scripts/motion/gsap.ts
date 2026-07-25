/**
 * Single GSAP entry point. Import gsap/ScrollTrigger/SplitText from HERE and
 * nowhere else: plugin registration and the site-wide motion signature are
 * side effects of this module, so importing the raw package would silently
 * skip them.
 *
 * D3 — one easing family, one duration family. If a tween needs a bespoke
 * bezier, the design is wrong, not the token.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

gsap.defaults({ ease: "expo.out", duration: 0.9 });

/** Stagger vocabulary — mirrors --dur-* / --ease-* in tokens.css. */
export const STAGGER = {
  chars: 0.012,
  lines: 0.05,
  cards: 0.09,
} as const;

export { gsap, ScrollTrigger, SplitText };
