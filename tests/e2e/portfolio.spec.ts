import { test, expect } from 'playwright/test';
import { frontendProjects } from '../../src/lib/frontend-projects';

const locales = [
  { locale: 'en', path: '/' },
  { locale: 'fr', path: '/fr/' },
  { locale: 'it', path: '/it/' },
] as const;

for (const { locale, path } of locales) {
  for (const width of [390, 768, 1440]) {
    for (const reducedMotion of ['reduce', 'no-preference'] as const) {
      const height = width === 1440 ? 1000 : 844;
      test.describe(`${locale} / ${width}px / ${reducedMotion}`, () => {
        test.use({
          viewport: { width, height },
          isMobile: width < 1440,
          hasTouch: width < 1440,
          contextOptions: { reducedMotion },
        });

        test('Work navigation is pointer-reachable and Escape restores focus', async ({ page }) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(`${path}?view=lite`);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.locator('h1')).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator('[data-preloader]')).toHaveCount(0);
          await expect(page.locator('.frontend-demo')).toHaveCount(frontendProjects.length);
          const root = page.locator('[data-island-root]');
          await expect(root).toHaveAttribute('data-bound', 'true');
          const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
          // Navigation is now permanently visible on desktop and touch layouts.
          for (const destination of ['home', 'work', 'about', 'experience', 'contact']) {
            const link = nav.locator(`[data-island-nav="${destination}"]`);
            await expect(link).toHaveAttribute('href', `#${destination}`);
            await expect(link).toBeVisible();
            await expect(link).toBeInViewport({ ratio: 1 });
          }
          const work = nav.locator('[data-island-nav="work"]');
          if (width < 1440) await work.tap();
          else await work.click();
          await expect(page).toHaveURL(/#work$/);
          const panel = page.locator('[data-island-panel="work"]');
          await expect(panel).toBeVisible();
          await expect(panel.locator('[data-island-heading]')).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(page).toHaveURL(/#home$/);
          await expect(root).toHaveAttribute('data-destination', 'home');
          await expect(panel).toBeHidden();
          await expect(work).toBeFocused();
          await expect(work).toBeInViewport({ ratio: 1 });
          if (width < 1440) await work.tap();
          else await work.click();
          await expect(page).toHaveURL(/#work$/);
          await expect(panel.locator('[data-island-heading]')).toBeFocused();
          const dimensions = await page.evaluate(() => ({
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
          expect(errors).toEqual([]);
        });
      });
    }
  }
}

test.describe('typed frontend catalogue', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    contextOptions: { reducedMotion: 'reduce' },
  });

  for (const { locale, path } of locales) {
    test(`${locale} renders every project with its image and demo/source links`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${path}?view=lite#work`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('[data-island-root]')).toHaveAttribute('data-bound', 'true');
      const cards = page.locator('.frontend-demo');
      await expect(cards).toHaveCount(frontendProjects.length);
      for (const [index, project] of frontendProjects.entries()) {
        const card = cards.nth(index);
        await expect(card.getByRole('heading', { level: 4 })).toHaveText(project.name);
        await expect(card.locator('.frontend-demo__description')).toHaveText(
          project.description[locale],
        );
        await expect(card.locator('.frontend-demo__preview')).toHaveAttribute('href', project.demo);
        const links = card.locator('.frontend-demo__links a');
        await expect(links).toHaveCount(2);
        await expect(links.nth(0)).toHaveAttribute('href', project.demo);
        await expect(links.nth(1)).toHaveAttribute('href', project.source);
        const image = card.locator('img');
        await expect(image).toHaveAttribute('src', project.image);
        await expect(image).toHaveAttribute('alt', `${project.name} — ${project.sector[locale]}`);
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (el) =>
                el instanceof HTMLImageElement &&
                el.complete &&
                el.naturalWidth > 0 &&
                el.naturalHeight > 0,
            ),
          )
          .toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }
});
