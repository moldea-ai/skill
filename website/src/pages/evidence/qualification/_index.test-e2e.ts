import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('leads from a profile to its current inspectable attempt', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Adapter qualification evidence' }),
  ).toBeVisible();
  const profileLink = page.getByRole('link', { name: /Custom runtime qualification/ });
  const status = await profileLink
    .locator('[data-evidence-status]')
    .getAttribute('data-evidence-status');
  expect(status).not.toBeNull();
  await profileLink.click();
  await expect(page.getByRole('heading', { name: 'Qualification status summary' })).toBeVisible();
  await expect(page.getByText('Current result')).toBeVisible();
  const expectedLinkNames = {
    errored: 'Inspect the execution-error attempt',
    failed: 'Inspect the failed attempt',
    passed: 'Inspect the passing attempt',
  } as const;

  if (status !== 'errored' && status !== 'failed' && status !== 'passed') {
    throw new Error(`Unexpected qualification status: ${status ?? 'missing'}.`);
  }

  await expect(page.getByRole('link', { name: expectedLinkNames[status] })).toBeVisible();
});

test('describes the current immutable attempt according to its status', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/custom/custom/'));
  const attemptLink = page.getByRole('link', { name: /^Inspect the .* attempt$/u });
  await attemptLink.click();
  const status = await page
    .locator('[data-evidence-status]')
    .first()
    .getAttribute('data-evidence-status');
  const expectedDescriptions = {
    errored: 'Immutable qualification evidence from an execution-error attempt for custom/custom.',
    failed: 'Immutable failed qualification evidence for custom/custom.',
    passed: 'Immutable passing qualification evidence for custom/custom.',
  } as const;

  if (status !== 'errored' && status !== 'failed' && status !== 'passed') {
    throw new Error(`Unexpected qualification status: ${status ?? 'missing'}.`);
  }

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    expectedDescriptions[status],
  );
});

test('keeps qualification evidence accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    const profileRoute = toPublicPath('/evidence/qualification/custom/custom/');

    await page.goto(profileRoute);
    const currentAttemptRoute = await page
      .getByRole('link', { name: /^Inspect the .* attempt$/u })
      .getAttribute('href');

    if (currentAttemptRoute === null) {
      throw new Error('The qualification profile does not link to its current attempt.');
    }

    for (const route of [
      toPublicPath('/evidence/qualification/'),
      profileRoute,
      currentAttemptRoute,
    ]) {
      await page.goto(route);
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll, route).toBeLessThanOrEqual(widths.client);
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
        route,
      ).toStrictEqual([]);
    }

    await context.close();
  }
});
