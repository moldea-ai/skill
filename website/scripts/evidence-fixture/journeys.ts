import { createJourneysEvidenceBundle } from '../../../src/scripted-journeys/public-evidence/index.ts';
import type {
  IJourneyAssessment,
  IJourneyDefinition,
} from '../../../src/scripted-journeys/index.ts';

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
        checks: [{ kind: 'path-exists', path: 'moldea/project.md' }],
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

/** Creates presentation-only evidence with passing, failing, blocked, and unverified states. */
export const createSyntheticJourneysBundle = () => {
  const evaluatedAt = '2026-01-01T00:00:00.000Z';
  const assessment: IJourneyAssessment = {
    runId: '20260101-aabbcc',
    status: 'failed',
    evaluatedAt,
    assessor: { commit: 'a'.repeat(40), sourceSha256: 'b'.repeat(64) },
    bundleSha256: 'c'.repeat(64),
    platforms: (['chatgpt', 'claude'] as const).map((platform) => ({
      platform,
      configuration: {
        model: `${platform} fixture model`,
        settings: { mode: 'Chat', observedDate: '2026-01-01' },
        interventions: platform === 'chatgpt' ? ['Continued after a truncated response.'] : [],
      },
      environment: { node: 'v24.15.0', platform: 'linux' },
      restartCounts: { initialize: platform === 'chatgpt' ? 1 : 0 },
      journeys: definitions.map((definition) => ({
        id: definition.id,
        status:
          definition.id === 'repair'
            ? 'blocked'
            : definition.id === 'preserve' && platform === 'claude'
              ? 'failed'
              : 'passed',
        steps: definition.steps.map((step) => {
          const status =
            definition.id === 'repair'
              ? 'blocked'
              : definition.id === 'preserve' && platform === 'claude'
                ? 'failed'
                : 'passed';
          return {
            id: step.id,
            status,
            checks: [
              {
                check: step.checks[0]!,
                status,
                detail:
                  status === 'passed'
                    ? 'Criterion satisfied by the reconstructed files.'
                    : status === 'failed'
                      ? 'Unexpected change to project knowledge.'
                      : 'Prerequisite was not satisfied.',
              },
            ],
            unverified: step.unverified,
            facts: { issuedAt: evaluatedAt, recordedAt: evaluatedAt, cliPresent: true },
            reply:
              'Saved the project foundation.\n\nValidation reports **valid**.\n\n<script>alert("unsafe")</script>\n\n[unsafe link](javascript:alert(1))',
            activity: {
              commands: ['node .agents/skills/moldea/scripts/moldea-cli.mjs validate --json'],
              reads: ['README.md', 'src/greeting.js'],
              writes: step.id === 'initialize' ? ['moldea/project.md'] : [],
              notes: ['Agent-reported activity is not an execution trace.'],
            },
          };
        }),
      })),
    })),
  };
  const artifacts = assessment.platforms.flatMap((platform) =>
    platform.journeys.flatMap((journey) =>
      journey.steps.flatMap((step) => {
        const hasChange = step.id === 'initialize';
        const prefix = `${platform.platform}/${journey.id}/${step.id}/`;
        return [
          {
            path: `${prefix}changes.json`,
            mediaType: 'application/json',
            content: Buffer.from(
              JSON.stringify(hasChange ? [{ path: 'moldea/project.md', kind: 'added' }] : []),
            ),
          },
          {
            path: `${prefix}changes.patch`,
            mediaType: 'application/patch+text',
            content: Buffer.from(
              hasChange
                ? 'diff --git a/moldea/project.md b/moldea/project.md\nnew file mode 100644\n--- /dev/null\n+++ b/moldea/project.md\n@@ -0,0 +1,2 @@\n+# Project\n+The greeting service returns a personalized welcome.\n'
                : '',
            ),
          },
          { path: `${prefix}reply.md`, mediaType: 'text/plain', content: Buffer.from(step.reply) },
          {
            path: `${prefix}activity.json`,
            mediaType: 'application/json',
            content: Buffer.from(JSON.stringify(step.activity)),
          },
        ];
      }),
    ),
  );
  return createJourneysEvidenceBundle({
    assessment,
    definitions,
    artifacts,
    classification: 'fixture',
    skill: {
      commit: 'd'.repeat(40),
      version: '0.0.0-fixture',
      cliRepairVersion: '11.0.0',
      treeSha256: 'e'.repeat(64),
    },
    instructions: { version: 1, sha256: 'f'.repeat(64) },
  });
};
