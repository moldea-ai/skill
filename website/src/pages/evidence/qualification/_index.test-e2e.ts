import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('represents the current qualification evidence state', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Adapter qualification evidence' }),
  ).toBeVisible();
  const customProfileLink = page.getByRole('link', { name: /Custom runtime qualification/ });
  await expect(
    customProfileLink.locator('[data-evidence-status][data-evidence-status="passed"]'),
  ).toBeVisible();
  await expect(customProfileLink.getByRole('img', { name: 'Custom adapter icon' })).toBeVisible();
  await expect(customProfileLink.locator('img')).toHaveCount(0);
  await expect(
    customProfileLink.getByText('Attempts', { exact: true }).locator('..'),
  ).toContainText('5');

  const anthropicProfileLink = page.getByRole('link', {
    name: /Anthropic Messages API qualification/,
  });
  await expect(
    anthropicProfileLink.locator('[data-evidence-status][data-evidence-status="passed"]'),
  ).toBeVisible();
  const anthropicCompanyLogo = anthropicProfileLink.getByAltText('Anthropic company logo');
  await expect(anthropicCompanyLogo).toBeVisible();
  await expect(
    anthropicProfileLink.getByText('Attempts', { exact: true }).locator('..'),
  ).toContainText('1');

  const claudeProfileLink = page.getByRole('link', {
    name: /Claude Agent SDK qualification/,
  });
  await expect(
    claudeProfileLink.locator('[data-evidence-status][data-evidence-status="failed"]'),
  ).toBeVisible();
  await expect(claudeProfileLink.getByAltText('Anthropic company logo')).toBeVisible();
  await expect(
    claudeProfileLink.getByText('Attempts', { exact: true }).locator('..'),
  ).toContainText('1');

  const vercelProfileLink = page.getByRole('link', {
    name: /Vercel AI SDK direct generation qualification/,
  });
  await expect(
    vercelProfileLink.locator('[data-evidence-status][data-evidence-status="passed"]'),
  ).toBeVisible();
  await expect(vercelProfileLink.getByAltText('Vercel company logo')).toBeVisible();
  await expect(
    vercelProfileLink.getByText('Attempts', { exact: true }).locator('..'),
  ).toContainText('2');

  const toolLoopProfileLink = page.getByRole('link', {
    name: /Vercel AI SDK ToolLoopAgent qualification/,
  });
  await expect(
    toolLoopProfileLink.locator('[data-evidence-status][data-evidence-status="passed"]'),
  ).toBeVisible();
  await expect(toolLoopProfileLink.getByAltText('Vercel company logo')).toBeVisible();
  await expect(
    toolLoopProfileLink.getByText('Attempts', { exact: true }).locator('..'),
  ).toContainText('2');

  const openAiResponsesProfileLink = page.getByRole('link', {
    name: /OpenAI Responses API qualification/,
  });
  await expect(openAiResponsesProfileLink.getByAltText('OpenAI company logo')).toBeVisible();

  const openAiAgentsProfileLink = page.getByRole('link', {
    name: /OpenAI Agents SDK qualification/,
  });
  await expect(openAiAgentsProfileLink.getByAltText('OpenAI company logo')).toBeVisible();

  const anthropicCompanyLogos = page.getByAltText('Anthropic company logo');
  const openAiCompanyLogos = page.getByAltText('OpenAI company logo');
  const vercelCompanyLogos = page.getByAltText('Vercel company logo');

  await expect(anthropicCompanyLogos).toHaveCount(2);
  await expect(openAiCompanyLogos).toHaveCount(2);
  await expect(vercelCompanyLogos).toHaveCount(2);
  await expect
    .poll(() =>
      vercelCompanyLogos.evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      openAiCompanyLogos.evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      anthropicCompanyLogos.evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(
    await vercelCompanyLogos.first().evaluate((element) => getComputedStyle(element).filter),
  ).not.toBe('none');
  expect(
    await openAiCompanyLogos.first().evaluate((element) => getComputedStyle(element).filter),
  ).not.toBe('none');
  expect(
    await anthropicCompanyLogos.evaluateAll((images) =>
      images.every((image) => getComputedStyle(image).filter === 'none'),
    ),
  ).toBe(true);
});

test('presents the recorded Anthropic profile', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/anthropic/typescript-messages-api-0-117/'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Anthropic Messages API qualification' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '10 realistic journeys' })).toBeVisible();
  await expect(page.locator('[data-evidence-status="passed"]').first()).toBeVisible();
  await expect(page.getByText(/No protocol 6 Sol attempt has been committed/u)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inspect the passing attempt' })).toHaveAttribute(
    'href',
    /\/evidence\/qualification\/anthropic\/typescript-messages-api-0-117\/attempts\//u,
  );
});

test('presents the recorded Custom and Vercel results', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/custom/custom/'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Custom runtime qualification' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '8 realistic journeys' })).toBeVisible();
  await expect(page.locator('[data-evidence-status="passed"]').first()).toBeVisible();
  await expect(page.getByText(/No protocol 6 Sol attempt has been committed/u)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inspect the passing attempt' })).toHaveAttribute(
    'href',
    /\/evidence\/qualification\/custom\/custom\/attempts\//u,
  );

  await page.goto(
    toPublicPath('/evidence/qualification/vercel-ai-sdk/typescript-generate-stream-text-7/'),
  );
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vercel AI SDK direct generation qualification',
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '10 realistic journeys' })).toBeVisible();
  await expect(page.locator('[data-evidence-status="passed"]').first()).toBeVisible();
  await expect(page.getByText(/No protocol 6 Sol attempt has been committed/u)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inspect the passing attempt' })).toHaveAttribute(
    'href',
    /\/evidence\/qualification\/vercel-ai-sdk\/typescript-generate-stream-text-7\/attempts\//u,
  );

  await page.goto(
    toPublicPath('/evidence/qualification/vercel-ai-sdk/typescript-tool-loop-agent-7/'),
  );
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vercel AI SDK ToolLoopAgent qualification',
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '10 realistic journeys' })).toBeVisible();
  await expect(page.locator('[data-evidence-status="passed"]').first()).toBeVisible();
  await expect(page.getByText(/No protocol 6 Sol attempt has been committed/u)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inspect the passing attempt' })).toHaveAttribute(
    'href',
    /\/evidence\/qualification\/vercel-ai-sdk\/typescript-tool-loop-agent-7\/attempts\//u,
  );
});

test('replays qualification evidence through human-readable and technical views', async ({
  page,
}) => {
  await page.goto(toPublicPath('/evidence/qualification/custom/custom/'));
  const attemptRoute = await page
    .getByRole('link', { name: 'Inspect the passing attempt' })
    .getAttribute('href');
  if (attemptRoute === null) throw new Error('The Custom profile has no passing attempt route.');
  await page.goto(attemptRoute);

  const journey = page
    .locator('main details')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Create a grounded agent' }) })
    .first();
  await journey.locator(':scope > summary').click();

  const replayTab = journey.getByRole('tab', { name: 'Replay' });
  const evidenceTab = journey.getByRole('tab', { name: 'Evidence' });
  const technicalTab = journey.getByRole('tab', { name: 'Technical' });
  await expect(replayTab).toHaveAttribute('aria-selected', 'true');
  await expect(evidenceTab).toHaveAttribute('aria-selected', 'false');
  await expect(technicalTab).toHaveAttribute('aria-selected', 'false');
  await expect(journey.getByText('Developer', { exact: true })).toBeVisible();
  await expect(journey.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(journey.getByText('Deterministic verifier', { exact: true })).toBeVisible();
  const developerMessage = journey.locator('article').filter({ hasText: 'DEVELOPER' }).first();
  await expect(developerMessage).toContainText('Add the order-triage agent');
  await expect(developerMessage).toContainText('createOrderTriageAgent');
  await expect(journey.getByRole('heading', { name: 'Workspace changes' })).toBeVisible();
  await expect(journey.getByTitle('moldea/agents/order-triage/description.md')).toBeVisible();
  const verdict = journey.locator('[data-replay-verdict]').first();
  await expect(verdict.getByText('Trial verdict', { exact: true })).toBeVisible();
  await verdict.locator('summary').click();
  await expect(verdict.getByRole('heading', { name: 'Why it passed' })).toBeVisible();

  await replayTab.focus();
  await replayTab.press('ArrowRight');
  await expect(evidenceTab).toBeFocused();
  await expect(evidenceTab).toHaveAttribute('aria-selected', 'true');
  await expect(journey.getByRole('heading', { name: 'What had to happen' })).toBeVisible();
  await expect(journey.getByRole('heading', { name: 'What must not happen' })).toBeVisible();
  await expect(journey.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
  await expect(journey.getByRole('heading', { name: 'Requirement results' })).toBeVisible();

  await evidenceTab.press('End');
  await expect(technicalTab).toBeFocused();
  await expect(technicalTab).toHaveAttribute('aria-selected', 'true');
  await expect(journey.getByRole('heading', { name: 'Complete trial evidence' })).toBeVisible();
  const initialTrial = journey
    .getByRole('heading', { level: 5, name: 'Initial trial' })
    .locator('xpath=ancestor::article[1]');
  await initialTrial.locator('summary').first().click();
  await expect(initialTrial.getByRole('heading', { name: 'Deterministic evidence' })).toBeVisible();
  await expect(initialTrial.getByText('Commands recorded:', { exact: false })).toBeVisible();
  await expect(
    initialTrial.getByText(/Operational retries \(0\) and committed trial artifacts/u),
  ).toBeVisible();
});

test('keeps qualification evidence accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    const profileRoute = toPublicPath('/evidence/qualification/custom/custom/');
    const anthropicProfileRoute = toPublicPath(
      '/evidence/qualification/anthropic/typescript-messages-api-0-117/',
    );
    const vercelProfileRoute = toPublicPath(
      '/evidence/qualification/vercel-ai-sdk/typescript-generate-stream-text-7/',
    );
    const toolLoopProfileRoute = toPublicPath(
      '/evidence/qualification/vercel-ai-sdk/typescript-tool-loop-agent-7/',
    );
    const openAiResponsesProfileRoute = toPublicPath(
      '/evidence/qualification/openai/typescript-responses-api-7/',
    );
    const openAiAgentsProfileRoute = toPublicPath(
      '/evidence/qualification/openai-agents-sdk/typescript-agent-handoffs-0-16/',
    );
    const routes = [
      toPublicPath('/evidence/qualification/'),
      profileRoute,
      anthropicProfileRoute,
      openAiResponsesProfileRoute,
      openAiAgentsProfileRoute,
      vercelProfileRoute,
      toolLoopProfileRoute,
    ];

    await page.goto(profileRoute);
    const attemptLink = page.getByRole('link', { name: /^Inspect the .* attempt$/u });

    if ((await attemptLink.count()) > 0) {
      const currentAttemptRoute = await attemptLink.getAttribute('href');

      if (currentAttemptRoute === null) {
        throw new Error('The qualification profile does not link to its current attempt.');
      }

      routes.push(currentAttemptRoute);
    }

    for (const route of routes) {
      await page.goto(route);
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll, route).toBeLessThanOrEqual(widths.client);
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
        route,
      ).toStrictEqual([]);
    }

    await context.close();
  }
});

test(
  'renders recovered protocol 6 trial evidence',
  { tag: '@qualification-current-fixture' },
  async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme,
        viewport: { height: 900, width: 320 },
      });
      const page = await context.newPage();
      await page.goto(
        toPublicPath('/evidence/qualification/custom/custom/attempts/attempt-recovered/'),
      );

      await expect(
        page.getByRole('heading', { level: 1, name: 'attempt-recovered' }),
      ).toBeVisible();
      await expect(
        page.getByText('Recovered cases', { exact: true }).locator('..').getByText('1'),
      ).toBeVisible();
      await expect(
        page.getByText('Operational retries', { exact: true }).locator('..').getByText('1'),
      ).toBeVisible();

      const caseEvidence = page
        .locator('main details')
        .filter({ has: page.getByRole('heading', { level: 3, name: 'Release case' }) })
        .first();
      await caseEvidence.locator(':scope > summary').click();
      await expect(caseEvidence).toContainText('Recovered after two fresh passing confirmations.');
      await expect(caseEvidence.getByRole('tab', { name: 'Replay' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(caseEvidence.getByText('Developer', { exact: true }).first()).toBeVisible();
      await expect(caseEvidence.getByText('Coding agent', { exact: true }).first()).toBeVisible();
      await caseEvidence.getByRole('tab', { name: 'Evidence' }).click();
      await expect(caseEvidence.getByRole('heading', { name: 'Why it recovered' })).toBeVisible();
      await caseEvidence.getByRole('tab', { name: 'Technical' }).click();
      await expect(caseEvidence.getByRole('heading', { level: 5 })).toHaveText([
        'Initial trial',
        'Confirmation 1',
        'Confirmation 2',
      ]);

      const initialTrial = caseEvidence
        .getByRole('heading', { level: 5, name: 'Initial trial' })
        .locator('xpath=ancestor::article[1]');
      await expect(initialTrial.locator('[data-evidence-status]').first()).toHaveAttribute(
        'data-evidence-status',
        'failed',
      );
      await initialTrial.locator('summary').first().click();
      await expect(initialTrial.getByText('Unexpected changed path unexpected.md.')).toHaveCount(2);
      await expect(
        initialTrial.getByText(
          'The judge was skipped because runner-owned evidence already failed.',
        ),
      ).toBeVisible();
      await expect(initialTrial.getByText('skipped', { exact: true })).toBeVisible();

      for (const confirmationName of ['Confirmation 1', 'Confirmation 2']) {
        const confirmationTrial = caseEvidence
          .getByRole('heading', { level: 5, name: confirmationName })
          .locator('xpath=ancestor::article[1]');
        await expect(confirmationTrial.locator('[data-evidence-status]').first()).toHaveAttribute(
          'data-evidence-status',
          'passed',
        );
      }

      await expect(caseEvidence.getByText('Fresh evidence', { exact: true })).toHaveCount(5);
      const retryDisclosure = initialTrial.getByText(
        'Operational retries (1) and committed trial artifacts',
        { exact: true },
      );
      await retryDisclosure.focus();
      await expect(retryDisclosure).toBeFocused();
      await retryDisclosure.press('Enter');
      await expect(initialTrial.getByText('Actor retry 1', { exact: true })).toBeVisible();
      await expect(initialTrial.getByText('timed-out', { exact: true })).toBeVisible();
      await expect(initialTrial.getByRole('link', { name: /actor-output\.json/u })).toHaveAttribute(
        'href',
        /cases\/release-case\/trials\/initial\/actor-output\.json$/u,
      );

      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      await context.close();
    }
  },
);
