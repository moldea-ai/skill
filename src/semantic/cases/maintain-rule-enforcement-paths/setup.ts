import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Seeds three routed owners with qualified paths and no manifest relationship entries. */
export const prepareEnforcementPaths: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  const files = [
    ['.gitignore', '/.agents/skills/moldea/\n/node_modules/\n'],
    ['moldea/moldea.yaml', 'version: 1\n'],
    [
      'moldea/project.md',
      '# Shop and magazine\n\n## Routing\n\n- [Stock](context/stock.md) governs stock reservation.\n- [Release review](context/release-review.md) governs the release reviewer.\n- [Editorial](context/editorial.md) governs published posts.\n',
    ],
    [
      'moldea/context/stock.md',
      '# Stock reservation\n\nReserve only available stock. The [reservation guard](../../src/reserve-stock.js) rejects requests above the available quantity.\n',
    ],
    [
      'src/reserve-stock.js',
      'export const canReserveStock = (requested, available) => requested <= available;\n',
    ],
    [
      'moldea/context/release-review.md',
      '# Release review\n\nThe release reviewer marks unverified checks as pending. The project-owned [release review skill](../../.agents/skills/release-review/SKILL.md) gives that instruction to the reviewer.\n',
    ],
    [
      '.agents/skills/release-review/SKILL.md',
      '---\nname: release-review\ndescription: Review release checks.\n---\n\nMark every unverified check as pending.\n',
    ],
    [
      'moldea/context/editorial.md',
      '# Editorial\n\nPublished posts cite their primary evidence. This directly governs the authored source [Spring catalogue](../../content/spring-catalogue.md).\n',
    ],
    [
      'content/spring-catalogue.md',
      '# Spring catalogue\n\nThe spring selection includes three new items. [Source](https://example.com/spring-catalogue).\n',
    ],
  ] as const;
  for (const [relativePath, content] of files) {
    const targetPath = join(context.repositoryPath, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
  }
  return result;
};
