import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  collectSkillArtifactEvidence,
  hasValidSkillArtifactEvidence,
  validateSkillDocument,
  validateSkillEvidenceConfiguration,
} from './skill-artifact-evidence.mjs';

const createCaseDefinition = (root = 'generated-skill') => ({
  id: 'skill-case',
  skillEvidence: {
    activationScenarios: [
      { request: 'Create the configured agent.', shouldActivate: true },
      { request: 'Review an unrelated file.', shouldActivate: false },
    ],
    artifacts: [{ role: 'authoritative-source', root }],
  },
});

describe('semantic skill artifact evidence', () => {
  test('validates the bounded configuration and skill document contract', () => {
    assert.deepEqual(validateSkillEvidenceConfiguration({ id: 'plain-case' }), {
      activationScenarios: [],
      artifacts: [],
    });
    assert.throws(
      () => validateSkillEvidenceConfiguration(createCaseDefinition('_archive/skill')),
      /unsafe skill artifact root/u,
    );
    assert.deepEqual(
      validateSkillDocument(
        '---\nname: generated-skill\ndescription: Handles generated behavior.\n---\n\n# Skill\n',
        'generated-skill',
      ),
      {
        description: 'Handles generated behavior.',
        errors: [],
        name: 'generated-skill',
        valid: true,
      },
    );
  });

  test('collects bounded content while excluding prohibited context directories', async () => {
    const repositoryPath = await mkdtemp(join(tmpdir(), 'moldea-skill-evidence-'));
    try {
      await mkdir(join(repositoryPath, 'generated-skill', 'references'), { recursive: true });
      await mkdir(join(repositoryPath, 'generated-skill', '_archive'), { recursive: true });
      await writeFile(
        join(repositoryPath, 'generated-skill', 'SKILL.md'),
        '---\nname: generated-skill\ndescription: Handles generated behavior.\n---\n\nRead [rules](references/rules.md).\n',
      );
      await writeFile(
        join(repositoryPath, 'generated-skill', 'references', 'rules.md'),
        'Rules.\n',
      );
      await writeFile(
        join(repositoryPath, 'generated-skill', 'references', 'large.md'),
        'x'.repeat(32_769),
      );
      await writeFile(join(repositoryPath, 'generated-skill', '_archive', 'ignored.md'), 'ignored');

      const caseDefinition = createCaseDefinition();
      const evidence = await collectSkillArtifactEvidence(repositoryPath, caseDefinition);
      assert.equal(hasValidSkillArtifactEvidence(evidence, caseDefinition), true);
      assert.equal(evidence[0].excludedDirectoryCount, 1);
      assert.equal(evidence[0].validation.valid, true);
      assert.deepEqual(evidence[0].resourceReferences, [
        {
          isSafe: true,
          reference: 'references/rules.md',
          resolvedPath: 'generated-skill/references/rules.md',
          type: 'file',
        },
      ]);
      assert.equal(
        evidence[0].files.find(({ path }) => path.endsWith('/large.md')).omission,
        'file-too-large',
      );
      assert.equal(
        evidence[0].files.some(({ path }) => path.includes('_archive')),
        false,
      );
    } finally {
      await rm(repositoryPath, { force: true, recursive: true });
    }
  });
});
