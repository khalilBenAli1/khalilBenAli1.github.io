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
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.locator('h1')).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator('[data-preloader]')).toHaveCount(0);
          await expect(page.locator('.frontend-demo')).toHaveCount(frontendProjects.length);

          const burger = page.locator('[data-nav-burger]');
          if (width < 1440) {
            const overlay = page.locator('[data-nav-overlay]');
            const work = page.locator('[data-nav-overlay-link][href="#work"]');
            await burger.click();
            await expect(burger).toHaveAttribute('aria-expanded', 'true');
            await expect(overlay).toBeVisible();
            // The original filtered-header bug made this 67px rather than the viewport height.
            await expect
              .poll(() => overlay.evaluate((el) => el.getBoundingClientRect().height))
              .toBe(height);
            await expect(work).toBeInViewport({ ratio: 1 });
            await expect(page.locator('[data-nav-close]')).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(overlay).toBeHidden();
            await expect(burger).toHaveAttribute('aria-expanded', 'false');
            await expect(burger).toBeFocused();

            await burger.click();
            await expect(work).toBeInViewport({ ratio: 1 });
            await work.click();
            await expect(overlay).toBeHidden();
            await expect(burger).toHaveAttribute('aria-expanded', 'false');
          } else {
            await expect(burger).toBeHidden();
            await page.locator('[data-nav-link="work"]').click();
          }

          await expect(page).toHaveURL(/#work$/);
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
      await page.goto(path);
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
    });
  }
});
