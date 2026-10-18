import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

import { createReviewPolicy, REVIEW_DOMAINS } from './fixtures.ts';

/** Seeds three independently scoped policy/report pairs for a retained maintenance conversation. */
export const prepareCycleBudget: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  await mkdir(join(context.repositoryPath, 'reports'), { recursive: true });
  await mkdir(join(context.repositoryPath, 'moldea/context'), { recursive: true });
  const entries: string[] = [];
  for (const [index, domain] of REVIEW_DOMAINS.entries()) {
    entries.push(
      `  /moldea/context/${domain.id}.md:\n    affectedBy:\n      - /reports/${domain.id}-review.md\n`,
    );
    await writeFile(
      join(context.repositoryPath, 'moldea/context', `${domain.id}.md`),
      createReviewPolicy(index),
      'utf8',
    );
    await writeFile(
      join(context.repositoryPath, 'reports', `${domain.id}-review.md`),
      `# ${domain.team} review\n\nReview pending.\n`,
      'utf8',
    );
  }
  await writeFile(
    join(context.repositoryPath, 'moldea/moldea.yaml'),
    `version: 1\ncontext:\n${entries.join('')}`,
    'utf8',
  );
  await writeFile(
    join(context.repositoryPath, 'moldea/project.md'),
    '# Contract review service\n\nThree operating teams review active contract evidence. Humans retain refund, payment and account-access approval.\n',
    'utf8',
  );
  return result;
};
