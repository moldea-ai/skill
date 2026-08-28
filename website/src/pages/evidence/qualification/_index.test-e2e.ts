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
  await Promise.all([
    page.waitForURL(/\/evidence\/qualification\/custom\/custom\/$/u),
    profileLink.click(),
  ]);
  await expect(page.getByRole('heading', { name: 'Qualification status summary' })).toBeVisible();
  await expect(page.getByText('Current result')).toBeVisible();
  const expectedLinkNames = {
    errored: 'Inspect the execution-error attempt',
    failed: 'Inspect the failed attempt',
    passed: 'Inspect the passing attempt',
  } as const;

  if (status === 'not-recorded') {
    await expect(page.getByText('No recorded attempt').first()).toBeVisible();
    await expect(
      page.getByText(/No current protocol 6 Sol attempt has been committed/u).first(),
    ).toBeVisible();
    await expect(page.getByText('Historical Terra', { exact: true }).first()).toBeVisible();
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
    await expect(
      page.getByText(/No current protocol 6 Sol attempt has been committed/u).first(),
    ).toBeVisible();
    const historicalAttemptRow = page
      .getByRole('row')
      .filter({ hasText: 'Historical Terra' })
      .first();
    await expect(historicalAttemptRow).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/attempts\/[^/]+\/$/u),
      historicalAttemptRow.getByRole('link').click(),
    ]);
    await page.getByText('Technical provenance and raw artifacts', { exact: true }).click();
    await expect(page.getByText('Historical Terra', { exact: true })).toBeVisible();
    return;
  }

  await Promise.all([page.waitForURL(/\/attempts\/[^/]+\/$/u), attemptLink.click()]);
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

test('presents the Vercel qualification history transparently', async ({ page }) => {
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

  if (status === 'not-recorded') {
    await expect(
      page.getByText(/No current protocol 6 Sol attempt has been committed/u).first(),
    ).toBeVisible();
    const historicalAttemptRow = page
      .getByRole('row')
      .filter({ hasText: 'Historical Terra' })
      .first();
    await expect(historicalAttemptRow).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/attempts\/[^/]+\/$/u),
      historicalAttemptRow.getByRole('link').click(),
    ]);
    await page.getByText('Technical provenance and raw artifacts', { exact: true }).click();
    await expect(page.getByText('Historical Terra', { exact: true })).toBeVisible();
    return;
  }

  if (status !== 'errored' && status !== 'failed' && status !== 'passed') {
    throw new Error(`Unexpected qualification status: ${status ?? 'missing'}.`);
  }

  await expect(attemptLink).toBeVisible();
  await Promise.all([page.waitForURL(/\/attempts\/[^/]+\/$/u), attemptLink.click()]);
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

test(
  'renders recovered protocol 6 trial evidence',
  { tag: '@qualification-current-fixture' },
  async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme,
        viewport: { height: 900, width: 320 },
      });
      const page = await context.newPage();
      await page.goto(
        toPublicPath('/evidence/qualification/custom/custom/attempts/attempt-recovered/'),
      );

      await expect(
        page.getByRole('heading', { level: 1, name: 'attempt-recovered' }),
      ).toBeVisible();
      await expect(
        page.getByText('Recovered cases', { exact: true }).locator('..').getByText('1'),
      ).toBeVisible();
      await expect(
        page.getByText('Operational retries', { exact: true }).locator('..').getByText('1'),
      ).toBeVisible();

      const caseEvidence = page
        .locator('article')
        .filter({ has: page.getByRole('heading', { level: 3, name: 'Release case' }) })
        .first();
      await expect(caseEvidence).toContainText(
        'Two fresh passing confirmations recovered this case',
      );
      await expect(caseEvidence.getByRole('heading', { level: 5 })).toHaveText([
        'Initial trial',
        'Confirmation 1',
        'Confirmation 2',
      ]);

      const initialTrial = caseEvidence
        .getByRole('heading', { level: 5, name: 'Initial trial' })
        .locator('xpath=ancestor::article[1]');
      await expect(initialTrial.locator('[data-evidence-status]').first()).toHaveAttribute(
        'data-evidence-status',
        'failed',
      );
      await expect(initialTrial.getByText('Unexpected changed path unexpected.md.')).toHaveCount(2);
      await expect(
        initialTrial.getByText(
          'The judge was skipped because deterministic postchecks or workspace assertions already failed.',
        ),
      ).toBeVisible();
      await expect(initialTrial.getByText('skipped', { exact: true })).toBeVisible();

      for (const confirmationName of ['Confirmation 1', 'Confirmation 2']) {
        const confirmationTrial = caseEvidence
          .getByRole('heading', { level: 5, name: confirmationName })
          .locator('xpath=ancestor::article[1]');
        await expect(confirmationTrial.locator('[data-evidence-status]').first()).toHaveAttribute(
          'data-evidence-status',
          'passed',
        );
      }

      await expect(caseEvidence.getByText('Fresh evidence', { exact: true })).toHaveCount(5);
      const retryDisclosure = initialTrial.getByText(
        'Operational retries (1) and raw trial artifacts',
        { exact: true },
      );
      await retryDisclosure.focus();
      await expect(retryDisclosure).toBeFocused();
      await retryDisclosure.press('Enter');
      await expect(initialTrial.getByText('Actor retry 1', { exact: true })).toBeVisible();
      await expect(initialTrial.getByText('timed-out', { exact: true })).toBeVisible();
      await expect(initialTrial.getByRole('link', { name: /actor-output\.json/u })).toHaveAttribute(
        'href',
        /cases\/release-case\/trials\/initial\/actor-output\.json$/u,
      );

      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      await context.close();
    }
  },
);
