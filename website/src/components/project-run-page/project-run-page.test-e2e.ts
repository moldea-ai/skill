import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const detailPath = withBase(
  '/evidence/project-runs/projects/project-1/',
  process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
);
const recordedPath = withBase(
  '/evidence/project-runs/projects/project-2/',
  process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
);

test('shows attempted patch targets without presenting a failed tool result as success', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(recordedPath);
  await expect(page.locator('[data-session-entry]')).toHaveCount(8);
  await expect(page.locator('[data-session-role="user"]')).toContainText('Add visit reminders');
  await expect(page.locator('[data-session-role="assistant"]')).toHaveCount(2);
  const tools = page.locator('[data-session-tool]');
  await expect(tools).toHaveCount(3);
  await tools.first().getByRole('button', { name: 'Read exec call 4 and result' }).click();
  const dialog = page.getByRole('dialog', { name: 'exec · event 4' });
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())!.width).toBeLessThan(700);
  await expect(dialog.locator('[data-code-block]').first()).toContainText('cat moldea/project.md');
  await expect(dialog.locator('[data-code-block]').last()).toContainText(
    'The reminder schedule uses each customer timezone.',
  );
  await dialog.getByRole('button', { name: 'Close tool call' }).click();
  await expect(dialog).toBeHidden();
  const failedPatch = tools.nth(1);
  await expect(failedPatch).toContainText('Patch targets');
  await expect(failedPatch).toContainText('Update moldea/project.md');
  await failedPatch.getByRole('button', { name: 'Read apply_patch call 6 and result' }).click();
  const failedDialog = page.getByRole('dialog', { name: 'apply_patch · event 6' });
  await expect(failedDialog.getByRole('heading', { name: 'Tool result' })).toBeVisible();
  await expect(failedDialog).toContainText('Script failed: apply_patch verification failed');
  await expect(failedDialog).not.toContainText('Result · completed');
  await failedDialog.getByRole('button', { name: 'Close tool call' }).click();
  await tools.last().getByRole('button', { name: 'Read apply_patch call 8 and result' }).click();
  await expect(page.getByRole('dialog', { name: 'apply_patch · event 8' })).toContainText(
    'Patch applied.',
  );
});

test('keeps event numbers aligned within their rows at mobile and desktop widths', async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(recordedPath);
    const ordinals = await page.locator('[data-session-ordinal]').evaluateAll((elements) =>
      elements.map((element) => ({
        right: element.getBoundingClientRect().right,
        height: element.getBoundingClientRect().height,
        whiteSpace: getComputedStyle(element).whiteSpace,
        rowRight: element.parentElement?.getBoundingClientRect().right ?? 0,
      })),
    );
    expect(ordinals).toHaveLength(8);
    expect(
      Math.max(...ordinals.map(({ right }) => right)) -
        Math.min(...ordinals.map(({ right }) => right)),
    ).toBeLessThan(2);
    expect(
      ordinals.every(
        ({ height, whiteSpace, right, rowRight }) =>
          height < 20 && whiteSpace === 'nowrap' && right <= rowRight,
      ),
    ).toBe(true);
  }
});

test('shows request history honestly when a full session is unavailable', async ({ page }) => {
  await page.goto(detailPath);
  await expect(page.getByRole('heading', { name: 'Follow the conversation' })).toBeVisible();
  await expect(page.getByText('Conversation not included')).toBeVisible();
  await expect(
    page.getByText('The policy and implementation relationship were checked.'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Project record' }).click();
  await expect(page.getByText(/The timezone correction required a developer prompt/)).toBeVisible();
  const externalLink = page.getByRole('link', { name: 'Explore the code', exact: true });
  await expect(externalLink).toHaveAttribute(
    'href',
    `https://github.com/jesusgraterol/moldea-mock-project-public/tree/${'c'.repeat(40)}`,
  );
  await expect(externalLink.locator('[data-external-link-icon]')).toBeVisible();
  await expect(page.locator('[data-session-entry]')).toHaveCount(0);
});

test('keeps both views available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(detailPath);
    await expect(page.getByRole('heading', { name: 'Follow the conversation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inspect the source' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('keeps project tabs usable for source IDs containing underscores', async ({ page }) => {
  await page.goto(
    withBase(
      '/evidence/project-runs/projects/project_3/',
      process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
    ),
  );
  await page.getByRole('tab', { name: 'Project record' }).click();
  await expect(page.getByRole('heading', { name: 'Inspect the source' })).toBeVisible();
});
