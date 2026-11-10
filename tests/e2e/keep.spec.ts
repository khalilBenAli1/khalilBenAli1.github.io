import { expect, test, type Page } from 'playwright/test';

const locales = [
  { locale: 'en', path: '/' },
  { locale: 'fr', path: '/fr/' },
  { locale: 'it', path: '/it/' },
] as const;
const places = ['work', 'about', 'experience', 'contact'] as const;

const root = (page: Page) => page.locator('[data-keep-root]');

/** Scrolls so the first section title has only just begun to enter the window. */
async function toRisingTitle(page: Page) {
  await page.evaluate(() => {
    const passage = document.querySelector<HTMLElement>('[data-keep-passage]')!;
    const top = passage.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight * 0.6, behavior: 'instant' });
  });
}

/** Waits until the page has stopped gliding, then returns where the element is. */
async function atRest(page: Page, selector: string) {
  const top = () => page.locator(selector).evaluate((element) => element.getBoundingClientRect().top);
  let last = await top();
  await expect
    .poll(async () => {
      const now = await top();
      const still = Math.abs(now - last) < 0.5;
      last = now;
      return still;
    }, { intervals: [200] })
    .toBe(true);
  return (await page.locator(selector).boundingBox())!;
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(0);
}

test.describe('keep interface', () => {
  /* Each press glides the page to its place; five glides in a software-rendered
     browser on a busy machine need more than the default half minute. */
  test.describe.configure({ timeout: 60_000 });

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
    await expect(button).toHaveText('Motion on');
    await expect(root(page)).toHaveAttribute('data-motion', 'on');

    /* With motion on, a title that is still rising is only partly shown. */
    await toRisingTitle(page);
    await expect
      .poll(() => page.locator('#work-title').evaluate((title) => Number(getComputedStyle(title).opacity)))
      .toBeLessThan(0.9);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    await button.click();
    await expect(button).toHaveText('Motion off');
    await expect(root(page)).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');

    await page.reload();
    await expect(root(page)).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('[data-keep-motion]')).toHaveText('Motion off');
    /* A title that is only just entering the window is already fully shown. */
    await toRisingTitle(page);
    await expect(page.locator('#work-title')).toHaveCSS('opacity', '1');
  });

  test.describe('system reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('nothing moves and there is nothing to switch off', async ({ page }) => {
      await page.goto('/?view=lite');
      await expect(root(page)).toHaveAttribute('data-motion', 'off');
      await expect(page.locator('[data-keep-motion]')).toBeDisabled();
      await expect(page.locator('.keep-hero__copy > *').first()).toHaveCSS('animation-name', 'none');
      await toRisingTitle(page);
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
      await expect(flame).toHaveCSS('background-image', /radial-gradient/);
    });
  });

  test('the footer tells the time in Faenza', async ({ page }) => {
    await page.goto('/?view=lite');
    await expect(page.locator('[data-keep-clock]')).toHaveText(/^\d{2}:\d{2}$/);
  });
});

test.describe('the work belongs to the keep', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const light = (page: Page, id: string) =>
    page.locator(`#project-${id}`).evaluate((plaque: HTMLElement) =>
      plaque.style.getPropertyValue('--light') === '' ? null : Number(plaque.style.getPropertyValue('--light')));

  test('a plaque is lit by the torch beside it and dark far from it', async ({ page }) => {
    await page.goto('/?view=lite#frontend');
    const near = page.locator('#project-maison-sol');
    await expect(near).toBeInViewport();
    /* Measured only once the page has stopped: a box taken mid-glide can put
       the pointer below the window, where it is not a torch at all. */
    const box = await atRest(page, '#project-maison-sol .keep-demo__body');
    /* Held over the words of the plaque, not over its picture: a hovered
       picture shows its true colours whatever the torch is doing. */
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    /* The torch is carried again before each reading. */
    const carried = async (id: string) => {
      await page.mouse.move(x - 3, y - 3);
      await page.mouse.move(x, y);
      await page.waitForTimeout(60);
      return light(page, id);
    };

    await expect.poll(() => carried('maison-sol')).toBe(1);
    /* Atelier No.8 hangs two plaques to the right, out of the torch's reach. */
    await expect.poll(() => carried('atelier-no8')).toBeLessThan(0.25);
    await page.mouse.move(x - 3, y - 3);
    await page.mouse.move(x, y);
    await expect(page.locator('.keep-torch')).toHaveClass(/is-carried/);
    await expect(near.locator('img')).toHaveCSS('filter', /brightness\(0\.98\)/);
    await near.locator('.keep-demo__shot').hover();
    await expect(near.locator('img')).toHaveCSS('filter', 'none');

    /* A keyboard visitor lights a plaque by reaching into it. */
    await page.locator('#project-atelier-no8 .keep-links a').last().focus();
    await expect(page.locator('#project-atelier-no8 img')).toHaveCSS('filter', /brightness\(0\.98\)/);
    /* The picture itself, once focused, shows its true colours. */
    await page.locator('#project-atelier-no8 .keep-demo__shot').focus();
    await expect(page.locator('#project-atelier-no8 img')).toHaveCSS('filter', 'none');

    /* With motion off nothing is left in the dark. */
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('[data-keep-motion]').click();
    await expect.poll(() => light(page, 'maison-sol')).toBeNull();
    await expect(page.locator('.keep-torch')).not.toHaveClass(/is-carried/);
  });

  test('blocks come out of the dark once, when they are reached', async ({ page }) => {
    await page.goto('/?view=lite');
    const plaque = page.locator('#project-cuddy');
    await expect(plaque).not.toHaveClass(/is-seen/);
    await expect(plaque).toHaveCSS('opacity', '0');
    await plaque.scrollIntoViewIfNeeded();
    await expect(plaque).toHaveClass(/is-seen/);
    await expect(plaque).toHaveCSS('opacity', '1');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(plaque).toHaveClass(/is-seen/);
  });

  test('each stretch of the page names its place on the road', async ({ page }) => {
    await page.goto('/fr/?view=lite');
    await expect(page.locator('#work .keep-place')).toHaveText('La nef');
    await expect(page.locator('#about .keep-place')).toHaveText('La cour');
    await expect(page.locator('#experience .keep-place')).toHaveText('L’escalier');
    await expect(page.locator('#contact .keep-place')).toHaveText('Le fanal');
  });

  test('the wheel glides, and a focused link is never pulled away', async ({ page }) => {
    await page.goto('/?view=lite');
    await expect(page.locator('html')).toHaveClass(/lenis/);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

    const email = page.locator('a[href^="mailto:"]');
    await email.focus();
    await expect(email).toBeInViewport();
    await page.waitForTimeout(700);
    await expect(email, 'still in view once the glide has settled').toBeInViewport();

    /* The motion switch hands scrolling back to the browser. */
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('[data-keep-motion]').click();
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('every plaque is lit and nothing waits to be revealed', async ({ page }) => {
      await page.goto('/');
      const plaque = page.locator('#project-cuddy');
      await expect(plaque).toHaveCSS('opacity', '1');
      await expect(page.locator('#project-sora img')).toHaveCSS('filter', /brightness\(0\.98\)/);
      await expect(page.locator('.keep-torch')).toHaveCount(0);
    });
  });
});
