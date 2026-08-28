import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('represents the clean qualification evidence state', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Adapter qualification evidence' }),
  ).toBeVisible();
  const profileLinks = [
    page.getByRole('link', { name: /Custom runtime qualification/ }),
    page.getByRole('link', { name: /Vercel AI SDK direct generation qualification/ }),
  ];

  for (const profileLink of profileLinks) {
    await expect(
      profileLink.locator('[data-evidence-status][data-evidence-status="not-recorded"]'),
    ).toBeVisible();
  }
});

test('presents both qualification profiles before their first protocol 6 attempt', async ({
  page,
}) => {
  const profiles = [
    {
      route: '/evidence/qualification/custom/custom/',
      heading: 'Custom runtime qualification',
      journeyHeading: '8 realistic journeys',
    },
    {
      route: '/evidence/qualification/vercel-ai-sdk/typescript-generate-stream-text-7/',
      heading: 'Vercel AI SDK direct generation qualification',
      journeyHeading: '10 realistic journeys',
    },
  ] as const;

  for (const profile of profiles) {
    await page.goto(toPublicPath(profile.route));
    await expect(page.getByRole('heading', { level: 1, name: profile.heading })).toBeVisible();
    await expect(page.getByRole('heading', { name: profile.journeyHeading })).toBeVisible();
    await expect(
      page.getByText(/No protocol 6 Sol attempt has been committed/u).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /^Inspect the .* attempt$/u })).toHaveCount(0);
  }
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
          'The judge was skipped because runner-owned evidence already failed.',
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
        'Operational retries (1) and committed trial artifacts',
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
