// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { requiresRootVerification, selectCiChecks } from './index.ts';

test.each([
  [['website/src/components/button.astro', 'website/public/logo.svg'], false],
  [['website/src/layouts/base.astro', 'website/src/styles/site.css'], false],
  [['website/src/pages/index.astro', 'src/semantic/index.ts'], true],
  [['website/src/lib/semantic/presentation.ts'], true],
  [['website/scripts/generate.ts'], true],
  [['website/src/pages-other/index.ts'], true],
  [['website/public/_archive/source.ts'], true],
  [['.github/workflows/website.yml'], true],
  [[], true],
])('requiresRootVerification(%o) -> %s', (paths, expected) => {
  expect(requiresRootVerification(paths)).toBe(expected);
});

const WorkflowSchema = z.object({
  on: z.record(z.string(), z.unknown()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  jobs: z.record(
    z.string(),
    z.object({
      if: z.string().optional(),
      env: z.record(z.string(), z.string()).optional(),
      outputs: z.record(z.string(), z.string()).optional(),
      uses: z.string().optional(),
      'timeout-minutes': z.number().optional(),
      strategy: z.object({ matrix: z.record(z.string(), z.unknown()) }).optional(),
      container: z.string().optional(),
      needs: z.union([z.string(), z.array(z.string())]).optional(),
      steps: z
        .array(
          z.object({
            name: z.string().optional(),
            if: z.string().optional(),
            uses: z.string().optional(),
            with: z.object({ ref: z.string().optional() }).optional(),
            run: z.string().optional(),
            env: z.record(z.string(), z.string()).optional(),
          }),
        )
        .optional(),
    }),
  ),
});

const readWorkflow = (name: string) =>
  WorkflowSchema.parse(
    parseYaml(
      readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8'),
    ),
  );

const conformance = readWorkflow('conformance');
const selectedJobs = [
  'correctness',
  'portable',
  'quality',
  'windows-portability',
  'macos-portability',
  'minimum-git',
];

test('conformance selects all maintained lanes together and retains tag identity checks', () => {
  for (const name of selectedJobs) {
    expect(conformance.jobs[name]?.needs).toBe('changes');
    expect(conformance.jobs[name]?.if).toBe("needs.changes.outputs.root_required == 'true'");
  }
  expect(conformance.jobs['result']?.if).toBe('always()');
  expect(conformance.jobs['result']?.needs).toStrictEqual(['changes', ...selectedJobs]);
  const portableSteps = conformance.jobs['portable']?.steps ?? [];
  expect(
    portableSteps.find(({ name }) => name === 'Check tagged skill release identity'),
  ).toMatchObject({ if: "github.ref_type == 'tag'", run: 'npm run release:identity:check' });
  expect(
    portableSteps.find(({ name }) => name === 'Install and compare the tagged release source')?.if,
  ).toBe("github.ref_type == 'tag'");
  expect(
    conformance.jobs['quality']?.steps?.find(({ name }) => name === 'Typecheck website on tags')
      ?.if,
  ).toBe("github.ref_type == 'tag'");
});

test('Windows and macOS run every portable integration file', () => {
  const windows = conformance.jobs['windows-portability']?.steps?.find(
    ({ name }) => name === 'Clone under a realistic deep temporary path',
  );
  expect(windows?.run).toContain('npm run test:integration -- src/portable');
  expect(
    conformance.jobs['macos-portability']?.steps?.find(
      ({ name }) => name === 'Run portable integration tests',
    )?.run,
  ).toBe('npm run test:integration -- src/portable');
});

test('the minimum-Git lane runs repair Git tests on Bullseye with the development Node.js', () => {
  const job = conformance.jobs['minimum-git'];
  expect(job?.container).toBe(`node:${conformance.env?.['DEVELOPMENT_NODE_VERSION']}-bullseye`);
  expect(job?.steps?.find(({ name }) => name === 'Run repair Git integration tests')?.run).toBe(
    'npx vitest run --config vitest/test-integration.config.ts src/portable/repair-git',
  );
});

test('conformance checks the exact candidate head and Windows deep-clones that same commit', () => {
  const candidateRef = '${{ github.event.pull_request.head.sha || github.sha }}';
  for (const name of ['changes', ...selectedJobs]) {
    const checkout = conformance.jobs[name]?.steps?.find(({ uses }) =>
      uses?.startsWith('actions/checkout@'),
    );
    expect(checkout?.with?.ref).toBe(candidateRef);
  }
  const deepClone = conformance.jobs['windows-portability']?.steps?.find(
    ({ name }) => name === 'Clone under a realistic deep temporary path',
  );
  expect(deepClone?.env?.['CANDIDATE_COMMIT']).toBe(candidateRef);
  expect(deepClone?.run).toContain('checkout --detach $env:CANDIDATE_COMMIT');
  expect(
    conformance.jobs['changes']?.steps?.find(({ name }) => name === 'Select conformance checks')
      ?.env?.['CI_TESTED_SHA'],
  ).toBe(candidateRef);
});

// GitHub's Ubuntu run steps use Bash with errexit; Windows does not execute this gate.
test.runIf(process.platform !== 'win32').each([
  [
    'full success',
    'success',
    'true',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    0,
  ],
  [
    'presentation-only skips',
    'success',
    'false',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    0,
  ],
  [
    'failed correctness',
    'success',
    'true',
    'failure',
    'success',
    'success',
    'success',
    'success',
    'success',
    1,
  ],
  [
    'cancelled portable',
    'success',
    'true',
    'success',
    'cancelled',
    'success',
    'success',
    'success',
    'success',
    1,
  ],
  [
    'failed quality',
    'success',
    'true',
    'success',
    'success',
    'failure',
    'success',
    'success',
    'success',
    1,
  ],
  [
    'unexpected Windows skip',
    'success',
    'true',
    'success',
    'success',
    'success',
    'skipped',
    'success',
    'success',
    1,
  ],
  [
    'failed macOS',
    'success',
    'true',
    'success',
    'success',
    'success',
    'success',
    'failure',
    'failure',
    1,
  ],
  [
    'failed minimum Git',
    'success',
    'true',
    'success',
    'success',
    'success',
    'success',
    'success',
    'failure',
    1,
  ],
  [
    'unexpected presentation execution',
    'success',
    'false',
    'success',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    1,
  ],
  [
    'failed classification',
    'failure',
    'true',
    'success',
    'success',
    'success',
    'success',
    'success',
    'success',
    1,
  ],
  [
    'cancelled classification',
    'cancelled',
    'false',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    1,
  ],
  [
    'missing selection',
    'success',
    '',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    'skipped',
    1,
  ],
])(
  'conformance gate: %s',
  (
    _scenario,
    classification,
    rootRequired,
    correctness,
    portable,
    quality,
    windows,
    macos,
    minimumGit,
    expectedCode,
  ) => {
    const step = conformance.jobs['result']?.steps?.find(
      ({ name }) => name === 'Require every selected check to succeed',
    );
    expect(step?.env).toStrictEqual({
      CLASSIFICATION: '${{ needs.changes.result }}',
      ROOT_REQUIRED: '${{ needs.changes.outputs.root_required }}',
      TEST_SUITE: '${{ needs.changes.outputs.test_suite }}',
      CORRECTNESS: '${{ needs.correctness.result }}',
      PORTABLE: '${{ needs.portable.result }}',
      QUALITY: '${{ needs.quality.result }}',
      WINDOWS: '${{ needs.windows-portability.result }}',
      MACOS: '${{ needs.macos-portability.result }}',
      MINIMUM_GIT: '${{ needs.minimum-git.result }}',
    });
    if (step?.run === undefined) throw new Error('Conformance result gate is missing.');
    for (const testSuite of ['essential', 'full']) {
      const result = spawnSync('bash', ['-e', '-c', step.run], {
        cwd: fileURLToPath(new URL('../..', import.meta.url)),
        env: {
          ...process.env,
          CLASSIFICATION: classification,
          ROOT_REQUIRED: rootRequired,
          TEST_SUITE: testSuite,
          CORRECTNESS: correctness,
          PORTABLE: portable,
          QUALITY: quality,
          WINDOWS: windows,
          MACOS: macos,
          MINIMUM_GIT: minimumGit,
        },
        encoding: 'utf8',
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(
        testSuite === 'full' && rootRequired === 'false' ? 1 : expectedCode,
      );
    }
  },
);

test('Pages requires selected evidence and successful verification plus build before deployment', () => {
  const pages = readWorkflow('pages');
  for (const name of ['verify', 'build']) {
    expect(pages.jobs[name]?.needs).toBe('evidence-selection');
    expect(pages.jobs[name]?.if).toBe("needs.evidence-selection.outputs.selected == 'true'");
  }
  expect(pages.jobs['deploy']?.needs).toStrictEqual(['evidence-selection', 'verify', 'build']);
  expect(pages.jobs['deploy']?.if).toBe(
    "needs.evidence-selection.outputs.selected == 'true' && needs.verify.result == 'success' && needs.build.result == 'success'",
  );
  const buildSteps = pages.jobs['build']?.steps ?? [];
  const prepareIndex = buildSteps.findIndex(({ run }) => run === 'npm run evidence:prepare');
  const buildIndex = buildSteps.findIndex(({ run }) => run === 'npm run website:build');
  const uploadIndex = buildSteps.findIndex(
    ({ uses }) => uses === 'actions/upload-pages-artifact@v4',
  );
  expect(prepareIndex).toBeGreaterThan(-1);
  expect(buildIndex).toBeGreaterThan(prepareIndex);
  expect(uploadIndex).toBeGreaterThan(buildIndex);
  expect(buildSteps.some(({ run }) => /test:(unit|integration|e2e)/u.test(run ?? ''))).toBe(false);
});

test.each([
  [undefined, 'branch', 'essential'],
  ['essential', 'branch', 'essential'],
  ['full', 'branch', 'full'],
  ['essential', 'tag', 'full'],
  ['full', 'tag', 'full'],
] as const)(
  'selectCiChecks(%s, %s) -> %s without Git for explicit dispatch/tags',
  async (suite, refType, expected) => {
    expect(
      await selectCiChecks(
        { repositoryRoot: 'missing-repository', eventName: 'workflow_dispatch', refType },
        suite,
      ),
    ).toStrictEqual({ rootRequired: true, testSuite: expected });
  },
);

test.each(['', 'FULL', 'other'])('rejects invalid CI priority %s even for a tag', async (suite) => {
  await expect(
    selectCiChecks(
      { repositoryRoot: 'missing-repository', eventName: 'push', refType: 'tag' },
      suite,
    ),
  ).rejects.toThrow('Expected essential or full');
});

test('routine essential preserves every existing OS/runtime lane and selective full preparation', () => {
  expect(conformance.on).toMatchObject({
    push: { tags: ['v*'] },
    workflow_dispatch: {
      inputs: {
        test_suite: { type: 'choice', default: 'essential', options: ['essential', 'full'] },
      },
    },
  });
  expect(Object.keys(conformance.on ?? {})).toStrictEqual([
    'pull_request',
    'push',
    'workflow_dispatch',
  ]);
  expect(conformance.jobs['changes']?.outputs).toStrictEqual({
    root_required: '${{ steps.selection.outputs.root_required }}',
    test_suite: '${{ steps.selection.outputs.test_suite }}',
  });
  expect(
    conformance.jobs['changes']?.steps?.find(({ name }) => name === 'Select conformance checks')
      ?.env?.['CI_TEST_SUITE'],
  ).toBe("${{ inputs.test_suite || 'essential' }}");
  for (const name of selectedJobs) {
    const job = conformance.jobs[name];
    expect(job?.if).toBe("needs.changes.outputs.root_required == 'true'");
    expect(job?.env?.['MOLDEA_TEST_SUITE']).toBe('${{ needs.changes.outputs.test_suite }}');
    for (const step of job?.steps ?? [])
      if (
        step.name === 'Install semantic sandbox dependencies' ||
        step.name === 'Build isolated runtime helpers'
      )
        expect(step.if).toBe("needs.changes.outputs.test_suite == 'full'");
  }
  expect(conformance.jobs['correctness']?.['timeout-minutes']).toBe(10);
  expect(conformance.jobs['portable']?.strategy?.matrix).toStrictEqual({
    node: ['22.17.0', '24.11.0', '26.8.1'],
  });
  const deep =
    conformance.jobs['windows-portability']?.steps?.find(
      ({ name }) => name === 'Clone under a realistic deep temporary path',
    )?.run ?? '';
  expect(deep).toContain("if ($env:MOLDEA_TEST_SUITE -eq 'full')");
  expect(deep).toContain("--testNamePattern='^(?!sandbox |proxy shutdown )'");
  const correctness = conformance.jobs['correctness']?.steps?.find(
    ({ name }) => name === 'Run maintained root correctness tests',
  );
  expect(correctness?.run).toBe('npm run test:unit && npm run test:integration');
  const runs = Object.values(conformance.jobs)
    .flatMap(({ steps = [] }) => steps.map(({ run = '' }) => run))
    .join('\n');
  expect(runs).not.toMatch(/test:full|test:e2e|release:check|evidence:prepare|playwright install/u);
});

test('website CI retains validators and exact source without full-only permutations', () => {
  const website = readWorkflow('website-checks');
  const steps = website.jobs['checks']?.steps ?? [];
  expect(steps.find(({ name }) => name === 'Checkout exact caller commit')?.with?.ref).toBe(
    '${{ github.sha }}',
  );
  const runs = steps.map(({ run = '' }) => run);
  for (const command of [
    'npm run docs:check',
    'npm --workspace website run typecheck',
    'npm --workspace website run lint',
    'npm --workspace website run format:check',
    'npm --workspace website run build:fixture',
  ])
    expect(runs).toContain(command);
  expect(runs.join('\n')).not.toMatch(/test:(unit|integration|e2e)/u);
});

test.runIf(process.platform !== 'win32').each(['', 'unknown'])(
  'final gate refuses malformed priority %s',
  (testSuite) => {
    const run = conformance.jobs['result']?.steps?.find(
      ({ name }) => name === 'Require every selected check to succeed',
    )?.run;
    if (run === undefined) throw new Error('Conformance result gate is missing.');
    const result = spawnSync('bash', ['-e', '-c', run], {
      env: {
        ...process.env,
        CLASSIFICATION: 'success',
        ROOT_REQUIRED: 'true',
        TEST_SUITE: testSuite,
        CORRECTNESS: 'success',
        PORTABLE: 'success',
        QUALITY: 'success',
        WINDOWS: 'success',
        MACOS: 'success',
        MINIMUM_GIT: 'success',
      },
    });
    expect(result.status).not.toBe(0);
  },
);
