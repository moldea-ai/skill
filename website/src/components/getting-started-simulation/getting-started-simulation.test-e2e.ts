import { expect, test } from '@playwright/test';

import { DEFAULT_BASE_PATH, withBase } from '../../lib/site/url.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows the complete initialization journey including conditional clarification', async ({
  page,
}) => {
  await page.goto(toPublicPath('/'));

  const simulation = page.getByLabel('Getting started simulation');
  await expect(
    page.getByRole('heading', { level: 2, name: 'One install. One ordinary request.' }),
  ).toBeVisible();
  await expect(simulation.getByText('npx skills add moldea-ai/skill')).toBeVisible();
  await expect(simulation.getByText('Initialize moldea for this repository.')).toBeVisible();
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
