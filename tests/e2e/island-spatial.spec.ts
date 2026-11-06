import { expect, test, type Page } from 'playwright/test';
import type { SceneMetrics } from '../../src/lib/island/types';
import { destinationPosters, islandPosters } from '../../src/lib/island/posters';
import { t } from '../../src/lib/i18n';

// Explicit mobile-width 3D exercises the live low-power path on software CI.
test.use({
  viewport: { width: 600, height: 900 },
  contextOptions: { reducedMotion: 'no-preference' },
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

const nav = (page: Page, destination: string) =>
  page.locator(`nav[aria-label="Primary"] [data-island-nav="${destination}"]`);
const root = (page: Page) => page.locator('[data-island-root]');

async function metrics(page: Page): Promise<SceneMetrics> {
  return root(page).evaluate((element: HTMLElement) => {
    element.dispatchEvent(new Event('island:inspect'));
    return JSON.parse(element.dataset.islandMetrics!);
  });
}

async function ready(page: Page) {
  await expect(root(page)).toHaveAttribute('data-scene-status', 'ready', { timeout: 60_000 });
  await expect.poll(async () => {
    const value = await metrics(page);
    return value.bakedArchitecture && (value.enhancedReadyMs ?? 0) > 0;
  }, { timeout: 60_000 }).toBe(true);
  await expect(page.locator('[data-island-canvas]')).toBeVisible();
  expect((await metrics(page)).quality).toBe('low');
}

async function settled(page: Page) {
  await expect.poll(async () => (await metrics(page)).cameraMoving, { timeout: 20_000 }).toBe(false);
  return metrics(page);
}

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

test.describe('spatial rooms and live content (software Chromium)', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Software ANGLE is Chromium-specific.');
  test.setTimeout(120_000);

  test('rooms keep one canvas; project details and sector previews drive its exhibit', async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto('/?view=3d');
    await ready(page);
    const original = await page.locator('[data-island-canvas]').elementHandle();
    const homeZoom = (await settled(page)).cameraZoom!;

    for (const destination of ['about', 'experience', 'contact', 'work']) {
      await nav(page, destination).click();
      await expect(root(page)).toHaveAttribute('data-destination', destination);
      await expect(page.locator(`[data-island-panel="${destination}"]`)).toBeVisible();
      await expect(page.locator(`[data-island-place="${destination}"]`)).toBeVisible();
      expect((await settled(page)).cameraZoom).toBeGreaterThan(homeZoom);
      expect(await original!.evaluate(canvas => canvas.isConnected)).toBe(true);
      await expect(page.locator('[data-island-canvas]')).toHaveCount(1);
      await expect(page.locator('[data-island-canvas]')).toBeInViewport({ ratio: 0.95 });
    }
    const galleryZoom = (await metrics(page)).cameraZoom!;
    const sora = page.locator('[data-island-card="sora"]');
    await sora.locator('.island-project__details-link').click();
    await expect(page).toHaveURL(/#project-sora$/);
    await expect(root(page)).toHaveAttribute('data-selected-project', 'sora');
    await expect(sora).toBeFocused();
    await expect.poll(async () => (await metrics(page)).exhibitId).toBe('sora');
    expect((await settled(page)).cameraZoom).toBeGreaterThan(galleryZoom);
    expect(await original!.evaluate(canvas => canvas.isConnected)).toBe(true);

    await sora.getByRole('link', { name: 'Back to gallery', exact: true }).click();
    await expect(root(page)).toHaveAttribute('data-selected-project', '');
    await expect.poll(async () => (await metrics(page)).exhibitId).toBeNull();
    expect((await settled(page)).cameraZoom).toBeCloseTo(galleryZoom, 2);

    await page.locator('.island-gallery__filters [data-island-filter="beauty"]').click();
    await expect(root(page)).toHaveAttribute('data-sector', 'beauty');
    await expect(root(page)).toHaveAttribute('data-selected-project', '');
    await expect(page.locator('[data-island-card]:visible')).toHaveCount(2);
    await expect.poll(async () => (await metrics(page)).exhibitId).toBe('veyli-colour');
    // A sector chooses a display preview without entering the close project pose.
    expect((await settled(page)).cameraZoom).toBeCloseTo(galleryZoom, 2);
    await page.locator('.island-gallery__filters [data-island-filter="all"]').click();
    await expect(root(page)).toHaveAttribute('data-sector', 'all');
    await expect.poll(async () => (await metrics(page)).exhibitId).toBeNull();
    expect((await settled(page)).cameraZoom).toBeCloseTo(galleryZoom, 2);
    await original!.dispose();
    expect(errors).toEqual([]);
  });

  test('milestone preview, selection and reset stay aligned with keyboard/ARIA state', async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto('/?view=3d#experience');
    await ready(page);
    const roomZoom = (await settled(page)).cameraZoom!;
    const button = page.locator('[data-island-milestone="3"]');
    const entry = page.locator('[data-island-milestone-entry="3"]');
    const heading = page.locator('[data-island-panel="experience"] [data-island-heading]');
    await expect(button).toHaveAccessibleName(/nBold/);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.hover();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBe(3);
    expect((await settled(page)).cameraZoom).toBeCloseTo(roomZoom, 2);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await heading.hover();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBeNull();

    await button.focus();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBe(3);
    // Pointer preview must return to the keyboard-focused milestone on leave,
    // without converting either preview into a pressed/selected state.
    const alternate = page.locator('[data-island-milestone="2"]');
    await alternate.hover();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBe(2);
    await expect(button).toBeFocused();
    await heading.hover();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBe(3);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(alternate).toHaveAttribute('aria-pressed', 'false');
    await button.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(entry).toHaveAttribute('data-milestone-selected', '');
    expect((await settled(page)).cameraZoom).toBeGreaterThan(roomZoom);
    await heading.hover();
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBe(3);

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(entry).not.toHaveAttribute('data-milestone-selected', '');
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBeNull();
    expect((await settled(page)).cameraZoom).toBeCloseTo(roomZoom, 2);

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await nav(page, 'about').click();
    await expect(root(page)).toHaveAttribute('data-destination', 'about');
    await expect.poll(async () => (await metrics(page)).activeMilestone).toBeNull();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });

  test('direct project refresh and browser history restore the live display and close camera pose', async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto('/?view=3d#project-sora');
    await ready(page);
    await expect.poll(async () => (await metrics(page)).exhibitId).toBe('sora');
    const detailZoom = (await settled(page)).cameraZoom!;
    const card = page.locator('[data-island-card="sora"]');
    await expect(card).toHaveClass(/is-selected/);
    await page.reload();
    await ready(page);
    await expect(root(page)).toHaveAttribute('data-selected-project', 'sora');
    await expect.poll(async () => (await metrics(page)).exhibitId).toBe('sora');
    expect((await settled(page)).cameraZoom).toBeCloseTo(detailZoom, 2);
    const canvas = await page.locator('[data-island-canvas]').elementHandle();
    await card.getByRole('link', { name: 'Back to gallery', exact: true }).click();
    await expect.poll(async () => (await metrics(page)).exhibitId).toBeNull();
    expect((await settled(page)).cameraZoom).toBeLessThan(detailZoom);
    await page.goBack();
    await expect(root(page)).toHaveAttribute('data-selected-project', 'sora');
    await expect.poll(async () => (await metrics(page)).exhibitId).toBe('sora');
    expect((await settled(page)).cameraZoom).toBeCloseTo(detailZoom, 2);
    expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
    await canvas!.dispose();
    expect(errors).toEqual([]);
  });

  test('lite rooms retain readable controls and use available captured room posters without WebGL', async ({ page }) => {
    const errors = captureErrors(page);
    await page.addInitScript(() => {
      Reflect.set(window, '__spatialWebGLRequests', 0);
      const getContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: function (this: HTMLCanvasElement, ...args: unknown[]) {
          if (String(args[0]).startsWith('webgl'))
            Reflect.set(window, '__spatialWebGLRequests', Reflect.get(window, '__spatialWebGLRequests') + 1);
          return Reflect.apply(getContext, this, args);
        },
      });
    });
    await page.goto('/?view=lite');
    await expect(root(page)).toHaveAttribute('data-view', 'lite');
    for (const destination of ['work', 'about', 'experience', 'contact'] as const) {
      await nav(page, destination).click();
      await expect(page.locator(`[data-island-panel="${destination}"]`)).toBeVisible();
      await expect(page.locator(`[data-island-place="${destination}"]`)).toBeVisible();
      const poster = page.locator('[data-island-poster] img');
      await expect(poster).toBeVisible();
      await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      // The optional pose map is populated only by real scene captures. Until
      // then, the existing whole-island poster remains the intentional fallback.
      const expected = destinationPosters[destination]?.mobile ?? islandPosters.mobile;
      expect(await poster.evaluate((image: HTMLImageElement) => new URL(image.currentSrc).pathname)).toBe(expected);
      await expect(page.locator('.island-brand')).toBeInViewport({ ratio: 1 });
    }
    await expect(page.getByRole('link', { name: t('en').contact.email, exact: true })).toHaveAttribute('href', 'mailto:khalil.benali16121@gmail.com');
    expect(await page.evaluate(() => Reflect.get(window, '__spatialWebGLRequests'))).toBe(0);
    expect(errors).toEqual([]);
  });

});
