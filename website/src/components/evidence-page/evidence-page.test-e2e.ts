import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

import {
  getProjectPatchPaths,
  getRecordedWorkspace,
  getSemanticPreviewCase,
} from './presentation.ts';

const toPublicPath = (route: string): string =>
  withBase(route, process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

test('presents each evidence source as a navigable section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(toPublicPath('/evidence/'));
  const projectCount =
    loadWebsiteModel().projectRuns?.pages.reduce(
      (count, { attempts }) => count + attempts.length,
      0,
    ) ?? 0;
  const sections = page.locator('[data-evidence-path]');
  await expect(sections).toHaveCount(3);
  const navigation = page.getByRole('navigation', { name: 'Evidence sections' });
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(navigation.getByRole('link', { name: /Agent decisions/u })).toHaveAttribute(
    'href',
    '#decisions',
  );
  await expect(navigation.getByRole('link', { name: /Project connections/u })).toHaveAttribute(
    'href',
    '#integrations',
  );
  await expect(navigation.getByRole('link', { name: /Coding projects/u })).toContainText(
    `${projectCount} projects`,
  );
  await expect(sections.locator('[data-evidence-path-action]').getByRole('link')).toHaveText([
    'Explore decisions',
    'Browse connection tests',
    'Explore project runs',
  ]);
  const boxes = await sections.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
  expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
  await expect(sections.last().locator('[data-evidence-status]')).toHaveCount(0);
  await expect(sections.last().locator('[data-recorded-project]')).toHaveCount(1);
  await expect(
    sections.last().getByRole('link', { name: /View .* more project runs/u }),
  ).toHaveCount(0);
  const projectPreview = loadWebsiteModel().projectRuns!.pages[0]!.attempts[0]!;
  await expect(
    sections.last().getByRole('link', { name: 'Open the recorded session' }),
  ).toHaveAttribute('href', toPublicPath(projectPreview.route));
  const projectCopy = sections.last().getByRole('heading', { level: 2 }).locator('..');
  expect(await projectCopy.evaluate((element) => getComputedStyle(element).position)).toBe(
    'static',
  );
  const changeCase = getSemanticPreviewCase(
    loadWebsiteModel().semanticEvaluation,
    'bound-context-maintenance',
  );
  await expect(
    sections.first().locator('[data-recorded-change] [data-evidence-status]'),
  ).toHaveCount(changeCase === null ? 0 : 1);
  const decisionCopy = sections.first().getByRole('heading', { level: 2 }).locator('..');
  await expect(decisionCopy.locator('[data-evidence-status]')).toHaveCount(0);
  await expect(
    page.locator('[data-recorded-agent] [data-evidence-status="recovered"]'),
  ).toHaveCount(0);
  expect(
    await sections.last().evaluate((element) => getComputedStyle(element).borderBottomWidth),
  ).toBe('0px');
  expect(
    await page.locator('footer').evaluate((element) => getComputedStyle(element).borderTopWidth),
  ).toBe('1px');
  for (const section of await sections.all()) {
    const action = section.locator('[data-evidence-path-action]');
    const link = action.getByRole('link');
    const [actionBox, linkBox] = await Promise.all([action.boundingBox(), link.boundingBox()]);
    expect(actionBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    expect(Math.abs(actionBox!.width - linkBox!.width)).toBeLessThan(2);
    const colors = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.background).not.toBe(colors.foreground);
  }
});

test('matches the other hero proportions and keeps the primary CTA keyboard accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(toPublicPath('/evidence/'));
  const hero = page.locator('[data-evidence-hero]');
  const [copyBounds, exampleBounds] = await Promise.all([
    hero.locator(':scope > div').boundingBox(),
    hero.locator('[data-recorded-agent]').boundingBox(),
  ]);
  expect(copyBounds).not.toBeNull();
  expect(exampleBounds).not.toBeNull();
  expect(exampleBounds!.width / copyBounds!.width).toBeCloseTo(1 / 0.9, 2);

  const navigation = page.getByRole('navigation', { name: 'Evidence sections' });
  await navigation.getByRole('link').last().focus();
  await page.keyboard.press('Tab');
  const primaryCta = page.getByRole('link', { name: 'Explore decisions', exact: true });
  await expect(primaryCta).toBeFocused();
  expect(await primaryCta.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe(
    'none',
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${toPublicPath('/evidence/semantic/')}$`, 'u'));
});

test('keeps evidence paths readable at 320px in both themes', async ({ browser }) => {
  const model = loadWebsiteModel();
  const agentCase = getSemanticPreviewCase(
    model.semanticEvaluation,
    'agent-adoption-inline-runtime-instruction',
  );
  const changeCase = getSemanticPreviewCase(model.semanticEvaluation, 'bound-context-maintenance');
  const expectedPaths = [
    ...(getRecordedWorkspace(
      agentCase?.replay ?? null,
      (path) =>
        path.startsWith('src/') ||
        path.endsWith('/instruction.md') ||
        path === 'moldea/moldea.yaml',
    )?.paths ?? []),
    ...(getRecordedWorkspace(changeCase?.replay ?? null)?.paths ?? []),
    ...getProjectPatchPaths(model.projectRuns!.pages[0]!.attempts[0]!),
  ].map(({ path }) => path);
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    try {
      const page = await context.newPage();
      await page.goto(toPublicPath('/evidence/'));
      await expect(page.locator('[data-evidence-path]')).toHaveCount(3);
      const logoBoxes = await page.locator('[data-adapter-logos] img').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { top: box.top, left: box.left, right: box.right };
        }),
      );
      expect(logoBoxes.length).toBeGreaterThan(0);
      expect(
        Math.max(...logoBoxes.map(({ top }) => top)) - Math.min(...logoBoxes.map(({ top }) => top)),
      ).toBeLessThan(2);
      const logoRow = await page.locator('[data-adapter-logos]').boundingBox();
      expect(logoRow).not.toBeNull();
      const marksCenter = (logoBoxes[0]!.left + logoBoxes.at(-1)!.right) / 2;
      expect(Math.abs(marksCenter - (logoRow!.x + logoRow!.width / 2))).toBeLessThan(2);
      const recordedFiles = page.locator('[data-recorded-file-path]');
      expect(
        await recordedFiles.evaluateAll((files) =>
          files.map((file) => file.getAttribute('data-recorded-file-path')).sort(),
        ),
      ).toStrictEqual([...expectedPaths].sort());
      for (const file of await recordedFiles.all()) {
        const path = await file.getAttribute('data-recorded-file-path');
        expect(await file.ariaSnapshot()).toContain(path!);
        const filename = file.locator('code');
        const dimensions = await filename.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            height: element.getBoundingClientRect().height,
            lineHeight: Number.parseFloat(style.lineHeight),
            whiteSpace: style.whiteSpace,
          };
        });
        expect(dimensions.whiteSpace).toBe('nowrap');
        expect(dimensions.height).toBeLessThanOrEqual(dimensions.lineHeight + 1);
        await expect(file.locator('[data-file-preview], [data-status-badge]')).toHaveCount(0);
      }
      await page
        .locator('[data-recorded-connection] [data-file-preview] code[title]')
        .first()
        .evaluate((element) => {
          const directory = element.querySelector('span');
          if (directory === null) throw new Error('Expected a recorded file directory.');
          directory.textContent = '[redacted]/recorded-project/long-repository-prefix/moldea';
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
      ).toStrictEqual([]);
    } finally {
      await context.close();
    }
  }
});

test('keeps the test examples and project links readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(toPublicPath('/evidence/'));
    await expect(page.locator('[data-recorded-agent]')).toContainText(
      'Finish the support agent. Connect its maintained instructions to both model calls',
    );
    await expect(page.locator('[data-recorded-change]')).toContainText(
      'Run document cleanup more often when the backlog grows.',
    );
    await expect(page.locator('[data-recorded-connection]')).toContainText(
      'The declared tool name did not match the code.',
    );
    await expect(page.locator('[data-recorded-project]')).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: 'Open the recorded session', exact: true }),
    ).toHaveCount(1);
  } finally {
    await context.close();
  }
});
