import { createHash } from 'node:crypto';
import { lstat, open, opendir, readlink } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

import { parseDocument } from 'yaml';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const SKILL_ARTIFACT_ROLES = new Set([
  'authoritative-source',
  'distributed-copy',
  'installed-copy',
]);
const ALLOWED_SKILL_FRONTMATTER_KEYS = new Set([
  'allowed-tools',
  'compatibility',
  'description',
  'license',
  'metadata',
  'name',
]);
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_ARTIFACT_ROOTS = 8;
const MAX_ACTIVATION_SCENARIOS = 8;
const MAX_DIRECTORIES = 32;
const MAX_FILES = 32;
const MAX_FILE_BYTES = 32_768;
const MAX_RESOURCE_REFERENCES = 32;
const MAX_TRAVERSAL_ENTRIES = 64;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const isBoundedEvidenceText = (content) =>
  typeof content === 'string' && Buffer.byteLength(content, 'utf8') <= MAX_FILE_BYTES;

const hasSafeRelativePath = (path) => {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path) || path.includes('\\')) {
    return false;
  }
  return !path
    .split('/')
    .some(
      (segment) =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        EXCLUDED_DIRECTORY_NAMES.has(segment),
    );
};

/** Validates evaluator-only skill evidence without exposing it to the actor prompt. */
export const validateSkillEvidenceConfiguration = (caseDefinition) => {
  if (!('skillEvidence' in caseDefinition)) {
    return { activationScenarios: [], artifacts: [] };
  }
  if (!isPlainRecord(caseDefinition.skillEvidence)) {
    throw new Error(`Semantic case ${caseDefinition.id} has invalid skill evidence.`);
  }

  const { activationScenarios, artifacts } = caseDefinition.skillEvidence;
  if (
    !Array.isArray(activationScenarios) ||
    activationScenarios.length > MAX_ACTIVATION_SCENARIOS ||
    !activationScenarios.every(
      (scenario) =>
        isPlainRecord(scenario) &&
        typeof scenario.request === 'string' &&
        scenario.request.trim().length > 0 &&
        scenario.request.length <= 1_024 &&
        typeof scenario.shouldActivate === 'boolean',
    )
  ) {
    throw new Error(`Semantic case ${caseDefinition.id} has invalid skill activation scenarios.`);
  }
  if (
    !Array.isArray(artifacts) ||
    artifacts.length === 0 ||
    artifacts.length > MAX_ARTIFACT_ROOTS
  ) {
    throw new Error(`Semantic case ${caseDefinition.id} has invalid skill artifact roots.`);
  }

  const roots = new Set();
  for (const artifact of artifacts) {
    if (
      !isPlainRecord(artifact) ||
      !hasSafeRelativePath(artifact.root) ||
      !SKILL_ARTIFACT_ROLES.has(artifact.role) ||
      roots.has(artifact.root)
    ) {
      throw new Error(`Semantic case ${caseDefinition.id} has an unsafe skill artifact root.`);
    }
    roots.add(artifact.root);
  }

  return { activationScenarios, artifacts };
};

/** Validates the portable structural contract of one Agent Skill document. */
export const validateSkillDocument = (content, directoryName) => {
  const errors = [];
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  let frontmatter = null;

  if (!match) {
    errors.push('missing-frontmatter');
  } else {
    try {
      const document = parseDocument(match[1], { uniqueKeys: true });
      if (document.errors.length > 0) {
        errors.push('invalid-frontmatter');
      } else {
        const parsedFrontmatter = document.toJS();
        if (isPlainRecord(parsedFrontmatter)) frontmatter = parsedFrontmatter;
        else errors.push('invalid-frontmatter-object');
      }
    } catch {
      errors.push('invalid-frontmatter');
    }
  }

  const name = typeof frontmatter?.name === 'string' ? frontmatter.name : null;
  const description = typeof frontmatter?.description === 'string' ? frontmatter.description : null;
  if (frontmatter) {
    for (const key of Object.keys(frontmatter)) {
      if (!ALLOWED_SKILL_FRONTMATTER_KEYS.has(key))
        errors.push(`unsupported-frontmatter-key:${key}`);
    }
    if (
      name === null ||
      name.length > 64 ||
      !SKILL_NAME_PATTERN.test(name) ||
      name.includes('--')
    ) {
      errors.push('invalid-name');
    } else if (name !== directoryName) {
      errors.push('name-directory-mismatch');
    }
    if (
      description === null ||
      description.trim().length === 0 ||
      description.length > 1_024 ||
      description.includes('<') ||
      description.includes('>')
    ) {
      errors.push('invalid-description');
    }
    for (const key of ['allowed-tools', 'compatibility', 'license']) {
      if (key in frontmatter && typeof frontmatter[key] !== 'string') {
        errors.push(`invalid-frontmatter-value:${key}`);
      }
    }
    if (
      'metadata' in frontmatter &&
      (!isPlainRecord(frontmatter.metadata) ||
        Object.values(frontmatter.metadata).some((value) => typeof value !== 'string'))
    ) {
      errors.push('invalid-frontmatter-value:metadata');
    }
  }
  if (match && content.slice(match[0].length).trim().length === 0) errors.push('empty-body');

  return {
    description,
    errors: [...new Set(errors)],
    name,
    valid: errors.length === 0,
  };
};

const extractSkillResourceReferences = (content) => {
  const markdownReferences = new Set();
  const references = new Set();
  const markdownPattern =
    /\]\(((?:(?:\.\.)?\/)*\/?(?:assets|docs|references|scripts)\/[A-Za-z0-9._/-]+)\)/gu;
  for (const match of content.matchAll(markdownPattern)) {
    markdownReferences.add(match[1]);
    references.add(match[1]);
  }
  const linkedResourceIdentities = new Set(
    [...markdownReferences].map((reference) =>
      reference.replace(/^\//u, '').replace(/^(?:\.\.\/)+/u, ''),
    ),
  );
  for (const match of content.matchAll(
    /`(\/?(?:assets|docs|references|scripts)\/[A-Za-z0-9._/-]+)`/gu,
  )) {
    const reference = match[1];
    if (!linkedResourceIdentities.has(reference.replace(/^\//u, ''))) references.add(reference);
  }
  return [...references].sort((left, right) => left.localeCompare(right, 'en'));
};

const inspectSkillResourceReference = async (repositoryPath, root, reference) => {
  const absolutePath = reference.startsWith('/')
    ? resolve(repositoryPath, reference.slice(1))
    : resolve(repositoryPath, root, reference);
  const resolvedPath = relative(repositoryPath, absolutePath).replaceAll('\\', '/');
  const isSafe = hasSafeRelativePath(resolvedPath);
  if (!isSafe) return { isSafe, reference, resolvedPath, type: 'unsafe' };

  try {
    const stats = await lstat(absolutePath);
    const type = stats.isDirectory()
      ? 'directory'
      : stats.isFile()
        ? 'file'
        : stats.isSymbolicLink()
          ? 'symlink'
          : 'missing';
    return { isSafe, reference, resolvedPath, type };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { isSafe, reference, resolvedPath, type: 'missing' };
    }
    throw error;
  }
};

const readBoundedEvidenceFile = async (path) => {
  const fileHandle = await open(path, 'r');
  const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
  let totalBytesRead = 0;
  try {
    while (totalBytesRead < buffer.byteLength) {
      const { bytesRead } = await fileHandle.read(
        buffer,
        totalBytesRead,
        buffer.byteLength - totalBytesRead,
        totalBytesRead,
      );
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
    }
  } finally {
    await fileHandle.close();
  }
  return {
    content: buffer.subarray(0, Math.min(totalBytesRead, MAX_FILE_BYTES)),
    isTruncated: totalBytesRead > MAX_FILE_BYTES,
  };
};

const readBoundedDirectoryEntries = async (directoryPath, maximumEntries) => {
  const directory = await opendir(directoryPath);
  const entries = [];
  try {
    while (entries.length <= maximumEntries) {
      const entry = await directory.read();
      if (entry === null) {
        return {
          entries: entries.sort((left, right) => left.name.localeCompare(right.name, 'en')),
          isTruncated: false,
        };
      }
      entries.push(entry);
    }
  } finally {
    await directory.close();
  }
  return { entries: [], isTruncated: true };
};

const inspectSkillArtifactPath = async (absolutePath) => {
  const stats = await lstat(absolutePath);
  if (stats.isDirectory()) return { type: 'directory' };
  if (stats.isSymbolicLink()) {
    return { mode: stats.mode, target: await readlink(absolutePath), type: 'symlink' };
  }
  if (stats.isFile()) return { mode: stats.mode, type: 'file' };
  return { type: 'other' };
};

const collectConfiguredSkillArtifact = async (repositoryPath, artifact) => {
  const absoluteRoot = join(repositoryPath, artifact.root);
  const directoryPaths = [];
  const fileStates = new Map();
  let excludedDirectoryCount = 0;
  let isTraversalTruncated = false;
  let remainingTraversalEntries = MAX_TRAVERSAL_ENTRIES;
  let rootType = 'missing';

  try {
    const rootStats = await lstat(absoluteRoot);
    rootType = rootStats.isDirectory()
      ? 'directory'
      : rootStats.isFile()
        ? 'file'
        : rootStats.isSymbolicLink()
          ? 'symlink'
          : 'missing';
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  const visit = async (directoryPath) => {
    directoryPaths.push(relative(repositoryPath, directoryPath).replaceAll('\\', '/'));
    const directoryBatch = await readBoundedDirectoryEntries(
      directoryPath,
      remainingTraversalEntries,
    );
    if (directoryBatch.isTruncated) {
      isTraversalTruncated = true;
      remainingTraversalEntries = 0;
      return;
    }
    remainingTraversalEntries -= directoryBatch.entries.length;
    for (const entry of directoryBatch.entries) {
      if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        if (entry.isDirectory()) excludedDirectoryCount += 1;
        continue;
      }
      const absolutePath = join(directoryPath, entry.name);
      const relativePath = relative(repositoryPath, absolutePath).replaceAll('\\', '/');
      const state = await inspectSkillArtifactPath(absolutePath);
      if (state.type === 'directory') await visit(absolutePath);
      else if (state.type === 'symlink' || state.type === 'file')
        fileStates.set(relativePath, state);
    }
  };

  const directoryName = basename(artifact.root);
  const skillDocumentPath = `${artifact.root}/SKILL.md`;
  if (rootType === 'directory') {
    try {
      const state = await inspectSkillArtifactPath(join(repositoryPath, skillDocumentPath));
      if (state.type === 'symlink' || state.type === 'file')
        fileStates.set(skillDocumentPath, state);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
    await visit(absoluteRoot);
  }

  const artifactPaths = [...fileStates.keys()].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  const selectedPaths = artifactPaths.includes(skillDocumentPath)
    ? [skillDocumentPath, ...artifactPaths.filter((path) => path !== skillDocumentPath)].slice(
        0,
        MAX_FILES,
      )
    : artifactPaths.slice(0, MAX_FILES);
  const files = [];
  for (const path of selectedPaths) {
    const state = fileStates.get(path);
    if (state.type === 'symlink') {
      files.push({
        content: null,
        mode: state.mode,
        omission: 'symlink',
        path,
        sha256: createHash('sha256').update(state.target).digest('hex'),
      });
      continue;
    }
    const boundedFile = await readBoundedEvidenceFile(join(repositoryPath, path));
    let content = null;
    let omission = 'file-too-large';
    let sha256 = null;
    if (!boundedFile.isTruncated) {
      sha256 = createHash('sha256').update(boundedFile.content).digest('hex');
      try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(boundedFile.content);
        omission = null;
      } catch {
        omission = 'non-utf8';
      }
    }
    files.push({ content, mode: state.mode, omission, path, sha256 });
  }

  const skillDocumentEvidence = files.find(({ path }) => path === skillDocumentPath);
  let skillDocumentContent = null;
  let validation = {
    description: null,
    errors: [
      rootType === 'directory' ? 'missing-skill-document' : `invalid-skill-root:${rootType}`,
    ],
    name: null,
    valid: false,
  };
  if (skillDocumentEvidence?.content !== null && skillDocumentEvidence?.content !== undefined) {
    skillDocumentContent = skillDocumentEvidence.content;
    validation = validateSkillDocument(skillDocumentContent, directoryName);
  } else if (skillDocumentEvidence?.omission === 'file-too-large') {
    validation.errors = ['skill-document-too-large'];
  } else if (skillDocumentEvidence?.omission === 'non-utf8') {
    validation.errors = ['invalid-skill-document-encoding'];
  }

  const resourceReferences = [];
  let truncatedResourceReferenceCount = 0;
  if (skillDocumentContent !== null) {
    const references = extractSkillResourceReferences(skillDocumentContent);
    const selectedReferences = references.slice(0, MAX_RESOURCE_REFERENCES);
    truncatedResourceReferenceCount = references.length - selectedReferences.length;
    for (const reference of selectedReferences) {
      resourceReferences.push(
        await inspectSkillResourceReference(repositoryPath, artifact.root, reference),
      );
    }
  }
  const selectedDirectories = directoryPaths
    .sort((left, right) => left.localeCompare(right, 'en'))
    .slice(0, MAX_DIRECTORIES);
  return {
    directories: selectedDirectories,
    excludedDirectoryCount,
    files,
    isTraversalTruncated,
    resourceReferences,
    role: artifact.role,
    root: artifact.root,
    rootType,
    truncatedDirectoryCount: directoryPaths.length - selectedDirectories.length,
    truncatedFileCount: artifactPaths.length - selectedPaths.length,
    truncatedResourceReferenceCount,
    validation,
  };
};

/** Collects bounded post-execution evidence for configured skill-focused cases. */
export const collectSkillArtifactEvidence = async (repositoryPath, caseDefinition) => {
  const { artifacts } = validateSkillEvidenceConfiguration(caseDefinition);
  const evidence = [];
  for (const artifact of artifacts) {
    evidence.push(await collectConfiguredSkillArtifact(repositoryPath, artifact));
  }
  return evidence;
};

/** Checks whether independently collected skill evidence matches its configured bounded roots. */
export const hasValidSkillArtifactEvidence = (evidence, caseDefinition) => {
  let configuration;
  try {
    configuration = validateSkillEvidenceConfiguration(caseDefinition);
  } catch {
    return false;
  }
  return (
    Array.isArray(evidence) &&
    evidence.length === configuration.artifacts.length &&
    evidence.every((entry, index) => {
      const configuredArtifact = configuration.artifacts[index];
      return (
        isPlainRecord(entry) &&
        entry.role === configuredArtifact.role &&
        entry.root === configuredArtifact.root &&
        ['directory', 'file', 'missing', 'symlink'].includes(entry.rootType) &&
        Number.isSafeInteger(entry.truncatedFileCount) &&
        entry.truncatedFileCount >= 0 &&
        Number.isSafeInteger(entry.truncatedDirectoryCount) &&
        entry.truncatedDirectoryCount >= 0 &&
        typeof entry.isTraversalTruncated === 'boolean' &&
        Number.isSafeInteger(entry.truncatedResourceReferenceCount) &&
        entry.truncatedResourceReferenceCount >= 0 &&
        Number.isSafeInteger(entry.excludedDirectoryCount) &&
        entry.excludedDirectoryCount >= 0 &&
        isPlainRecord(entry.validation) &&
        typeof entry.validation.valid === 'boolean' &&
        Array.isArray(entry.validation.errors) &&
        entry.validation.errors.every((error) => typeof error === 'string') &&
        entry.validation.valid === (entry.validation.errors.length === 0) &&
        (entry.validation.name === null || typeof entry.validation.name === 'string') &&
        (entry.validation.description === null ||
          typeof entry.validation.description === 'string') &&
        Array.isArray(entry.directories) &&
        entry.directories.length <= MAX_DIRECTORIES &&
        entry.directories.every((path) => typeof path === 'string') &&
        Array.isArray(entry.resourceReferences) &&
        entry.resourceReferences.length <= MAX_RESOURCE_REFERENCES &&
        entry.resourceReferences.every(
          (reference) =>
            isPlainRecord(reference) &&
            typeof reference.reference === 'string' &&
            typeof reference.resolvedPath === 'string' &&
            typeof reference.isSafe === 'boolean' &&
            ['directory', 'file', 'missing', 'symlink', 'unsafe'].includes(reference.type),
        ) &&
        Array.isArray(entry.files) &&
        entry.files.length <= MAX_FILES &&
        entry.files.every(
          (file) =>
            isPlainRecord(file) &&
            typeof file.path === 'string' &&
            Number.isSafeInteger(file.mode) &&
            (/^[a-f0-9]{64}$/u.test(file.sha256) ||
              (file.sha256 === null && file.omission === 'file-too-large')) &&
            (isBoundedEvidenceText(file.content) || file.content === null) &&
            [null, 'file-too-large', 'non-utf8', 'symlink'].includes(file.omission) &&
            (file.content === null) !== (file.omission === null),
        )
      );
    })
  );
};
