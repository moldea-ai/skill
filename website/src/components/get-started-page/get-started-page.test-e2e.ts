import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import {
  INSTALL_COMMAND,
  NODE_VERSION_RANGE,
  SKILLS_DIRECTORY_URL,
} from '../../lib/model/constants.ts';
import { SITE_NAME } from '../../lib/site/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const route = toPublicPath('/get-started/');

/**
 * Asserts the shared new-tab treatment: target, visible icon, and announced behavior.
 * @param link The link that should open in a new tab.
 * @param href The expected destination.
 */
const expectNewTabLink = async (link: Locator, href: string): Promise<void> => {
  await expect(link).toHaveAttribute('href', href);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link.locator('svg[data-external-link-icon]')).toHaveCount(1);
};

test('walks through the requirements and four setup steps in order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(page).toHaveTitle(`Get started · ${SITE_NAME}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Get started with moldea' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(page.getByText('Illustrative conversations.', { exact: false })).toBeVisible();
  expect(await page.locator('main h2').allTextContents()).toStrictEqual([
    'Before you start',
    'Add the Skill to your repository.',
    'Initialize the project once.',
    'Keep working as usual.',
    'Ask for a fix when something seems off.',
    'Review pull requests with the same context.',
  ]);

  const stepNavigation = page.getByRole('navigation', { name: 'Setup steps' });
  const stepLinks = stepNavigation.getByRole('link');
  await expect(stepLinks).toHaveText(['Install', 'Initialize', 'Keep working', 'Fix']);
  for (const href of await stepLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') ?? ''),
  )) {
    await expect(page.locator(href)).toHaveCount(1);
  }

  const requirements = page.locator('#before-you-start li');
  await expect(requirements).toHaveCount(4);
  await expect(requirements.nth(0).getByRole('link')).toHaveAttribute(
    'href',
    toPublicPath('/docs/coding-agent-compatibility/'),
  );
  await expect(requirements.nth(1)).toContainText(`Node.js ${NODE_VERSION_RANGE}`);
  await expect(requirements.nth(2)).toContainText('package.json');
  await expect(requirements.nth(3)).toContainText('not globally');

  const install = page.locator('#install');
  await expect(install.locator('[data-install-command]')).toContainText(INSTALL_COMMAND);
  await expectNewTabLink(
    install.getByRole('link', {
      name: 'Get the skill on skills.sh (opens in a new tab)',
      exact: true,
    }),
    SKILLS_DIRECTORY_URL,
  );
  await expect(install.getByRole('link', { name: 'Pin a release' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/getting-started/'),
  );

  const initialize = page.locator('#initialize');
  await expect(initialize.locator('[data-conversation]')).toContainText('Initialize moldea');
  await expect(initialize.getByRole('listitem')).toContainText([
    "One question if the repository doesn't make the project's purpose clear.",
    'One confirmation before it registers agents your project already has.',
    "A block to add to AGENTS.md yourself if it can't edit that file.",
  ]);
  await expect(initialize.locator('[data-file-preview]')).toHaveCount(2);
  await expect(initialize.locator('[data-file-preview]').first()).toContainText('version: 1');

  const keepWorking = page.locator('#keep-working');
  await expect(
    keepWorking.getByRole('list', { name: 'Updated files' }).getByRole('listitem'),
  ).toHaveCount(4);
  await expect(keepWorking.getByRole('link', { name: 'How it works' })).toHaveAttribute(
    'href',
    toPublicPath('/how-it-works/'),
  );

  const fix = page.locator('#fix');
  await expect(fix.getByText('After you update the Skill', { exact: false })).toBeVisible();
  await expect(fix.locator('[data-repair-report] dt')).toHaveText([
    'Checked',
    'Fixed',
    'Verified',
    'Needs input',
    'Not checked',
  ]);
  await expect(fix.getByRole('link', { name: 'Repair guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/evaluate-reconcile-validate/#repair-a-project'),
  );
  await expect(fix.getByRole('link', { name: 'Update the Skill' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/getting-started/#update-or-remove-the-skill'),
  );

  await expectNewTabLink(
    page.getByRole('link', { name: 'Explore PR Assurance (opens in a new tab)', exact: true }),
    'https://moldea.ai/pr-assurance',
  );

  // only the install command is something a reader runs, so it alone offers copying
  await expect(page.getByRole('button', { name: 'Copy code', exact: true })).toHaveCount(1);
  await expect(page.locator('h1 code')).toHaveCount(0);

  const accessibilityResults = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibilityResults.violations).toStrictEqual([]);
});

test('copies the exact install command', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(route);

  const button = page
    .locator('#install [data-install-command]')
    .getByRole('button', { name: 'Copy code', exact: true });
  await button.focus();
  await button.press('Enter');

  await expect(button).toHaveAttribute('data-code-copy-state', 'copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(INSTALL_COMMAND);
});

for (const width of [320, 1440]) {
  test(`keeps the setup steps usable at ${width}px in both themes`, async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { height: 900, width },
      });
      try {
        const page = await context.newPage();
        await page.goto(route);

        const dimensions = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(dimensions.documentWidth, colorScheme).toBeLessThanOrEqual(dimensions.viewportWidth);

        const firstStep = page
          .getByRole('navigation', { name: 'Setup steps' })
          .getByRole('link', { name: 'Install' });
        // Website UI action links draw their keyboard focus indicator as a ring
        await firstStep.focus();
        await expect(firstStep).toBeFocused();
        await expect(firstStep).not.toHaveCSS('box-shadow', 'none');

        const accessibilityResults = await new AxeBuilder({ page })
          .include('main')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(accessibilityResults.violations, colorScheme).toStrictEqual([]);
      } finally {
        await context.close();
      }
    }
  });
}

test('keeps every step readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { height: 900, width: 320 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);

    for (const id of ['#before-you-start', '#install', '#initialize', '#keep-working', '#fix']) {
      await expect(page.locator(id)).toBeVisible();
    }
    await expect(page.locator('#install [data-install-command]')).toContainText(INSTALL_COMMAND);
    await expect(page.locator('#fix [data-repair-report]')).toContainText('Needs input');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
