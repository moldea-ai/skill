// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, test } from 'vitest';

import { executeProcess } from '../process/index.ts';

import { generateRuntimeArtifacts } from './runtime-generation.ts';

const temporaryDirectories: string[] = [];
const TEST_NODE_EXECUTABLE = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((temporaryDirectory) => rm(temporaryDirectory, { force: true, recursive: true })),
  );
});

test('runtime generation emits standalone helpers for isolated execution', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'moldea-runtime-generation-'));
  temporaryDirectories.push(temporaryDirectory);
  const outputDirectory = path.join(temporaryDirectory, 'runtime');

  const result = await generateRuntimeArtifacts({ outputDirectory });

  assert.deepEqual(
    result.artifacts,
    [
      path.relative(process.cwd(), path.join(outputDirectory, 'git-command-policy-boundary.mjs')),
      path.relative(process.cwd(), path.join(outputDirectory, 'codex-evaluation-proxy.mjs')),
      ...['setup', 'next', 'record', 'export'].map((entry) =>
        path.relative(process.cwd(), path.join(outputDirectory, 'journeys', `${entry}.mjs`)),
      ),
    ].map((artifactPath) => artifactPath.split(path.sep).join('/')),
  );

  for (const entry of ['setup', 'next', 'record', 'export']) {
    const helperUrl = pathToFileURL(path.join(outputDirectory, 'journeys', `${entry}.mjs`)).href;
    await executeProcess({
      command: TEST_NODE_EXECUTABLE,
      args: ['--input-type=module', '-e', 'await import(process.argv[1])', helperUrl],
      cwd: temporaryDirectory,
    });
  }

  const gitBoundaryPath = path.join(outputDirectory, 'git-command-policy-boundary.mjs');
  const gitBoundaryModule = (await import(pathToFileURL(gitBoundaryPath).href)) as {
    prepareGitCommandPolicyBoundary: (
      directoryPath: string,
      options?: { trustedReadOnlyWorkspacePaths?: readonly string[] },
    ) => Promise<string>;
  };
  const wrapperPath = await gitBoundaryModule.prepareGitCommandPolicyBoundary(
    path.join(temporaryDirectory, 'bin'),
    { trustedReadOnlyWorkspacePaths: ['fixture'] },
  );
  const wrapperSource = await readFile(wrapperPath, 'utf8');
  assert.match(wrapperSource, /\["fixture"\]/u);

  const proxyResult = await executeProcess({
    args: [path.join(outputDirectory, 'codex-evaluation-proxy.mjs')],
    command: TEST_NODE_EXECUTABLE,
    cwd: temporaryDirectory,
    expectedExitCodes: [1],
  });
  assert.match(proxyResult.stderr, /requires a socket path and allowed hosts/u);
});
