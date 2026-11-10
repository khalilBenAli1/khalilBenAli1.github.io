import { expect, test, type Page } from 'playwright/test';
import type { KeepMetrics } from '../../src/scripts/keep/scene';

const root = (page: Page) => page.locator('[data-keep-root]');

/* Linux CI cannot assume a physical GPU. These run real WebGL2 through software
   ANGLE; the suite above covers the interface in Chromium and WebKit. */
test.use({
  viewport: { width: 850, height: 620 },
  /* Same CSS layout and shaders, a quarter of the pixels to rasterise. */
  deviceScaleFactor: 0.5,
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

test.describe('real WebGL scene lifecycle (software Chromium)', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Software ANGLE is Chromium-specific.');
  test.setTimeout(120_000);

  const metrics = (page: Page): Promise<KeepMetrics> =>
    page.evaluate(() =>
      (window as unknown as { __keepScene: { metrics(): KeepMetrics } }).__keepScene.metrics());

  async function live(page: Page) {
    await expect(root(page)).toHaveAttribute('data-scene', 'live', { timeout: 60_000 });
    await expect.poll(async () => (await metrics(page)).frames, { timeout: 60_000 }).toBeGreaterThan(1);
  }

  const toEnd = (page: Page) =>
    page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));

  test('the keep renders cheaply and the camera walks the road as the page scrolls', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    /* Positive control for the light-view check in keep.spec.ts: this is the
       request that view must never make. */
    const sceneRequests: string[] = [];
    page.on('request', (request) => {
      if (/scene\.[\w-]+\.js$/.test(request.url())) sceneRequests.push(request.url());
    });
    await page.goto('/');
    await live(page);
    expect(sceneRequests).toHaveLength(1);
    await expect(page.locator('[data-keep-canvas]')).toHaveCSS('opacity', '1', { timeout: 15_000 });

    const start = await metrics(page);
    expect(start.drawCalls).toBeGreaterThan(0);
    expect(start.drawCalls, 'sky, stone, flames, embers and ash').toBeLessThanOrEqual(6);
    expect(start.triangles).toBeLessThan(20_000);
    expect(start.pixelRatio).toBeLessThanOrEqual(1.75);
    expect(start.cameraZ).toBeGreaterThan(20);
    expect(start.running).toBe(true);

    await toEnd(page);
    /* The signal fire stands at z -108; the road ends a few metres short of it. */
    await expect.poll(async () => (await metrics(page)).cameraZ, { timeout: 60_000 }).toBeLessThan(-100);
    const end = await metrics(page);
    expect(end.litFires, 'every fire on the road is lit by the end').toBeGreaterThan(start.litFires);
    /* Two at the gate, the signal fire and one per career entry at the least. */
    const entries = await page.locator('[data-keep-milestone]').count();
    expect(end.litFires).toBeGreaterThanOrEqual(3 + entries);
    expect(errors).toEqual([]);
  });

  test('switching motion off stops the frame loop but still follows the page', async ({ page }) => {
    await page.goto('/');
    await live(page);
    await page.locator('[data-keep-motion]').click();
    await expect.poll(async () => (await metrics(page)).running).toBe(false);
    const still = await metrics(page);
    await page.waitForTimeout(600);
    expect((await metrics(page)).frames, 'no frames while nothing changes').toBe(still.frames);

    await toEnd(page);
    await expect.poll(async () => (await metrics(page)).cameraZ).toBeLessThan(-100);
    const moved = await metrics(page);
    expect(moved.frames).toBeGreaterThan(still.frames);
    expect(moved.running).toBe(false);
  });

  test.describe('system reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('the scene is a still picture that changes only with the scroll position', async ({ page }) => {
      await page.goto('/');
      await live(page);
      await expect.poll(async () => (await metrics(page)).running).toBe(false);
      const still = await metrics(page);
      await page.waitForTimeout(600);
      expect((await metrics(page)).frames).toBe(still.frames);
      await toEnd(page);
      await expect.poll(async () => (await metrics(page)).cameraZ).toBeLessThan(-100);
    });
  });

  test('a lost graphics context leaves the whole portfolio readable', async ({ page }) => {
    await page.goto('/');
    await live(page);
    await page.locator('[data-keep-canvas]').evaluate((canvas: HTMLCanvasElement) => {
      canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(root(page)).toHaveAttribute('data-scene', 'unsupported');
    await expect(page.locator('[data-keep-canvas]')).toHaveCSS('opacity', '0');
    await page.locator('.keep-nav [data-keep-link="contact"]').click();
    await expect(page.locator('#contact-title')).toBeInViewport();
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });
});
