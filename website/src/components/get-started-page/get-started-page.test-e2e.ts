import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import {
  GIT_VERSION_RANGE,
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

/**
 * Reads each file row's path and change state from an example tree, in display order.
 * @param tree The example file tree.
 * @returns The rows as path and status pairs.
 */
const getTreeStatuses = async (tree: Locator): Promise<string[][]> =>
  tree
    .locator('[data-project-file-path]')
    .evaluateAll((rows) =>
      rows.map((row) => [
        row.getAttribute('data-project-file-path') ?? '',
        row.getAttribute('data-file-status') ?? '',
      ]),
    );

test('walks through the requirements and four setup steps in order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(page).toHaveTitle(`Get started · ${SITE_NAME}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Get started with moldea' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  // role locators skip the headings of closed file dialogs
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Before you start',
    'Add the Skill to your repository.',
    'Map the areas that matter.',
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
  await expect(requirements).toHaveCount(3);
  await expect(requirements.nth(0).getByRole('link')).toHaveAttribute(
    'href',
    toPublicPath('/docs/coding-agent-compatibility/'),
  );
  await expect(requirements.nth(1)).toContainText(NODE_VERSION_RANGE);
  await expect(requirements.nth(2)).toContainText(GIT_VERSION_RANGE);
  await expect(requirements.nth(1)).toContainText('needs no package.json');

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
  // the guided conversation is much taller than its text, so the columns align at the top
  await expect(initialize).toHaveCSS('align-items', 'flex-start');
  await expect(page.locator('#keep-working')).toHaveCSS('align-items', 'center');
  const messages = initialize.locator('[data-conversation-message]');
  await expect(messages).toHaveCount(6);
  await expect(messages.nth(0)).toContainText('Initialize moldea');
  await expect(messages.nth(1)).toContainText('Round 1');
  await expect(messages.nth(1)).toContainText('Coverage: 0 of 2 areas. Agents: none found.');
  await expect(messages.nth(1)).toContainText('Files changed: README.md, AGENTS.md');
  await expect(messages.nth(1)).toContainText('Gaps: Refunds and Orders.');
  await expect(messages.nth(1).getByRole('listitem')).toContainText('src/refund-policy.ts');
  await expect(messages.nth(2)).toContainText('Yes');
  await expect(messages.nth(3).getByRole('listitem')).toHaveText([
    'Continue with Orders.',
    'Stop here and validate the covered scope.',
  ]);
  await expect(messages.nth(4)).toContainText('Stop here.');
  await expect(messages.nth(5)).toContainText('Coverage: 1 of 2 areas.');
  await expect(messages.nth(5)).toContainText('Orders remains uncovered.');
  await expect(messages.nth(5)).toContainText('Structural validation passed');
  expect(
    await getTreeStatuses(
      initialize.getByRole('list', { name: 'Files initialization adds and updates' }),
    ),
  ).toStrictEqual([
    ['/src/order-lookup.ts', 'Unchanged'],
    ['/src/refund-policy.ts', 'Unchanged'],
    ['/src/refund-policy.test-unit.ts', 'Unchanged'],
    ['/moldea/moldea.yaml', 'Added'],
    ['/moldea/project.md', 'Added'],
    ['/moldea/context/refund-policy.md', 'Added'],
    ['/AGENTS.md', 'Modified'],
    ['/README.md', 'Modified'],
  ]);

  const keepWorking = page.locator('#keep-working');
  expect(
    await getTreeStatuses(
      keepWorking.getByRole('list', { name: 'Files the policy change updates' }),
    ),
  ).toStrictEqual([
    ['/src/order-lookup.ts', 'Unchanged'],
    ['/src/refund-policy.ts', 'Modified'],
    ['/src/refund-policy.test-unit.ts', 'Modified'],
    ['/moldea/context/refund-policy.md', 'Modified'],
    ['/moldea/moldea.yaml', 'Unchanged'],
    ['/moldea/project.md', 'Unchanged'],
  ]);
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
  await expect(fix.getByRole('link', { name: 'Check and fix guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/check-fix-validate/#fix-a-project'),
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

test('opens example files from the trees with the keyboard and returns focus', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    try {
      const page = await context.newPage();
      await page.goto(route);

      for (const file of [
        { trigger: 'Open /README.md, modified', title: 'README', content: '<!-- moldea:start -->' },
        { trigger: 'Open /moldea/moldea.yaml, added', title: 'Manifest', content: 'version: 1' },
        {
          trigger: 'Open /src/refund-policy.ts, modified',
          title: 'Refund rule',
          content: 'completedDays <= 14',
        },
      ]) {
        const trigger = page.getByRole('button', { name: file.trigger, exact: true });
        await trigger.focus();
        await trigger.press('Enter');

        const dialog = page.getByRole('dialog', { name: file.title, exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(file.content);
        if (file.trigger.endsWith('modified')) {
          await expect(
            dialog.getByRole('region', { name: `${file.title} changes`, exact: true }),
          ).toHaveAttribute('data-code-diff', 'unified');
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        const accessibilityResults = await new AxeBuilder({ page })
          .include('dialog[open]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(accessibilityResults.violations, colorScheme).toStrictEqual([]);

        await dialog.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
    } finally {
      await context.close();
    }
  }
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
    await expect(page.locator('#initialize [data-project-file-path]')).toHaveCount(8);
    await expect(page.locator('#initialize [data-project-file-path]').last()).toContainText(
      'README.md',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
