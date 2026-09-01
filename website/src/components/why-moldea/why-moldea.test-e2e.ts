import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('connects coding-agent work to three durable outcomes', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const whyMoldea = page.getByRole('region', {
    name: 'Turn coding-agent work into durable project infrastructure.',
  });
  await expect(whyMoldea).toBeVisible();
  await expect(whyMoldea.locator('.eyebrow code')).toHaveText('moldea');
  await expect(whyMoldea.getByRole('link', { name: 'See evidence' })).toHaveAttribute(
    'href',
    toPublicPath('/evidence/'),
  );
  await expect(
    whyMoldea.getByText(
      'Your coding agent can inspect a repository, write instructions, and add checks.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    whyMoldea.getByText(
      'Without a common format and operating method, every team has to define and maintain its own conventions, validators, runtime analyzers, and handoff process.',
      { exact: false },
    ),
  ).toBeVisible();

  for (const outcome of [
    'Memory that outlives the session',
    'Behavior that evolves with the code',
    'Verification beyond model confidence',
  ]) {
    await expect(whyMoldea.getByRole('heading', { level: 3, name: outcome })).toBeVisible();
  }

  await expect(whyMoldea.locator('ol > li')).toHaveCount(3);

  const parallelContentBoxes = await whyMoldea
    .locator('[data-why-moldea-narrative], [data-why-moldea-outcomes]')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const { height, top } = element.getBoundingClientRect();

        return { height: Math.round(height), top: Math.round(top) };
      }),
    );
  expect(new Set(parallelContentBoxes.map(({ top }) => top)).size).toBe(1);
  expect(new Set(parallelContentBoxes.map(({ height }) => height)).size).toBe(1);
});

test('keeps stacked outcome copy compact at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const outcomeCopyGaps = await page
    .locator('[data-why-moldea-outcomes] > li')
    .evaluateAll((outcomes) =>
      outcomes.map((outcome) => {
        const heading = outcome.querySelector('h3');
        const description = outcome.querySelector('p');
        if (heading === null || description === null) {
          throw new Error('Expected each outcome to contain a heading and description.');
        }

        return Math.round(
          description.getBoundingClientRect().top - heading.getBoundingClientRect().bottom,
        );
      }),
    );

  expect(outcomeCopyGaps).toHaveLength(3);
  outcomeCopyGaps.forEach((gap) => {
    expect(gap).toBeLessThanOrEqual(8);
  });
});
