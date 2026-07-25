/**
 * Scroll-linked transforms. Desktop only, and deliberately tiny — subtlety is
 * the whole difference between "depth" and "theme park".
 *
 *   hero exit          .hero__inner drifts up 6% and dims over the first 90vh
 *   [data-parallax]    element travels +/-6% of its own height across the
 *                      viewport; [data-parallax="10"] to override the amount
 *
 * Wrapped in gsap.matchMedia so the triggers are created on desktop and fully
 * reverted (inline transforms cleared) the moment the viewport goes narrow.
 */
import { gsap } from "./gsap";
import { DESKTOP, reduced } from "./env";

export function initScrollLinked(): void {
  if (reduced) return;

  const mm = gsap.matchMedia();

  mm.add(DESKTOP, () => {
    const hero = document.querySelector<HTMLElement>(".hero");
    const heroInner = hero?.querySelector<HTMLElement>(".hero__inner");

    if (hero && heroInner) {
      gsap.to(heroInner, {
        yPercent: -6,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: () => `+=${window.innerHeight * 0.9}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }

    gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
      const amount = Number(el.dataset.parallax) || 6;
      gsap.fromTo(
        el,
        { yPercent: amount },
        {
          yPercent: -amount,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    });
  });
}
