// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import {
  assessJudgeOutput,
  buildActorPrompt,
  buildJudgePrompt,
  collectProductionPackageRoots,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticEvaluationCandidate,
  createSemanticEvaluationRecord,
  getPendingSemanticCaseDefinitions,
  getSemanticCriterionLabels,
  getSemanticToolingSource,
  mergeSemanticCandidateResult,
  normalizePortableSkillSemanticEvidence,
  validateSemanticCandidateCompatibility,
  validateSemanticCaseDefinition,
  validateSemanticResultRecording,
  validateSkillDocument,
  validateSkillEvidenceConfiguration,
} from './semantic-evaluation-runner.mjs';

const EXPECTED_CRITERION = {
  criterion: 'The supplied evidence demonstrates the expected secret behavior.',
  label: 'expected-secret-label',
};
const FORBIDDEN_CRITERION = {
  criterion: 'The supplied evidence demonstrates the forbidden secret behavior.',
  label: 'forbidden-secret-label',
};
const CASE_DEFINITION = {
  expected: [EXPECTED_CRITERION],
  forbidden: [FORBIDDEN_CRITERION],
  id: 'blind-evaluation',
  prompt: 'Evaluate this repository without changing it.',
};
const SECOND_CASE_DEFINITION = {
  expected: [
    {
      criterion: 'The supplied evidence demonstrates the second expected behavior.',
      label: 'second-expected-label',
    },
  ],
  forbidden: [
    {
      criterion: 'The supplied evidence demonstrates the second forbidden behavior.',
      label: 'second-forbidden-label',
    },
  ],
  id: 'second-evaluation',
  prompt: 'Evaluate a second repository scenario without changing it.',
};
const SKILL_CASE_DEFINITION = {
  expected: [EXPECTED_CRITERION],
  forbidden: [FORBIDDEN_CRITERION],
  id: 'skill-evaluation',
  input: { developerDirection: 'Create a release-review skill.' },
  operation: 'create-agent-skill',
  scenario: 'A repository needs a reusable release-review workflow.',
  skillEvidence: {
    activationScenarios: [
      { request: 'Review this release.', shouldActivate: true },
      { request: 'Update package.json.', shouldActivate: false },
    ],
    artifacts: [{ role: 'authoritative-source', root: 'skills/release-review' }],
  },
};
const HOST_INSTRUCTIONS =
  '# Evaluation coding instructions\n\nEnd every `plan` response by stating that no repository files were changed.\n';
const HOST_CASE_DEFINITION = {
  ...SKILL_CASE_DEFINITION,
  hostInstructions: HOST_INSTRUCTIONS,
  id: 'host-plan-command',
};
const ACTOR_HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const JUDGE_HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const ARTIFACT_DIGEST = 'a'.repeat(64);
const CLI_IDENTITY = {
  integrity: `sha512-${'a'.repeat(86)}`,
  jsonSchemaVersion: 2,
  name: '@moldea.ai/cli',
  packageLockSha256: 'd'.repeat(64),
  version: '4.0.0',
};
const EVALUATED_AT = '2026-08-16T12:00:00.000Z';
const BEFORE_SNAPSHOT_STATE = {
  content: 'before',
  mode: 33_204,
  omission: null,
  sha256: 'b'.repeat(64),
  type: 'file',
};
const AFTER_SNAPSHOT_STATE = {
  content: 'after',
  mode: 33_204,
  omission: null,
  sha256: 'c'.repeat(64),
  type: 'file',
};

const createCaseResult = (caseDefinition, passed) => ({
  actorResponse: `Actor response for ${caseDefinition.id}`,
  caseId: caseDefinition.id,
  forbidden: [],
  id: caseDefinition.id,
  observed: passed ? getSemanticCriterionLabels(caseDefinition.expected) : [],
  passed,
  rationale: passed ? 'The expected behavior was demonstrated.' : 'Expected evidence was missing.',
  skillArtifactEvidence: [],
  workspaceChanges: {
    created: [],
    deleted: [],
    modified: [
      {
        after: AFTER_SNAPSHOT_STATE,
        before: BEFORE_SNAPSHOT_STATE,
        path: 'src/example.js',
      },
    ],
  },
});

test('actor prompt contains only the user scenario', () => {
  const actorPrompt = buildActorPrompt(CASE_DEFINITION);

  assert.equal(actorPrompt, CASE_DEFINITION.prompt);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
  assert.doesNotMatch(actorPrompt, /expected secret behavior|forbidden secret behavior/);
});

test('structured actor prompt excludes evaluation criteria', () => {
  const actorPrompt = buildActorPrompt(HOST_CASE_DEFINITION);

  assert.match(actorPrompt, /Requested operation: create-agent-skill/);
  assert.match(actorPrompt, /Create a release-review skill/);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
  assert.doesNotMatch(actorPrompt, /expected secret behavior|forbidden secret behavior/);
  assert.doesNotMatch(actorPrompt, /Review this release|shouldActivate|authoritative-source/);
  assert.doesNotMatch(actorPrompt, /Evaluation coding instructions|no repository files were changed/);
});

test('judge prompt receives criteria after actor execution', () => {
  const judgePrompt = buildJudgePrompt(
    HOST_CASE_DEFINITION,
    'Actor response',
    {
      created: [],
      deleted: [],
      modified: [],
    },
    [
      {
        directories: ['skills/release-review'],
        excludedDirectoryCount: 0,
        files: [],
        resourceReferences: [],
        role: 'authoritative-source',
        root: 'skills/release-review',
        rootType: 'directory',
        truncatedDirectoryCount: 0,
        truncatedFileCount: 0,
        validation: {
          description: 'Reviews releases.',
          errors: [],
          name: 'release-review',
          valid: true,
        },
      },
    ],
  );

  assert.match(judgePrompt, /expected-secret-label/);
  assert.match(judgePrompt, /forbidden-secret-label/);
  assert.match(judgePrompt, /expected secret behavior/);
  assert.match(judgePrompt, /forbidden secret behavior/);
  assert.match(judgePrompt, /exact evidence rule/);
  assert.match(judgePrompt, /Actor response/);
  assert.match(judgePrompt, /Independent skill artifact evidence/);
  assert.match(judgePrompt, /"valid": true/);
  assert.match(judgePrompt, /untrusted artifact evidence/);
  assert.match(judgePrompt, /Evaluator-only activation scenarios/);
  assert.match(judgePrompt, /Review this release/);
  assert.match(judgePrompt, /Applicable host coding instructions/);
  assert.match(judgePrompt, /no repository files were changed/);
});

test('semantic case definitions require strict unique evaluator criteria', () => {
  assert.doesNotThrow(() => validateSemanticCaseDefinition(CASE_DEFINITION));
  assert.throws(
    () => validateSemanticCaseDefinition({ ...CASE_DEFINITION, expected: ['legacy-label'] }),
    /invalid evaluator criteria/,
  );
  assert.throws(
    () =>
      validateSemanticCaseDefinition({
        ...CASE_DEFINITION,
        expected: [{ ...EXPECTED_CRITERION, unsupported: true }],
      }),
    /invalid evaluator criteria/,
  );
  assert.throws(
    () =>
      validateSemanticCaseDefinition({
        ...CASE_DEFINITION,
        forbidden: [
          {
            criterion: 'The expected label cannot also be forbidden.',
            label: EXPECTED_CRITERION.label,
          },
        ],
      }),
    /duplicate evaluator labels/,
  );
});

test('semantic case digests include evaluator criterion text', () => {
  const changedCriterionCase = {
    ...CASE_DEFINITION,
    expected: [
      {
        ...EXPECTED_CRITERION,
        criterion: 'A materially different expected evidence contract.',
      },
    ],
  };

  assert.notEqual(
    createSemanticCaseDefinitionDigest(CASE_DEFINITION),
    createSemanticCaseDefinitionDigest(changedCriterionCase),
  );
  assert.notEqual(
    createSemanticCaseSuiteDigest([CASE_DEFINITION]),
    createSemanticCaseSuiteDigest([changedCriterionCase]),
  );
});

test('skill evidence configuration validates roles, paths, and activation scenarios', () => {
  assert.deepEqual(validateSkillEvidenceConfiguration(SKILL_CASE_DEFINITION), {
    activationScenarios: SKILL_CASE_DEFINITION.skillEvidence.activationScenarios,
    artifacts: SKILL_CASE_DEFINITION.skillEvidence.artifacts,
  });
  assert.deepEqual(validateSkillEvidenceConfiguration(CASE_DEFINITION), {
    activationScenarios: [],
    artifacts: [],
  });

  for (const root of [
    '/skills/release-review',
    '../skills/release-review',
    'skills\\release-review',
    'skills/_archive/release-review',
  ]) {
    assert.throws(
      () =>
        validateSkillEvidenceConfiguration({
          ...SKILL_CASE_DEFINITION,
          skillEvidence: {
            activationScenarios: [],
            artifacts: [{ role: 'authoritative-source', root }],
          },
        }),
      /invalid skill artifact root|unsafe skill artifact root/,
    );
  }

  assert.throws(
    () =>
      validateSkillEvidenceConfiguration({
        ...SKILL_CASE_DEFINITION,
        skillEvidence: {
          activationScenarios: [],
          artifacts: [
            { role: 'authoritative-source', root: 'skills/release-review' },
            { role: 'distributed-copy', root: 'skills/release-review' },
          ],
        },
      }),
    /unsafe skill artifact root/,
  );
  assert.throws(
    () =>
      validateSkillEvidenceConfiguration({
        ...SKILL_CASE_DEFINITION,
        skillEvidence: {
          activationScenarios: [{ request: '', shouldActivate: true }],
          artifacts: SKILL_CASE_DEFINITION.skillEvidence.artifacts,
        },
      }),
    /invalid skill activation scenarios/,
  );
});

test('skill document validation enforces identity, activation, and body contracts', () => {
  assert.deepEqual(
    validateSkillDocument(
      [
        '---',
        'name: release-review',
        'description: Reviews npm and pnpm releases when publication readiness is requested.',
        '---',
        '',
        '# Release review',
      ].join('\n'),
      'release-review',
    ),
    {
      description: 'Reviews npm and pnpm releases when publication readiness is requested.',
      errors: [],
      name: 'release-review',
      valid: true,
    },
  );

  assert.deepEqual(
    validateSkillDocument(
      ['---', 'name: ReleaseReview', 'description: ""', 'unsupported: true', '---'].join('\n'),
      'release-review',
    ),
    {
      description: '',
      errors: [
        'unsupported-frontmatter-key:unsupported',
        'invalid-name',
        'invalid-description',
        'empty-body',
      ],
      name: 'ReleaseReview',
      valid: false,
    },
  );

  assert.equal(
    validateSkillDocument(
      [
        '---',
        'name: release-review',
        'description: Review <repository> releases.',
        '---',
        '',
        '# Release review',
      ].join('\n'),
      'release-review',
    ).valid,
    false,
  );
});

test('assessment derives failure when expected evidence is missing', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: [],
      observed: [],
      rationale: 'No supporting evidence.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment derives failure when forbidden behavior is observed', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: ['forbidden-secret-label'],
      observed: ['expected-secret-label'],
      rationale: 'Both behaviors were present.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment rejects labels outside the declared case contract', () => {
  assert.throws(
    () =>
      assessJudgeOutput(
        CASE_DEFINITION,
        JSON.stringify({
          forbidden: ['undeclared-label'],
          observed: ['expected-secret-label'],
          rationale: 'Unsupported label.',
        }),
      ),
    /undeclared behavior label/,
  );
});

test('semantic candidates bind exact artifacts, case suites, and hosts', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  const candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  assert.equal(
    createSemanticCaseSuiteDigest(caseDefinitions),
    createSemanticCaseSuiteDigest([...caseDefinitions].reverse()),
  );
  assert.throws(
    () => createSemanticCaseSuiteDigest([CASE_DEFINITION, CASE_DEFINITION]),
    /case IDs must be unique/,
  );
  assert.doesNotThrow(() =>
    validateSemanticCandidateCompatibility(candidate, {
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      judgeHost: JUDGE_HOST,
    }),
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(
        { ...candidate, evaluationProtocolVersion: 9 },
        {
          actorHost: ACTOR_HOST,
          artifactDigest: ARTIFACT_DIGEST,
          caseDefinitions,
          cli: CLI_IDENTITY,
          judgeHost: JUDGE_HOST,
        },
      ),
    /unsupported shape/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: 'b'.repeat(64),
        caseDefinitions,
        cli: CLI_IDENTITY,
        judgeHost: JUDGE_HOST,
      }),
    /different portable artifact/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions: [
          { ...CASE_DEFINITION, prompt: 'Changed evaluation prompt.' },
          SECOND_CASE_DEFINITION,
        ],
        cli: CLI_IDENTITY,
        judgeHost: JUDGE_HOST,
      }),
    /different case suite/,
  );
  const populatedCandidate = mergeSemanticCandidateResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    EVALUATED_AT,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(populatedCandidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions: [
          {
            ...CASE_DEFINITION,
            expected: [
              {
                criterion: 'The supplied evidence demonstrates changed expected behavior.',
                label: 'changed-expected-label',
              },
            ],
          },
          SECOND_CASE_DEFINITION,
        ],
        cli: CLI_IDENTITY,
        judgeHost: JUDGE_HOST,
      }),
    /different case suite/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: { ...CLI_IDENTITY, version: '3.3.8' },
        judgeHost: JUDGE_HOST,
      }),
    /different release CLI/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: { ...ACTOR_HOST, version: '2.0.0' },
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: CLI_IDENTITY,
        judgeHost: JUDGE_HOST,
      }),
    /different actor or judge hosts/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: { ...ACTOR_HOST, reasoningEffort: 'high' },
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: CLI_IDENTITY,
        judgeHost: { ...JUDGE_HOST, reasoningEffort: 'high' },
      }),
    /different actor or judge hosts/,
  );
});

test('semantic candidates resume pending cases and replace targeted evidence', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  let candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  candidate = mergeSemanticCandidateResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    EVALUATED_AT,
  );
  candidate = mergeSemanticCandidateResult(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.deepEqual(
    getPendingSemanticCaseDefinitions(candidate, caseDefinitions).map(({ id }) => id),
    [SECOND_CASE_DEFINITION.id],
  );
  assert.throws(
    () => validateSemanticResultRecording({ candidate, caseDefinitions }),
    /incomplete or failing/,
  );

  candidate = mergeSemanticCandidateResult(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, true),
    '2026-08-16T12:01:00.000Z',
  );
  assert.deepEqual(getPendingSemanticCaseDefinitions(candidate, caseDefinitions), []);
  assert.doesNotThrow(() => validateSemanticResultRecording({ candidate, caseDefinitions }));

  const record = createSemanticEvaluationRecord({
    candidate,
    caseDefinitions,
    generatedAt: '2026-08-16T12:02:00.000Z',
  });
  assert.equal(record.evaluationProtocolVersion, 10);
  assert.deepEqual(record.cli, CLI_IDENTITY);
  assert.equal(record.caseSuiteDigest, createSemanticCaseSuiteDigest(caseDefinitions));
  assert.deepEqual(
    record.cases.map(({ id }) => id),
    caseDefinitions.map(({ id }) => id),
  );
  assert.deepEqual(
    record.cases.map(({ caseDefinitionDigest }) => caseDefinitionDigest),
    caseDefinitions.map(createSemanticCaseDefinitionDigest),
  );
});

test('semantic candidates accept explicitly truncated skill artifact evidence', () => {
  const caseDefinitions = [SKILL_CASE_DEFINITION];
  const result = createCaseResult(SKILL_CASE_DEFINITION, true);
  result.skillArtifactEvidence = [
    {
      directories: ['skills/release-review'],
      excludedDirectoryCount: 0,
      files: [
        {
          content: null,
          mode: 33_204,
          omission: 'file-too-large',
          path: 'skills/release-review/large-reference.md',
          sha256: null,
        },
      ],
      isTraversalTruncated: true,
      resourceReferences: [],
      role: 'authoritative-source',
      root: 'skills/release-review',
      rootType: 'directory',
      truncatedDirectoryCount: 1,
      truncatedFileCount: 1,
      truncatedResourceReferenceCount: 8,
      validation: {
        description: null,
        errors: ['missing-skill-document'],
        name: null,
        valid: false,
      },
    },
  ];
  const candidate = mergeSemanticCandidateResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    SKILL_CASE_DEFINITION,
    result,
    EVALUATED_AT,
  );

  assert.doesNotThrow(() => validateSemanticResultRecording({ candidate, caseDefinitions }));
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              skillArtifactEvidence: [
                {
                  ...candidate.results[0].skillArtifactEvidence[0],
                  files: [
                    {
                      ...candidate.results[0].skillArtifactEvidence[0].files[0],
                      omission: 'non-utf8',
                    },
                  ],
                },
              ],
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
});

test('semantic candidate validation rejects internally inconsistent evidence', () => {
  const caseDefinitions = [CASE_DEFINITION];
  const candidate = mergeSemanticCandidateResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [{ ...candidate.results[0], passed: true }],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [
                  {
                    path: 'src/oversized.js',
                    state: {
                      content: 'é'.repeat(16_385),
                      mode: 33_204,
                      omission: null,
                      sha256: 'd'.repeat(64),
                      type: 'file',
                    },
                  },
                ],
                deleted: [],
                modified: [],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [],
                deleted: [],
                modified: [
                  {
                    ...candidate.results[0].workspaceChanges.modified[0],
                    after: {
                      mode: AFTER_SNAPSHOT_STATE.mode,
                      sha256: AFTER_SNAPSHOT_STATE.sha256,
                      type: 'file',
                    },
                  },
                ],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [],
                deleted: [],
                modified: ['src/example.js'],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [{ ...candidate.results[0], skillArtifactEvidence: [{}] }],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
});

test('semantic evidence normalization permits only release-version declarations', () => {
  const previousSkill = [
    'metadata:',
    "  version: '1.0.0'",
    '',
    'Skill release `1.0.0` supports exactly:',
    '',
    'Preserve canonical instruction provenance.',
  ].join('\n');
  const nextSkill = previousSkill.replaceAll('1.0.0', '1.0.1');

  assert.equal(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence('SKILL.md', nextSkill),
  );
  assert.equal(
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.0` supports:\n',
    ),
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.1` supports:\n',
    ),
  );
  assert.notEqual(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence(
      'SKILL.md',
      nextSkill.replace('Preserve canonical', 'Replace canonical'),
    ),
  );
  assert.match(createPortableSkillSemanticDigest(), /^[a-f0-9]{64}$/);
});

test('uses the published CLI for compatibility-sensitive runtime states', () => {
  assert.equal(
    getSemanticToolingSource('available-runtime-insufficient-behavioral-evidence'),
    'published-package',
  );
  assert.equal(
    getSemanticToolingSource('dedicated-repository-runtime-selection'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('unavailable-runtime-selection'), 'published-package');
  assert.equal(
    getSemanticToolingSource('agent-adoption-inline-runtime-instruction'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('adopted-relevance-no-change'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-insufficient-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-partial-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-sufficient-context'), 'published-package');
  assert.equal(
    getSemanticToolingSource('plan-runtime-inventory-insufficient-evidence'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('pnpm-pnp-local-cli-provider'), 'scenario-specific');
});

test('collects the exact published CLI production dependency closure', () => {
  const rootNodeModules = join(process.cwd(), 'node_modules');
  const packageEntries = collectProductionPackageRoots(
    join(process.cwd(), 'node_modules', '@moldea.ai', 'cli'),
  ).map((packageRoot) => ({
    lockPath: `node_modules/${relative(rootNodeModules, packageRoot)}`,
    manifest: JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')),
  }));
  const manifestsByName = new Map(packageEntries.map(({ manifest }) => [manifest.name, manifest]));
  const rootLock = JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8'));
  const rootManifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const cliManifest = manifestsByName.get('@moldea.ai/cli');

  assert.equal(cliManifest.version, rootManifest.devDependencies['@moldea.ai/cli']);
  for (const dependencyName of Object.keys(cliManifest.dependencies)) {
    assert.ok(manifestsByName.has(dependencyName), `Missing CLI dependency ${dependencyName}.`);
  }
  for (const { lockPath, manifest } of packageEntries) {
    assert.equal(rootLock.packages[lockPath]?.version, manifest.version);
  }
});
