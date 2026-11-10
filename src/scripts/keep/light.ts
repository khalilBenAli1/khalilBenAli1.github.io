/**
 * Torchlight for the plaques on the wall.
 *
 * Everything in the keep is dark until someone carries a light to it. With a
 * mouse, the visitor's pointer is the torch: plaques near it are lit and the
 * rest fall back into shadow. On a touch screen the light sits in the middle of
 * the window, so plaques light as they are scrolled to. Each plaque gets
 * `--light` (0…1) and the torch position inside it (`--lx`, `--ly`); keep.css
 * turns those into brightness and a warm glow. Without this file every plaque
 * is simply fully lit.
 */
export interface Light {
  /** Recompute after the page has scrolled or been laid out again. */
  refresh(): void;
  setEnabled(enabled: boolean): void;
}

function ease(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

export function createLight(root: HTMLElement): Light {
  const plaques = [...root.querySelectorAll<HTMLElement>("[data-keep-lit]")];
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const torch = document.createElement("div");
  torch.className = "keep-torch";
  torch.setAttribute("aria-hidden", "true");
  root.append(torch);

  let enabled = false;
  let queued = false;
  let pointerX = 0;
  let pointerY = 0;
  let carrying = false;
  let atWall = false;

  function paint(): void {
    queued = false;
    if (!enabled) return;
    const view = window.innerHeight;
    const rects = plaques.map((plaque) => plaque.getBoundingClientRect());
    const withTorch = carrying && fine.matches;

    plaques.forEach((plaque, index) => {
      const rect = rects[index];
      if (rect.bottom < -200 || rect.top > view + 200) return;
      let light: number;
      let x: number;
      let y: number;
      if (withTorch) {
        const dx = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
        const dy = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
        light = 1 - ease(20, 380, Math.hypot(dx, dy));
        x = pointerX - rect.left;
        y = pointerY - rect.top;
      } else {
        const fromCentre = Math.abs((rect.top + rect.bottom) / 2 - view * 0.5);
        light = 1 - ease(view * 0.2, view * 0.66, fromCentre);
        x = rect.width / 2;
        y = Math.min(Math.max(view * 0.5 - rect.top, 0), rect.height);
      }
      plaque.style.setProperty("--light", light.toFixed(3));
      plaque.style.setProperty("--lx", `${x.toFixed(0)}px`);
      plaque.style.setProperty("--ly", `${y.toFixed(0)}px`);
    });

    /* The glow itself only shows against a wall; over open road it would
       read as a smudge on the scene. */
    torch.classList.toggle("is-carried", withTorch && atWall);
    if (withTorch) {
      torch.style.transform = `translate3d(${pointerX.toFixed(1)}px, ${pointerY.toFixed(1)}px, 0)`;
    }
  }

  function queue(): void {
    if (queued || !enabled) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  function clear(): void {
    torch.classList.remove("is-carried");
    for (const plaque of plaques) {
      plaque.style.removeProperty("--light");
      plaque.style.removeProperty("--lx");
      plaque.style.removeProperty("--ly");
    }
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      carrying = true;
      atWall = event.target instanceof Element && event.target.closest("[data-keep-wall]") !== null;
      queue();
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    carrying = false;
    queue();
  });

  return {
    refresh: queue,
    setEnabled(next) {
      if (next === enabled) return;
      enabled = next;
      if (enabled) queue();
      else clear();
    },
  };
}
