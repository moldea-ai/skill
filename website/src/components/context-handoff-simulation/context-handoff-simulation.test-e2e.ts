import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows reactive and casual proactive context handoffs', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const contextHandoff = page.getByRole('region', {
    name: 'The agent can ask. You can also lead.',
  });
  await expect(contextHandoff).toBeVisible();
  await expect(
    contextHandoff.getByRole('heading', { name: 'Answer the missing boundary.' }),
  ).toBeVisible();
  await expect(
    contextHandoff.getByText(
      'I found an invoice-processing service, but the repository does not establish whether it only extracts invoice data or also authorizes payment decisions. Which boundary is correct?',
    ),
  ).toBeVisible();
  await expect(
    contextHandoff.getByText(
      'It extracts and validates invoice data for accounting systems. It never authorizes payments.',
    ),
  ).toBeVisible();
  await expect(
    contextHandoff.getByText(
      'Understood. I’ll use that boundary to complete the project foundation without inventing payment authority.',
    ),
  ).toBeVisible();
  await expect(
    contextHandoff.getByRole('heading', { name: 'Bring the context you already maintain.' }),
  ).toBeVisible();
  const productBriefPath = contextHandoff.getByText('product-brief.md', { exact: true });
  await expect(productBriefPath).toBeVisible();
  await expect(productBriefPath).toHaveJSProperty('tagName', 'CODE');
  await expect(productBriefPath).toHaveCSS('font-family', /monospace/);
  await expect(productBriefPath.locator('xpath=..')).toContainText(
    'Here’s some context for future work: product-brief.md contains the current users, goals, and operating boundaries for this project. Please keep the durable parts with the project.',
  );
  await expect(
    contextHandoff.getByText(
      'I reviewed the brief alongside the repository. The supported audience, invoice-processing purpose, and no-payment-authorization boundary are now part of project context for future work. I left launch timing, draft messaging, and other temporary product notes out so the durable context stays focused.',
    ),
  ).toBeVisible();

  const examplesLink = contextHandoff.getByRole('link', { name: 'Browse interaction examples' });
  await expect(examplesLink).toHaveAttribute('href', toPublicPath('/examples/'));
});
