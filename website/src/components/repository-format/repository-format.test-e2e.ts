import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { REPOSITORY_FORMAT_SPECIFICATION_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows the verified project growing from initialization to agent work', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const repositoryFormat = page.getByRole('region', {
    name: 'Your project. Your files.',
  });
  await expect(repositoryFormat).toBeVisible();
  await expect(repositoryFormat.getByText('my-store/', { exact: true })).toBeVisible();

  const initializedFiles = repositoryFormat.getByRole('list', {
    name: 'Files created at initialization',
  });
  await expect(initializedFiles.getByText('moldea.yaml', { exact: true })).toBeVisible();
  await expect(initializedFiles.getByText('project.md', { exact: true })).toBeVisible();

  const taskFiles = repositoryFormat.getByRole('list', {
    name: 'Agent files added for the task',
  });
  await expect(taskFiles.getByText('context/refund-policy.md', { exact: true })).toBeVisible();
  await expect(taskFiles.getByText('agents/support/instruction.md', { exact: true })).toBeVisible();

  const sourceFiles = repositoryFormat.getByRole('list', {
    name: 'Application and agent source files',
  });
  for (const path of [
    'agent.ts',
    'instructions.ts',
    'order-lookup.ts',
    'contracts.ts',
    'refund-policy.ts',
    'refund-policy.test-unit.ts',
  ]) {
    await expect(sourceFiles.getByText(path, { exact: true })).toBeVisible();
  }

  for (const benefit of ['Owned in Git', 'Connections are visible', 'Private by default']) {
    await expect(repositoryFormat.getByRole('heading', { level: 3, name: benefit })).toBeVisible();
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
      name: 'Your project. Your files.',
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
