// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { parseChangedPaths, requiresFullConformance } from './index.ts';

test.each([
  ['M\0website/src/pages/index.astro\0', ['website/src/pages/index.astro']],
  ['R100\0src/old.ts\0website/public/new.ts\0', ['src/old.ts', 'website/public/new.ts']],
  ['C75\0website/public/old.svg\0src/new.svg\0', ['website/public/old.svg', 'src/new.svg']],
  ['C075\0website/public/old.svg\0src/new.svg\0', ['website/public/old.svg', 'src/new.svg']],
  ['M\0website/public/with\nnewline.svg\0', ['website/public/with\nnewline.svg']],
  ['', []],
  ['M\0missing-terminator', null],
  ['U\0website/public/conflict\0', null],
  ['R101\0website/public/old\0website/public/new\0', null],
  ['R100\0website/public/one\0', null],
  ['M\0website/public/../shared.ts\0', null],
  ['M\0\0', null],
])('parseChangedPaths(%s) -> %o', (output, expected) => {
  expect(parseChangedPaths(output)).toStrictEqual(expected);
});

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
  [null, true],
])('requiresFullConformance(%o) -> %s', (paths, expected) => {
  expect(requiresFullConformance(paths)).toBe(expected);
});

const WorkflowSchema = z.object({
  jobs: z.record(
    z.string(),
    z.object({
      if: z.string().optional(),
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
];

test('conformance selects all maintained lanes together and retains tag identity checks', () => {
  for (const name of selectedJobs) {
    expect(conformance.jobs[name]?.needs).toBe('changes');
    expect(conformance.jobs[name]?.if).toBe("needs.changes.outputs.full == 'true'");
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
  ['full success', 'success', 'true', 'success', 'success', 'success', 'success', 'success', 0],
  [
    'presentation-only skips',
    'success',
    'false',
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
    1,
  ],
  ['failed quality', 'success', 'true', 'success', 'success', 'failure', 'success', 'success', 1],
  [
    'unexpected Windows skip',
    'success',
    'true',
    'success',
    'success',
    'success',
    'skipped',
    'success',
    1,
  ],
  ['failed macOS', 'success', 'true', 'success', 'success', 'success', 'success', 'failure', 1],
  [
    'unexpected presentation execution',
    'success',
    'false',
    'success',
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
    1,
  ],
  ['missing selection', 'success', '', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped', 1],
])(
  'conformance gate: %s',
  (
    _scenario,
    classification,
    full,
    correctness,
    portable,
    quality,
    windows,
    macos,
    expectedCode,
  ) => {
    const step = conformance.jobs['result']?.steps?.find(
      ({ name }) => name === 'Require every selected check to succeed',
    );
    expect(step?.env).toStrictEqual({
      CLASSIFICATION: '${{ needs.changes.result }}',
      FULL: '${{ needs.changes.outputs.full }}',
      CORRECTNESS: '${{ needs.correctness.result }}',
      PORTABLE: '${{ needs.portable.result }}',
      QUALITY: '${{ needs.quality.result }}',
      WINDOWS: '${{ needs.windows-portability.result }}',
      MACOS: '${{ needs.macos-portability.result }}',
    });
    if (step?.run === undefined) throw new Error('Conformance result gate is missing.');
    const result = spawnSync('bash', ['-e', '-c', step.run], {
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
      env: {
        ...process.env,
        CLASSIFICATION: classification,
        FULL: full,
        CORRECTNESS: correctness,
        PORTABLE: portable,
        QUALITY: quality,
        WINDOWS: windows,
        MACOS: macos,
      },
      encoding: 'utf8',
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(expectedCode);
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
  const testIndex = buildSteps.findIndex(
    ({ run }) => run === 'npm --workspace website run test:integration:artifact',
  );
  const uploadIndex = buildSteps.findIndex(
    ({ uses }) => uses === 'actions/upload-pages-artifact@v4',
  );
  expect(prepareIndex).toBeGreaterThan(-1);
  expect(buildIndex).toBeGreaterThan(prepareIndex);
  expect(testIndex).toBeGreaterThan(buildIndex);
  expect(uploadIndex).toBeGreaterThan(testIndex);
});
