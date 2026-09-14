import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';
import { INSTALL_COMMAND, SKILLS_DIRECTORY_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows one install followed by an ordinary coding-agent request', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const gettingStarted = page.getByRole('region', {
    name: 'One install. One ordinary request.',
  });
  const journey = gettingStarted.getByRole('list', { name: 'Getting started' });
  const steps = journey.locator(':scope > li');

  await expect(
    gettingStarted.getByRole('heading', {
      level: 2,
      name: 'One install. One ordinary request.',
    }),
  ).toBeVisible();
  await expect(gettingStarted.getByRole('link', { name: 'Get the skill' })).toHaveAttribute(
    'href',
    SKILLS_DIRECTORY_URL,
  );
  await expect(gettingStarted.getByRole('link', { name: 'Read the setup guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/getting-started/'),
  );
  await expect(steps).toHaveCount(3);
  await expect(
    steps.nth(0).getByText('Install it in this project.', { exact: true }),
  ).toBeVisible();
  await expect(steps.nth(0).locator('[data-install-command] code')).toHaveText(INSTALL_COMMAND);
  await expect(
    steps.nth(1).getByText('Initialize the project once.', { exact: true }),
  ).toBeVisible();
  await expect(steps.nth(1).getByText('Initialize moldea', { exact: true })).toBeVisible();
  await expect(steps.nth(1).locator('code')).toHaveText('moldea');
  await expect(
    steps.nth(2).getByText('Describe the outcome naturally.', { exact: true }),
  ).toBeVisible();
  await expect(steps.nth(2).getByText(LANDING_EXAMPLE.request, { exact: true })).toBeVisible();
  await expect(
    gettingStarted.getByRole('heading', { level: 3, name: 'Your coding agent handles the rest' }),
  ).toBeVisible();
  await expect(gettingStarted.getByText('Support agent ready.', { exact: true })).toBeVisible();
  const projectResult = gettingStarted.getByRole('list', {
    name: 'Created support agent result',
  });
  await expect(projectResult.getByRole('listitem')).toHaveText([
    'Project instructions saved',
    'Order lookup connected',
    'Deterministic checks passed',
  ]);
  await expect(gettingStarted.getByRole('button', { name: 'Copy code', exact: true })).toHaveCount(
    1,
  );
});

test('copies the exact install command through the shared keyboard control', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(toPublicPath('/'));

  const installCommand = page.locator('[data-getting-started] [data-install-command]');
  const button = installCommand.getByRole('button', { name: 'Copy code', exact: true });
  const feedback = installCommand.locator('[data-code-copy-feedback]');

  await button.focus();
  await button.press('Enter');

  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('data-code-copy-state', 'copied');
  await expect(button.locator('[data-code-copy-success-icon]')).toHaveCSS('opacity', '1');
  await expect(button.locator('[data-code-copy-icon]')).toHaveCSS('opacity', '0');
  await expect(feedback).toHaveText('Copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INSTALL_COMMAND);
});

test('keeps the setup readable without JavaScript and compact at 320px', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      javaScriptEnabled: false,
      reducedMotion: 'reduce',
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const gettingStarted = page.getByRole('region', {
      name: 'One install. One ordinary request.',
    });
    const journey = gettingStarted.getByRole('list', { name: 'Getting started' });
    const widths = await gettingStarted.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));

    await expect(journey.getByText(INSTALL_COMMAND, { exact: true })).toBeVisible();
    await expect(gettingStarted.getByRole('button', { name: 'Copy code' })).toHaveCount(0);
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    await context.close();
  }
});
