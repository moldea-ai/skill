import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows reactive and natural proactive context handoffs', async ({ page }) => {
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
  await expect(contextHandoff.getByRole('heading', { name: 'Share what is true.' })).toBeVisible();
  await expect(
    contextHandoff.getByText(
      'Platform owns the application runtime and delivery pipeline. Product owns workflow definitions. Security approves production access.',
    ),
  ).toBeVisible();
  await expect(
    contextHandoff.getByText(
      'I checked those responsibilities against the existing project context. They establish durable ownership and approval boundaries, so I kept them with the project without inventing new runtime or agent behavior.',
    ),
  ).toBeVisible();
  await expect(
    contextHandoff.getByText('No special command is needed after adoption.'),
  ).toBeVisible();

  const examplesLink = contextHandoff.getByRole('link', { name: 'Browse interaction examples' });
  await expect(examplesLink).toHaveAttribute('href', toPublicPath('/examples/'));
});
