import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assertGitSucceeded, runGit } from 'jg-git-commands';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Creates indexed skill descendants before replacing their parents with installer-style links. */
export const createDirectoryLinkSetup =
  (isUnsafe: boolean): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
    const names = Array.from(
      { length: isUnsafe ? 1 : 32 },
      (_, index) => `fixture-${String(index + 1).padStart(2, '0')}`,
    );
    for (const name of names) {
      for (const parent of ['.agents/skills', '.agents/link-sources']) {
        const directory = join(context.repositoryPath, parent, name);
        await mkdir(directory, { recursive: true });
        await writeFile(
          join(directory, 'SKILL.md'),
          `# ${name}\n\nPreserve this installed skill.\n`,
        );
      }
    }
    await writeFile(
      join(context.repositoryPath, 'moldea/project.md'),
      '# Project\n\nThe approved returns window is 30 days.\n',
    );
    await writeFile(
      join(context.repositoryPath, 'src/project-state.js'),
      'export const returnsWindowDays = 14;\n',
    );
    await writeFile(
      join(context.repositoryPath, 'moldea/moldea.yaml'),
      'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
    );
    if (isUnsafe) {
      const outside = join(dirname(context.repositoryPath), 'outside-skill');
      await mkdir(outside);
      await writeFile(join(outside, 'SKILL.md'), '# Outside repository\n');
    }
    return {
      ...result,
      afterBaseline: async () => {
        await result?.afterBaseline?.();
        assertGitSucceeded(
          await runGit(
            ['add', '--force', '--', ...names.map((name) => `.agents/skills/${name}/SKILL.md`)],
            { cwd: context.repositoryPath, isolateConfig: true },
          ),
          'Index contained-link fixture descendants',
        );
        for (const name of names) {
          const path = join(context.repositoryPath, '.agents/skills', name);
          await rm(path, { recursive: true });
          await symlink(isUnsafe ? '../../../outside-skill' : `../link-sources/${name}`, path);
        }
      },
    };
  };
