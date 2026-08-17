import { expect, test } from '@playwright/test';

import { DEFAULT_BASE_PATH, withBase } from '../../lib/site/url.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('uses the theme-aware brand mark for skill guidance', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const underTheHoodConversation = page
      .getByRole('heading', { level: 3, name: 'Coding agent ↔ skill' })
      .locator('..')
      .locator('..');
    const visibleSkillMark = underTheHoodConversation.locator('[data-skill-guidance-mark]:visible');

    await expect(underTheHoodConversation.getByText('Skill guidance')).toBeVisible();
    await expect(visibleSkillMark).toHaveCount(1);
    await expect(visibleSkillMark).toHaveAttribute(
      'src',
      toPublicPath(`/logo/icon-xs-${colorScheme}.png`),
    );
    await expect(visibleSkillMark).toHaveAttribute('width', '207');
    await expect(visibleSkillMark).toHaveAttribute('height', '215');

    await context.close();
  }
});
