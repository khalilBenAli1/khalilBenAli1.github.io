import { test, expect, type Locator, type Page } from 'playwright/test';
import { frontendProjects } from '../../src/lib/frontend-projects';
import { cvFile, homePath, resumePath, t, type Locale } from '../../src/lib/i18n';
import baseline from '../fixtures/island-preservation.json' with { type: 'json' };

// This fixture is a source-derived snapshot made before the island redesign.
// Do not regenerate it from the current implementation to make a failure pass.
const text = (value: string) => value.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

async function containsAll(locator: Locator, values: readonly string[]) {
  // CSS text-transform is presentation; exact source spelling is checked above.
  const actual = text(await locator.innerText()).toLocaleLowerCase();
  for (const value of values) expect(actual).toContain(text(value).toLocaleLowerCase());
}

async function hasHref(page: Page, href: string) {
  expect(await page.locator('a').evaluateAll((links, expected) =>
    links.some((link) => link.getAttribute('href') === expected), href), href).toBe(true);
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

test.describe('immutable preservation baseline', () => {
  test('original dictionaries, catalogue and locale helpers keep every source value', () => {
    for (const route of baseline.localeRoutes) {
      const locale = route.locale as Locale;
      expect(t(locale)).toMatchObject(baseline.dictionaries[locale]);
      expect(homePath(locale)).toBe(route.home);
      expect(resumePath(locale)).toBe(route.resume);
      expect(cvFile(locale)).toBe(route.pdf);
    }
    const expected = baseline.frontendProjects.map(({ screenshot, publicationState, ...project }) => project);
    expect(frontendProjects).toEqual(expected);
  });

  test('four PDFs, portrait and nine screenshots are unchanged', async ({ request }) => {
    const files = [
      ...baseline.protectedDownloads,
      baseline.identity.portrait,
      ...baseline.frontendProjects.map((project) => project.screenshot),
    ];
    for (const file of files) {
      const response = await request.get(file.url);
      expect(response.ok(), file.url).toBe(true);
      const bytes = Uint8Array.from(await response.body());
      expect(bytes.byteLength, file.url).toBe(file.bytes);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      expect(sha256, file.url).toBe(file.sha256);
    }
  });
});

test.describe('semantic content survives presentation changes', () => {
  // All content and links must exist before optional navigation/3D enhancement.
  test.use({ javaScriptEnabled: false, contextOptions: { reducedMotion: 'reduce' } });

  for (const route of baseline.localeRoutes) {
    const locale = route.locale as Locale;
    const dict = baseline.dictionaries[locale];

    test(`${locale} preserves nine frontend experiences and five honest professional records`, async ({ page }) => {
      await page.goto(route.home);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      for (const project of baseline.frontendProjects) {
        const article = page.getByRole('article').filter({
          has: page.getByRole('heading', { name: project.name, exact: true }),
        });
        await expect(article).toHaveCount(1);
        await containsAll(article, [project.name, project.year, project.sector[locale],
          project.description[locale], ...project.technology]);
        expect(await article.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
          .toEqual(expect.arrayContaining([project.demo, project.source]));
        const image = article.locator('img');
        await expect(image).toHaveAttribute('src', project.image);
        await expect(image).toHaveAttribute('alt', `${project.name} — ${project.sector[locale]}`);
        const imageResponse = await page.request.get(project.image);
        expect(imageResponse.ok(), project.image).toBe(true);
        expect(imageResponse.headers()['content-type']).toContain('image/');
      }
      for (const project of baseline.professionalProjects) {
        const article = page.getByRole('article').filter({
          has: page.getByRole('heading', { name: project.name, exact: true }),
        });
        await expect(article).toHaveCount(1);
        await containsAll(article, [project.name, project.client, project.year,
          project.copy[locale].subtitle, ...project.copy[locale].highlights,
          ...project.technology, dict.work.privateRepo]);
        await expect(article.getByText(dict.work.production, { exact: true }))
          .toHaveCount(project.production ? 1 : 0);
        expect(await article.locator('a[href^="https://"]').count(),
          `${project.name} must not gain a fabricated public demo/source`).toBe(0);
      }
      await containsAll(page.locator('body'), [baseline.biat.name, baseline.biat.description[locale],
        dict.work.moreLine, baseline.frontendGalleryCopy[locale].note]);
      await hasHref(page, baseline.biat.sourceHref);
    });

    test(`${locale} preserves identity, AI, skills, career and contact content`, async ({ page }) => {
      await page.goto(route.home);
      const body = page.locator('body');
      await containsAll(body, [baseline.identity.name, dict.hero.eyebrow, dict.hero.status,
        dict.hero.lead, ...strings(dict.ai.cards), ...strings(dict.experience.entries),
        ...strings(dict.skills.groups), ...baseline.skillsGroups.flatMap((group) => group.items),
        ...baseline.marqueeItems, dict.contact.line, dict.contact.localTime,
        dict.contact.footerLeft, dict.contact.footerRight]);
      for (const href of [baseline.identity.emailHref, baseline.identity.githubHref,
        baseline.identity.linkedinHref, route.resume, route.pdf]) await hasHref(page, href);
      for (const alternate of baseline.localeRoutes) await hasHref(page, alternate.home);
      await expect(page.locator(`img[src="${baseline.identity.portrait.url}"]`).first())
        .toHaveAttribute('alt', /Khalil Ben Ali/);
    });

    test(`${locale} keeps the complete independent résumé and localized navigation`, async ({ page }) => {
      await page.goto(route.resume);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('KHALIL BEN ALI');
      const { title, photoAlt, ...resumeBody } = dict.resume;
      await containsAll(page.locator('body'), strings(resumeBody));
      await expect(page.locator('img')).toHaveAttribute('src', baseline.identity.portrait.url);
      await expect(page.locator('img')).toHaveAttribute('alt', photoAlt);
      for (const href of [route.home, route.pdf, '#resume', baseline.identity.emailHref,
        baseline.identity.githubHref, baseline.identity.linkedinHref]) await hasHref(page, href);
      for (const alternate of baseline.localeRoutes) await hasHref(page, alternate.resume);
      await expect(page.locator(`a[href="${route.pdf}"]`)).toHaveAttribute('download', '');
      await expect(page.locator('canvas, [data-island-root], [data-island-scene]')).toHaveCount(0);
      expect(await page.locator('script[src]').evaluateAll((scripts) => scripts.map((script) =>
        script.getAttribute('src')).filter((src) => /island/i.test(src ?? '')))).toEqual([]);
    });
  }
});
