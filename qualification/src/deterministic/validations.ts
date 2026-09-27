import type { IQualificationCaseScenario } from '../contracts/index.ts';

type IExpectation = IQualificationCaseScenario['deterministicEvidence']['before'];
type IDiagnosticSelector = NonNullable<IExpectation['requiredDiagnostics']>[number];
type IEvidenceSelector = NonNullable<IExpectation['requiredEvidence']>[number];

export interface IProjectedDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  agentId?: string | undefined;
  capabilityKind?: 'skill' | 'tool' | undefined;
  capabilityId?: string | undefined;
  relationship?: string | undefined;
  reason?: string | undefined;
  details?:
    | {
        packageName?: string | undefined;
        boundaryVersion?: string | undefined;
        declaredRange?: string | null | undefined;
      }
    | undefined;
}

export interface IProjectedEvidence {
  kind: string;
  agentId: string | null;
  capabilityKind: 'skill' | 'tool' | null;
  capabilityId: string | null;
  references: Array<{ path: string; symbol?: string | undefined }>;
  details: {
    declaredDeferredLoading?: 'absent' | 'enabled' | 'disabled' | 'unknown' | undefined;
    patternId?: string | undefined;
    interruptForm?: 'two-argument' | undefined;
    responseSchemaRole?: 'resume-value' | undefined;
  };
}

const matchesSpecifiedFields = (
  actual: object,
  expected: object,
  fields: readonly string[],
): boolean => {
  const actualFields = actual as Record<string, unknown>;
  const expectedFields = expected as Record<string, unknown>;
  return fields.every(
    (field) =>
      !Object.hasOwn(expected, field) ||
      (Object.hasOwn(actual, field) && actualFields[field] === expectedFields[field]),
  );
};

const matchesDiagnostic = (actual: IProjectedDiagnostic, expected: IDiagnosticSelector): boolean =>
  matchesSpecifiedFields(actual, expected, [
    'code',
    'severity',
    'agentId',
    'capabilityKind',
    'capabilityId',
    'relationship',
    'reason',
  ]) &&
  (expected.details === undefined ||
    (actual.details !== undefined &&
      matchesSpecifiedFields(actual.details, expected.details, [
        'packageName',
        'boundaryVersion',
        'declaredRange',
      ])));

const matchesEvidence = (actual: IProjectedEvidence, expected: IEvidenceSelector): boolean => {
  const expectedReference = expected.reference;
  return (
    matchesSpecifiedFields(actual, expected, [
      'kind',
      'agentId',
      'capabilityKind',
      'capabilityId',
    ]) &&
    (expected.details === undefined ||
      matchesSpecifiedFields(actual.details, expected.details, [
        'declaredDeferredLoading',
        'patternId',
        'interruptForm',
        'responseSchemaRole',
      ])) &&
    (expectedReference === undefined ||
      actual.references.some((reference) =>
        matchesSpecifiedFields(reference, expectedReference, ['path', 'symbol']),
      ))
  );
};

/** Checks every bounded metadata selector against one complete Core record. */
export const inspectDeterministicSelectors = (
  expectation: IExpectation,
  diagnostics: readonly IProjectedDiagnostic[],
  evidence: readonly IProjectedEvidence[],
): string[] => [
  ...(expectation.requiredDiagnostics ?? [])
    .filter((selector) => !diagnostics.some((record) => matchesDiagnostic(record, selector)))
    .map((selector) => `Required diagnostic was not observed: ${JSON.stringify(selector)}.`),
  ...(expectation.forbiddenDiagnostics ?? [])
    .filter((selector) => diagnostics.some((record) => matchesDiagnostic(record, selector)))
    .map((selector) => `Forbidden diagnostic was observed: ${JSON.stringify(selector)}.`),
  ...(expectation.requiredEvidence ?? [])
    .filter((selector) => !evidence.some((record) => matchesEvidence(record, selector)))
    .map((selector) => `Required evidence was not observed: ${JSON.stringify(selector)}.`),
  ...(expectation.forbiddenEvidence ?? [])
    .filter((selector) => evidence.some((record) => matchesEvidence(record, selector)))
    .map((selector) => `Forbidden evidence was observed: ${JSON.stringify(selector)}.`),
];
