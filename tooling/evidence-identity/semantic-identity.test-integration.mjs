import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  SEMANTIC_IDENTITY_RECEIPT_PATH,
  captureSemanticSourceIdentity,
  createSemanticIdentityReceipt,
  readSemanticAttemptIdentity,
  recoverSemanticIdentity,
  writeSemanticIdentityReceipt,
} from './semantic-identity.mjs';

const temporaryRoots = [];

const createOwnedSemanticIdentityReceipt = (repositoryRoot, arguments_) => ({
  ...createSemanticIdentityReceipt(repositoryRoot, arguments_),
  evaluatorProcessId: process.pid,
});

const recoverOwnedReceipt = (repositoryRoot, receipt) =>
  recoverSemanticIdentity(repositoryRoot, {
    expectedInvocationId: receipt.invocationId,
  });

const createInactiveProcessId = async () => {
  const inactiveProcess = spawn(process.execPath, ['-e', '']);
  const inactiveProcessId = inactiveProcess.pid;
  await new Promise((resolveClose, reject) => {
    inactiveProcess.once('error', reject);
    inactiveProcess.once('close', resolveClose);
  });
  return inactiveProcessId;
};

const createReceiptClaimPath = (receiptPath, consumerProcessId, receiptText) =>
  `${receiptPath}.${consumerProcessId}.${createHash('sha256').update(receiptText).digest('hex')}.consumed`;

const createSidecarTemporaryPath = (repositoryRoot, processId) =>
  `${join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)}.sidecar.${processId}.00000000-0000-4000-8000-000000000000.tmp`;

const writeFixtureFile = (repositoryRoot, relativePath, content = 'export {};\n') => {
  const absolutePath = join(repositoryRoot, relativePath);
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, content);
};

const createRepository = () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-semantic-identity-'));
  temporaryRoots.push(repositoryRoot);
  writeFixtureFile(
    repositoryRoot,
    'moldea/SKILL.md',
    "---\nname: moldea\nmetadata:\n  version: '5.0.0'\n---\n\n# moldea\n",
  );
  writeFixtureFile(
    repositoryRoot,
    'moldea/references/local-tooling.md',
    '# Local tooling\n\nSkill 5.0.0 supports exactly the current CLI.\n',
  );
  writeFixtureFile(repositoryRoot, 'fixtures/conformance-cases.json', '{}\n');
  writeFixtureFile(repositoryRoot, 'fixtures/semantic-evaluation-coverage.json', '{}\n');
  writeFixtureFile(repositoryRoot, 'tests/semantic-evaluation-runner.mjs');
  for (const relativePath of [
    'tooling/codex-evaluation-host/index.mjs',
    'tooling/evidence-identity/cli-closure.mjs',
    'tooling/evidence-identity/portable-skill.mjs',
    'tooling/evidence-identity/semantic-evaluation-child.mjs',
    'tooling/evidence-identity/semantic-evaluation.mjs',
    'tooling/evidence-identity/semantic-inputs.mjs',
    'tooling/evidence-identity/semantic-identity.mjs',
    'tooling/release-identity/constants.mjs',
    'tooling/release-identity/identity.mjs',
    'tooling/release-identity/index.mjs',
    'tooling/semantic-evaluation/index.mjs',
  ]) {
    writeFixtureFile(repositoryRoot, relativePath);
  }
  const packageManifest = {
    name: 'semantic-identity-fixture',
    version: '5.0.0',
    moldeaRelease: { cliJsonSchemaVersion: 3 },
    devDependencies: { '@moldea.ai/cli': '6.0.0' },
  };
  const packageLock = {
    name: packageManifest.name,
    version: packageManifest.version,
    lockfileVersion: 3,
    packages: {
      '': {
        name: packageManifest.name,
        version: packageManifest.version,
        devDependencies: packageManifest.devDependencies,
      },
      'node_modules/@moldea.ai/cli': {
        version: '6.0.0',
        integrity: 'sha512-cli',
      },
    },
  };
  writeFixtureFile(repositoryRoot, 'package.json', `${JSON.stringify(packageManifest)}\n`);
  writeFixtureFile(repositoryRoot, 'package-lock.json', `${JSON.stringify(packageLock)}\n`);
  execFileSync('git', ['init', '--quiet'], { cwd: repositoryRoot });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], {
    cwd: repositoryRoot,
  });
  execFileSync('git', ['config', 'user.name', 'Fixture'], {
    cwd: repositoryRoot,
  });
  execFileSync('git', ['add', '--all'], { cwd: repositoryRoot });
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], {
    cwd: repositoryRoot,
  });
  return repositoryRoot;
};

const writeAttempt = (
  repositoryRoot,
  attemptId = '20260901T120000000Z-semantic-11111111',
  evidenceText = '{"fixture":true}\n',
) => {
  const attemptDirectory = join(
    repositoryRoot,
    'fixtures',
    'semantic-evaluation-results',
    'attempts',
    attemptId,
  );
  mkdirSync(attemptDirectory, { recursive: true });
  const evidenceSha256 = createHash('sha256').update(evidenceText).digest('hex');
  const attempt = {
    attemptId,
    evidence: { path: 'evidence.json', sha256: evidenceSha256 },
  };
  writeFileSync(join(attemptDirectory, 'attempt.json'), `${JSON.stringify(attempt)}\n`);
  writeFileSync(join(attemptDirectory, 'evidence.json'), evidenceText);
  writeFileSync(
    join(repositoryRoot, 'fixtures', '.semantic-evaluation-candidate.json'),
    evidenceText,
  );
  return { attemptDirectory, attemptId, evidenceSha256 };
};

const createAttemptIdentityText = (receipt, attempt) => {
  const attemptSha256 = createHash('sha256')
    .update(readFileSync(join(attempt.attemptDirectory, 'attempt.json')))
    .digest('hex');
  return `${JSON.stringify(
    {
      argumentDigest: receipt.argumentDigest,
      attemptId: attempt.attemptId,
      attemptSha256,
      cliClosureDigest: receipt.cliClosureDigest,
      evidenceSha256: attempt.evidenceSha256,
      invocationId: receipt.invocationId,
      portableSkillBehaviorDigest: receipt.portableSkillBehaviorDigest,
      schemaVersion: receipt.schemaVersion,
      semanticInputDigest: receipt.semanticInputDigest,
      sourceCommit: receipt.sourceCommit,
      sourceDigest: receipt.sourceDigest,
    },
    null,
    2,
  )}\n`;
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('captures clean committed source and rejects relevant source drift', () => {
  const repositoryRoot = createRepository();
  const sourceIdentity = captureSemanticSourceIdentity(repositoryRoot);
  assert.match(sourceIdentity.sourceCommit, /^[a-f0-9]{40}$/u);
  assert.ok(
    sourceIdentity.sourceEntries.some(
      ({ path }) => path === 'tests/semantic-evaluation-runner.mjs',
    ),
  );

  writeFileSync(join(repositoryRoot, 'tests', 'semantic-evaluation-runner.mjs'), 'changed\n');
  assert.throws(() => captureSemanticSourceIdentity(repositoryRoot), /requires every relevant/u);
});

test('finalizes one attributable new attempt and binds its exact bytes', async () => {
  const repositoryRoot = createRepository();
  const receipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);
  const attempt = writeAttempt(repositoryRoot);

  assert.deepEqual(await recoverOwnedReceipt(repositoryRoot, receipt), {
    attemptId: attempt.attemptId,
    status: 'finalized',
  });
  const identity = JSON.parse(
    readFileSync(join(attempt.attemptDirectory, 'identity.json'), 'utf8'),
  );
  assert.equal(identity.attemptId, attempt.attemptId);
  assert.equal(identity.evidenceSha256, attempt.evidenceSha256);
  assert.equal(identity.sourceCommit, receipt.sourceCommit);
  assert.equal(identity.sourceDigest, receipt.sourceDigest);
  assert.equal(identity.portableSkillBehaviorDigest, receipt.portableSkillBehaviorDigest);
  assert.equal(identity.cliClosureDigest, receipt.cliClosureDigest);
  assert.equal(identity.semanticInputDigest, receipt.semanticInputDigest);
  assert.deepEqual(readSemanticAttemptIdentity(repositoryRoot, attempt.attemptId), identity);
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), false);
});

test('recovers sidecar publication interrupted before and after its final link', async () => {
  const inactiveProcessId = await createInactiveProcessId();
  const beforeLinkRoot = createRepository();
  const beforeLinkReceipt = {
    ...createSemanticIdentityReceipt(beforeLinkRoot, ['--record']),
    evaluatorProcessId: inactiveProcessId,
    ownerProcessId: inactiveProcessId,
  };
  await writeSemanticIdentityReceipt(beforeLinkRoot, beforeLinkReceipt);
  const beforeLinkAttempt = writeAttempt(beforeLinkRoot);
  const beforeLinkTemporaryPath = createSidecarTemporaryPath(beforeLinkRoot, inactiveProcessId);
  writeFileSync(beforeLinkTemporaryPath, '{"partial":');

  assert.deepEqual(await recoverSemanticIdentity(beforeLinkRoot), {
    attemptId: beforeLinkAttempt.attemptId,
    status: 'finalized',
  });
  assert.equal(existsSync(beforeLinkTemporaryPath), false);
  assert.equal(existsSync(join(beforeLinkAttempt.attemptDirectory, 'identity.json')), true);

  const afterLinkRoot = createRepository();
  const afterLinkReceipt = {
    ...createSemanticIdentityReceipt(afterLinkRoot, ['--record']),
    evaluatorProcessId: inactiveProcessId,
    ownerProcessId: inactiveProcessId,
  };
  await writeSemanticIdentityReceipt(afterLinkRoot, afterLinkReceipt);
  const afterLinkAttempt = writeAttempt(afterLinkRoot);
  const afterLinkIdentityText = createAttemptIdentityText(afterLinkReceipt, afterLinkAttempt);
  const afterLinkIdentityPath = join(afterLinkAttempt.attemptDirectory, 'identity.json');
  const afterLinkTemporaryPath = createSidecarTemporaryPath(afterLinkRoot, inactiveProcessId);
  writeFileSync(afterLinkTemporaryPath, afterLinkIdentityText);
  writeFileSync(afterLinkIdentityPath, afterLinkIdentityText);

  assert.deepEqual(await recoverSemanticIdentity(afterLinkRoot), {
    attemptId: afterLinkAttempt.attemptId,
    status: 'finalized',
  });
  assert.equal(existsSync(afterLinkTemporaryPath), false);
  assert.equal(readFileSync(afterLinkIdentityPath, 'utf8'), afterLinkIdentityText);
});

test('preserves sidecar staging owned by an active writer', async () => {
  const repositoryRoot = createRepository();
  const receipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);
  writeAttempt(repositoryRoot);
  const temporaryPath = createSidecarTemporaryPath(repositoryRoot, process.pid);
  writeFileSync(temporaryPath, '{"partial":');

  await assert.rejects(recoverOwnedReceipt(repositoryRoot, receipt), /being published by process/u);
  assert.equal(existsSync(temporaryPath), true);
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);
});

test('retires a no-attempt receipt only while source and attempt history remain exact', async () => {
  const repositoryRoot = createRepository();
  const receipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);

  assert.deepEqual(await recoverOwnedReceipt(repositoryRoot, receipt), {
    attemptId: null,
    status: 'retired',
  });

  const staleRepositoryRoot = createRepository();
  const staleReceipt = createOwnedSemanticIdentityReceipt(staleRepositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(staleRepositoryRoot, staleReceipt);
  writeFileSync(join(staleRepositoryRoot, 'tests', 'semantic-evaluation-runner.mjs'), 'changed\n');
  await assert.rejects(
    recoverOwnedReceipt(staleRepositoryRoot, staleReceipt),
    /requires every relevant|no longer matches/u,
  );
  assert.equal(existsSync(join(staleRepositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);
});

test('never overwrites a receipt and rejects ambiguous attempt creation', async () => {
  const repositoryRoot = createRepository();
  const receipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);
  await assert.rejects(writeSemanticIdentityReceipt(repositoryRoot, receipt), /already exists/u);

  writeAttempt(repositoryRoot);
  writeAttempt(repositoryRoot, '20260901T120000001Z-semantic-22222222', '{"fixture":false}\n');
  await assert.rejects(
    recoverOwnedReceipt(repositoryRoot, receipt),
    /cannot attribute multiple new attempts/u,
  );
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);
});

test('rejects an attempt whose recorded evidence digest is not exact', async () => {
  const repositoryRoot = createRepository();
  const receipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);
  const attempt = writeAttempt(repositoryRoot);
  writeFileSync(join(attempt.attemptDirectory, 'evidence.json'), 'tampered\n');

  await assert.rejects(
    recoverOwnedReceipt(repositoryRoot, receipt),
    /does not bind its exact evidence bytes/u,
  );
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);
});

test('blocks an active receipt owner and permits explicit recovery after its process ends', async () => {
  const repositoryRoot = createRepository();
  const activeReceipt = createOwnedSemanticIdentityReceipt(repositoryRoot, ['--record']);
  await writeSemanticIdentityReceipt(repositoryRoot, activeReceipt);

  await assert.rejects(
    recoverSemanticIdentity(repositoryRoot),
    /belongs to active recording process/u,
  );
  assert.equal(existsSync(join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH)), true);

  const deadOwnerRoot = createRepository();
  const inactiveOwnerProcessId = await createInactiveProcessId();
  const deadOwnerReceipt = {
    ...createSemanticIdentityReceipt(deadOwnerRoot, ['--record']),
    evaluatorProcessId: inactiveOwnerProcessId,
    ownerProcessId: inactiveOwnerProcessId,
  };
  await writeSemanticIdentityReceipt(deadOwnerRoot, deadOwnerReceipt);
  assert.deepEqual(await recoverSemanticIdentity(deadOwnerRoot), {
    attemptId: null,
    status: 'retired',
  });

  const activeEvaluatorRoot = createRepository();
  const activeEvaluator = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1_000)']);
  const activeEvaluatorReceipt = {
    ...createSemanticIdentityReceipt(activeEvaluatorRoot, ['--record']),
    evaluatorProcessId: activeEvaluator.pid,
    ownerProcessId: inactiveOwnerProcessId,
  };
  await writeSemanticIdentityReceipt(activeEvaluatorRoot, activeEvaluatorReceipt);
  try {
    await assert.rejects(
      recoverSemanticIdentity(activeEvaluatorRoot),
      /belongs to active evaluator process/u,
    );
  } finally {
    activeEvaluator.kill('SIGTERM');
    await new Promise((resolveClose) => activeEvaluator.once('close', resolveClose));
  }
  assert.deepEqual(await recoverSemanticIdentity(activeEvaluatorRoot), {
    attemptId: null,
    status: 'retired',
  });
});

test('recovers exact receipt-consumption claims and preserves mismatched claims', async () => {
  const inactiveProcessId = await createInactiveProcessId();
  const repositoryRoot = createRepository();
  const receipt = {
    ...createSemanticIdentityReceipt(repositoryRoot, ['--record']),
    evaluatorProcessId: inactiveProcessId,
    ownerProcessId: inactiveProcessId,
  };
  await writeSemanticIdentityReceipt(repositoryRoot, receipt);
  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const receiptText = readFileSync(receiptPath, 'utf8');
  const claimPath = createReceiptClaimPath(receiptPath, inactiveProcessId, receiptText);
  writeFileSync(claimPath, receiptText);

  assert.deepEqual(await recoverSemanticIdentity(repositoryRoot), {
    attemptId: null,
    status: 'retired',
  });
  assert.equal(existsSync(receiptPath), false);
  assert.equal(existsSync(claimPath), false);

  const claimOnlyRoot = createRepository();
  const claimOnlyReceipt = {
    ...createSemanticIdentityReceipt(claimOnlyRoot, ['--record']),
    evaluatorProcessId: inactiveProcessId,
    ownerProcessId: inactiveProcessId,
  };
  await writeSemanticIdentityReceipt(claimOnlyRoot, claimOnlyReceipt);
  const claimOnlyReceiptPath = join(claimOnlyRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const claimOnlyReceiptText = readFileSync(claimOnlyReceiptPath, 'utf8');
  const claimOnlyPath = createReceiptClaimPath(
    claimOnlyReceiptPath,
    inactiveProcessId,
    claimOnlyReceiptText,
  );
  writeFileSync(claimOnlyPath, claimOnlyReceiptText);
  rmSync(claimOnlyReceiptPath);

  assert.deepEqual(await recoverSemanticIdentity(claimOnlyRoot), {
    attemptId: null,
    status: 'retired',
  });
  assert.equal(existsSync(claimOnlyReceiptPath), false);
  assert.equal(existsSync(claimOnlyPath), false);

  const mismatchedRoot = createRepository();
  const mismatchedReceipt = {
    ...createSemanticIdentityReceipt(mismatchedRoot, ['--record']),
    evaluatorProcessId: inactiveProcessId,
    ownerProcessId: inactiveProcessId,
  };
  await writeSemanticIdentityReceipt(mismatchedRoot, mismatchedReceipt);
  const mismatchedReceiptPath = join(mismatchedRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const mismatchedReceiptText = readFileSync(mismatchedReceiptPath, 'utf8');
  const mismatchedClaimPath = createReceiptClaimPath(
    mismatchedReceiptPath,
    inactiveProcessId,
    mismatchedReceiptText,
  );
  writeFileSync(mismatchedClaimPath, `${mismatchedReceiptText}\n`);

  await assert.rejects(
    recoverSemanticIdentity(mismatchedRoot),
    /consumption claim has an invalid digest/u,
  );
  assert.equal(existsSync(mismatchedReceiptPath), true);
  assert.equal(existsSync(mismatchedClaimPath), true);

  const activeClaimRoot = createRepository();
  const activeClaimReceipt = createOwnedSemanticIdentityReceipt(activeClaimRoot, ['--record']);
  await writeSemanticIdentityReceipt(activeClaimRoot, activeClaimReceipt);
  const activeClaimReceiptPath = join(activeClaimRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const activeClaimReceiptText = readFileSync(activeClaimReceiptPath, 'utf8');
  const activeClaimPath = createReceiptClaimPath(
    activeClaimReceiptPath,
    process.pid,
    activeClaimReceiptText,
  );
  writeFileSync(activeClaimPath, activeClaimReceiptText);

  await assert.rejects(
    recoverOwnedReceipt(activeClaimRoot, activeClaimReceipt),
    /being consumed by active process/u,
  );
  assert.equal(existsSync(activeClaimReceiptPath), true);
  assert.equal(existsSync(activeClaimPath), true);
});
