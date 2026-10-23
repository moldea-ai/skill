import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Seeds the frozen 10.0.1 bridge behind a contained instruction link.
 * The fixture comes from moldea/assets/managed-agents-block.md at commit
 * 5e87645bd2830dde0f93914e285309728d456a8b, independently of the installed 10.0.2 template.
 * Healthy canonical relationships keep the required repair confined to integration.
 * @returns The setup callback preserving either refresh authority or protected-file handoff.
 */
export const createStaleIntegrationSetup =
  (isProtected: boolean): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    const bridge = (await readFile(join(import.meta.dirname, 'bridge-10.0.1.md'), 'utf8'))
      .replaceAll('{{skill-path}}', '.agents/skills/moldea')
      .replaceAll('\n', '\r\n');
    const prefix =
      '\uFEFF# Host rules\r\n\r\n' +
      (isProtected
        ? 'AGENTS.md and config/agent-notes.md are protected. Do not edit either or replace the link.\r\n\r\n'
        : 'Keep changes scoped and verified.\r\n\r\n');
    await mkdir(join(context.repositoryPath, 'config'), { recursive: true });
    await writeFile(
      join(context.repositoryPath, 'config/agent-notes.md'),
      prefix + bridge + '\r\nKeep these owner rules.\r\n',
      'utf8',
    );
    await rm(join(context.repositoryPath, 'AGENTS.md'), { force: true });
    await symlink('config/agent-notes.md', join(context.repositoryPath, 'AGENTS.md'));
    return { ...result, seedManagedAgentsBlock: false };
  };
