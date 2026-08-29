// @vitest-environment node
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { REPOSITORY_FORMAT_SPECIFICATION_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('connects a root-level repository to its implementation and guide', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const repositoryFormat = page.getByRole('region', {
    name: 'Start with two files. Add structure only when it earns a home.',
  });
  await expect(repositoryFormat).toBeVisible();

  const fileSystem = repositoryFormat.getByRole('list', {
    name: 'Example project filesystem',
  });
  await expect(fileSystem).toBeVisible();
  await expect(fileSystem.getByText('my-platform/', { exact: true })).toBeVisible();

  const moldeaBranch = fileSystem.locator('[data-project-root-branch="moldea"]');
  const sourceBranch = fileSystem.locator('[data-project-root-branch="src"]');
  await expect(moldeaBranch.getByText('moldea/', { exact: true })).toBeVisible();
  await expect(sourceBranch.getByText('src/', { exact: true })).toBeVisible();

  for (const path of [
    'moldea.yaml',
    'project.md',
    'support-policy.md',
    'customer-data.md',
    'support-agent/',
  ]) {
    await expect(moldeaBranch.getByText(path, { exact: true })).toBeVisible();
  }
  await expect(moldeaBranch.getByLabel('Additional agent directories')).toContainText('...');

  for (const path of ['support-agent.ts', 'support-tools.ts']) {
    await expect(sourceBranch.getByText(path, { exact: true })).toBeVisible();
  }
  await expect(sourceBranch.getByLabel('Additional agent implementations')).toContainText('...');
  await expect(sourceBranch.getByLabel('Additional source files and directories')).toContainText(
    '...',
  );

  const organizationLayers = repositoryFormat.getByRole('list', {
    name: 'How the Repository format scales',
  });
  await expect(organizationLayers.getByRole('listitem')).toHaveCount(3);

  const [fileSystemBounds, moldeaBounds, sourceBounds, organizationLayersBounds] =
    await Promise.all([
      repositoryFormat.locator('[data-repository-format-filesystem]').boundingBox(),
      moldeaBranch.boundingBox(),
      sourceBranch.boundingBox(),
      organizationLayers.boundingBox(),
    ]);

  expect(fileSystemBounds).not.toBeNull();
  expect(moldeaBounds).not.toBeNull();
  expect(sourceBounds).not.toBeNull();
  expect(organizationLayersBounds).not.toBeNull();

  if (fileSystemBounds && moldeaBounds && sourceBounds && organizationLayersBounds) {
    expect(sourceBounds.y).toBeGreaterThanOrEqual(moldeaBounds.y + moldeaBounds.height);
    expect(organizationLayersBounds.x).toBeGreaterThanOrEqual(
      fileSystemBounds.x + fileSystemBounds.width,
    );
    expect(Math.abs(fileSystemBounds.height - organizationLayersBounds.height)).toBeLessThanOrEqual(
      1,
    );
  }

  await expect(
    repositoryFormat.getByRole('heading', { name: 'Project truth has one visible home.' }),
  ).toBeVisible();
  await expect(
    repositoryFormat.getByRole('heading', { name: 'Behavior stays focused and reviewable.' }),
  ).toBeVisible();
  await expect(
    repositoryFormat.getByRole('heading', { name: 'Connections remain inspectable.' }),
  ).toBeVisible();

  const guideLink = repositoryFormat.getByRole('link', {
    name: 'Explore the Repository format',
  });
  await expect(guideLink).toHaveAttribute('href', toPublicPath('/docs/repository-format/'));

  await guideLink.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Repository format' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Start with two files' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'official Repository Format specification' }).first(),
  ).toHaveAttribute('href', REPOSITORY_FORMAT_SPECIFICATION_URL);
});

test('stacks the filesystem and cards accessibly at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const repositoryFormat = page.getByRole('region', {
      name: 'Start with two files. Add structure only when it earns a home.',
    });
    const fileSystem = repositoryFormat.locator('[data-repository-format-filesystem]');
    const organizationLayers = repositoryFormat.locator('[data-repository-format-layers]');
    const [fileSystemBounds, organizationLayersBounds] = await Promise.all([
      fileSystem.boundingBox(),
      organizationLayers.boundingBox(),
    ]);

    expect(fileSystemBounds).not.toBeNull();
    expect(organizationLayersBounds).not.toBeNull();

    if (fileSystemBounds && organizationLayersBounds) {
      expect(organizationLayersBounds.y).toBeGreaterThanOrEqual(
        fileSystemBounds.y + fileSystemBounds.height,
      );
    }

    const documentWidths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(documentWidths.scroll).toBeLessThanOrEqual(documentWidths.client);

    const accessibilityResults = await new AxeBuilder({ page })
      .include('[data-repository-format]')
      .analyze();
    const materialViolations = accessibilityResults.violations.filter(
      ({ impact }) => impact === 'critical' || impact === 'serious',
    );
    expect(
      materialViolations,
      `The Repository format section has material accessibility violations in ${colorScheme} mode`,
    ).toStrictEqual([]);
    await context.close();
  }
});
