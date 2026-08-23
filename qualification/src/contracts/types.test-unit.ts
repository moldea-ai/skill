// @vitest-environment node
import { expect, test } from 'vitest';

import { QualificationCaseScenarioSchema } from './types.ts';

const createScenario = (pathPattern: string) => ({
  version: 1,
  id: 'path-pattern',
  title: 'Path pattern',
  purpose: 'Validate a workspace path pattern.',
  taskFile: 'task.md',
  seedDirectory: 'seed',
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
    mustChangePaths: [],
    mustExistPaths: [],
    mustNotExistPaths: [],
    allowedChangePaths: [],
    allowedChangePathPatterns: [pathPattern],
    mustChangePathPatterns: [pathPattern],
  },
  judgeRequirements: [{ id: 'path-contract', description: 'The path contract is valid.' }],
});

test.each(['moldea/runtimes/*.md', 'moldea/runtimes/**/*.md'])(
  'QualificationCaseScenarioSchema(%s) -> accepts',
  (pathPattern) => {
    expect(QualificationCaseScenarioSchema.safeParse(createScenario(pathPattern)).success).toBe(
      true,
    );
  },
);

test.each([
  '/moldea/runtimes/*.md',
  '../moldea/runtimes/*.md',
  'moldea\\runtimes\\*.md',
  'moldea/runtimes/custom.md',
  'moldea/runtimes/***.md',
  'moldea/runtimes/{custom,other}.md',
])('QualificationCaseScenarioSchema(%s) -> rejects', (pathPattern) => {
  expect(QualificationCaseScenarioSchema.safeParse(createScenario(pathPattern)).success).toBe(
    false,
  );
});
