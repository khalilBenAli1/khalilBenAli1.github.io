import { expect, test, type Page } from 'playwright/test';
import type { SceneMetrics } from '../../src/lib/island/types';

// Linux CI cannot assume a physical GPU. These tests exercise actual WebGL2
// rendering through software ANGLE, while the ordinary suite covers WebKit HTML.
test.use({
  viewport: { width: 850, height: 900 },
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

test.describe('real WebGL scene lifecycle (software Chromium)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Software ANGLE is Chromium-specific.');
  test.setTimeout(120_000);

  async function metrics(page: Page): Promise<SceneMetrics> {
    return page.locator('[data-island-root]').evaluate((root: HTMLElement) => {
      root.dispatchEvent(new Event('island:inspect'));
      return JSON.parse(root.dataset.islandMetrics!);
    });
  }

  async function ready(page: Page) {
    await expect(page.locator('[data-island-root]')).toHaveAttribute('data-scene-status', 'ready', { timeout: 60_000 });
    await expect(page.locator('[data-island-canvas]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect.poll(async () => (await metrics(page)).frames, { timeout: 20_000 }).toBeGreaterThan(1);
  }

  async function frozenFrames(page: Page) {
    await expect.poll(async () => (await metrics(page)).loopActive, { timeout: 20_000 }).toBe(false);
    const before = await metrics(page);
    // A bounded observation window verifies that an idle loop really stays idle.
    await page.waitForTimeout(400);
    expect((await metrics(page)).frames).toBe(before.frames);
    return before;
  }

  test('renders geometry, freezes for motion/visibility/offscreen, and resumes once', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?view=3d');
    await ready(page);
    const initial = await metrics(page);
    expect(initial.quality).toBe('high');
    expect(initial.drawCalls).toBeGreaterThan(10);
    expect(initial.triangles).toBeGreaterThan(10_000);
    expect(initial.textures).toBeGreaterThan(3);
    const renderer = await page.locator('[data-island-canvas]').evaluate((canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext('webgl2')!;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
        vendor: gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR),
      };
    });
    const cadence = await page.evaluate(async () => {
      const stage = document.querySelector('[data-island-stage]')!;
      let submissions = 0;
      const count = () => { submissions++; };
      stage.addEventListener('island:frame', count);
      const started = performance.now();
      await new Promise(resolve => setTimeout(resolve, 2000));
      stage.removeEventListener('island:frame', count);
      const elapsedMs = performance.now() - started;
      return { submissions, elapsedMs, submissionsPerSecond: submissions * 1000 / elapsedMs };
    });
    await testInfo.attach('renderer-and-startup.json', {
      body: JSON.stringify({ renderer, initial, cadence,
        note: 'Software rendering. renderCpuMs measures CPU submission, and cadence counts scene submissions; neither is a hardware GPU FPS claim.',
      }, null, 2),
      contentType: 'application/json',
    });

    const motion = page.locator('[data-island-motion]');
    await motion.click();
    await expect(motion).toHaveAttribute('aria-pressed', 'false');
    const stopped = await frozenFrames(page);
    await motion.click();
    await expect.poll(async () => (await metrics(page)).frames, { timeout: 20_000 }).toBeGreaterThan(stopped.frames);
    const resumed = await metrics(page);
    expect(resumed.schedulerStarts).toBe(stopped.schedulerStarts + 1);
    await page.waitForTimeout(400);
    expect((await metrics(page)).schedulerStarts).toBe(resumed.schedulerStarts);

    // Deterministically exercise the document-visibility event contract. Browser
    // background throttling itself is not presented as application evidence.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hidden = await frozenFrames(page);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await metrics(page)).frames, { timeout: 20_000 }).toBeGreaterThan(hidden.frames);
    expect((await metrics(page)).schedulerStarts).toBe(hidden.schedulerStarts + 1);

    // The wide layout deliberately keeps its island sticky beside the gallery.
    // The stacked tablet layout can genuinely scroll the scene offscreen.
    await page.setViewportSize({ width: 850, height: 900 });
    await page.locator('nav[aria-label="Primary"] [data-island-nav="work"]').click();
    await expect(page.locator('[data-island-panel="work"]')).toBeVisible();
    await page.locator('[data-island-card]').last().scrollIntoViewIfNeeded();
    await expect.poll(async () => page.locator('[data-island-canvas]').evaluate(canvas => canvas.getBoundingClientRect().bottom)).toBeLessThan(-80);
    const offscreen = await frozenFrames(page);
    await page.locator('.island-brand').click();
    await expect(page).toHaveURL(/#home$/);
    await expect.poll(async () => (await metrics(page)).frames, { timeout: 20_000 }).toBeGreaterThan(offscreen.frames);
    expect(errors).toEqual([]);
  });

  test('light-view switches lose old contexts and recreate one bounded scene', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // A narrow viewport exercises the explicitly opted-in low-power 3D path.
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/?view=3d');
    await ready(page);
    await page.locator('[data-island-motion]').click();
    await frozenFrames(page);
    const initial = await metrics(page);
    expect(initial.quality).toBe('low');
    const view = page.locator('[data-island-view]');
    for (let iteration = 0; iteration < 2; iteration++) {
      const oldCanvas = await page.locator('[data-island-canvas]').elementHandle();
      const oldContext = await oldCanvas!.evaluateHandle((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!);
      await view.click();
      await expect(page.locator('[data-island-root]')).toHaveAttribute('data-view', 'lite');
      await expect.poll(async () => oldContext.evaluate(gl => gl.isContextLost())).toBe(true);
      expect((await metrics(page)).loopActive).toBe(false);
      await expect(page.locator('[data-island-poster] img')).toBeVisible();
      await view.click();
      await ready(page);
      await frozenFrames(page);
      expect(await oldCanvas!.evaluate(canvas => canvas.isConnected)).toBe(false);
      const recreated = await metrics(page);
      expect(recreated.geometries).toBeLessThanOrEqual(initial.geometries + 2);
      expect(recreated.loopActive).toBe(false);
      await expect(page.locator('[data-island-canvas]')).toHaveCount(1);
      await oldContext.dispose();
      await oldCanvas!.dispose();
    }
    await page.locator('nav[aria-label="Primary"] [data-island-nav="contact"]').click();
    await expect(page.locator('[data-island-panel="contact"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a lost GPU context falls back and can be explicitly retried', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/?view=3d');
    await ready(page);
    await page.locator('[data-island-canvas]').evaluate((canvas: HTMLCanvasElement) => {
      const lose = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context');
      if (!lose) throw new Error('Software WebGL must expose controlled context loss.');
      lose.loseContext();
    });
    await expect(page.locator('[data-island-root]')).toHaveAttribute('data-scene-status', 'lost');
    await expect(page.locator('[data-island-root]')).toHaveAttribute('data-view', 'lite');
    await expect(page.locator('[data-island-poster] img')).toBeVisible();
    await page.locator('nav[aria-label="Primary"] [data-island-nav="contact"]').click();
    await expect(page.locator('[data-island-panel="contact"]')).toBeVisible();
    await page.locator('.island-brand').click();
    await page.locator('[data-island-view]').click();
    await ready(page);
    expect(await page.locator('[data-island-canvas]').count()).toBe(1);
    expect(errors).toEqual([]);
  });
});
