import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { REPOSITORY_FORMAT_SPECIFICATION_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows the verified project as one connected filesystem', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const repositoryFormat = page.getByRole('region', {
    name: 'Project context lives beside the code.',
  });
  await expect(repositoryFormat).toBeVisible();
  await expect(repositoryFormat.getByText('my-store/', { exact: true })).toBeVisible();

  const filesystem = repositoryFormat.getByRole('list', {
    name: 'Example project filesystem',
  });
  for (const path of [
    'moldea/',
    'moldea.yaml',
    'project.md',
    'context/',
    'refund-policy.md',
    'agents/',
    'support/',
    'description.md',
    'instruction.md',
    'src/',
    'agent.ts',
    'instructions.ts',
    'order-lookup.ts',
    'contracts.ts',
    'refund-policy.ts',
    'refund-policy.test-unit.ts',
  ]) {
    await expect(filesystem.getByText(path, { exact: true })).toBeVisible();
  }

  for (const benefit of ['One visible home', 'Easy to inspect', 'Clear and checkable']) {
    await expect(repositoryFormat.getByRole('heading', { level: 3, name: benefit })).toBeVisible();
  }

  const [filesystemBounds, benefitsBounds] = await Promise.all([
    repositoryFormat.locator('[data-repository-format-filesystem]').boundingBox(),
    repositoryFormat.locator('[data-repository-format-benefits]').boundingBox(),
  ]);
  expect(filesystemBounds).not.toBeNull();
  expect(benefitsBounds).not.toBeNull();
  if (filesystemBounds && benefitsBounds) {
    expect(Math.abs(filesystemBounds.height - benefitsBounds.height)).toBeLessThan(2);
  }

  await expect(
    repositoryFormat.getByRole('link', { name: 'Read the safety model' }),
  ).toHaveAttribute('href', toPublicPath('/docs/safety-and-privacy/'));
  const guideLink = repositoryFormat.getByRole('link', { name: 'Explore the format' });
  await expect(guideLink).toHaveAttribute('href', toPublicPath('/docs/repository-format/'));

  await guideLink.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Repository format' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'official Repository Format specification' }).first(),
  ).toHaveAttribute('href', REPOSITORY_FORMAT_SPECIFICATION_URL);
});

test('stacks the filesystem and benefits accessibly at 320px in both themes', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const repositoryFormat = page.getByRole('region', {
      name: 'Project context lives beside the code.',
    });
    const fileSystem = repositoryFormat.locator('[data-repository-format-filesystem]');
    const benefits = repositoryFormat.locator('[data-repository-format-benefits]');
    const [fileSystemBounds, benefitsBounds] = await Promise.all([
      fileSystem.boundingBox(),
      benefits.boundingBox(),
    ]);

    expect(fileSystemBounds).not.toBeNull();
    expect(benefitsBounds).not.toBeNull();
    if (fileSystemBounds && benefitsBounds) {
      expect(benefitsBounds.y).toBeGreaterThanOrEqual(fileSystemBounds.y + fileSystemBounds.height);
    }

    const widths = await repositoryFormat.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    const accessibilityResults = await new AxeBuilder({ page })
      .include('[data-repository-format]')
      .analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await context.close();
  }
});
