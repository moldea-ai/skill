import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { INSTALL_COMMAND, SKILLS_DIRECTORY_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('separates installation, initialization, and ordinary project work', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const adoption = page.getByRole('region', { name: 'Install. Initialize. Start building.' });
  const journey = adoption.getByRole('list', { name: 'Getting started' });
  const steps = journey.locator(':scope > li');

  await expect(
    adoption.getByRole('heading', { level: 2, name: 'Install. Initialize. Start building.' }),
  ).toBeVisible();
  await expect(
    adoption.getByText(
      'Install the skill once, initialize the project, then ask for the agent you need.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(adoption.getByRole('link', { name: 'Get the skill' })).toHaveAttribute(
    'href',
    SKILLS_DIRECTORY_URL,
  );
  await expect(adoption.getByRole('link', { name: 'Read the setup guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/getting-started/'),
  );
  await expect(steps).toHaveCount(3);

  const installStep = steps.nth(0);
  const initializationStep = steps.nth(1);
  const ordinaryWorkStep = steps.nth(2);

  await expect(
    installStep.getByRole('heading', { level: 3, name: 'Install the skill' }),
  ).toBeVisible();
  await expect(installStep.locator('[data-install-command] code')).toHaveText(INSTALL_COMMAND);

  await expect(
    initializationStep.getByRole('heading', { level: 3, name: 'Initialize the project' }),
  ).toBeVisible();
  await expect(initializationStep.getByText('Initialize moldea', { exact: true })).toBeVisible();
  await expect(
    initializationStep.locator('code.inline-code', { hasText: 'moldea' }).first(),
  ).toBeVisible();
  await expect(
    initializationStep.getByText(/Agent files are added when you ask for them/),
  ).toBeVisible();
  await expect(
    initializationStep.getByText('Create a support agent grounded in our current refund policy.'),
  ).toHaveCount(0);

  await expect(ordinaryWorkStep).toHaveAttribute('data-getting-started-ordinary-work', '');
  await expect(
    ordinaryWorkStep.getByRole('heading', { level: 3, name: 'Ask for the outcome' }),
  ).toBeVisible();
  await expect(
    ordinaryWorkStep.getByText('Create a support agent grounded in our current refund policy.', {
      exact: true,
    }),
  ).toBeVisible();

  await expect(adoption.locator('[data-getting-started-copy]')).toHaveCount(0);
  await expect(adoption.locator('[data-getting-started-copy-status]')).toHaveCount(0);
  await expect(adoption.getByRole('button', { name: 'Copy code', exact: true })).toHaveCount(1);
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
  const pre = installCommand.locator('pre');
  await expect(pre).toHaveCSS('padding-inline-start', '16px');
  await expect(pre).toHaveCSS('padding-inline-end', '16px');
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

    const adoption = page.getByRole('region', { name: 'Install. Initialize. Start building.' });
    const journey = adoption.getByRole('list', { name: 'Getting started' });
    const widths = await adoption.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));

    await expect(journey.getByText(INSTALL_COMMAND, { exact: true })).toBeVisible();
    await expect(adoption.getByRole('button', { name: 'Copy code', exact: true })).toHaveCount(0);
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    await context.close();
  }
});
