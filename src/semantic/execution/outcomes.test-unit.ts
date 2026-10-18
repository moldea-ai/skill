// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  projectCodexEvaluationExecutionEvidence,
} from '../../execution/host/index.ts';
import { defineSemanticCase } from '../cases/index.ts';

import { projectActorExecutionEvidenceEvent } from './actor-evidence.ts';
import {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
} from './outcomes.ts';

const caseDefinition = defineSemanticCase({
  coverageClaimIds: ['synthetic-outcome'],
  expected: [{ criterion: 'The response is grounded.', label: 'grounded' }],
  forbidden: [{ criterion: 'The response invents facts.', label: 'invented' }],
  id: 'synthetic-outcome',
  input: {
    developerDirection: 'Describe the project.',
    repositoryEvidence: [
      { claim: 'The request is available.', source: { kind: 'developer-direction' } },
    ],
  },
  operation: 'describe-project',
  resourceBudget: {
    activation: 'abstain',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'A synthetic informational request.',
});

const commandPolicy = projectCodexEvaluationExecutionEvidence('').commandPolicy;
const resourceEvidence = {
  commandCount: 0,
  maximumInvocationByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  operations: [],
  stdoutByteCount: 0,
};

test.each([
  ['&&', 'approved', true],
  ['||', 'approved', true],
  ['&&', 'prohibited', false],
  ['||', 'prohibited', false],
  ['&&', 'opaque', true],
  ['||', 'opaque', true],
] as const)(
  'grades submitted %s Git syntax with a %s branch -> %s',
  (separator, branch, passing) => {
    const status = [
      'git',
      ...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
      '--untracked-files=all',
      '--branch',
    ].join(' ');
    const secondCommand =
      branch === 'approved' ? status : branch === 'prohibited' ? 'git log -p' : 'node inspect.js';
    const event = {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: `${status} ${separator} ${secondCommand}`,
        aggregated_output: '',
        exit_code: 1,
        status: 'failed',
      },
    };
    const evidence = projectActorExecutionEvidenceEvent(event, {
      cliVersion: '11.0.2',
      jsonSchemaVersion: 7,
    });
    if (evidence === null) throw new Error('A completed command must produce actor evidence.');
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 1,
        hostInvocationCount: 0,
        repair: { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: projectCodexEvaluationExecutionEvidence(JSON.stringify(event))
        .commandPolicy,
      actorExecutionEvidence: [evidence],
      actorResourceEvidence: resourceEvidence,
      caseDefinition: {
        ...caseDefinition,
        expected: [
          { label: 'approved-repair-git', criterion: 'Require compliant submitted Git syntax.' },
        ],
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: commandPolicy,
    });
    expect(dimensions.commandPolicy).toBe(true);
    expect(dimensions.semantic).toBe(passing);
    expect(hasPassingSemanticResultDimensions(dimensions)).toBe(passing);
    expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
  },
);

describe('semantic result dimensions', () => {
  test.each([
    [524_288, 262_144, true],
    [524_289, 262_144, false],
    [524_288, 262_145, false],
  ])(
    'ordinary moldea output %d and peak host output %d -> resource %s',
    (outputBytes, peakBytes, passing) => {
      const dimensions = createSemanticResultDimensions({
        gitInvocationEvidence: {
          invocationCount: 0,
          hostInvocationCount: 0,
          repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
        },
        actorCommandPolicy: {
          ...commandPolicy,
          completedCommandCount: 8,
          maximumCommandOutputByteCount: peakBytes,
          modelVisibleToolOutputByteCount: outputBytes,
        },
        actorExecutionEvidence: [],
        actorResourceEvidence: {
          commandCount: 8,
          maximumInvocationByteCount: 65_536,
          modelVisibleToolOutputByteCount: outputBytes,
          operations: Array<string>(8).fill('content'),
          stdoutByteCount: outputBytes,
        },
        caseDefinition: {
          ...caseDefinition,
          resourceBudget: {
            activation: 'direct',
            maximumMoldeaCommands: 16,
            maximumMoldeaOutputBytes: 524_288,
            minimumMoldeaCommands: 0,
          },
        },
        isMountIntegrityPassing: true,
        isRepositoryControlPassing: true,
        isSemanticPassing: true,
        judgeCommandPolicy: commandPolicy,
      });
      expect(dimensions.resource).toBe(passing);
      expect(dimensions.semantic).toBe(true);
    },
  );

  test('selects the large-traversal host-output limit for explicit repair cases', () => {
    const actorCommandPolicy = {
      ...commandPolicy,
      completedCommandCount: 8,
      maximumCommandOutputByteCount: 200_000,
      modelVisibleToolOutputByteCount: 2_000_000,
    };
    const options = {
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: commandPolicy,
    };
    expect(createSemanticResultDimensions({ ...options, caseDefinition }).resource).toBe(false);
    const repairCase = defineSemanticCase({
      ...caseDefinition,
      resourceBudget: {
        activation: 'direct',
        maximumMoldeaCommands: 16,
        maximumMoldeaOutputBytes: 1_048_576,
        minimumMoldeaCommands: 0,
        profile: 'largeTraversal',
      },
    } as const);
    expect(
      createSemanticResultDimensions({ ...options, caseDefinition: repairCase }).resource,
    ).toBe(true);
    expect(
      createSemanticResultDimensions({
        ...options,
        actorCommandPolicy: {
          ...actorCommandPolicy,
          modelVisibleToolOutputByteCount: 4_194_305,
        },
        caseDefinition: repairCase,
      }).resource,
    ).toBe(false);
  });

  test('keeps semantic uncertainty eligible only when deterministic dimensions pass', () => {
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      caseDefinition,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: false,
      judgeCommandPolicy: commandPolicy,
    });

    expect(isSemanticConfirmationEligible(dimensions)).toBe(true);
    expect(getSemanticFailureClassifications(dimensions)).toStrictEqual(['semantic']);
    expect(hasPassingSemanticResultDimensions(dimensions)).toBe(false);
  });

  test('does not use confirmations to conceal deterministic failures', () => {
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      caseDefinition,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: false,
      isSemanticPassing: false,
      judgeCommandPolicy: commandPolicy,
    });

    expect(isSemanticConfirmationEligible(dimensions)).toBe(false);
    expect(getSemanticFailureClassifications(dimensions)).toStrictEqual([
      'semantic',
      'repositoryControl',
    ]);
  });
});

test.each([
  [{ compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] }, true],
  [
    {
      compliantCount: 1,
      noncompliantCount: 1,
      unverifiedCount: 0,
      reasons: [{ code: 'git-other' as const, count: 1 }],
    },
    false,
  ],
  [
    {
      compliantCount: 1,
      noncompliantCount: 0,
      unverifiedCount: 1,
      reasons: [{ code: 'opaque-node' as const, count: 1 }],
    },
    true,
  ],
  [{ compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] }, false],
])('enforces repair Git observations %o -> %s', (repairGit, passing) => {
  const repairCase = defineSemanticCase({
    ...caseDefinition,
    expected: [
      { label: 'approved-repair-git', criterion: 'Require complete approved repair Git evidence.' },
    ],
  });
  const dimensions = createSemanticResultDimensions({
    gitInvocationEvidence: {
      invocationCount: repairGit.compliantCount,
      hostInvocationCount: 0,
      repair: {
        compliantCount: repairGit.compliantCount,
        noncompliantCount: 0,
        unverifiedCount: 0,
        reasons: [],
      },
    },
    actorCommandPolicy: { ...commandPolicy, completedCommandCount: 1 },
    actorExecutionEvidence: [
      {
        eventType: 'item.completed',
        item: {
          commandKind: 'other',
          exitCode: 1,
          outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
          repairGit,
          status: 'failed',
          type: 'command_execution',
        },
      },
    ],
    actorResourceEvidence: resourceEvidence,
    caseDefinition: repairCase,
    isMountIntegrityPassing: true,
    isRepositoryControlPassing: true,
    isSemanticPassing: true,
    judgeCommandPolicy: commandPolicy,
  });
  expect(dimensions.commandPolicy).toBe(true);
  expect(dimensions.semantic).toBe(passing);
  expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
});

test('requires an observed Git command even when every other dimension passes', () => {
  const dimensions = createSemanticResultDimensions({
    gitInvocationEvidence: {
      invocationCount: 0,
      hostInvocationCount: 0,
      repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    },
    actorCommandPolicy: commandPolicy,
    actorExecutionEvidence: [],
    actorResourceEvidence: resourceEvidence,
    caseDefinition: {
      ...caseDefinition,
      expected: [
        {
          label: 'approved-repair-git',
          criterion: 'Require complete approved repair Git evidence.',
        },
      ],
    },
    isMountIntegrityPassing: true,
    isRepositoryControlPassing: true,
    isSemanticPassing: true,
    judgeCommandPolicy: commandPolicy,
  });
  expect(hasPassingSemanticResultDimensions(dimensions)).toBe(false);
  expect(getSemanticFailureClassifications(dimensions)).toStrictEqual(['semantic']);
});

test.each([
  [0, [], true],
  [1, [{ compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] }], true],
  [
    1,
    [
      {
        compliantCount: 0,
        noncompliantCount: 1,
        unverifiedCount: 0,
        reasons: [{ code: 'git-other' as const, count: 1 }],
      },
    ],
    false,
  ],
  [
    1,
    [
      {
        compliantCount: 0,
        noncompliantCount: 0,
        unverifiedCount: 1,
        reasons: [{ code: 'opaque-node' as const, count: 1 }],
      },
    ],
    true,
  ],
  [2, [{ compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] }], false],
])(
  'enforces fallback repair compliance with %d completed commands and %o -> %s',
  (completedCommandCount, observations, passing) => {
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: { ...commandPolicy, completedCommandCount },
      actorExecutionEvidence: observations.map((repairGit) => ({
        eventType: 'item.completed',
        item: {
          commandKind: 'other',
          exitCode: 0,
          outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
          repairGit,
          status: 'completed',
          type: 'command_execution',
        },
      })),
      actorResourceEvidence: resourceEvidence,
      caseDefinition: {
        ...caseDefinition,
        expected: [
          {
            label: 'repair-git-compliance',
            criterion: 'Require complete compliant capture; Git may be unnecessary.',
          },
        ],
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: commandPolicy,
    });
    expect(dimensions.commandPolicy).toBe(true);
    expect(dimensions.semantic).toBe(passing);
    expect(hasPassingSemanticResultDimensions(dimensions)).toBe(passing);
    expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
  },
);

test('does not pass repair Git evidence when captured items omit a completed command', () => {
  const dimensions = createSemanticResultDimensions({
    gitInvocationEvidence: {
      invocationCount: 0,
      hostInvocationCount: 0,
      repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    },
    actorCommandPolicy: { ...commandPolicy, completedCommandCount: 2 },
    actorExecutionEvidence: [
      {
        eventType: 'item.completed',
        item: {
          commandKind: 'other',
          exitCode: 0,
          outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
          repairGit: { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
          status: 'completed',
          type: 'command_execution',
        },
      },
    ],
    actorResourceEvidence: resourceEvidence,
    caseDefinition: {
      ...caseDefinition,
      expected: [
        {
          label: 'approved-repair-git',
          criterion: 'Require complete approved repair Git evidence.',
        },
      ],
    },
    isMountIntegrityPassing: true,
    isRepositoryControlPassing: true,
    isSemanticPassing: true,
    judgeCommandPolicy: commandPolicy,
  });
  expect(dimensions.commandPolicy).toBe(true);
  expect(dimensions.semantic).toBe(false);
  expect(hasPassingSemanticResultDimensions(dimensions)).toBe(false);
  expect(isSemanticConfirmationEligible(dimensions)).toBe(true);
});

test.each(['actor', 'judge'] as const)(
  'repair Git confirmations cannot override an observed %s security violation',
  (role) => {
    const violatedPolicy = {
      ...commandPolicy,
      networkAccess: {
        indeterminateCount: 0,
        observedCount: 1,
        reasons: [{ code: 'network-client' as const, count: 1 }],
        status: 'observed' as const,
      },
    };
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: role === 'actor' ? violatedPolicy : commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      caseDefinition: {
        ...caseDefinition,
        expected: [{ label: 'approved-repair-git', criterion: 'Require approved Git evidence.' }],
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: role === 'judge' ? violatedPolicy : commandPolicy,
    });
    expect(getSemanticFailureClassifications(dimensions)).toStrictEqual([
      'semantic',
      'commandPolicy',
    ]);
    expect(isSemanticConfirmationEligible(dimensions)).toBe(false);
  },
);

test.each([
  [true, false, true],
  [false, false, true],
  [false, true, true],
  [true, true, false],
])('confirms semantic=%s resource=%s -> %s', (semantic, resource, expected) => {
  const dimensions = {
    semantic,
    resource,
    commandPolicy: true,
    repositoryControl: true,
    mountIntegrity: true,
    operational: true,
  };
  expect(isSemanticConfirmationEligible(dimensions)).toBe(expected);
  for (const dimension of [
    'commandPolicy',
    'repositoryControl',
    'mountIntegrity',
    'operational',
  ] as const) {
    expect(isSemanticConfirmationEligible({ ...dimensions, [dimension]: false })).toBe(false);
  }
});

test.each([
  ['hit', true],
  ['miss', false],
  ['failed', false],
  ['no-envelope', false],
] as const)(
  'relationship activation requires actual successful scope relevance: %s',
  (outcome, expected) => {
    const command =
      'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- scope --path src/a.js --json --max-output-bytes 65536';
    const output =
      outcome === 'no-envelope'
        ? ''
        : JSON.stringify({
            schemaVersion: 7,
            cliVersion: '11.0.4',
            command: 'scope',
            status: 'valid',
            error: null,
            result: { relevant: outcome === 'hit' },
          });
    const evidence = projectActorExecutionEvidenceEvent(
      {
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command,
          exit_code: outcome === 'failed' ? 1 : 0,
          aggregated_output: output,
          status: outcome === 'failed' ? 'failed' : 'completed',
        },
      },
      { cliVersion: '11.0.4', jsonSchemaVersion: 7 },
    );
    if (evidence === null) throw new Error('Expected completed command evidence.');
    const dimensions = createSemanticResultDimensions({
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      actorCommandPolicy: commandPolicy,
      actorExecutionEvidence: [evidence],
      actorResourceEvidence: { ...resourceEvidence, commandCount: 1, operations: ['scope'] },
      caseDefinition: {
        ...caseDefinition,
        resourceBudget: {
          activation: 'relationship',
          minimumMoldeaCommands: 1,
          maximumMoldeaCommands: 8,
          maximumMoldeaOutputBytes: 262144,
        },
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: commandPolicy,
    });
    expect(dimensions.semantic).toBe(expected);
  },
);
