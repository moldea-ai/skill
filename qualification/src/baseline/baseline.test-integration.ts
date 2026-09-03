// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { PACKAGE_VERSION_MAP } from '../../../tooling/release-identity/compatibility-bridge-4-0-2.mjs';
import {
  COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY,
  hasCompatibilityBridge402Qualification,
  mapCompatibilityBridge402Packages,
} from '../../../tooling/release-identity/historical-semantic.mjs';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import {
  QualificationAttemptResultSchema,
  type ICandidateClosure,
  type IQualificationExecutionEnvironment,
} from '../contracts/index.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  QualificationAttemptStorageSchema,
} from '../storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { inspectQualificationBaseline } from './baseline.ts';
import { calculateQualificationBaselineDigestAtCommit } from './fingerprints.ts';

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-5.6-sol',
  reasoningEffort: 'medium',
  codexVersion: 'codex-cli test',
  nodeVersion: process.version,
  pnpmVersion: '11.9.0',
  gitVersion: 'git version test',
  allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
  hostTimeoutMs: 120_000,
  modelEndpoint: null,
  sslCertificateFileSha256: null,
};

const CARRY_FORWARD_SOURCE_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';
const CARRY_FORWARD_SOURCE_RELEASE = 'v4.0.0' as const;

const candidate: ICandidateClosure = {
  fingerprint: 'a'.repeat(64),
  cliVersion: '4.0.0',
  cliJsonSchemaVersion: 2,
  packages: [
    {
      name: '@moldea.ai/cli',
      version: '4.0.0',
      registryIntegrity: `sha512-${'a'.repeat(86)}`,
      registryShasum: 'b'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-4.0.0.tgz',
      tarballPath: '/candidate/cli.tgz',
      tarballName: 'cli-4.0.0.tgz',
      sha256: 'c'.repeat(64),
    },
  ],
  runtimePackages: [
    {
      name: 'ai',
      version: '7.0.77',
      registryIntegrity: `sha512-${'d'.repeat(86)}`,
      registryShasum: 'e'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/ai/-/ai-7.0.77.tgz',
      tarballPath: '/candidate/ai.tgz',
      tarballName: 'ai-7.0.77.tgz',
      sha256: '6'.repeat(64),
    },
  ],
  typeScriptPackage: {
    name: 'typescript',
    version: '6.0.3',
    registryIntegrity: `sha512-${'f'.repeat(86)}`,
    registryShasum: 'a'.repeat(40),
    registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
    tarballPath: '/candidate/typescript.tgz',
    tarballName: 'typescript-6.0.3.tgz',
    sha256: 'f'.repeat(64),
  },
  runtimeDirectory: '/candidate',
};

const createRepositoryState = (commit: string, fingerprint: string): IGitRepositoryState => ({
  commit,
  fingerprint,
  isDirty: false,
  entries: [],
});

const packagesState = createRepositoryState('packages-commit', 'd'.repeat(64));
const skillState = createRepositoryState('skill-commit', 'e'.repeat(64));

/** Creates exact source and candidate package identities for bridge authorization tests. */
const createBridgePackages = () => {
  const packageDigests = Object.entries(PACKAGE_VERSION_MAP).map(
    ([name, { candidate: candidateVersion, source: sourceVersion }], index) => {
      const identity = String(index + 1);
      return {
        candidateSha256: identity.repeat(64),
        name,
        registry: {
          candidate: {
            integrity: `sha512-candidate-${identity}`,
            shasum: identity.repeat(40),
            tarball: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${candidateVersion}.tgz`,
          },
          source: {
            integrity: `sha512-source-${identity}`,
            shasum: identity.repeat(40),
            tarball: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${sourceVersion}.tgz`,
          },
        },
        sourceSha256: identity.repeat(64),
      };
    },
  );
  const sourcePackages = packageDigests.map((packageDigest) => ({
    name: packageDigest.name,
    registryIntegrity: packageDigest.registry.source.integrity,
    registryShasum: packageDigest.registry.source.shasum,
    registryTarballUrl: packageDigest.registry.source.tarball,
    sha256: packageDigest.sourceSha256,
    tarballName: new URL(packageDigest.registry.source.tarball).pathname.split('/').at(-1)!,
    version: PACKAGE_VERSION_MAP[packageDigest.name]!.source,
  }));
  const candidatePackages = packageDigests.map((packageDigest) => ({
    name: packageDigest.name,
    version: PACKAGE_VERSION_MAP[packageDigest.name]!.candidate,
    registryIntegrity: packageDigest.registry.candidate.integrity,
    registryShasum: packageDigest.registry.candidate.shasum,
    registryTarballUrl: packageDigest.registry.candidate.tarball,
    tarballName: new URL(packageDigest.registry.candidate.tarball).pathname.split('/').at(-1)!,
    sha256: packageDigest.candidateSha256,
  }));

  return { candidatePackages, packageDigests, sourcePackages };
};

/**
 * Creates the smallest committed qualification source tree required by baseline verification.
 * @param repositoryRoot The temporary repository root that owns the fixture source.
 * @returns A promise resolving to the exact fixture source commit.
 */
const createQualificationSourceCommit = async (repositoryRoot: string): Promise<string> => {
  const sourceFiles = [
    [
      'package.json',
      `${JSON.stringify({
        version: '4.0.0',
        type: 'module',
        devDependencies: { '@moldea.ai/cli': '5.0.0', semver: '7.8.5' },
        moldeaRelease: { cliJsonSchemaVersion: 2 },
      })}\n`,
    ],
    [
      'package-lock.json',
      `${JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': {
            version: '4.0.0',
            devDependencies: { '@moldea.ai/cli': '5.0.0', semver: '7.8.5' },
          },
          'node_modules/@moldea.ai/cli': {
            version: '5.0.0',
            dev: true,
            integrity: 'sha512-cli-runtime',
          },
          'node_modules/semver': {
            version: '7.8.5',
            dev: true,
            integrity: 'sha512-semver-runtime',
          },
        },
      })}\n`,
    ],
    [
      'moldea/SKILL.md',
      [
        '---',
        'name: moldea-fixture',
        'description: Qualification baseline fixture.',
        'metadata:',
        '  version: 4.0.0',
        '---',
        '',
        'Skill release `4.0.0` supports exactly:',
        '',
      ].join('\n'),
    ],
    ['moldea/references/local-tooling.md', '# Local tooling\n\nRelease `4.0.0` supports:\n'],
    [
      'qualification/cases/cases.yaml',
      [
        'version: 2',
        'cases:',
        '  - id: release-case',
        '    title: Release case',
        '    layer: universal-baseline',
        '    description: Verify complete passing evidence.',
        '    challenge: Exercise the reusable Custom baseline.',
        '',
      ].join('\n'),
    ],
    [
      'qualification/package.json',
      `${JSON.stringify({
        name: '@moldea.ai/adapter-qualification-fixture',
        version: '0.0.0',
        type: 'module',
        engines: { node: '^24.15.0' },
        scripts: { qualification: 'node src/bin/index.ts' },
        dependencies: { yaml: '2.9.0' },
      })}\n`,
    ],
    [
      'qualification/package-lock.json',
      `${JSON.stringify({
        name: '@moldea.ai/adapter-qualification-fixture',
        version: '0.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: '@moldea.ai/adapter-qualification-fixture',
            version: '0.0.0',
            dependencies: { yaml: '2.9.0' },
            engines: { node: '^24.15.0' },
          },
          'node_modules/yaml': {
            version: '2.9.0',
            integrity: 'sha512-yaml-runtime',
          },
        },
      })}\n`,
    ],
    ['qualification/src/execution/executor.ts', 'export const executorVersion = 1;\n'],
    ['tooling/codex-evaluation-host/host.mjs', 'export const hostVersion = 1;\n'],
    ['tooling/package-candidate/index.mjs', 'export const candidateVersion = 1;\n'],
  ] as const;

  await Promise.all(
    sourceFiles.map(async ([relativePath, source]) => {
      const filePath = path.join(repositoryRoot, relativePath);
      await ensureDirectory(path.dirname(filePath));
      await writeTextFileAtomically(filePath, source);
    }),
  );
  await executeProcess({
    command: 'git',
    args: ['init', '--initial-branch=main'],
    cwd: repositoryRoot,
  });
  await executeProcess({ command: 'git', args: ['add', '-A'], cwd: repositoryRoot });
  await executeProcess({
    command: 'git',
    args: [
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.name=moldea qualification',
      '-c',
      'user.email=qualification@moldea.local',
      'commit',
      '-m',
      'test: commit qualification baseline source',
    ],
    cwd: repositoryRoot,
  });
  const { stdout } = await executeProcess({
    command: 'git',
    args: ['rev-parse', 'HEAD'],
    cwd: repositoryRoot,
  });
  return stdout.trim();
};

describe('Custom qualification baseline', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('does not require a baseline for Custom and blocks adapters when it is missing', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const commonOptions = {
      candidate,
      customTargetDigest: '2'.repeat(64),
      executionEnvironment,
      isDryRun: false,
      qualificationBaselineDigest: '1'.repeat(64),
      resultsRoot: path.join(temporaryRoot, 'results'),
      skillState,
    };

    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        selection: { adapterId: 'custom', implementationId: 'custom' },
      }),
    ).resolves.toMatchObject({ passed: true, status: 'not-required' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      }),
    ).resolves.toMatchObject({ passed: false, status: 'missing' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        isDryRun: true,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      }),
    ).resolves.toMatchObject({ passed: true, status: 'not-required' });
  });

  test('rejects a recorded baseline with an incompatible stored identity', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const baselineFixture = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'custom-baseline-unreadable-source',
      packages: [...candidate.packages, candidate.typeScriptPackage].map(
        createPublicCandidatePackage,
      ),
      resultsRoot,
      skillRepositoryCommit: skillState.commit,
      skillRepositoryFingerprint: skillState.fingerprint,
    });
    const qualificationRepositoryCommit = await createQualificationSourceCommit(temporaryRoot);
    const passingBaseline = QualificationAttemptResultSchema.parse({
      ...baselineFixture,
      provenance: {
        ...baselineFixture.provenance,
        qualificationRepositoryCommit,
      },
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingBaseline,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );

    await expect(
      inspectQualificationBaseline({
        candidate,
        customTargetDigest: 'e'.repeat(64),
        executionEnvironment,
        isDryRun: false,
        qualificationBaselineDigest: '1'.repeat(64),
        resultsRoot,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
        skillState,
      }),
    ).resolves.toMatchObject({
      passed: false,
      status: 'incompatible',
      failures: [
        'Custom baseline attempt custom-baseline-unreadable-source does not match the current universal suite, Custom target, portable skill, execution environment, and published candidate closure.',
      ],
    });
  });

  test('accepts only an integrity-verified baseline with identical universal inputs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const baselineFixture = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'custom-baseline',
      hasOperationalRetry: true,
      isRecovered: true,
      packages: [...candidate.packages, candidate.typeScriptPackage].map(
        createPublicCandidatePackage,
      ),
      packagesRepositoryCommit: packagesState.commit,
      packagesRepositoryFingerprint: packagesState.fingerprint,
      qualificationDigest: '1'.repeat(64),
      resultsRoot,
      skillRepositoryCommit: skillState.commit,
      skillRepositoryFingerprint: skillState.fingerprint,
    });
    const qualificationRepositoryCommit = await createQualificationSourceCommit(temporaryRoot);
    const qualificationBaselineDigest = await calculateQualificationBaselineDigestAtCommit(
      qualificationRepositoryCommit,
      temporaryRoot,
    );
    const passingBaseline = QualificationAttemptResultSchema.parse({
      ...baselineFixture,
      provenance: {
        ...baselineFixture.provenance,
        qualificationRepositoryCommit,
      },
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingBaseline,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );
    const commonOptions = {
      candidate,
      customTargetDigest: 'e'.repeat(64),
      executionEnvironment,
      isDryRun: false,
      qualificationBaselineDigest,
      resultsRoot,
      selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      skillState,
    };

    await expect(inspectQualificationBaseline(commonOptions)).resolves.toMatchObject({
      passed: true,
      status: 'passed',
      baselineAttemptId: 'custom-baseline',
    });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        skillState: { ...skillState, commit: 'evidence-only-commit' },
      }),
    ).resolves.toMatchObject({
      passed: true,
      status: 'passed',
      baselineAttemptId: 'custom-baseline',
    });

    for (const [relativePath, currentVersionSource, nextVersionSource] of [
      ['package.json', '"version":"4.0.0"', '"version":"4.0.1"'],
      ['package-lock.json', '"version":"4.0.0"', '"version":"4.0.1"'],
      ['moldea/SKILL.md', '4.0.0', '4.0.1'],
      ['moldea/references/local-tooling.md', '4.0.0', '4.0.1'],
    ] as const) {
      const absolutePath = path.join(temporaryRoot, relativePath);
      await writeTextFileAtomically(
        absolutePath,
        (await readFile(absolutePath, 'utf8')).replaceAll(currentVersionSource, nextVersionSource),
      );
    }
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        skillState: { ...skillState, fingerprint: '9'.repeat(64) },
      }),
    ).resolves.toMatchObject({
      passed: true,
      status: 'passed',
      baselineAttemptId: 'custom-baseline',
    });
    for (const environmentChange of [
      { allowedEgressHosts: [...executionEnvironment.allowedEgressHosts, 'example.com'] },
      { hostTimeoutMs: executionEnvironment.hostTimeoutMs + 1 },
      {
        modelEndpoint: {
          origin: 'https://example.com',
          sha256: '9'.repeat(64),
        },
      },
      { sslCertificateFileSha256: '9'.repeat(64) },
    ]) {
      await expect(
        inspectQualificationBaseline({
          ...commonOptions,
          executionEnvironment: { ...executionEnvironment, ...environmentChange },
        }),
      ).resolves.toMatchObject({ passed: false, status: 'incompatible' });
    }
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        customTargetDigest: '9'.repeat(64),
      }),
    ).resolves.toMatchObject({ passed: false, status: 'incompatible' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        candidate: {
          ...candidate,
          packages: [{ ...candidate.packages[0]!, sha256: '9'.repeat(64) }],
        },
      }),
    ).resolves.toMatchObject({ passed: false, status: 'incompatible' });

    const storagePath = path.join(
      resultsRoot,
      't1',
      'attempts',
      createQualificationAttemptKey(passingBaseline.attemptId),
      'storage.json',
    );
    const storage = await readJsonFile(storagePath, QualificationAttemptStorageSchema);
    const { candidatePackages, packageDigests, sourcePackages } = createBridgePackages();
    const sourceAttemptDigest = '7'.repeat(64);
    const sourceCliClosureDigest = '8'.repeat(64);
    const sourcePortableSkillBehaviorDigest = '9'.repeat(64);
    const bridgeResult = {
      ...passingBaseline,
      provenance: {
        ...passingBaseline.provenance,
        packages: sourcePackages,
      },
    };
    const bridgeStorage = {
      ...storage,
      attemptDigest: sourceAttemptDigest,
      carryForward: {
        attestationId: `v4.0.0-custom-${sourceAttemptDigest}`,
        sourceAttemptDigest,
        sourceCommit: CARRY_FORWARD_SOURCE_COMMIT,
        sourceRelease: CARRY_FORWARD_SOURCE_RELEASE,
      },
      cliClosureDigest: sourceCliClosureDigest,
      portableSkillBehaviorDigest: sourcePortableSkillBehaviorDigest,
    } as const;
    const sortedSourcePackages = [...sourcePackages].sort(({ name: left }, { name: right }) =>
      left.localeCompare(right, 'en'),
    );
    const bridgeQualificationEnvelope = {
      attestationId: bridgeStorage.carryForward.attestationId,
      attemptId: bridgeResult.attemptId,
      attemptSha256: sourceAttemptDigest,
      candidateCompatibility: bridgeStorage.compatibility,
      candidateTargetCompatibilityDigest: bridgeResult.provenance.targetDigest,
      cliClosureDigest: sourceCliClosureDigest,
      compatibility: bridgeStorage.compatibility,
      environment: {
        model: bridgeResult.provenance.model,
        reasoningEffort: bridgeResult.provenance.reasoningEffort,
        codexVersion: bridgeResult.provenance.codexVersion,
        nodeVersion: bridgeResult.provenance.nodeVersion,
        pnpmVersion: bridgeResult.provenance.pnpmVersion,
        gitVersion: bridgeResult.provenance.gitVersion,
        allowedEgressHosts: bridgeResult.provenance.allowedEgressHosts,
        hostTimeoutMs: bridgeResult.provenance.hostTimeoutMs,
        modelEndpoint: bridgeResult.provenance.modelEndpoint,
        sslCertificateFileSha256: bridgeResult.provenance.sslCertificateFileSha256,
      },
      isCompatible: true,
      packages: sortedSourcePackages,
      packagesDigest: createHash('sha256')
        .update(`${JSON.stringify(sortedSourcePackages)}\n`)
        .digest('hex'),
      portableSkillBehaviorDigest: sourcePortableSkillBehaviorDigest,
      qualificationRepositoryCommit: bridgeResult.provenance.qualificationRepositoryCommit,
      selection: bridgeResult.selection,
      skillRepositoryCommit: bridgeResult.provenance.skillRepositoryCommit,
      skillRepositoryFingerprint: bridgeResult.provenance.skillRepositoryFingerprint,
      status: bridgeResult.status,
      targetCompatibilityDigest: bridgeResult.provenance.targetDigest,
      targetDigest: bridgeResult.provenance.targetDigest,
    };
    const compatibilityBridge = { packages: { packageDigests } };
    const sourceAttestation = {
      candidate: {
        cliClosureDigest: sourceCliClosureDigest,
        portableSkillBehaviorDigest: sourcePortableSkillBehaviorDigest,
      },
      qualification: { envelopes: [bridgeQualificationEnvelope] },
    };
    const bridgeOptions = {
      attestation: compatibilityBridge,
      candidateCliClosureDigest: COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.cliClosureDigest,
      candidatePackages,
      candidatePortableSkillBehaviorDigest:
        COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.portableSkillBehaviorDigest,
      result: bridgeResult,
      sourceAttestation,
      storage: bridgeStorage,
    };

    expect(mapCompatibilityBridge402Packages(compatibilityBridge, sourcePackages)).toStrictEqual(
      [...candidatePackages].sort(({ name: left }, { name: right }) =>
        left.localeCompare(right, 'en'),
      ),
    );
    expect(hasCompatibilityBridge402Qualification(bridgeOptions)).toBe(true);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        candidatePackages: [
          { ...candidatePackages[0]!, sha256: '0'.repeat(64) },
          ...candidatePackages.slice(1),
        ],
      }),
    ).toBe(false);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        candidateCliClosureDigest: '0'.repeat(64),
      }),
    ).toBe(false);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        candidatePortableSkillBehaviorDigest: '0'.repeat(64),
      }),
    ).toBe(false);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        sourceAttestation: {
          ...sourceAttestation,
          candidate: {
            ...sourceAttestation.candidate,
            portableSkillBehaviorDigest: '0'.repeat(64),
          },
        },
      }),
    ).toBe(false);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        sourceAttestation: {
          ...sourceAttestation,
          candidate: {
            ...sourceAttestation.candidate,
            cliClosureDigest: '0'.repeat(64),
          },
        },
      }),
    ).toBe(false);
    expect(
      hasCompatibilityBridge402Qualification({
        ...bridgeOptions,
        attestation: {
          packages: {
            packageDigests: [
              { ...packageDigests[0]!, sourceSha256: '0'.repeat(64) },
              ...packageDigests.slice(1),
            ],
          },
        },
      }),
    ).toBe(false);
    for (const registryIdentity of ['source', 'candidate'] as const) {
      expect(
        hasCompatibilityBridge402Qualification({
          ...bridgeOptions,
          attestation: {
            packages: {
              packageDigests: [
                {
                  ...packageDigests[0]!,
                  registry: {
                    ...packageDigests[0]!.registry,
                    [registryIdentity]: {
                      ...packageDigests[0]!.registry[registryIdentity],
                      integrity: 'sha512-incompatible',
                    },
                  },
                },
                ...packageDigests.slice(1),
              ],
            },
          },
        }),
      ).toBe(false);
    }

    await writeJsonFileAtomically(storagePath, {
      ...storage,
      cliClosureDigest: '9'.repeat(64),
    });
    await expect(inspectQualificationBaseline(commonOptions)).resolves.toMatchObject({
      passed: false,
      status: 'incompatible',
    });
    await writeJsonFileAtomically(storagePath, storage);

    await writeJsonFileAtomically(storagePath, {
      ...storage,
      compatibility: {
        ...storage.compatibility,
        qualificationBaselineEvaluatorDigest: '9'.repeat(64),
      },
    });

    await expect(inspectQualificationBaseline(commonOptions)).resolves.toMatchObject({
      passed: false,
      status: 'incompatible',
    });
  });
});
