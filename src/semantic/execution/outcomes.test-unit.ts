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
  identifyFinalValidationExemption,
  isSemanticConfirmationEligible,
  measureOwnedResourceUsage,
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
const LAUNCHER = 'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt --';

/** Projects valid command-policy evidence for completed commands with the given output sizes. */
const projectCommandPolicy = (commands: ReadonlyArray<readonly [string, number]>) =>
  projectCodexEvaluationExecutionEvidence(
    commands
      .map(([command, outputByteCount]) =>
        JSON.stringify({
          type: 'item.completed',
          item: {
            type: 'command_execution',
            command,
            aggregated_output: 'x'.repeat(outputByteCount),
            exit_code: 0,
            status: 'completed',
          },
        }),
      )
      .join('\n'),
  ).commandPolicy;

/** Splits a total across commands so one command carries the given peak. */
const splitOutput = (commandCount: number, totalBytes: number, peakBytes: number): number[] => {
  const remainder = totalBytes - peakBytes;
  const base = Math.floor(remainder / (commandCount - 1));
  return [
    peakBytes,
    ...Array.from({ length: commandCount - 1 }, (_, index) =>
      index === commandCount - 2 ? remainder - base * (commandCount - 2) : base,
    ),
  ];
};
const resourceEvidence = {
  commandCount: 0,
  maximumInvocationByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  operations: [],
  stdoutByteCount: 0,
};

test.each([
  [2_097_152, true],
  [2_097_153, false],
])('retains the judge absolute token ceiling at %d -> resource %s', (tokens, passing) => {
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
    isSemanticPassing: true,
    judgeCommandPolicy: commandPolicy,
    paidInvocations: [
      {
        stage: 'judge',
        usage: { inputTokens: tokens - 100, cachedInputTokens: 1_900_000, outputTokens: 100 },
      },
    ],
  });
  expect(dimensions.resource).toBe(passing);
  expect(dimensions.operational).toBe(true);
  expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
});

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
        actorCommandPolicy: projectCommandPolicy(
          splitOutput(8, outputBytes, peakBytes).map((bytes) => [
            `${LAUNCHER} content --path moldea/project.md --json --max-output-bytes 65536`,
            bytes,
          ]),
        ),
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

  test('counts assessment source reads only under the large-traversal profile', () => {
    const projectSourceReads = (totalBytes: number) =>
      projectCommandPolicy(
        splitOutput(8, totalBytes, 200_000).map((bytes) => ['cat README.md', bytes]),
      );
    const actorCommandPolicy = projectSourceReads(2_000_000);
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
    // reads the developer's task needs are not moldea work in ordinary cycles
    expect(createSemanticResultDimensions({ ...options, caseDefinition }).resource).toBe(true);
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
        actorCommandPolicy: projectSourceReads(4_194_305),
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
    actorCommandPolicy: projectCommandPolicy([['ls', 0]]),
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
      actorCommandPolicy: projectCommandPolicy(
        Array.from({ length: completedCommandCount }, () => ['ls', 0] as const),
      ),
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
    actorCommandPolicy: projectCommandPolicy([
      ['ls', 0],
      ['ls', 0],
    ]),
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

const SKILL_SCRIPTS = '/mnt/.agents/skills/moldea/scripts';
const VALIDATE = `${LAUNCHER} validate --json --max-output-bytes 65536`;
const NO_GIT_EVIDENCE = {
  invocationCount: 0,
  hostInvocationCount: 0,
  repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
};
const FILE_STATE = { content: '', mode: 0o644, omission: null, sha256: 'a'.repeat(64) } as const;
const MOLDEA_CHANGE = {
  created: [],
  deleted: [],
  modified: [
    {
      after: { ...FILE_STATE, type: 'file' as const },
      before: { ...FILE_STATE, type: 'file' as const },
      path: 'moldea/project.md',
    },
  ],
};

type IStreamEntry = readonly ['command', string, number] | readonly ['file-change', unknown];

/** Projects command-policy evidence from ordered commands and completed Codex patches. */
const projectStream = (entries: readonly IStreamEntry[]) =>
  projectCodexEvaluationExecutionEvidence(
    entries
      .map((entry) =>
        JSON.stringify({
          type: 'item.completed',
          item:
            entry[0] === 'command'
              ? {
                  type: 'command_execution',
                  command: entry[1],
                  aggregated_output: 'x'.repeat(entry[2]),
                  exit_code: 0,
                  status: 'completed',
                }
              : { type: 'file_change', changes: entry[1], status: 'completed' },
        }),
      )
      .join('\n'),
  ).commandPolicy;

/** Builds the launcher captures for the given operations and launcher output sizes. */
const createLauncherCaptures = (calls: ReadonlyArray<readonly ['scope' | 'validate', number]>) => ({
  actorExecutionEvidence: calls.map(([, byteCount]) => ({
    eventType: 'item.completed' as const,
    item: {
      commandKind: 'moldea' as const,
      exitCode: 0,
      outputEvidence: { byteCount, disposition: 'projected' as const, facts: [] },
      repairGit: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      status: 'completed' as const,
      type: 'command_execution' as const,
    },
  })),
  actorResourceEvidence: {
    commandCount: calls.length,
    maximumInvocationByteCount: Math.max(0, ...calls.map(([, byteCount]) => byteCount)),
    modelVisibleToolOutputByteCount: calls.reduce((total, [, byteCount]) => total + byteCount, 0),
    operations: calls.map(([operation]) => operation),
    stdoutByteCount: calls.reduce((total, [, byteCount]) => total + byteCount, 0),
  },
});

const PATCH_MOLDEA = ['file-change', [{ path: '/mnt/moldea/project.md', kind: 'update' }]] as const;

describe('moldea-only resource accounting', () => {
  const commandPolicy = projectStream([
    ['command', `node ${SKILL_SCRIPTS}/relevance-gate.mjs --repository /mnt --adoption-only`, 2],
    ['command', VALIDATE, 300],
    ['command', `node ${SKILL_SCRIPTS}/repair-git.mjs --repository /mnt -- checkpoint`, 50],
    ['command', 'cat moldea/project.md', 1_000],
    ['command', 'cat README.md', 500],
    ['command', 'sed -n 1,40p AGENTS.md', 200],
    ['command', 'node --test src/a.test-unit.js', 100],
    ['command', 'git status --short', 20],
  ]);
  const { actorResourceEvidence } = createLauncherCaptures([['validate', 300]]);

  test.each([
    [
      'ordinary',
      {
        aggregateMoldeaOutputByteCount: 1_352,
        completedCommandCount: 4,
        maximumCommandOutputByteCount: 1_000,
        modelVisibleToolOutputByteCount: 1_352,
      },
    ],
    [
      'largeTraversal',
      {
        aggregateMoldeaOutputByteCount: 1_352,
        completedCommandCount: 6,
        maximumCommandOutputByteCount: 1_000,
        modelVisibleToolOutputByteCount: 2_052,
      },
    ],
  ] as const)('measureOwnedResourceUsage(%s) -> exact owned totals', (profileName, usage) => {
    expect(
      measureOwnedResourceUsage({
        commandPolicy,
        exemptValidationByteCount: null,
        profileName,
        resourceEvidence: actorResourceEvidence,
      }),
    ).toStrictEqual(usage);
  });

  test('keeps scenario budgets CLI-only while helper and moldea/ reads use the profile', () => {
    const options = {
      actorCommandPolicy: commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence,
      gitInvocationEvidence: NO_GIT_EVIDENCE,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: projectCodexEvaluationExecutionEvidence('').commandPolicy,
    };
    const budget = {
      activation: 'direct',
      maximumMoldeaCommands: 1,
      maximumMoldeaOutputBytes: 300,
      minimumMoldeaCommands: 0,
    } as const;
    expect(
      createSemanticResultDimensions({
        ...options,
        caseDefinition: { ...caseDefinition, resourceBudget: budget },
      }).resource,
    ).toBe(true);
    expect(
      createSemanticResultDimensions({
        ...options,
        caseDefinition: {
          ...caseDefinition,
          resourceBudget: { ...budget, maximumMoldeaOutputBytes: 299 },
        },
      }).resource,
    ).toBe(false);
  });

  test('grades the ordinary aggregate allowance on launcher, helper and moldea/ output', () => {
    const options = {
      actorExecutionEvidence: [],
      actorResourceEvidence,
      caseDefinition: {
        ...caseDefinition,
        resourceBudget: {
          activation: 'direct',
          maximumMoldeaCommands: 16,
          maximumMoldeaOutputBytes: 524_288,
          minimumMoldeaCommands: 0,
        },
      } as const,
      gitInvocationEvidence: NO_GIT_EVIDENCE,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: projectCodexEvaluationExecutionEvidence('').commandPolicy,
    };
    const withCanonicalReads = (bytes: number) =>
      projectStream([
        ['command', VALIDATE, 300],
        ...splitOutput(4, bytes, 200_000).map(
          (size) => ['command', 'cat moldea/project.md', size] as const,
        ),
      ]);
    expect(
      createSemanticResultDimensions({
        ...options,
        actorCommandPolicy: withCanonicalReads(524_288 - 300),
      }).resource,
    ).toBe(true);
    expect(
      createSemanticResultDimensions({
        ...options,
        actorCommandPolicy: withCanonicalReads(524_289 - 300),
      }).resource,
    ).toBe(false);
  });

  test('a zero-budget abstention that runs only the relevance gate still passes', () => {
    const dimensions = createSemanticResultDimensions({
      actorCommandPolicy: projectStream([
        [
          'command',
          `node ${SKILL_SCRIPTS}/relevance-gate.mjs --repository /mnt --path src/a.ts`,
          2,
        ],
        ['command', 'cat src/a.ts', 4_000],
      ]),
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      caseDefinition,
      gitInvocationEvidence: NO_GIT_EVIDENCE,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: projectCodexEvaluationExecutionEvidence('').commandPolicy,
    });
    expect(caseDefinition.resourceBudget.maximumMoldeaOutputBytes).toBe(0);
    expect(dimensions.resource).toBe(true);
    expect(dimensions.semantic).toBe(true);
  });
});

describe('ordinary final-validation exception', () => {
  /** Evaluates the exemption for one ordered stream and its captured launcher calls. */
  const identify = (
    entries: readonly IStreamEntry[],
    calls: ReadonlyArray<readonly ['scope' | 'validate', number]>,
    overrides: Partial<Parameters<typeof identifyFinalValidationExemption>[0]> = {},
  ) => {
    const captures = createLauncherCaptures(calls);
    return identifyFinalValidationExemption({
      actorExecutionEvidence: captures.actorExecutionEvidence,
      commandPolicy: projectStream(entries),
      profileName: 'ordinary',
      resourceEvidence: captures.actorResourceEvidence,
      workspaceChanges: MOLDEA_CHANGE,
      ...overrides,
    });
  };

  test('exempts a validation that follows a moldea/ patch and ends moldea work', () => {
    expect(
      identify(
        [
          ['command', `${LAUNCHER} scope --paths-stdin --json --max-output-bytes 65536`, 900],
          ['command', 'cat moldea/project.md', 1_000],
          PATCH_MOLDEA,
          ['command', 'node --test src/a.test-unit.js', 100],
          ['command', VALIDATE, 2_000],
        ],
        [
          ['scope', 900],
          ['validate', 2_000],
        ],
      ),
    ).toBe(2_000);
  });

  test.each([
    [
      'validation before any write',
      [['command', VALIDATE, 2_000], PATCH_MOLDEA],
      [['validate', 2_000]],
    ],
    [
      'write, validate, then a patch write',
      [PATCH_MOLDEA, ['command', VALIDATE, 2_000], PATCH_MOLDEA],
      [['validate', 2_000]],
    ],
    [
      'write, validate, then a shell write to moldea/',
      [PATCH_MOLDEA, ['command', VALIDATE, 2_000], ['command', 'cat > moldea/notes.md', 0]],
      [['validate', 2_000]],
    ],
    [
      'further assessment after the validate',
      [PATCH_MOLDEA, ['command', VALIDATE, 2_000], ['command', 'cat moldea/project.md', 10]],
      [['validate', 2_000]],
    ],
    [
      'a second validation',
      [PATCH_MOLDEA, ['command', VALIDATE, 2_000], ['command', VALIDATE, 2_000]],
      [
        ['validate', 2_000],
        ['validate', 2_000],
      ],
    ],
    [
      'a validate followed by a patch with unreadable paths',
      [PATCH_MOLDEA, ['command', VALIDATE, 2_000], ['file-change', [{ kind: 'update' }]]],
      [['validate', 2_000]],
    ],
    [
      'a validate that cannot be placed in the stream',
      [PATCH_MOLDEA, ['command', `${VALIDATE} | head -c $LIMIT`, 2_000]],
      [['validate', 2_000]],
    ],
    [
      'shell-only writes',
      [
        ['command', 'cat > moldea/notes.md', 0],
        ['command', VALIDATE, 2_000],
      ],
      [['validate', 2_000]],
    ],
    [
      'an exempt-size overflow',
      [PATCH_MOLDEA, ['command', VALIDATE, 65_537]],
      [['validate', 65_537]],
    ],
    [
      'a patch outside moldea/',
      [
        ['file-change', [{ path: '/mnt/src/app.ts', kind: 'update' }]],
        ['command', VALIDATE, 2_000],
      ],
      [['validate', 2_000]],
    ],
    [
      'a validate that follows only a patch with missing paths',
      [
        ['file-change', [{ kind: 'update' }]],
        ['command', VALIDATE, 2_000],
      ],
      [['validate', 2_000]],
    ],
    [
      'a validate that follows only a patch with an empty change list',
      [
        ['file-change', []],
        ['command', VALIDATE, 2_000],
      ],
      [['validate', 2_000]],
    ],
    [
      'a patch with missing paths and a shell write before the validate',
      [
        ['file-change', [{ kind: 'update' }]],
        ['command', 'cat > moldea/notes.md', 0],
        ['command', VALIDATE, 2_000],
      ],
      [['validate', 2_000]],
    ],
  ] as const)('denies the exemption for %s', (_description, entries, calls) => {
    expect(identify(entries, calls)).toBeNull();
  });

  test('exempts a validation after a known moldea/ patch and a later unreadable patch', () => {
    expect(
      identify(
        [PATCH_MOLDEA, ['file-change', [{ kind: 'update' }]], ['command', VALIDATE, 2_000]],
        [['validate', 2_000]],
      ),
    ).toBe(2_000);
  });

  test.each([
    ['any largeTraversal trial', { profileName: 'largeTraversal' as const }],
    [
      'a cycle without net moldea/ changes',
      { workspaceChanges: { ...MOLDEA_CHANGE, modified: [] } },
    ],
    ['a trial without cycle changes', { workspaceChanges: undefined }],
  ])('denies the exemption for %s', (_description, overrides) => {
    expect(
      identify([PATCH_MOLDEA, ['command', VALIDATE, 2_000]], [['validate', 2_000]], overrides),
    ).toBeNull();
  });

  test('lets only the exempt validation cross the scenario and aggregate limits', () => {
    const grade = (entries: readonly IStreamEntry[]) => {
      const captures = createLauncherCaptures([
        ['scope', 1_000],
        ['validate', 10_000],
      ]);
      return createSemanticResultDimensions({
        ...captures,
        actorCommandPolicy: projectStream(entries),
        caseDefinition: {
          ...caseDefinition,
          resourceBudget: {
            activation: 'direct',
            maximumMoldeaCommands: 1,
            maximumMoldeaOutputBytes: 5_000,
            minimumMoldeaCommands: 0,
          },
        },
        gitInvocationEvidence: NO_GIT_EVIDENCE,
        isMountIntegrityPassing: true,
        isRepositoryControlPassing: true,
        isSemanticPassing: true,
        judgeCommandPolicy: projectCodexEvaluationExecutionEvidence('').commandPolicy,
        workspaceChanges: MOLDEA_CHANGE,
      }).resource;
    };
    const scope = [
      'command',
      `${LAUNCHER} scope --paths-stdin --json --max-output-bytes 65536`,
      1_000,
    ] as const;
    const reads = splitOutput(3, 515_000, 200_000).map(
      (size) => ['command', 'cat moldea/project.md', size] as const,
    );
    expect(grade([scope, ...reads, PATCH_MOLDEA, ['command', VALIDATE, 10_000]])).toBe(true);
    expect(grade([scope, ...reads, ['command', VALIDATE, 10_000], PATCH_MOLDEA])).toBe(false);
    expect(
      grade([
        scope,
        ...reads,
        PATCH_MOLDEA,
        ['command', VALIDATE, 10_000],
        ['command', 'cat moldea/project.md', 10],
      ]),
    ).toBe(false);
  });
});
