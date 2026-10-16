import { spawnSync } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { ensureDirectory, resolveContainedPath } from '../../../filesystem/index.ts';
import type { ISemanticCaseSetup } from '../../cases/index.ts';
import { createSemanticCaseSetup } from '../index.ts';

import { COMPLETED_SUPPORT_FILES, ONBOARDING_FILES } from './fixtures.ts';

type IInitializationStage = 'confirmation' | 'approved' | 'confirmed' | 'continuation';
const PROJECT_FOUNDATION =
  '# Operations review service\n\nThis service helps Customer Operations classify support requests and accounting staff review invoice data. Humans authorize every refund and payment.\n\n- [Architecture](../docs/architecture.md)\n- [Operations policy](../docs/operations-policy.md)\n- [Active human-approval decision](../docs/decisions/001-human-approval.md)\n- [Release review Agent Skill](../skills/release-review/SKILL.md)\n';

/**
 * Prepares one initialization stage with real local model calls and existing document authorities.
 * @returns The case setup callback, including the shared tooling mounts and baseline hook.
 */
export const createInitializationOnboardingSetup =
  (stage: IInitializationStage): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('explicit-initialization')(context);
    const files = { ...ONBOARDING_FILES };
    if (stage === 'confirmed' || stage === 'continuation') {
      files['moldea/project.md'] = PROJECT_FOUNDATION;
      files['moldea/moldea.yaml'] =
        stage === 'continuation'
          ? 'version: 1\n\nagents:\n  support-triage:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom.md\n    bindings:\n      runtimeAgent:\n        path: /src/support-agent.js\n        symbol: runSupportAgent\n      instructionLoader:\n        path: /src/support-agent.js\n        symbol: loadSupportInstruction\n'
          : 'version: 1\n';
    }
    if (stage === 'continuation') Object.assign(files, COMPLETED_SUPPORT_FILES);
    const packageManifest = z
      .looseObject({ scripts: z.record(z.string(), z.string()).optional() })
      .parse(JSON.parse(await readFile(path.join(context.repositoryPath, 'package.json'), 'utf8')));
    files['package.json'] = `${JSON.stringify(
      {
        ...packageManifest,
        name: 'operations-review-service',
        private: true,
        type: 'module',
        scripts: {
          ...packageManifest.scripts,
          test: 'npm run test:integration',
          'test:integration':
            'node --test src/support-agent.test-integration.js src/invoice-workflow.test-integration.js',
        },
      },
      null,
      2,
    )}\n`;
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = resolveContainedPath(context.repositoryPath, relativePath);
      await ensureDirectory(path.dirname(filePath));
      await writeFile(filePath, content, 'utf8');
    }
    await unlink(path.join(context.repositoryPath, 'src/service-status.js'));
    if (stage === 'confirmed' || stage === 'continuation') {
      const writer = spawnSync(
        process.execPath,
        [
          path.join(context.repositoryPath, '.agents/skills/moldea/scripts/managed-readme.mjs'),
          '--repository',
          context.repositoryPath,
        ],
        { encoding: 'utf8', timeout: 30_000 },
      );
      if (writer.error) throw writer.error;
      if (writer.status !== 0)
        throw new Error(`Unable to prepare onboarding README: ${writer.stderr.trim()}`);
    }
    return result;
  };
