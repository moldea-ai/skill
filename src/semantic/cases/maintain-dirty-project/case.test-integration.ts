import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, vi } from 'vitest';

import { projectCodexEvaluationExecutionEvidence } from '../../../execution/host/index.ts';
import { buildSemanticJudgePrompt } from '../../judging/index.ts';
import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('supplies the existing support channel as grounded judge evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-dirty-evidence-'));
  vi.stubEnv('CODEX_HOME', join(root, 'empty-codex-home'));
  try {
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const runtime = (await import(
      pathToFileURL(join(repositoryPath, 'src/support-agent.ts')).href
    )) as { supportAgent: { channel: string } };
    expect(runtime.supportAgent.channel).toBe('email');

    const grounding = semanticCase.input.repositoryEvidence.find(
      ({ source }) => source.kind === 'workspace-path' && source.path === 'src/support-agent.ts',
    );
    assert.ok(grounding, 'The judge needs the existing runtime support-channel fact.');
    expect(grounding.claim).toMatch(/channel.*\bemail\b/u);
    const prompt = buildSemanticJudgePrompt({
      actorCommandPolicyEvidence: projectCodexEvaluationExecutionEvidence('').commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: {
        commandCount: 0,
        maximumInvocationByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        operations: [],
        stdoutByteCount: 0,
      },
      actorResponse: 'The existing support channel is email.',
      caseDefinition: semanticCase,
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      isRepositoryControlPassing: true,
      repositoryEvidence: semanticCase.input.repositoryEvidence,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    });
    expect(prompt).toContain(grounding.claim);
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});
