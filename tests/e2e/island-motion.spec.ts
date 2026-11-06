import { test, expect, type Page } from "playwright/test";

const root = (page: Page) => page.locator("[data-island-root]");
const nav = (page: Page, destination: string) =>
  page.locator(`nav[aria-label="Primary"] [data-island-nav="${destination}"]`);
const settled = (page: Page) =>
  expect(root(page)).not.toHaveAttribute("data-transition", /.+/);

test.use({
  viewport: { width: 1440, height: 1000 },
  contextOptions: { reducedMotion: "no-preference" },
});

test("the world transitions into a section and returns home without losing focus or navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  const homeBounds = await page.locator("[data-island-stage]").boundingBox();
  const about = nav(page, "about");
  await about.click();
  await expect(root(page)).toHaveAttribute("data-transition", "world");
  await expect(root(page)).toHaveAttribute("data-destination", "about");
  await expect(page.locator("#about-title")).toBeFocused();
  await settled(page);
  const sectionBounds = await page.locator("[data-island-stage]").boundingBox();
  expect(sectionBounds!.width).toBeLessThan(homeBounds!.width);
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-transition", "world");
  await expect(root(page)).toHaveAttribute("data-destination", "home");
  await expect(about).toBeFocused();
  await settled(page);
  const restoredBounds = await page
    .locator("[data-island-stage]")
    .boundingBox();
  expect(Math.abs(restoredBounds!.width - homeBounds!.width)).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test("rapid navigation keeps the latest URL authoritative and browser history still works", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  await page.evaluate(() => {
    for (const destination of ["work", "about", "experience"])
      document
        .querySelector<HTMLAnchorElement>(
          `nav[aria-label="Primary"] [data-island-nav="${destination}"]`,
        )!
        .click();
  });
  await expect(page).toHaveURL(/#experience$/);
  await expect(root(page)).toHaveAttribute("data-destination", "experience");
  await expect(page.locator("#experience-title")).toBeFocused();
  await settled(page);
  await expect(page.locator("[data-island-panel]:visible")).toHaveCount(1);
  await page.goBack();
  await expect(root(page)).toHaveAttribute("data-destination", "about");
  await expect(page.locator("#about-title")).toBeFocused();
  await page.goForward();
  await expect(root(page)).toHaveAttribute("data-destination", "experience");
  await settled(page);
  expect(errors).toEqual([]);
});

test("the non-native fallback animates the same world and remains interruptible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  await nav(page, "work").click();
  await expect(root(page)).toHaveAttribute("data-destination", "work");
  expect(
    await page
      .locator("[data-island-stage]")
      .evaluate((element) => element.getAnimations().length),
  ).toBeGreaterThan(0);
  const scale = await page
    .locator("[data-island-stage]")
    .evaluate((element) => {
      const animation = element.getAnimations()[0];
      const transform = (animation.effect as KeyframeEffect).getKeyframes()[0]
        .transform as string;
      const matrix = new DOMMatrix(transform);
      return { x: matrix.a, y: matrix.d };
    });
  expect(Math.abs(scale.x - scale.y)).toBeLessThan(0.001);
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-destination", "home");
  await settled(page);
  expect(
    await page
      .locator("[data-island-stage]")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
});

test("live 3D navigation commits synchronously without asking for a native GPU snapshot", async ({
  page,
}) => {
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  const result = await page.evaluate(() => {
    const app = document.querySelector<HTMLElement>("[data-island-root]")!;
    let nativeCalls = 0;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: () => {
        nativeCalls++;
        throw new Error("A live canvas must not be snapshotted");
      },
    });
    // Exercise presentation routing independently of the real-WebGL lifecycle suite.
    app.dataset.view = "3d";
    document
      .querySelector<HTMLAnchorElement>(
        'nav[aria-label="Primary"] [data-island-nav="work"]',
      )!
      .click();
    return {
      nativeCalls,
      destination: app.dataset.destination,
      visible: !document.querySelector<HTMLElement>(
        '[data-island-panel="work"]',
      )!.hidden,
      focused: document.activeElement?.id,
      animations: document.querySelector("[data-island-stage]")!.getAnimations()
        .length,
    };
  });
  expect(result).toMatchObject({
    nativeCalls: 0,
    destination: "work",
    visible: true,
    focused: "work-title",
  });
  expect(result.animations).toBeGreaterThan(0);
  await settled(page);
});

test("a stalled native GPU snapshot cannot delay HTML navigation or replay a stale route", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-03T12:00:00Z") });
  await page.addInitScript(() => {
    const pending: { complete: () => Promise<void>; skips: number }[] = [];
    Reflect.set(window, "__islandPendingSnapshots", pending);
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void | Promise<void>) => {
        let resolveReady!: () => void;
        let resolveFinished!: () => void;
        let resolveUpdate!: () => void;
        const ready = new Promise<void>((resolve) => {
          resolveReady = resolve;
        });
        const finished = new Promise<void>((resolve) => {
          resolveFinished = resolve;
        });
        const updateCallbackDone = new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        });
        const snapshot = {
          skips: 0,
          async complete() {
            await update();
            resolveUpdate();
            resolveReady();
            resolveFinished();
          },
        };
        pending.push(snapshot);
        return {
          ready,
          finished,
          updateCallbackDone,
          skipTransition() {
            snapshot.skips++;
          },
        };
      },
    });
  });
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  await page.clock.pauseAt(new Date("2026-11-03T12:00:10Z"));
  await page.evaluate(() => {
    const events: string[] = [];
    Reflect.set(window, "__islandMotionRoutes", events);
    document
      .querySelector("[data-island-root]")!
      .addEventListener("island:route", (event) => {
        events.push((event as CustomEvent).detail.destination);
      });
    document
      .querySelector<HTMLAnchorElement>(
        'nav[aria-label="Primary"] [data-island-nav="work"]',
      )!
      .click();
  });
  await expect(root(page)).toHaveAttribute("data-destination", "home");
  // The native callback has deliberately never run; the bounded fallback must.
  await page.clock.runFor(250);
  await expect(root(page)).toHaveAttribute("data-destination", "work");
  await expect(page.locator("[data-island-panel=work]")).toBeVisible();
  await expect(page.locator("#work-title")).toBeFocused();
  expect(
    await page.evaluate(
      () => Reflect.get(window, "__islandPendingSnapshots")[0].skips,
    ),
  ).toBe(1);

  await page.evaluate(() =>
    document
      .querySelector<HTMLAnchorElement>(
        'nav[aria-label="Primary"] [data-island-nav="about"]',
      )!
      .click(),
  );
  await page.clock.runFor(250);
  await expect(root(page)).toHaveAttribute("data-destination", "about");
  await expect(page.locator("#about-title")).toBeFocused();
  // Both the obsolete callback and the current, already-committed callback arrive late.
  await page.evaluate(async () => {
    const pending = Reflect.get(window, "__islandPendingSnapshots");
    await pending[0].complete();
    await pending[1].complete();
  });
  await expect(page).toHaveURL(/#about$/);
  await expect(root(page)).toHaveAttribute("data-destination", "about");
  await expect(page.locator("[data-island-panel]:visible")).toHaveCount(1);
  expect(
    await page.evaluate(() => Reflect.get(window, "__islandMotionRoutes")),
  ).toEqual(["work", "about"]);
});

test("switching motion off during a pending transition commits the route and stops all movement", async ({
  page,
}) => {
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-bound", "true");
  await page.evaluate(() => {
    document
      .querySelector<HTMLAnchorElement>(
        'nav[aria-label="Primary"] [data-island-nav="contact"]',
      )!
      .click();
    document.querySelector<HTMLButtonElement>("[data-island-motion]")!.click();
  });
  await expect(page).toHaveURL(/#contact$/);
  await expect(root(page)).toHaveAttribute("data-destination", "contact");
  await expect(root(page)).toHaveAttribute("data-motion", "off");
  await expect(page.locator("#contact-title")).toBeFocused();
  await settled(page);
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-destination", "home");
  await settled(page);
  const talk = nav(page, "contact");
  await talk.hover();
  await expect(talk).toHaveCSS("transform", "none");
});

test("system reduced motion keeps section changes immediate and suppresses hover movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=lite");
  await expect(root(page)).toHaveAttribute("data-motion", "off");
  await nav(page, "about").click();
  await expect(root(page)).toHaveAttribute("data-destination", "about");
  await settled(page);
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-destination", "home");
  const talk = nav(page, "contact");
  await talk.hover();
  await expect(talk).toHaveCSS("transform", "none");
  await expect(talk.locator(".island-talk__icon")).toHaveCSS(
    "transform",
    "none",
  );
});
