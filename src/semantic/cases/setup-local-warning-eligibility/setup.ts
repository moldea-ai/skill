import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Prepares distinct local, shared-precedence and tracked-warning integration states.
 * @returns The setup callback with automatic bridge seeding enabled only for the healthy bridge.
 */
export const createIntegrationWarningSetup =
  (scenario: 'local' | 'shared' | 'tracked'): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
    if (scenario === 'shared') {
      await mkdir(join(context.repositoryPath, '.claude'), { recursive: true });
      await writeFile(
        join(context.repositoryPath, '.claude/CLAUDE.md'),
        '# Shared Claude notes\n\nRun focused checks before completion.\n',
        'utf8',
      );
      await writeFile(
        join(context.repositoryPath, 'CLAUDE.local.md'),
        '# Local fallback\n\n@AGENTS.md\n',
        'utf8',
      );
      await appendFile(join(context.repositoryPath, '.gitignore'), 'CLAUDE.local.md\n', 'utf8');
    } else {
      await writeFile(
        join(context.repositoryPath, 'AGENTS.md'),
        '# Host instructions\n\nKeep these notes unchanged.\n',
        'utf8',
      );
      if (scenario === 'local') {
        await writeFile(
          join(context.repositoryPath, 'CLAUDE.local.md'),
          '# Local Claude notes\n\nKeep responses brief.\n',
          'utf8',
        );
        await appendFile(
          join(context.repositoryPath, '.gitignore'),
          'AGENTS.md\nCLAUDE.local.md\n',
          'utf8',
        );
      }
    }
    return { ...result, seedManagedAgentsBlock: scenario === 'shared' };
  };
