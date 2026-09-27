// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationCaseScenario } from '../contracts/index.ts';

import {
  inspectDeterministicSelectors,
  type IProjectedDiagnostic,
  type IProjectedEvidence,
} from './validations.ts';

type IExpectation = IQualificationCaseScenario['deterministicEvidence']['before'];

const emptyExpectation = (): IExpectation => ({
  requiredDiagnosticCodes: [],
  forbiddenDiagnosticCodes: [],
  requiredEvidenceKinds: [],
  forbiddenEvidenceKinds: [],
});

const versionWarning = (details: IProjectedDiagnostic['details']): IProjectedDiagnostic => ({
  code: 'THINK_RUNTIME_RELATIONSHIP_UNVERIFIED',
  severity: 'warning',
  agentId: 'support',
  relationship: 'instruction-loader',
  reason: 'version-dependent-behavior',
  details,
});

const runtimeEvidence = (details: IProjectedEvidence['details']): IProjectedEvidence => ({
  kind: 'runtime-pattern',
  agentId: 'support',
  capabilityKind: null,
  capabilityId: null,
  references: [{ path: '/src/agent.ts', symbol: 'supportAgent' }],
  details,
});

describe('deterministic metadata selectors', () => {
  test('matches a version warning only when one record has its full boundary context', () => {
    const expected = {
      ...emptyExpectation(),
      requiredDiagnostics: [
        {
          code: 'THINK_RUNTIME_RELATIONSHIP_UNVERIFIED',
          severity: 'warning',
          agentId: 'support',
          relationship: 'instruction-loader',
          reason: 'version-dependent-behavior',
          details: {
            packageName: '@cloudflare/think',
            boundaryVersion: '0.18.0',
            declaredRange: null,
          },
        },
      ],
    } satisfies IExpectation;
    const correct = versionWarning({
      packageName: '@cloudflare/think',
      boundaryVersion: '0.18.0',
      declaredRange: null,
    });
    expect(inspectDeterministicSelectors(expected, [correct], [])).toStrictEqual([]);

    for (const actual of [
      versionWarning({ packageName: 'agents', boundaryVersion: '0.18.0', declaredRange: null }),
      versionWarning({
        packageName: '@cloudflare/think',
        boundaryVersion: '0.19.0',
        declaredRange: null,
      }),
      versionWarning({ packageName: '@cloudflare/think', boundaryVersion: '0.18.0' }),
      versionWarning({
        packageName: '@cloudflare/think',
        boundaryVersion: '0.18.0',
        declaredRange: '^0.19.0',
      }),
      { ...correct, relationship: 'tool-registration' },
    ]) {
      expect(inspectDeterministicSelectors(expected, [actual], [])).toHaveLength(1);
    }

    expect(
      inspectDeterministicSelectors(
        expected,
        [
          versionWarning({ packageName: '@cloudflare/think' }),
          versionWarning({ boundaryVersion: '0.18.0', declaredRange: null }),
        ],
        [],
      ),
    ).toHaveLength(1);
  });

  test.each(['absent', 'enabled', 'disabled', 'unknown'] as const)(
    'requires the actual %s deferred-loading state',
    (state) => {
      const expected = {
        ...emptyExpectation(),
        requiredEvidence: [
          {
            kind: 'runtime-pattern',
            agentId: 'support',
            reference: { path: '/src/agent.ts', symbol: 'supportAgent' },
            details: { declaredDeferredLoading: state },
          },
        ],
      } satisfies IExpectation;
      expect(
        inspectDeterministicSelectors(
          expected,
          [],
          [runtimeEvidence({ declaredDeferredLoading: state })],
        ),
      ).toStrictEqual([]);
      for (const other of ['absent', 'enabled', 'disabled', 'unknown'] as const) {
        if (other === state) continue;
        expect(
          inspectDeterministicSelectors(
            expected,
            [],
            [runtimeEvidence({ declaredDeferredLoading: other })],
          ),
        ).toHaveLength(1);
      }
      expect(inspectDeterministicSelectors(expected, [], [runtimeEvidence({})])).toHaveLength(1);
    },
  );

  test('checks interrupt form, resume role, references, and forbidden metadata', () => {
    const evidence = runtimeEvidence({
      patternId: 'functional-interrupt',
      interruptForm: 'two-argument',
      responseSchemaRole: 'resume-value',
    });
    const expected = {
      ...emptyExpectation(),
      requiredEvidence: [
        {
          kind: 'runtime-pattern',
          reference: { path: '/src/agent.ts', symbol: 'supportAgent' },
          details: {
            patternId: 'functional-interrupt',
            interruptForm: 'two-argument',
            responseSchemaRole: 'resume-value',
          },
        },
      ],
      forbiddenEvidence: [
        { kind: 'runtime-pattern', details: { declaredDeferredLoading: 'enabled' } },
      ],
    } satisfies IExpectation;
    expect(inspectDeterministicSelectors(expected, [], [evidence])).toStrictEqual([]);
    expect(
      inspectDeterministicSelectors(
        expected,
        [],
        [{ ...evidence, details: { patternId: 'functional-interrupt' } }],
      ),
    ).toHaveLength(1);
    expect(
      inspectDeterministicSelectors(
        expected,
        [],
        [{ ...evidence, references: [{ path: '/src/other.ts' }] }],
      ),
    ).toHaveLength(1);
    expect(
      inspectDeterministicSelectors(
        {
          ...emptyExpectation(),
          forbiddenEvidence: [
            { kind: 'runtime-pattern', details: { responseSchemaRole: 'resume-value' } },
          ],
        },
        [],
        [evidence],
      ),
    ).toHaveLength(1);
  });
});
