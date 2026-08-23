// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type {
  IActorOutput,
  IDeterministicVerification,
  IQualificationCaseScenario,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import { buildActorPrompt, buildJudgePrompt } from './index.ts';

const scenario: IQualificationCaseScenario = {
  version: 1,
  id: 'maintain-dirty-project',
  title: 'Maintain a dirty project',
  purpose: 'Verify conservative project maintenance.',
  taskFile: 'task.md',
  seedDirectory: 'seed',
  overlayDirectory: 'overlay',
  expectedDirectory: 'expected',
  removePaths: [],
  expectedRemovePaths: [],
  inspection: { before: 'valid', after: 'valid' },
  deterministicEvidence: {
    before: {
      requiredDiagnosticCodes: [],
      forbiddenDiagnosticCodes: [],
      requiredEvidenceKinds: [],
      forbiddenEvidenceKinds: [],
    },
    after: {
      requiredDiagnosticCodes: [],
      forbiddenDiagnosticCodes: [],
      requiredEvidenceKinds: [],
      forbiddenEvidenceKinds: [],
    },
  },
  expectedActorOutcome: 'completed',
  workspace: {
    expectation: 'changed',
    mustPreservePaths: [],
    mustChangePaths: ['moldea/moldea.yaml'],
    mustExistPaths: ['moldea/moldea.yaml'],
    mustNotExistPaths: [],
    allowedChangePaths: ['moldea/moldea.yaml'],
    allowedChangePathPatterns: [],
    mustChangePathPatterns: [],
  },
  judgeRequirements: [
    {
      id: 'preserves-unrelated-work',
      description: 'The unrelated dirty state remains byte-identical.',
    },
  ],
};

const actorOutput: IActorOutput = {
  outcome: 'completed',
  summary: 'Completed the requested project change.',
  commands: ['moldea validate'],
  changedFiles: ['moldea/moldea.yaml'],
  observations: [],
  unresolved: [],
};

const deterministicVerification: IDeterministicVerification = {
  passed: true,
  inspectionStatus: 'valid',
  repositoryFilesystemValid: true,
  memoryRepositoryEquivalent: true,
  coreValid: true,
  cliCompatibilityValid: true,
  cliIdentityValid: true,
  cliPackageInventoryValid: true,
  cliAdapterInventoryValid: true,
  cliEnvelopeValid: true,
  cliValidateStatus: 'valid',
  cliInspectStatus: 'valid',
  typecheckPassed: true,
  repositoryUnchanged: true,
  failures: [],
  durationMs: 1,
};

const workspaceAssertions: IWorkspaceAssertionResult = {
  passed: true,
  failures: [],
  before: [],
  after: [],
  changedPaths: ['moldea/moldea.yaml'],
};

describe('qualification prompts', () => {
  test('keeps adapter identity and judge criteria out of the natural actor task', () => {
    const prompt = buildActorPrompt({ task: '# Update the Moldea project' });

    expect(prompt).toContain('# Update the Moldea project');
    expect(prompt).toContain('Agent Skill guidance discovered in the workspace');
    expect(prompt).not.toContain('adapter-custom');
    expect(prompt).not.toContain('custom');
    expect(prompt).not.toContain(scenario.id);
    expect(prompt).not.toContain(scenario.judgeRequirements[0]?.description);
    expect(prompt).not.toContain('.moldea-qualification/skill');
    expect(prompt).toContain('.agents/skills/moldea/');
  });

  test('gives the independent judge the declared requirements and installed skill path', () => {
    const prompt = buildJudgePrompt({
      actorOutput,
      adapterId: 'custom',
      deterministicAfter: deterministicVerification,
      implementationId: 'custom',
      scenario,
      task: '# Update the Moldea project',
      workspaceAssertions,
    });

    expect(prompt).toContain('.agents/skills/moldea/SKILL.md');
    expect(prompt).toContain(
      'preserves-unrelated-work: The unrelated dirty state remains byte-identical.',
    );
  });
});
