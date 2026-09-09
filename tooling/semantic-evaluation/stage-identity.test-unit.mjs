import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256 } from '../codex-evaluation-host/index.mjs';

import {
  createSemanticActorStageIdentity,
  createSemanticJudgeStageIdentity,
  createSemanticStageValueDigest,
} from './stage-identity.mjs';

const digest = 'a'.repeat(64);
const actorHost = {
  developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'xhigh',
  role: 'actor',
  version: 'codex-cli 0.153.4',
};
const judgeHost = {
  ...actorHost,
  reasoningEffort: 'xhigh',
  role: 'judge',
};
const repositoryControlBefore = {
  indexDigest: digest,
  installedSkillDigest: digest,
  localConfigDigest: digest,
};

const createActor = (overrides = {}) =>
  createSemanticActorStageIdentity({
    actorHost,
    actorPrompt: 'Use moldea to validate this repository.',
    artifactDigest: digest,
    caseDefinitionDigest: digest,
    cli: { integrity: 'sha512-example', version: '7.0.1' },
    evaluationProtocolVersion: 25,
    readOnlyMountControlEvidence: [],
    repositoryControlBefore,
    resourceProfileDigest: digest,
    scenarioEvidence: [{ claim: 'The repository is adopted.' }],
    ...overrides,
  });

describe('semantic stage identity', () => {
  test('is stable across object key insertion order', () => {
    assert.equal(
      createSemanticStageValueDigest({ a: 1, b: { c: 2, d: 3 } }),
      createSemanticStageValueDigest({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  test('changes for every behavior-bearing actor input', () => {
    const baseline = createActor();
    for (const override of [
      { actorPrompt: 'Use moldea to inspect this repository.' },
      { artifactDigest: 'b'.repeat(64) },
      { caseDefinitionDigest: 'b'.repeat(64) },
      { cli: { integrity: 'sha512-other', version: '7.0.1' } },
      { actorHost: { ...actorHost, version: 'codex-cli 0.154.0' } },
      { actorHost: { ...actorHost, reasoningEffort: 'high' } },
      { evaluationProtocolVersion: 26 },
      {
        actorHost: {
          ...actorHost,
          developerInstructionsSha256: 'b'.repeat(64),
        },
      },
      {
        readOnlyMountControlEvidence: [
          {
            after: { mount: '/related', treeDigest: digest },
            before: { mount: '/related', treeDigest: digest },
            violations: [],
          },
        ],
      },
      {
        repositoryControlBefore: {
          ...repositoryControlBefore,
          indexDigest: 'b'.repeat(64),
        },
      },
      { resourceProfileDigest: 'b'.repeat(64) },
      { scenarioEvidence: [{ claim: 'The repository is not adopted.' }] },
    ]) {
      assert.notEqual(createActor(override).sha256, baseline.sha256);
    }
  });

  test('does not bind semantic stage reuse to the host timeout ceiling', () => {
    assert.equal(
      createActor({ hostTimeoutMs: 600_000 }).sha256,
      createActor({ hostTimeoutMs: 900_000 }).sha256,
    );
  });

  test('rejects role mismatches at each stage identity boundary', () => {
    assert.throws(() => createActor({ actorHost: judgeHost }), /complete model-host identity/u);
    assert.throws(
      () =>
        createSemanticJudgeStageIdentity({
          actorEvidence: { actorResponse: 'Valid.', workspaceChanges: [] },
          actorIdentitySha256: createActor().sha256,
          caseDefinitionDigest: digest,
          evaluationProtocolVersion: 25,
          judgeHost: actorHost,
          judgePrompt: 'Assess this exact evidence.',
        }),
      /complete model-host identity/u,
    );
  });

  test('ignores ephemeral Git identity while retaining fixture-owned state', () => {
    const baseline = createActor();
    const withEphemeralGitState = createActor({
      repositoryControlBefore: {
        ...repositoryControlBefore,
        headCommit: 'b'.repeat(40),
        symbolicRef: 'refs/heads/evaluation',
      },
    });

    assert.equal(withEphemeralGitState.sha256, baseline.sha256);
    assert.notEqual(
      createActor({
        repositoryControlBefore: {
          ...repositoryControlBefore,
          installedSkillDigest: 'b'.repeat(64),
        },
      }).sha256,
      baseline.sha256,
    );
  });

  test('binds judge identity to the actor identity and complete actor evidence', () => {
    const actor = createActor();
    const baseline = createSemanticJudgeStageIdentity({
      actorEvidence: { actorResponse: 'Valid.', workspaceChanges: [] },
      actorIdentitySha256: actor.sha256,
      caseDefinitionDigest: digest,
      evaluationProtocolVersion: 25,
      judgeHost,
      judgePrompt: 'Assess this exact evidence.',
    });
    const changed = createSemanticJudgeStageIdentity({
      actorEvidence: { actorResponse: 'Invalid.', workspaceChanges: [] },
      actorIdentitySha256: actor.sha256,
      caseDefinitionDigest: digest,
      evaluationProtocolVersion: 25,
      judgeHost,
      judgePrompt: 'Assess this exact evidence.',
    });
    assert.notEqual(changed.sha256, baseline.sha256);
    const changedPrompt = createSemanticJudgeStageIdentity({
      actorEvidence: { actorResponse: 'Valid.', workspaceChanges: [] },
      actorIdentitySha256: actor.sha256,
      caseDefinitionDigest: digest,
      evaluationProtocolVersion: 24,
      judgeHost,
      judgePrompt: 'Assess different evidence.',
    });
    assert.notEqual(changedPrompt.sha256, baseline.sha256);
    assert.notEqual(
      createSemanticJudgeStageIdentity({
        actorEvidence: { actorResponse: 'Valid.', workspaceChanges: [] },
        actorIdentitySha256: actor.sha256,
        caseDefinitionDigest: digest,
        evaluationProtocolVersion: 25,
        judgeHost: { ...judgeHost, reasoningEffort: 'high' },
        judgePrompt: 'Assess this exact evidence.',
      }).sha256,
      baseline.sha256,
    );
    assert.notEqual(
      createSemanticJudgeStageIdentity({
        actorEvidence: { actorResponse: 'Valid.', workspaceChanges: [] },
        actorIdentitySha256: actor.sha256,
        caseDefinitionDigest: digest,
        evaluationProtocolVersion: 25,
        judgeHost: {
          ...judgeHost,
          developerInstructionsSha256: 'b'.repeat(64),
        },
        judgePrompt: 'Assess this exact evidence.',
      }).sha256,
      baseline.sha256,
    );
  });
});
