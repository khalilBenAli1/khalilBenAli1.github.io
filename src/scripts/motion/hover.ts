/**
 * Pointer-follow interactions: magnetic elements and the hero photo tilt.
 *
 * Both are fine-pointer only and both are deliberately rationed — magnetism
 * applied to everything makes a page feel like jelly. Tag 2–4 elements, no
 * more: primary CTA, contact link, back-to-top.
 *
 *   [data-magnetic]        drifts up to 10px toward the pointer, springs back
 *   [data-magnetic-label]  optional inner element; counter-moves at 0.5x so
 *                          the label parallaxes inside its own button
 *   [data-tilt]            3D tilt toward the pointer (hero photo card)
 */
import { gsap } from "./gsap";
import { finePointer, reduced } from "./env";

const CAP = 10;
const cap = gsap.utils.clamp(-CAP, CAP);

export function initMagnetic(): void {
  if (reduced || !finePointer) return;

  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const label = el.querySelector<HTMLElement>("[data-magnetic-label]");
    const xTo = gsap.quickTo(el, "x", {
      duration: 0.4,
      ease: "power3",
      overwrite: "auto",
    });
    const yTo = gsap.quickTo(el, "y", {
      duration: 0.4,
      ease: "power3",
      overwrite: "auto",
    });
    const labelX = label
      ? gsap.quickTo(label, "x", {
          duration: 0.5,
          ease: "power3",
          overwrite: "auto",
        })
      : null;
    const labelY = label
      ? gsap.quickTo(label, "y", {
          duration: 0.5,
          ease: "power3",
          overwrite: "auto",
        })
      : null;

    el.addEventListener("pointermove", (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      const x = cap((event.clientX - rect.left - rect.width / 2) * 0.25);
      const y = cap((event.clientY - rect.top - rect.height / 2) * 0.35);
      xTo(x);
      yTo(y);
      // Counter-move: the label ends up travelling half as far as its frame.
      labelX?.(-x * 0.5);
      labelY?.(-y * 0.5);
    });

    el.addEventListener("pointerleave", () => {
      const spring = { duration: 0.9, ease: "elastic.out(1, 0.3)" } as const;
      gsap.to(el, { x: 0, y: 0, overwrite: "auto", ...spring });
      if (label) gsap.to(label, { x: 0, y: 0, overwrite: "auto", ...spring });
    });
  });
}

export function initTilt(): void {
  if (reduced || !finePointer) return;

  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rotX = gsap.quickTo(el, "rotationX", {
      duration: 0.6,
      ease: "power3",
    });
    const rotY = gsap.quickTo(el, "rotationY", {
      duration: 0.6,
      ease: "power3",
    });

    el.addEventListener("pointermove", (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      rotY(((event.clientX - rect.left) / rect.width - 0.5) * 12);
      rotX(-((event.clientY - rect.top) / rect.height - 0.5) * 12);
    });

    el.addEventListener("pointerleave", () => {
      rotX(0);
      rotY(0);
    });
  });
}
