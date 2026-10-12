import {
  createJourneysEvidenceBundle,
  createJourneySnapshotEvidenceBundle,
  parseJourneysEvidenceRecord,
} from '../../../src/scripted-journeys/public-evidence/index.ts';
import { createEvidenceBundle } from '../../../src/evidence/index.ts';
import type {
  IJourneyCampaign,
  IJourneyTrial,
  IJourneyOutcome,
  IJourneyDefinition,
} from '../../../src/scripted-journeys/index.ts';

import { EVALUATION_CONFIRMATION_POLICY } from '../../../src/execution/confirmation/index.ts';
import { createJourneyDefinitionDigest } from '../../../src/scripted-journeys/journeys/index.ts';
import { createFixtureFingerprint } from '../../../src/scripted-journeys/identity/index.ts';
import {
  deriveCampaignStatus,
  resolveJourneyTrials,
} from '../../../src/scripted-journeys/confirmation/index.ts';

// deterministic synthetic captures exercise every outcome without implying real platform results
const definitions: IJourneyDefinition[] = [
  {
    id: 'initialize',
    title: 'Initialize and validate',
    summary: 'Create a project foundation, then check it without edits.',
    order: 0,
    fixture: { adopted: false, installCli: false },
    steps: [
      {
        id: 'initialize',
        request: 'Initialize moldea.',
        dependsOn: [],
        checks: [
          { kind: 'path-exists', path: 'moldea/project.md' },
          { kind: 'path-exists', path: 'moldea/moldea.yaml' },
        ],
        unverified: ['Validation ran after the final write.'],
      },
      {
        id: 'validate',
        request: 'Validate moldea.',
        dependsOn: ['initialize'],
        checks: [{ kind: 'no-changes' }],
        unverified: ['The agent invoked validation.'],
      },
    ],
  },
  {
    id: 'preserve',
    title: 'Preserve project knowledge',
    summary: 'A code change should preserve the existing project foundation.',
    order: 1,
    fixture: { adopted: true, installCli: true },
    steps: [
      {
        id: 'edit',
        request: 'Change the greeting to Hello. Preserve the project foundation.',
        dependsOn: [],
        checks: [{ kind: 'no-changes' }],
        unverified: [],
      },
    ],
  },
  {
    id: 'repair',
    title: 'Repair a damaged foundation',
    summary: 'Restore a saved foundation before validating it.',
    order: 2,
    fixture: { adopted: true, installCli: true },
    steps: [
      {
        id: 'repair',
        request: 'Repair moldea.',
        dependsOn: [],
        checks: [{ kind: 'validate', result: 'valid' }],
        unverified: [],
      },
    ],
  },
];

for (const [index, id] of [
  'recovered',
  'confirmed',
  'split',
  'claude-only',
  ...Array.from({ length: 11 }, (_, index) => `additional-${index + 1}`),
].entries()) {
  definitions.push({
    id,
    title: id === 'claude-only' ? 'Claude-only observation' : `Confirmation example: ${id}`,
    summary: `Inspect the ${id} conversation and its retained trials.`,
    order: index + 3,
    fixture: { adopted: false, installCli: false },
    steps: [
      {
        id: 'read',
        request: 'Read the saved project policy without editing files.',
        dependsOn: [],
        checks: [{ kind: 'no-changes' }],
        unverified: [],
      },
    ],
  });
}

/** Creates deterministic presentation evidence for partial coverage and every resolution state. */
export const createSyntheticJourneysBundle = (
  input: {
    transform?: (assessment: IJourneyCampaign) => void;
  } = {},
) => {
  const evaluatedAt = '2026-01-01T00:00:00.000Z';
  let serial = 0;
  const makeTrial = (
    platform: 'chatgpt' | 'claude',
    selected: IJourneyDefinition[],
    confirmationIndex: number | null,
  ): IJourneyTrial => {
    const trialId = (++serial).toString(16).padStart(32, '0');
    return {
      trialId,
      archiveSha256: serial.toString(16).padStart(64, '0'),
      kind: confirmationIndex === null ? 'initial' : 'confirmation',
      selectedJourneys: selected.map((definition) => definition.id),
      confirmationIndex,
      observation: {
        configuration: {
          model: `${platform} fixture model`,
          settings: { mode: 'Chat' },
          interventions: platform === 'chatgpt' ? ['Continued after a truncated response.'] : [],
        },
        observedAt: evaluatedAt,
        freshChat: true,
      },
      diagnosticConfiguration: null,
      environment: { node: 'v24.15.0', platform: 'linux' },
      restartCounts: Object.fromEntries(selected.map((definition) => [definition.id, 0])),
      journeys: selected.map((definition) => {
        const status: IJourneyOutcome =
          definition.id === 'repair'
            ? 'blocked'
            : definition.id === 'confirmed' ||
                (definition.id === 'split' && confirmationIndex !== 2) ||
                (definition.id === 'recovered' && confirmationIndex === null) ||
                (definition.id === 'preserve' && platform === 'claude')
              ? 'failed'
              : 'passed';
        return {
          id: definition.id,
          status,
          steps: definition.steps.map((step) => ({
            id: step.id,
            status,
            checks: step.checks.map((check, criterion) => ({
              check,
              criterion,
              status,
              detail:
                status === 'passed'
                  ? 'Criterion satisfied by the reconstructed files.'
                  : status === 'failed'
                    ? 'Unexpected change to project knowledge.'
                    : 'Required CLI evidence is unavailable.',
            })),
            unverified: step.unverified,
            facts: { issuedAt: evaluatedAt, recordedAt: evaluatedAt, cliPresent: true },
            reply:
              'Saved the project foundation.\n\nValidation reports **valid**.\n\n<script>alert("unsafe")</script>\n\n[unsafe link](javascript:alert(1))',
            activity: {
              commands: ['node .agents/skills/moldea/scripts/moldea-cli.mjs validate --json'],
              reads: ['README.md', 'src/greeting.js'],
              writes:
                step.id === 'initialize'
                  ? ['moldea/project.md', 'moldea/moldea.yaml']
                  : status === 'failed' && step.checks.some((check) => check.kind === 'no-changes')
                    ? ['moldea/project.md']
                    : [],
              notes: ['Agent-reported activity is not an execution trace.'],
            },
          })),
        };
      }),
    };
  };
  const platforms = (['chatgpt', 'claude'] as const).map((platform) => {
    const trials = [
      makeTrial(
        platform,
        definitions.filter(
          (definition) => platform === 'claude' || definition.id !== 'claude-only',
        ),
        null,
      ),
    ];
    for (const id of ['recovered', 'confirmed', 'split'])
      for (const index of [1, 2])
        trials.push(
          makeTrial(platform, [definitions.find((definition) => definition.id === id)!], index),
        );
    return { platform, trials, resolutions: resolveJourneyTrials(trials) };
  });
  const files = Object.fromEntries(
    definitions.map((definition) => [
      `journeys/${definition.id}/fixture/policy.md`,
      'e'.repeat(64),
    ]),
  );
  const original: IJourneyCampaign = {
    assessmentFormatVersion: 2,
    mode: 'campaign',
    runId: '20260101-aabbcc',
    evaluatedAt,
    status: deriveCampaignStatus(platforms.flatMap((platform) => platform.resolutions)),
    assessor: { commit: 'a'.repeat(40), sourceSha256: 'b'.repeat(64) },
    bundleSha256: 'c'.repeat(64),
    definitions,
    platforms,
    bundle: {
      bundleFormatVersion: 2,
      runId: '20260101-aabbcc',
      createdAt: evaluatedAt,
      skill: {
        commit: 'd'.repeat(40),
        version: '0.0.0-fixture',
        cliRepairVersion: '11.0.0',
        treeSha256: 'e'.repeat(64),
      },
      instructions: { version: 2, sha256: 'f'.repeat(64) },
      assessorSourceSha256: 'b'.repeat(64),
      policy: EVALUATION_CONFIRMATION_POLICY,
      files,
      npmCache: { sha256: 'a'.repeat(64), packages: [] },
      journeys: definitions.map((definition) => ({
        id: definition.id,
        title: definition.title,
        stepCount: definition.steps.length,
        definitionDigest: createJourneyDefinitionDigest(definition),
        fixtureSha256: createFixtureFingerprint(files, definition.id),
        fixture: definition.fixture,
      })),
    },
  };
  const assessment = structuredClone(original);
  input.transform?.(assessment);
  assessment.bundle.journeys = assessment.definitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    stepCount: definition.steps.length,
    definitionDigest: createJourneyDefinitionDigest(definition),
    fixtureSha256: createFixtureFingerprint(assessment.bundle.files, definition.id),
    fixture: definition.fixture,
  }));
  for (const provider of assessment.platforms)
    provider.resolutions = resolveJourneyTrials(provider.trials);
  assessment.status = deriveCampaignStatus(
    assessment.platforms.flatMap((provider) => provider.resolutions),
  );
  const artifacts = assessment.platforms.flatMap((platform) =>
    platform.trials.flatMap((trial) =>
      trial.journeys.flatMap((journey) =>
        journey.steps.flatMap((step) => {
          const hasChange = step.id === 'initialize';
          const hasUnexpectedChange =
            step.status === 'failed' &&
            step.checks.some((check) => check.check.kind === 'no-changes');
          const prefix = `${platform.platform}/${journey.id}/${trial.confirmationIndex === null ? 'initial' : `c${trial.confirmationIndex}`}/${step.id}/`;
          return [
            {
              path: `${prefix}changes.json`,
              mediaType: 'application/json',
              content: Buffer.from(
                JSON.stringify(
                  hasChange
                    ? [
                        { path: 'moldea/project.md', kind: 'added' },
                        { path: 'moldea/moldea.yaml', kind: 'added' },
                      ]
                    : hasUnexpectedChange
                      ? [{ path: 'moldea/project.md', kind: 'modified' }]
                      : [],
                ),
              ),
            },
            {
              path: `${prefix}changes.patch`,
              mediaType: 'application/patch+text',
              content: Buffer.from(
                hasChange
                  ? 'diff --git a/moldea/project.md b/moldea/project.md\nnew file mode 100644\n--- /dev/null\n+++ b/moldea/project.md\n@@ -0,0 +1,2 @@\n+# Project\n+The greeting service returns a personalized welcome.\ndiff --git a/moldea/moldea.yaml b/moldea/moldea.yaml\nnew file mode 100644\n--- /dev/null\n+++ b/moldea/moldea.yaml\n@@ -0,0 +1 @@\n+version: 1\n'
                  : hasUnexpectedChange
                    ? 'diff --git a/moldea/project.md b/moldea/project.md\n--- a/moldea/project.md\n+++ b/moldea/project.md\n@@ -1,2 +1,2 @@\n # Project\n-The greeting service returns a personalized welcome.\n+The saved project knowledge was unexpectedly replaced.\n'
                    : '',
              ),
            },
            {
              path: `${prefix}reply.md`,
              mediaType: 'text/plain',
              content: Buffer.from(step.reply),
            },
            {
              path: `${prefix}activity.json`,
              mediaType: 'application/json',
              content: Buffer.from(JSON.stringify(step.activity)),
            },
          ];
        }),
      ),
    ),
  );
  return createJourneysEvidenceBundle({
    assessment,
    definitions: assessment.definitions,
    artifacts,
    classification: 'fixture',
    skill: assessment.bundle.skill,
    instructions: assessment.bundle.instructions,
  });
};

/** Builds a historical single-observation record with its unchanged raw artifacts. */
export const createSyntheticLegacyJourneysBundle = (
  input: Parameters<typeof createSyntheticJourneysBundle>[0] = {},
) => {
  const current = createSyntheticJourneysBundle(input);
  const source = parseJourneysEvidenceRecord(current).model.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected fixture campaign.');
  const campaign = source.assessment;
  const assessment = {
    runId: campaign.runId,
    evaluatedAt: campaign.evaluatedAt,
    status: 'failed' as const,
    assessor: campaign.assessor,
    bundleSha256: campaign.bundleSha256,
    platforms: campaign.platforms.map((provider) => ({
      platform: provider.platform,
      configuration: provider.trials[0]!.observation!.configuration,
      environment: provider.trials[0]!.environment,
      restartCounts: provider.trials[0]!.restartCounts,
      journeys: provider.trials[0]!.journeys.map((journey) => ({
        ...journey,
        steps: journey.steps.map((step) => ({
          ...step,
          checks: step.checks.map(({ criterion: _criterion, ...check }) => check),
        })),
      })),
    })),
  };
  const websiteModel = {
    ...assessment,
    route: '/evidence/journeys/',
    skill: campaign.bundle.skill,
    instructions: { ...campaign.bundle.instructions, version: 1 },
    assessmentUrl: '/evidence-assets/journeys/assessment.json',
    definitionsUrl: '/evidence-assets/journeys/definitions.json',
    platforms: assessment.platforms.map(({ journeys: _journeys, ...provider }) => provider),
    journeys: campaign.definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      route: `/evidence/journeys/${definition.id}/`,
      steps: definition.steps.map((step) => ({
        id: step.id,
        request: step.request,
        results: assessment.platforms.flatMap((provider) => {
          const recorded = provider.journeys
            .find(({ id }) => id === definition.id)
            ?.steps.find(({ id }) => id === step.id);
          if (!recorded) return [];
          const prefix = `${provider.platform}/${definition.id}/${step.id}`;
          return [
            {
              ...recorded,
              platform: provider.platform,
              ...source.captures[`${provider.platform}/${definition.id}/initial/${step.id}`]!,
              patchUrl: `/evidence-assets/journeys/${prefix}/changes.patch`,
              replyUrl: `/evidence-assets/journeys/${prefix}/reply.md`,
              activityUrl: `/evidence-assets/journeys/${prefix}/activity.json`,
            },
          ];
        }),
      })),
    })),
  };
  return createEvidenceBundle({
    classification: 'fixture',
    kind: 'journeys',
    payload: {
      assessment,
      definitions: campaign.definitions,
      skill: websiteModel.skill,
      instructions: websiteModel.instructions,
      websiteModel,
    },
    run: { ...current.run, status: assessment.status },
    artifacts: [
      ...current.artifacts.files
        .filter(({ path }) => path.includes('/initial/'))
        .map((file) => ({
          path: file.path.replace('/initial/', '/'),
          mediaType: file.mediaType,
          content: Buffer.from(
            current.artifacts.blobs.find(({ sha256 }) => sha256 === file.sha256)!.contentBase64,
            'base64',
          ),
        })),
      {
        path: 'assessment.json',
        mediaType: 'application/json',
        content: Buffer.from(`${JSON.stringify(assessment, null, 2)}\n`),
      },
      {
        path: 'definitions.json',
        mediaType: 'application/json',
        content: Buffer.from(`${JSON.stringify(campaign.definitions, null, 2)}\n`),
      },
    ],
  });
};

/** Exercises independent updates, a new single-provider test, historical requests and earlier-only rows. */
export const createSyntheticJourneySnapshot = () => {
  const filterTrials = (assessment: IJourneyCampaign, selected: string[]) => {
    for (const provider of assessment.platforms) {
      for (const trial of provider.trials) {
        trial.selectedJourneys = trial.selectedJourneys.filter((id) => selected.includes(id));
        trial.journeys = trial.journeys.filter(({ id }) => selected.includes(id));
        trial.restartCounts = Object.fromEntries(trial.selectedJourneys.map((id) => [id, 0]));
      }
      provider.trials = provider.trials.filter((trial) => trial.selectedJourneys.length > 0);
    }
  };
  const baseline = createSyntheticJourneysBundle({
    transform: (assessment) => {
      assessment.definitions = assessment.definitions.filter(({ id }) => id !== 'additional-2');
      filterTrials(
        assessment,
        assessment.definitions.map(({ id }) => id).filter((id) => id !== 'additional-3'),
      );
    },
  });
  const earlier = createJourneySnapshotEvidenceBundle({
    incoming: baseline,
    previous: createSyntheticLegacyJourneysBundle({
      transform: (assessment) => {
        assessment.definitions = assessment.definitions.filter(({ id }) => id !== 'additional-2');
        filterTrials(
          assessment,
          assessment.definitions.map(({ id }) => id),
        );
      },
    }),
    runId: 'journey-snapshot-1767225600000-abcdef01',
    evaluatedAt: '2026-01-01T00:00:00.000Z',
  });
  const update = createSyntheticJourneysBundle({
    transform: (assessment) => {
      assessment.runId = '20260102-aabbcc';
      assessment.bundle.runId = assessment.runId;
      assessment.evaluatedAt = '2026-01-02T00:00:00.000Z';
      assessment.bundle.skill.version = '0.0.1-fixture';
      assessment.assessor.sourceSha256 = '1'.repeat(64);
      assessment.bundle.assessorSourceSha256 = assessment.assessor.sourceSha256;
      assessment.definitions = assessment.definitions.filter(({ id }) => id !== 'additional-11');
      assessment.definitions.find(({ id }) => id === 'additional-1')!.steps[0]!.request =
        'Read the revised policy and preserve all saved project knowledge.';
      assessment.platforms = assessment.platforms.filter(({ platform }) => platform === 'chatgpt');
      filterTrials(assessment, ['additional-1', 'additional-2']);
    },
  });
  return createJourneySnapshotEvidenceBundle({
    incoming: update,
    previous: earlier,
    platform: 'chatgpt',
    runId: 'journey-snapshot-1767312000000-abcdef02',
    evaluatedAt: '2026-01-02T00:00:00.000Z',
  });
};
