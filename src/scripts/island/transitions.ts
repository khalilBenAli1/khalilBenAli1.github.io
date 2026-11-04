import type { IslandRoute } from "../../lib/island/types";

type NativeTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone?: Promise<void>;
  skipTransition(): void;
};
type TransitionDocument = Document & {
  startViewTransition?: (
    update: () => void | Promise<void>,
  ) => NativeTransition;
};

/** One interruptible visual transition around the existing, synchronous URL state. */
export function createIslandTransitions(root: HTMLElement, stage: HTMLElement) {
  let revision = 0;
  let native: NativeTransition | null = null;
  let pendingUpdate: (() => void) | null = null;
  let snapshotTimer = 0;
  const animations = new Set<Animation>();
  let disposed = false;

  function clearSnapshotTimer(): void {
    clearTimeout(snapshotTimer);
    snapshotTimer = 0;
  }

  function track(animation: Animation): void {
    animations.add(animation);
    void animation.finished.then(
      () => animations.delete(animation),
      () => animations.delete(animation),
    );
  }

  function cancel(): void {
    clearSnapshotTimer();
    const pending = pendingUpdate;
    pendingUpdate = null;
    if (!disposed) pending?.();
    revision++;
    native?.skipTransition();
    native = null;
    for (const animation of animations) animation.cancel();
    animations.clear();
    delete root.dataset.transition;
  }

  function enter(route: IslandRoute): void {
    const container =
      route.destination === "home"
        ? root.querySelector<HTMLElement>(".island-hero__copy")
        : root.querySelector<HTMLElement>(
            `[data-island-panel="${route.destination}"]`,
          );
    if (!container || typeof container.animate !== "function") return;
    const selectors =
      route.destination === "home"
        ? ".island-eyebrow, h1, .island-hero__intro, .island-hero__actions"
        : ".island-panel__header, .island-panel__intro, .island-identity, .island-contact, .timeline__entry, [data-island-card]";
    const elements = [...container.querySelectorAll<HTMLElement>(selectors)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight + 80
        );
      })
      .slice(0, 7);
    if (!elements.length) elements.push(container);
    elements.forEach((element, index) => {
      track(
        element.animate(
          [
            { opacity: 0, transform: "translate3d(0, 24px, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: 650,
            delay: index * 45,
            easing: "cubic-bezier(.2,.75,.2,1)",
            fill: "backwards",
          },
        ),
      );
    });
  }

  function run(
    old: IslandRoute,
    next: IslandRoute,
    enabled: boolean,
    update: () => void,
  ): void {
    const visualBefore = stage.getBoundingClientRect();
    cancel();
    const token = revision;
    if (disposed || !enabled || document.hidden) {
      update();
      return;
    }
    const changedDestination = old.destination !== next.destination;
    let updated = false;
    const commit = (): void => {
      if (updated) return;
      updated = true;
      pendingUpdate = null;
      update();
    };
    pendingUpdate = commit;
    const transitionDocument = document as TransitionDocument;
    const before = visualBefore;
    root.dataset.transition = changedDestination ? "world" : "content";
    let nativeActive = false;
    let fallbackStarted = false;

    const fallback = (): void => {
      if (token !== revision || disposed || fallbackStarted) return;
      fallbackStarted = true;
      nativeActive = false;
      clearSnapshotTimer();
      const skipped = native;
      native = null;
      skipped?.skipTransition();
      commit();
      if (token !== revision || disposed) return;
      const after = stage.getBoundingClientRect();
      if (
        changedDestination &&
        typeof stage.animate === "function" &&
        before.width &&
        after.width
      ) {
        track(
          stage.animate(
            [
              {
                transformOrigin: "0 0",
                transform: `translate(${before.left - after.left}px, ${before.top + before.height / 2 - after.top - (after.height * (before.width / after.width)) / 2}px) scale(${before.width / after.width})`,
              },
              {
                transformOrigin: "0 0",
                transform: "translate(0, 0) scale(1, 1)",
              },
            ],
            { duration: 800, easing: "cubic-bezier(.22,.7,.18,1)" },
          ),
        );
      }
      enter(next);
      const running = [...animations].map((animation) =>
        animation.finished.catch(() => undefined),
      );
      void Promise.all(running).then(() => {
        if (token === revision) delete root.dataset.transition;
      });
    };

    // Snapshotting a live WebGL canvas can block the main thread itself, so a
    // timer cannot guarantee availability. Animate that live canvas with FLIP;
    // native snapshots are reserved for the lightweight poster presentation.
    if (
      changedDestination &&
      root.dataset.view !== "3d" &&
      transitionDocument.startViewTransition
    ) {
      try {
        nativeActive = true;
        const transition = transitionDocument.startViewTransition(() => {
          if (token !== revision || disposed) return;
          commit();
        });
        native = transition;
        // Capturing a busy WebGL surface can stall the native callback. HTML
        // navigation must not wait for that GPU snapshot to become available.
        snapshotTimer = window.setTimeout(() => {
          if (token !== revision || disposed) return;
          snapshotTimer = 0;
          if (!updated) fallback();
        }, 220);
        void transition.updateCallbackDone?.catch(() => undefined);
        void transition.ready.then(
          () => {
            if (token !== revision || disposed || !nativeActive) return;
            clearSnapshotTimer();
            enter(next);
          },
          () => {
            if (token === revision && !disposed && nativeActive) fallback();
          },
        );
        void transition.finished.then(
          () => {
            if (token === revision && nativeActive) {
              if (!updated) {
                fallback();
                return;
              }
              clearSnapshotTimer();
              native = null;
              delete root.dataset.transition;
            }
          },
          () => {
            if (token === revision && nativeActive) {
              if (!updated) {
                fallback();
                return;
              }
              clearSnapshotTimer();
              native = null;
              delete root.dataset.transition;
            }
          },
        );
        return;
      } catch {
        // Older implementations can expose the API but reject it synchronously.
      }
    }

    fallback();
  }

  return {
    run,
    cancel,
    dispose(): void {
      disposed = true;
      cancel();
    },
  };
}
