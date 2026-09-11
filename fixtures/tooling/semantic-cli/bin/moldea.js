#!/usr/bin/env node

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

const manifest = require('../package.json');
const command = process.argv[2];
const optionValue = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
};
const digest = (content) => `sha256:${createHash('sha256').update(content).digest('hex')}`;
const readAsset = (logicalPath) => {
  const content = readFileSync(`.${logicalPath}`, 'utf8');
  return {
    content,
    metadata: {
      digest: digest(content),
      path: logicalPath,
      scalarLength: [...content].length,
      utf8ByteLength: Buffer.byteLength(content),
    },
  };
};
const writeEnvelope = (result, status = 'valid') => {
  process.stdout.write(
    `${JSON.stringify({
      cliVersion: manifest.version,
      command,
      error: null,
      result,
      schemaVersion: manifest.moldeaRelease.cliJsonSchemaVersion,
      status,
    })}\n`,
  );
  if (status === 'invalid') process.exitCode = 1;
};

if (command === '--version') {
  process.stdout.write(`${manifest.version}\n`);
} else if (command === 'composition' && process.argv.includes('--json')) {
  writeEnvelope({
    adapters: ['custom', ...Object.keys(manifest.dependencies)
      .filter((name) => name.startsWith('@moldea.ai/adapter-'))
      .map((name) => name.slice('@moldea.ai/adapter-'.length))]
      .sort()
      .map((id) => ({ id, repositoryFormatVersions: [1] })),
    minimumGitVersion: '2.30.0',
    packages: Object.entries(manifest.dependencies)
      .filter(([name]) => name.startsWith('@moldea.ai/'))
      .map(([name, version]) => ({ name, version }))
      .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
    repositoryFormatVersions: [1],
    supportedNodeRange: '>=22.11.0',
  });
} else if (['inspect', 'validate'].includes(command) && process.argv.includes('--json')) {
  const project = readAsset('/moldea/project.md');
  const records = command === 'inspect'
    ? [{ asset: project.metadata, key: '["project"]', kind: 'project' }]
    : [];
  writeEnvelope({
    counts: { agents: 0, context: 1, diagnostics: 0 },
    formatVersion: 1,
    page: { cursor: null, records },
    snapshotDigest: digest(project.content),
    source: { kind: 'git-working-tree' },
    valid: true,
  });
} else if (command === 'content' && process.argv.includes('--json')) {
  const logicalPath = optionValue('--path');
  if (logicalPath === null || !logicalPath.startsWith('/moldea/')) {
    process.exitCode = 2;
  } else {
    const asset = readAsset(logicalPath);
    writeEnvelope({
      asset: asset.metadata,
      chunk: { content: asset.content, cursor: null, scalarLength: [...asset.content].length },
      snapshotDigest: digest(asset.content),
      source: { kind: 'git-working-tree' },
    });
  }
} else if (command === 'scope' && process.argv.includes('--json')) {
  const logicalPath = optionValue('--path');
  const relevant = logicalPath === '/src/project-state.js';
  writeEnvelope({
    counts: { declarations: 1, diagnostics: 0, inputPaths: 1, matchedOwners: relevant ? 1 : 0, matchedPaths: relevant ? 1 : 0, matches: relevant ? 1 : 0 },
    inputDigest: digest(logicalPath ?? ''),
    manifestDigest: digest(readFileSync('./moldea/moldea.yaml', 'utf8')),
    page: { cursor: null, records: relevant ? [{ kind: 'match', path: logicalPath }] : [] },
    relevant,
    snapshotDigest: digest(readFileSync('./moldea/moldea.yaml', 'utf8')),
    source: { kind: 'git-working-tree' },
    valid: true,
  });
} else {
  process.stdout.write('fixture moldea CLI\n');
}
