import { expect, test, type Page } from 'playwright/test';

const locales = [
  { locale: 'en', path: '/' },
  { locale: 'fr', path: '/fr/' },
  { locale: 'it', path: '/it/' },
] as const;
const places = ['work', 'about', 'experience', 'contact'] as const;

const root = (page: Page) => page.locator('[data-keep-root]');

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(0);
}

test.describe('keep interface', () => {
  for (const { locale, path } of locales) {
    for (const width of [390, 820, 1440]) {
      test.describe(`${locale} / ${width}px`, () => {
        test.use({
          viewport: { width, height: width === 1440 ? 900 : 844 },
          hasTouch: width < 1440,
        });

        test('every place is one press away and the page stays inside the screen', async ({ page }) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const sceneRequests: string[] = [];
          page.on('request', (request) => {
            if (/scene\.[\w-]+\.js$/.test(request.url())) sceneRequests.push(request.url());
          });

          await page.goto(`${path}?view=lite`);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.getByRole('heading', { level: 1 })).toHaveText('Khalil Ben Ali');
          await expect(root(page)).toHaveAttribute('data-scene', 'lite');
          await noSidewaysScroll(page);

          const nav = page.locator('.keep-nav');
          for (const place of places) {
            const link = nav.locator(`[data-keep-link="${place}"]`);
            await expect(link).toHaveAttribute('href', `#${place}`);
            await expect(link).toBeInViewport({ ratio: 1 });
          }

          for (const place of places) {
            const link = nav.locator(`[data-keep-link="${place}"]`);
            if (width < 1440) await link.tap();
            else await link.click();
            await expect(page).toHaveURL(new RegExp(`#${place}$`));
            await expect(page.locator(`#${place}-title`)).toBeInViewport();
            await expect(link).toHaveAttribute('aria-current', 'location');
            await expect(root(page)).toHaveAttribute('data-place', place);
            await noSidewaysScroll(page);
          }

          await page.locator('.keep-brand').click();
          await expect(page).toHaveURL(/#home$/);
          await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
          await expect(nav.locator('[aria-current]')).toHaveCount(0);

          expect(sceneRequests, 'the light view must not download the 3D scene').toEqual([]);
          expect(errors).toEqual([]);
        });
      });
    }

    test(`${locale}: links to the earlier one-page site still land on their content`, async ({ page }) => {
      const targets = ['top', 'main-content', 'work', 'frontend', 'ai', 'skills', 'experience',
        'contact', 'project-cuddy', 'project-maison-sol'];
      for (const id of targets) {
        /* Arrive from outside each time, as a saved or shared link does. */
        await page.goto('about:blank');
        await page.goto(`${path}?view=lite#${id}`);
        const target = page.locator(`[id="${id}"]`);
        await expect(target, id).toHaveCount(1);
        if (id !== 'top' && id !== 'main-content') await expect(target, id).toBeInViewport();
      }
    });
  }

  test('career markers light as their entries come up the page', async ({ page }) => {
    await page.goto('/?view=lite');
    const entries = page.locator('[data-keep-milestone]');
    await expect(entries).toHaveCount(4);
    await expect(page.locator('[data-keep-milestone].is-lit')).toHaveCount(0);
    await entries.last().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('[data-keep-milestone].is-lit')).toHaveCount(4);
  });

  test('the motion switch is remembered and section titles stop moving', async ({ page }) => {
    await page.goto('/?view=lite');
    const button = page.locator('[data-keep-motion]');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(root(page)).toHaveAttribute('data-motion', 'on');

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(root(page)).toHaveAttribute('data-motion', 'off');

    await page.reload();
    await expect(root(page)).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('[data-keep-motion]')).toHaveAttribute('aria-pressed', 'false');
    /* A title that is only just entering the window is already fully shown. */
    await page.evaluate(() => {
      const passage = document.querySelector<HTMLElement>('[data-keep-passage]')!;
      window.scrollTo(0, passage.offsetTop - window.innerHeight * 0.9);
    });
    await expect(page.locator('#work-title')).toHaveCSS('opacity', '1');
  });

  test.describe('system reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('nothing moves and there is nothing to switch off', async ({ page }) => {
      await page.goto('/?view=lite');
      await expect(root(page)).toHaveAttribute('data-motion', 'off');
      await expect(page.locator('[data-keep-motion]')).toBeDisabled();
      await expect(page.locator('.keep-hero__copy > *').first()).toHaveCSS('animation-name', 'none');
      await page.evaluate(() => {
        const passage = document.querySelector<HTMLElement>('[data-keep-passage]')!;
        window.scrollTo(0, passage.offsetTop - window.innerHeight * 0.9);
      });
      await expect(page.locator('#work-title')).toHaveCSS('opacity', '1');
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('titles, markers and the résumé link are all simply there', async ({ page }) => {
      await page.goto('/');
      await expect(root(page)).toHaveAttribute('data-scene', 'pending');
      for (const place of places) {
        await expect(page.locator(`#${place}-title`)).toHaveCSS('opacity', '1');
      }
      await expect(page.locator('[data-keep-motion]')).toBeHidden();
      await expect(page.locator('.keep-header__resume')).toHaveAttribute('href', '/resume/');
      const flame = page.locator('.keep-career__flame').first();
      await expect(flame).not.toHaveCSS('background-color', 'rgb(51, 64, 59)');
    });
  });

  test('the footer tells the time in Faenza', async ({ page }) => {
    await page.goto('/?view=lite');
    await expect(page.locator('[data-keep-clock]')).toHaveText(/^\d{2}:\d{2}$/);
  });
});
