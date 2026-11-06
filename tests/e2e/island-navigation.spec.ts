import { test, expect, type Locator, type Page } from 'playwright/test';
import { homePath, t, type Locale } from '../../src/lib/i18n';
import { getIslandCopy } from '../../src/lib/island/copy';
import { PREFERENCE_KEY } from '../../src/lib/island/preferences';
import type { WorldDestination } from '../../src/lib/island/types';

const locales = ['en', 'fr', 'it'] as const;
const destinations = ['work', 'about', 'experience', 'contact'] as const;
const layouts = [
  { name: 'desktop', width: 1440, height: 1000, touch: false },
  { name: 'touch', width: 390, height: 844, touch: true },
] as const;

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function activate(control: Locator, touch: boolean) {
  if (touch) await control.tap();
  else await control.click();
}

async function keyboardActivate(page: Page, control: Locator) {
  // macOS WebKit uses Option-Tab for native traversal of all links and controls.
  const tab = Reflect.get(globalThis, 'process').platform === 'darwin' &&
    page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let step = 0; step < 40; step++) {
    if (await control.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press(tab);
  }
  await expect(control).toBeFocused();
  await page.keyboard.press('Enter');
}

async function bound(page: Page) {
  const root = page.locator('[data-island-root]');
  await expect(root).toHaveAttribute('data-bound', 'true');
  return root;
}

async function activeDestination(page: Page, destination: WorldDestination, locale: Locale, focused = false) {
  const copy = getIslandCopy(locale);
  const titles = { work: copy.gallery.title, about: copy.about.title,
    experience: copy.experience.title, contact: copy.contact.title };
  await expect(page.locator('[data-island-root]')).toHaveAttribute('data-destination', destination);
  const panel = page.locator(`[data-island-panel="${destination}"]`);
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-island-heading]')).toHaveText(titles[destination]);
  if (focused) await expect(panel.locator('[data-island-heading]')).toBeFocused();
  for (const other of destinations.filter((value) => value !== destination)) {
    await expect(page.locator(`[data-island-panel="${other}"]`)).toBeHidden();
  }
  await expect(page.locator(`nav[aria-label="Primary"] [data-island-nav="${destination}"]`))
    .toHaveAttribute('aria-current', 'page');
  const bounds = await page.evaluate(() => ({
    client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
  }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
  return panel;
}

async function assertPoster(page: Page) {
  const image = page.locator('[data-island-poster] img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement &&
    element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
  expect(await image.evaluate((element) => (element as HTMLImageElement).currentSrc)).toMatch(/\/island\//);
}

async function observeWebGL(page: Page, unavailable: boolean) {
  await page.addInitScript((forceUnavailable) => {
    Reflect.set(window, '__islandGlAttempts', 0);
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        if (String(args[0]).startsWith('webgl')) {
          Reflect.set(window, '__islandGlAttempts', Reflect.get(window, '__islandGlAttempts') + 1);
          if (forceUnavailable) return null;
        }
        return Reflect.apply(original, this, args);
      },
    });
  }, unavailable);
}

for (const layout of layouts) {
  test.describe(`island ${layout.name}`, () => {
    test.use({ viewport: { width: layout.width, height: layout.height },
      isMobile: layout.touch, hasTouch: layout.touch });

    for (const locale of locales) {
      test(`${locale} normal navigation and labelled places share routes and restore focus`, async ({ page }) => {
        // Exercise all four return trips and native keyboard traversal in one document.
        test.setTimeout(60_000);
        const errors = captureErrors(page);
        await page.goto(`${homePath(locale)}?view=lite`);
        const root = await bound(page);
        const copy = getIslandCopy(locale);
        for (const [index, destination] of destinations.entries()) {
          const link = page.locator(`nav[aria-label="Primary"] [data-island-nav="${destination}"]`);
          await expect(link).toHaveAttribute('href', `#${destination}`);
          await expect(link).toHaveAccessibleName(copy.destinations[destination]);
          await activate(link, layout.touch);
          await expect(page).toHaveURL(new RegExp(`#${destination}$`));
          const panel = await activeDestination(page, destination, locale, true);
          for (const alternate of locales) {
            await expect(page.locator(`[data-island-language="${alternate}"]`))
              .toHaveAttribute('href', `${homePath(alternate)}?view=lite#${destination}`);
          }
          if (index === 0) await activate(panel.getByRole('link', { name: copy.controls.home, exact: true }), layout.touch);
          else if (index === 1) await activate(panel.getByRole('link', {
            name: `${copy.controls.close} — ${copy.destinations[destination]}`, exact: true,
          }), layout.touch);
          else if (index === 2) await page.keyboard.press('Escape');
          else await activate(page.locator('nav[aria-label="Primary"] [data-island-nav="home"]'), layout.touch);
          await expect(root).toHaveAttribute('data-destination', 'home');
          await expect(link).toBeFocused();
          const hotspot = page.locator(`[data-island-hotspot="${destination}"]`);
          await expect(hotspot).toHaveAttribute('href', `#${destination}`);
          await expect(hotspot).toHaveAccessibleName(copy.destinations[destination]);
          if (layout.touch) await activate(hotspot, true);
          else await keyboardActivate(page, hotspot);
          await activeDestination(page, destination, locale, true);
          await page.keyboard.press('Escape');
          await expect(root).toHaveAttribute('data-destination', 'home');
          await expect(hotspot).toBeFocused();
        }
        expect(errors).toEqual([]);
      });
    }

    test('direct entry, refresh, browser history, legacy anchors and language links retain the route', async ({ page }) => {
      const errors = captureErrors(page);
      await page.goto('/?view=lite#experience');
      await bound(page);
      await activeDestination(page, 'experience', 'en');
      await page.reload();
      await bound(page);
      await activeDestination(page, 'experience', 'en');
      await activate(page.locator('nav[aria-label="Primary"] [data-island-nav="contact"]'), layout.touch);
      await activeDestination(page, 'contact', 'en', true);
      await page.goBack();
      await activeDestination(page, 'experience', 'en', true);
      await page.goForward();
      await activeDestination(page, 'contact', 'en', true);

      for (const [hash, destination] of [['frontend', 'work'], ['ai', 'about'], ['skills', 'about']] as const) {
        await page.goto(`/?view=lite&sector=beauty#${hash}`);
        await bound(page);
        await activeDestination(page, destination, 'en');
        await expect(page.locator(`#${hash}`)).toBeVisible();
      }
      for (const locale of ['fr', 'it'] as const) {
        const language = page.locator(`[data-island-language="${locale}"]`);
        await expect(language).toHaveAttribute('href', `${homePath(locale)}?view=lite&sector=beauty#skills`);
        await activate(language, layout.touch);
        await bound(page);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await activeDestination(page, 'about', locale);
        await expect(page).toHaveURL(`${new URL(homePath(locale), 'http://127.0.0.1:4192')}?view=lite&sector=beauty#skills`);
      }
      expect(errors).toEqual([]);
    });

    test('explicit light view shows the real island poster without attempting WebGL', async ({ page }) => {
      const errors = captureErrors(page);
      await observeWebGL(page, false);
      await page.goto('/?view=lite');
      const root = await bound(page);
      await expect(root).toHaveAttribute('data-view', 'lite');
      await expect(root).toHaveAttribute('data-scene-status', 'lite');
      await assertPoster(page);
      await expect(page.locator('[data-island-view]')).toHaveAccessibleName('Light view');
      expect(await page.evaluate(() => Reflect.get(window, '__islandGlAttempts'))).toBe(0);
      await activate(page.locator('nav[aria-label="Primary"] [data-island-nav="work"]'), layout.touch);
      await activeDestination(page, 'work', 'en', true);
      expect(errors).toEqual([]);
    });

    test('WebGL failure keeps the poster and all navigation usable without uncaught errors', async ({ page }) => {
      const errors = captureErrors(page);
      await observeWebGL(page, true);
      await page.goto('/?view=3d');
      const root = await bound(page);
      await expect(root).toHaveAttribute('data-scene-status', 'unsupported');
      await expect(root).toHaveAttribute('data-view', 'lite');
      await assertPoster(page);
      await expect(page.locator('[data-island-status]')).toHaveText(getIslandCopy('en').status.unsupported);
      expect(await page.evaluate(() => Reflect.get(window, '__islandGlAttempts'))).toBe(1);
      await activate(page.locator('nav[aria-label="Primary"] [data-island-nav="contact"]'), layout.touch);
      await activeDestination(page, 'contact', 'en', true);
      await expect(page.getByRole('link', { name: t('en').contact.email, exact: true })).toHaveAttribute('href', 'mailto:khalil.benali16121@gmail.com');
      await page.keyboard.press('Escape');
      await expect(root).toHaveAttribute('data-destination', 'home');
      expect(errors).toEqual([]);
    });
  });
}

test.describe('island motion preferences', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('system reduced motion is labelled, stops motion and responds to a runtime preference change', async ({ page }) => {
    const errors = captureErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?view=lite');
    const root = await bound(page);
    const button = page.locator('[data-island-motion]');
    await expect(root).toHaveAttribute('data-motion', 'off');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveAccessibleName('Reduced motion');
    await expect(button).toBeDisabled();
    await page.locator('nav[aria-label="Primary"] [data-island-nav="work"]').click();
    await activeDestination(page, 'work', 'en', true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(button).toBeEnabled();
    await expect(root).toHaveAttribute('data-motion', 'on');
    await expect(button).toHaveAccessibleName('Motion on');
    expect(errors).toEqual([]);
  });

  test('user motion-off is clearly labelled and persists after refresh', async ({ page }) => {
    const errors = captureErrors(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?view=lite');
    const root = await bound(page);
    const button = page.locator('[data-island-motion]');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(root).toHaveAttribute('data-motion', 'off');
    await expect(button).toHaveAccessibleName('Motion off');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PREFERENCE_KEY))
      .toEqual({ version: 1, view: 'auto', motion: 'off' });
    await page.reload();
    await bound(page);
    await expect(root).toHaveAttribute('data-motion', 'off');
    await expect(button).toHaveAccessibleName('Motion off');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });
});
