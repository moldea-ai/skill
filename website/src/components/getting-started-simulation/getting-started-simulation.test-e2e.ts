import { expect, test, type Locator } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const getSurfaceSelectionColors = (surface: Locator) => {
  return surface.evaluate((element) => {
    const surfaceStyle = getComputedStyle(element);
    const selectionStyle = getComputedStyle(element, '::selection');

    return {
      background: surfaceStyle.backgroundColor,
      color: surfaceStyle.color,
      selectionBackground: selectionStyle.backgroundColor,
      selectionColor: selectionStyle.color,
    };
  });
};

test('shows the complete initialization journey including conditional clarification', async ({
  page,
}) => {
  await page.goto(toPublicPath('/'));

  const simulation = page.getByLabel('Getting started simulation');
  await expect(
    page.getByRole('heading', { level: 2, name: 'One install. One ordinary request.' }),
  ).toBeVisible();
  await expect(simulation.getByText('npx skills add moldea-ai/skill')).toBeVisible();
  await expect(simulation.getByText('Initialize moldea')).toBeVisible();
  await expect(simulation.getByText('Reads your project')).toBeVisible();
  await expect(simulation.getByText('Clarifies only when needed')).toBeVisible();
  await expect(
    simulation.getByText(
      'If a material gap remains, it asks one focused question. Reply naturally, and it continues.',
    ),
  ).toBeVisible();
  await expect(simulation.getByText('Builds and checks grounded context')).toBeVisible();
  await expect(simulation.getByText(/Keep working with your coding agent as usual/)).toBeVisible();
});

test('keeps text selection visible across its dark and light surfaces', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const agentPanel = page.locator('[data-getting-started-agent-panel]');
    const completion = page.locator('[data-getting-started-completion]');
    const [agentPanelColors, completionColors] = await Promise.all([
      getSurfaceSelectionColors(agentPanel),
      getSurfaceSelectionColors(completion),
    ]);

    expect(agentPanelColors.selectionBackground).not.toBe(agentPanelColors.background);
    expect(agentPanelColors.selectionColor).toBe(agentPanelColors.color);
    expect(completionColors.selectionBackground).toBe(completionColors.color);
    expect(completionColors.selectionColor).toBe(completionColors.background);

    await context.close();
  }
});
