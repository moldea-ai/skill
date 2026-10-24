import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Binds instruction behavior while varying only the actual report output's relevance.
 * @returns The setup callback for the selected relationship boundary.
 */
export const createInvokedSkillSetup =
  (hasRelatedOutput: boolean): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
    const files = [
      ['.gitignore', '.agents/skills/moldea/\nnode_modules/\n'],
      [
        '.agents/skills/report-note/SKILL.md',
        '---\nname: report-note\ndescription: Write a release note from supplied verified and queued work.\n---\n\nRead the requested input and write the requested report. Distinguish verified work from queued work. Do not change release approval or modify this skill.\n',
      ],
      ['docs/release-input.md', '# Release input\n\nCSV export: verified.\nSearch: queued.\n'],
      ['reports/release-note.md', '# Release note\n\nDraft pending.\n'],
      ['src/legacy-report.js', 'export const reportState = "legacy";\n'],
      [
        'moldea/project.md',
        '# Release reports\n\nThe project records verified and queued release work. A human authorizes every release.\n',
      ],
      [
        'moldea/context/release-style.md',
        '# Release note policy\n\nDistinguish verified work from queued work. Release notes never authorize releases; a human retains release approval.\n',
      ],
      [
        'moldea/moldea.yaml',
        `version: 1\ncontext:\n  /moldea/context/release-style.md:\n    affectedBy:\n      - /.agents/skills/report-note/SKILL.md\n      - /${hasRelatedOutput ? 'reports/release-note.md' : 'src/legacy-report.js'}\n`,
      ],
    ] as const;
    for (const [relativePath, contents] of files) {
      const target = join(context.repositoryPath, relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents, 'utf8');
    }
    return result;
  };
