import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('represents the Custom profile current evidence state', async ({ page }) => {
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

  if (status === 'not-recorded') {
    await expect(page.getByText('No recorded attempt').first()).toBeVisible();
    await expect(page.getByText('No official attempt has been committed.').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Inspect the .* attempt$/u })).toHaveCount(0);
    return;
  }

  if (status !== 'errored' && status !== 'failed' && status !== 'passed') {
    throw new Error(`Unexpected qualification status: ${status ?? 'missing'}.`);
  }

  await expect(page.getByRole('link', { name: expectedLinkNames[status] })).toBeVisible();
});

test('describes the Custom profile and any current immutable attempt', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/custom/custom/'));
  const attemptLink = page.getByRole('link', { name: /^Inspect the .* attempt$/u });

  if ((await attemptLink.count()) === 0) {
    await expect(page.getByText('No recorded attempt').first()).toBeVisible();
    await expect(page.getByText('No official attempt has been committed.').first()).toBeVisible();
    return;
  }

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

  const durationTexts = await page.locator('time[datetime^="PT"]').allTextContents();
  expect(durationTexts.length).toBeGreaterThan(1);
  for (const durationText of durationTexts) {
    expect(durationText.trim()).toMatch(/^\d+(?:d|h|m|s)(?: \d+(?:d|h|m|s))*$/u);
  }
});

test('presents the current Vercel qualification attempt transparently', async ({ page }) => {
  await page.goto(
    toPublicPath('/evidence/qualification/vercel-ai-sdk/typescript-generate-stream-text-7/'),
  );

  await expect(
    page.getByRole('heading', { level: 1, name: 'Vercel AI SDK direct generation qualification' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '10 realistic journeys' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '36 behavior claims covered' })).toBeVisible();
  const attemptLink = page.getByRole('link', { name: /^Inspect the .* attempt$/u });
  const status = await page
    .locator('[data-evidence-status]')
    .first()
    .getAttribute('data-evidence-status');
  const expectedDescriptions = {
    errored:
      'Immutable qualification evidence from an execution-error attempt for vercel-ai-sdk/typescript-generate-stream-text-7.',
    failed:
      'Immutable failed qualification evidence for vercel-ai-sdk/typescript-generate-stream-text-7.',
    passed:
      'Immutable passing qualification evidence for vercel-ai-sdk/typescript-generate-stream-text-7.',
  } as const;

  if (status !== 'errored' && status !== 'failed' && status !== 'passed') {
    throw new Error(`Unexpected qualification status: ${status ?? 'missing'}.`);
  }

  await expect(attemptLink).toBeVisible();
  await attemptLink.click();
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
    const vercelProfileRoute = toPublicPath(
      '/evidence/qualification/vercel-ai-sdk/typescript-generate-stream-text-7/',
    );
    const routes = [toPublicPath('/evidence/qualification/'), profileRoute, vercelProfileRoute];

    await page.goto(profileRoute);
    const attemptLink = page.getByRole('link', { name: /^Inspect the .* attempt$/u });

    if ((await attemptLink.count()) > 0) {
      const currentAttemptRoute = await attemptLink.getAttribute('href');

      if (currentAttemptRoute === null) {
        throw new Error('The qualification profile does not link to its current attempt.');
      }

      routes.push(currentAttemptRoute);
    }

    for (const route of routes) {
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
