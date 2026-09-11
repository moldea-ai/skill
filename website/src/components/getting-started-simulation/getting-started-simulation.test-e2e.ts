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

test('shows the recommended initialization journey and ordinary project work', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const simulation = page.getByLabel('Getting started simulation');
  await expect(
    page.getByRole('heading', { level: 2, name: 'One install. One ordinary request.' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Add the skill to your project and establish durable, Git-owned context. Initialization is the recommended starting point, and you can still begin with the outcome you want.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(simulation.getByText('npx skills add moldea-ai/skill')).toBeVisible();
  await expect(
    simulation.getByRole('heading', { level: 3, name: 'Install the skill.' }),
  ).toBeVisible();
  await expect(
    simulation.getByRole('heading', {
      level: 3,
      name: 'Establish the durable project foundation.',
    }),
  ).toBeVisible();
  const numberedSteps = simulation.locator(':scope > div > ol');
  const steps = numberedSteps.locator(':scope > li');
  await expect(steps).toHaveCount(3);

  const initializationStep = steps.nth(1);
  const initializationRequest = initializationStep.getByText('Initialize moldea', { exact: true });
  await expect(initializationRequest).toBeVisible();
  await expect(initializationRequest.locator('code')).toHaveText('moldea');
  await expect(simulation.getByText('Reads your project')).toBeVisible();
  await expect(simulation.getByText('Clarifies only when needed')).toBeVisible();
  await expect(
    simulation.getByText(
      'If a material gap remains, it asks one focused question. Reply naturally, and it continues.',
    ),
  ).toBeVisible();
  await expect(simulation.getByText('Builds and checks grounded context')).toBeVisible();
  await expect(simulation.getByText(/Keep working with your coding agent as usual/)).toBeVisible();

  const agentPanel = simulation.locator('[data-getting-started-agent-panel]');
  const ordinaryWork = steps.nth(2);
  await expect(ordinaryWork).toHaveAttribute('data-getting-started-ordinary-work', '');
  await expect(ordinaryWork.getByText('03', { exact: true })).toBeVisible();
  await expect(
    ordinaryWork.getByRole('heading', { level: 3, name: 'Describe the outcome naturally.' }),
  ).toBeVisible();
  await expect(
    ordinaryWork.getByText('Create a support agent grounded in our current refund policy.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    initializationStep.getByText('Create a support agent grounded in our current refund policy.'),
  ).toHaveCount(0);
  await expect(agentPanel.locator('[data-getting-started-ordinary-work]')).toHaveCount(0);
  await expect(agentPanel.locator('[data-getting-started-completion]')).toHaveCount(1);
});

test('keeps text selection visible across its dark and light surfaces', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const simulation = page.getByLabel('Getting started simulation');
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

    const simulationWidths = await simulation.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(simulationWidths.scroll).toBeLessThanOrEqual(simulationWidths.client);

    await context.close();
  }
});
