#!/usr/bin/env node

// src/portable/initialization-inspection/entry.ts
import { dirname, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

// src/portable/initialization-inspection/inspection.ts
import { lstat, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { isPathWithin, readRepositoryFile, resolveRepositoryFile } from "./repository-files.mjs";

// src/portable/initialization-inspection/constants.ts
var INITIALIZATION_INSPECTION_LIMITS = {
  directoryDepth: 64,
  inventoryEntries: 16384,
  inventoryRecords: 128,
  sourcePaths: 8,
  sourceFileBytes: 32768,
  sourcePacketBytes: 65536,
  outputBytes: 262144
};
var INSPECTION_EXCLUDED_DIRECTORIES = /* @__PURE__ */ new Set([
  "_archive",
  "_archives",
  "_backup",
  "_backups",
  ".git",
  "node_modules"
]);

// src/portable/initialization-inspection/inspection.ts
var validateSourcePath = (path) => {
  const parts = path.split("/");
  if (!path || isAbsolute(path) || /^[a-z]:/iu.test(path) || /[\\\p{Cc}]/u.test(path) || parts.some(
    (part) => !part || part === "." || part === ".." || /[<>:"|?*]|[. ]$/u.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part) || INSPECTION_EXCLUDED_DIRECTORIES.has(part)
  ) || parts.some((part) => /^\.env(?:\.|$)|^(?:auth|credentials)\.json$|\.(?:pem|key)$/iu.test(part))) {
    throw new Error("Inspection requires known repository-relative source paths.");
  }
  return path;
};
var logicalPath = (root, path) => relative(root, path).split(sep).join("/");
var inspectInventory = async (root, installedRoot) => {
  const inventory = {
    canonicalAgentDirectories: [],
    documents: [],
    decisionCandidates: [],
    skillCandidates: [],
    visitedEntries: 0
  };
  const pending = [{ path: root, depth: 0 }];
  let isComplete = true;
  for (let index = 0; index < pending.length; index += 1) {
    const directory = pending[index];
    if (directory.depth > INITIALIZATION_INSPECTION_LIMITS.directoryDepth) {
      isComplete = false;
      continue;
    }
    try {
      const stat = await lstat(directory.path);
      if (!stat.isDirectory() || !isPathWithin(root, await realpath(directory.path))) {
        isComplete = false;
        continue;
      }
      const entries = await opendir(directory.path);
      for await (const entry of entries) {
        if (inventory.visitedEntries === INITIALIZATION_INSPECTION_LIMITS.inventoryEntries) {
          isComplete = false;
          return { inventory: sortInventory(inventory), isComplete };
        }
        inventory.visitedEntries += 1;
        if (INSPECTION_EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        const absolutePath = join(directory.path, entry.name);
        if (isPathWithin(installedRoot, absolutePath)) continue;
        if (entry.isSymbolicLink()) continue;
        const path = logicalPath(root, absolutePath);
        const isAgentDirectory = entry.isDirectory() && /^moldea\/agents\/[^/]+$/u.test(path);
        const isDocument = entry.isFile() && entry.name.endsWith(".md");
        if (isAgentDirectory || isDocument) {
          const category = isAgentDirectory ? "canonicalAgentDirectories" : entry.name === "SKILL.md" ? "skillCandidates" : path.split("/").some((part) => /^(?:adr|adrs|decisions)$/iu.test(part)) ? "decisionCandidates" : "documents";
          if (inventory[category].length === INITIALIZATION_INSPECTION_LIMITS.inventoryRecords) isComplete = false;
          else if (category === "skillCandidates")
            inventory.skillCandidates.push({ path, ownership: "unverified" });
          else inventory[category].push(path);
        }
        if (entry.isDirectory()) pending.push({ path: absolutePath, depth: directory.depth + 1 });
      }
    } catch {
      isComplete = false;
    }
  }
  return { inventory: sortInventory(inventory), isComplete };
};
var sortInventory = (inventory) => {
  inventory.canonicalAgentDirectories.sort();
  inventory.documents.sort();
  inventory.decisionCandidates.sort();
  inventory.skillCandidates.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return inventory;
};
var inspectSources = async (root, paths) => {
  let remainingBytes = INITIALIZATION_INSPECTION_LIMITS.sourcePacketBytes;
  const sources = [];
  for (const path of paths) {
    if (remainingBytes === 0) {
      sources.push({ path, content: null, omission: "packet-limit" });
      continue;
    }
    try {
      const absolutePath = resolve(root, path);
      const sourcePath = await resolveRepositoryFile(
        root,
        absolutePath,
        INITIALIZATION_INSPECTION_LIMITS.sourceFileBytes,
        "reject"
      );
      const { size } = await lstat(sourcePath);
      if (size > INITIALIZATION_INSPECTION_LIMITS.sourceFileBytes) throw new Error("Source exceeds its byte limit.");
      if (size > remainingBytes) {
        sources.push({ path, content: null, omission: "packet-limit" });
        continue;
      }
      remainingBytes -= size;
      const bytes = await readRepositoryFile(root, absolutePath, size, "reject");
      const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      if (bytes.some((byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13))
        throw new Error("Source is not supported text.");
      sources.push({ path, content, omission: null });
    } catch {
      sources.push({ path, content: null, omission: "source-unavailable" });
    }
  }
  return sources;
};
var collectInitializationInspection = async (options) => {
  if (!isAbsolute(options.repositoryRoot) || !(await lstat(options.repositoryRoot)).isDirectory()) {
    throw new Error("Inspection requires an absolute regular repository directory.");
  }
  const paths = [...new Set(options.paths ?? [])].map(validateSourcePath);
  if (paths.length > INITIALIZATION_INSPECTION_LIMITS.sourcePaths)
    throw new Error("Inspection source batch exceeds its path limit.");
  const root = await realpath(options.repositoryRoot);
  const installedRoot = await realpath(options.installedSkillRoot);
  const installedSkill = {
    repositoryPath: isPathWithin(root, installedRoot) ? logicalPath(root, installedRoot) : null,
    ownership: "installed-distribution"
  };
  if (paths.length > 0) {
    const sources = await inspectSources(root, paths);
    return {
      kind: "moldea-initialization-inspection",
      mode: "sources",
      status: sources.every((source) => source.omission === null) ? "complete" : "partial",
      installedSkill,
      sources
    };
  }
  const { inventory, isComplete } = await inspectInventory(root, installedRoot);
  return {
    kind: "moldea-initialization-inspection",
    mode: "inventory",
    status: isComplete ? "complete" : "partial",
    installedSkill,
    inventory
  };
};

// src/portable/initialization-inspection/entry.ts
var [flag, repositoryRoot, ...remaining] = process.argv.slice(2);
try {
  if (flag !== "--repository" || !repositoryRoot || remaining.length % 2 !== 0 || remaining.some((part, index) => index % 2 === 0 && part !== "--path")) {
    throw new Error(
      "Usage: initialization-inspection --repository <absolute-root> [--path <known-relative-file> ...]"
    );
  }
  const result = await collectInitializationInspection({
    repositoryRoot,
    installedSkillRoot: resolve2(dirname(fileURLToPath(import.meta.url)), ".."),
    paths: remaining.filter((_, index) => index % 2 === 1)
  });
  const output = `${JSON.stringify(result)}
`;
  if (Buffer.byteLength(output) > INITIALIZATION_INSPECTION_LIMITS.outputBytes)
    throw new Error("Inspection output exceeds its byte limit.");
  process.stdout.write(output);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Initialization inspection failed."}
`
  );
  process.exitCode = 1;
}
