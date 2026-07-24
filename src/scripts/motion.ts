import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initHeroLoad(): void {
  const eyebrow = document.querySelector<HTMLElement>("[data-hero-eyebrow]");
  const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line]");
  const supporting = gsap.utils.toArray<HTMLElement>(
    "[data-hero-sub], [data-hero-meta]",
  );

  if (reducedMotion.matches) {
    gsap.fromTo(
      [eyebrow, ...lines, ...supporting].filter(Boolean),
      { opacity: 0 },
      { opacity: 1, duration: 0.35, stagger: 0.04, clearProps: "opacity" },
    );
    return;
  }

  const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });
  if (eyebrow) {
    timeline.fromTo(
      eyebrow,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 },
    );
  }
  timeline.fromTo(
    lines,
    { clipPath: "inset(100% 0 0 0)", yPercent: 24 },
    {
      clipPath: "inset(0% 0 0 0)",
      yPercent: 0,
      duration: 0.9,
      stagger: 0.08,
    },
    eyebrow ? "-=0.1" : 0,
  );
  timeline.fromTo(
    supporting,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.48, stagger: 0.06 },
    "-=0.52",
  );
}

function initRotatingWord(): void {
  const slot = document.querySelector<HTMLElement>("[data-hero-word]");
  if (!slot) return;

  const rawWords = slot.dataset.words ?? "[]";
  let words: string[] = [];
  try {
    const parsed = JSON.parse(rawWords) as unknown;
    words = Array.isArray(parsed)
      ? parsed.filter((word): word is string => typeof word === "string")
      : [];
  } catch {
    words = rawWords
      .split("|")
      .map((word) => word.trim())
      .filter(Boolean);
  }
  if (words.length < 2) return;

  let index = 0;

  const swapReduced = (): void => {
    index = (index + 1) % words.length;
    gsap.to(slot, {
      opacity: 0,
      duration: 0.14,
      onComplete: () => {
        slot.textContent = words[index];
        gsap.to(slot, { opacity: 1, duration: 0.14 });
      },
    });
  };

  const swapAnimated = (): void => {
    const outgoing = new SplitText(slot, { type: "chars" });
    gsap.to(outgoing.chars, {
      yPercent: 80,
      opacity: 0,
      filter: "blur(7px)",
      duration: 0.28,
      stagger: 0.02,
      ease: "power3.in",
      onComplete: () => {
        outgoing.revert();
        index = (index + 1) % words.length;
        slot.textContent = words[index];
        gsap.set(slot, { "--hero-wdth": 75 });
        const incoming = new SplitText(slot, { type: "chars" });
        gsap.fromTo(
          incoming.chars,
          { yPercent: -80, opacity: 0, filter: "blur(7px)" },
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.45,
            stagger: 0.02,
            ease: "power4.out",
            clearProps: "transform,opacity,filter",
            onComplete: () => incoming.revert(),
          },
        );
        gsap.to(slot, {
          "--hero-wdth": 100,
          duration: 0.58,
          ease: "power3.out",
        });
      },
    });
  };

  window.setInterval(
    () => (reducedMotion.matches ? swapReduced() : swapAnimated()),
    2800,
  );
}

function initScrollMotion(): void {
  const revealTargets = gsap.utils.toArray<HTMLElement>(
    ".work-row, [data-reveal]",
  );

  revealTargets.forEach((target) => {
    const canvas = target.querySelector<HTMLCanvasElement>("canvas[data-plate]");
    const reveal = (): void => {
      canvas?.dispatchEvent(new CustomEvent("plate:reveal"));
    };

    if (reducedMotion.matches) {
      gsap.fromTo(
        target,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.35,
          scrollTrigger: {
            trigger: target,
            start: "top 80%",
            once: true,
            onEnter: reveal,
          },
        },
      );
      return;
    }

    gsap.fromTo(
      target,
      { opacity: 0, y: 42 },
      {
        opacity: 1,
        y: 0,
        duration: 0.78,
        ease: "power3.out",
        scrollTrigger: {
          trigger: target,
          start: "top 80%",
          once: true,
          onEnter: reveal,
        },
      },
    );

    const plate = target.querySelector<HTMLElement>("[data-plate-container]");
    if (plate) {
      gsap.fromTo(
        plate,
        { yPercent: 2.5 },
        {
          yPercent: -2.5,
          ease: "none",
          scrollTrigger: {
            trigger: target,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      );
    }
  });
}

function initMagneticCtas(): void {
  if (reducedMotion.matches) return;

  document
    .querySelectorAll<HTMLElement>("[data-magnetic]")
    .forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const bounds = element.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 16;
        gsap.to(element, {
          x: x,
          y: y,
          duration: 0.24,
          ease: "power2.out",
        });
      });
      element.addEventListener("pointerleave", () => {
        gsap.to(element, { x: 0, y: 0, duration: 0.38, ease: "power3.out" });
      });
    });
}

function initCursorDot(): void {
  if (reducedMotion.matches || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  const dot = document.querySelector<HTMLElement>("[data-cursor-dot]");
  if (!dot) return;

  const setX = gsap.quickSetter(dot, "x", "px");
  const setY = gsap.quickSetter(dot, "y", "px");
  document.documentElement.classList.add("js-cursor-active");
  window.addEventListener("pointermove", (event) => {
    setX(event.clientX - 4);
    setY(event.clientY - 4);
  });
}

function initMotion(): void {
  initHeroLoad();
  initRotatingWord();
  initScrollMotion();
  initMagneticCtas();
  initCursorDot();
}

if (document.fonts?.ready) {
  void document.fonts.ready.then(initMotion);
} else {
  initMotion();
}
