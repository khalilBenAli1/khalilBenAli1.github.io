import { test, expect, type Page } from 'playwright/test';
import { getIslandCopy } from '../../src/lib/island/copy';
import { homePath, type Locale } from '../../src/lib/i18n';

const visibleCards = (page: Page) => page.locator('[data-island-card]:visible');
const detailLink = (page: Page, id: string) => page.locator(`[data-island-card="${id}"] .island-project__details-link`);

for (const locale of ['en', 'fr', 'it'] as const satisfies readonly Locale[]) {
  test(`${locale} sector and project navigation follow the URL and preserve history`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const copy = getIslandCopy(locale);
    await page.goto(`${homePath(locale)}?view=lite#work`);
    await expect(page.locator('[data-island-root]')).toHaveAttribute('data-bound', 'true');
    await expect(visibleCards(page)).toHaveCount(15);
    await expect(visibleCards(page).first()).toHaveAttribute('data-island-card', 'maison-sol');

    const beauty = page.locator('.island-gallery__filters [data-island-filter="beauty"]');
    await beauty.click();
    await expect(page).toHaveURL(/\?view=lite&sector=beauty#work$/);
    await expect(beauty).toHaveAttribute('aria-current', 'true');
    await expect(visibleCards(page)).toHaveCount(2);
    await expect(page.locator('[data-island-gallery-count]')).toHaveText('2');
    await expect(page.locator('[data-island-collection="professional"]')).toBeHidden();

    const trigger = detailLink(page, 'veyli-colour');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/sector=beauty#project-veyli-colour$/);
    await expect(visibleCards(page)).toHaveCount(1);
    const selected = page.locator('[data-island-card="veyli-colour"]');
    await expect(selected).toBeFocused();
    await expect(selected.locator('[data-island-project-extra]')).toBeVisible();
    await expect(selected.locator('.frontend-demo__links a')).toHaveCount(2);
    await selected.getByRole('link', { name: copy.controls.backToGallery, exact: true }).click();
    await expect(page).toHaveURL(/sector=beauty#work$/);
    await expect(visibleCards(page)).toHaveCount(2);
    await expect(trigger).toBeFocused();

    await page.goBack();
    await expect(selected).toHaveClass(/is-selected/);
    await expect(visibleCards(page)).toHaveCount(1);
    await page.goForward();
    await expect(visibleCards(page)).toHaveCount(2);
    await page.locator('.island-gallery__filters [data-island-filter="all"]').click();
    await expect(page).toHaveURL(/\?view=lite#work$/);
    await expect(visibleCards(page)).toHaveCount(15);
    expect(errors).toEqual([]);
  });
}

test('a direct project link survives refresh and overrides a conflicting sector', async ({ page }) => {
  await page.goto('/?view=lite&sector=beauty#project-maison-sol');
  const selected = page.locator('[data-island-card="maison-sol"]');
  await expect(selected).toHaveClass(/is-selected/);
  await expect(visibleCards(page)).toHaveCount(1);
  await page.reload();
  await expect(selected).toHaveClass(/is-selected/);
  await expect(page.locator('[data-island-language="fr"]'))
    .toHaveAttribute('href', '/fr/?view=lite&sector=beauty#project-maison-sol');
  await selected.getByRole('link', { name: 'Close — Maison Sol', exact: true }).click();
  await expect(page).toHaveURL(/sector=beauty#work$/);
  await expect(visibleCards(page)).toHaveCount(2);
  await expect(page.locator('[data-island-panel="work"] [data-island-heading]')).toBeFocused();
});

test('closing nested project details restores both levels of keyboard focus', async ({ page }) => {
  await page.goto('/?view=lite');
  const work = page.locator('nav[aria-label="Primary"] [data-island-nav="work"]');
  await work.click();
  const trigger = detailLink(page, 'maison-sol');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-island-card="maison-sol"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(work).toBeFocused();
  await expect(page.locator('[data-island-root]')).toHaveAttribute('data-destination', 'home');
});

test('only actual project identifiers can become detail routes', async ({ page }) => {
  await page.goto('/?view=lite#project-maison-sol-title');
  await expect(page.locator('[data-island-root]')).toHaveAttribute('data-destination', 'home');
  await expect(page.locator('[data-island-root]')).toHaveAttribute('data-selected-project', '');
});

test.describe('gallery touch navigation', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('filters, project details and back links fit the viewport', async ({ page }) => {
    await page.goto('/?view=lite#work');
    await page.locator('.island-gallery__filters [data-island-filter="travel"]').tap();
    await expect(visibleCards(page)).toHaveCount(1);
    await detailLink(page, 'roam').tap();
    const card = page.locator('[data-island-card="roam"]');
    await expect(card).toHaveClass(/is-selected/);
    await card.getByRole('link', { name: 'Back to gallery', exact: true }).tap();
    await expect(detailLink(page, 'roam')).toBeFocused();
    const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  });
});
