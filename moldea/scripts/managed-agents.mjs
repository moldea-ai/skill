#!/usr/bin/env node

// src/portable/managed-agents/managed-agents.ts
import { realpath } from "node:fs/promises";
import { dirname as dirname2, isAbsolute as isAbsolute2, join as join2, relative, resolve as resolve2, sep } from "node:path";
import { fileURLToPath } from "node:url";

// src/portable/managed-block/managed-block.ts
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, open, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
var MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
var MAX_MANAGED_BLOCK_BYTES = 4 * 1024;
var START_MARKER = "<!-- moldea:start -->";
var END_MARKER = "<!-- moldea:end -->";
var UTF8_BOM = Buffer.from([239, 187, 191]);
var START_MARKER_BYTES = Buffer.from(START_MARKER, "ascii");
var END_MARKER_BYTES = Buffer.from(END_MARKER, "ascii");
var LF_BYTES = Buffer.from("\n", "ascii");
var CRLF_BYTES = Buffer.from("\r\n", "ascii");
var decodeUtf8 = (bytes, description) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${description} is not valid UTF-8`);
  }
};
var isEqualBytes = (left, right) => left.length === right.length && left.equals(right);
var isUtf8Bom = (bytes) => bytes.length === UTF8_BOM.length && isEqualBytes(bytes, UTF8_BOM);
var hasUtf8Bom = (bytes) => bytes.length >= UTF8_BOM.length && isEqualBytes(bytes.subarray(0, UTF8_BOM.length), UTF8_BOM);
var renderBlock = (block, lineEndingBytes) => Buffer.from(block.replaceAll("\n", lineEndingBytes === CRLF_BYTES ? "\r\n" : "\n"), "utf8");
var parseMarkerLine = (lineBytes, lineStart, isFirstLine) => {
  const contentBytes = isFirstLine && hasUtf8Bom(lineBytes) ? lineBytes.subarray(UTF8_BOM.length) : lineBytes;
  const markerOffset = lineBytes.length - contentBytes.length;
  const containsStartMarker = contentBytes.indexOf(START_MARKER_BYTES) !== -1;
  const containsEndMarker = contentBytes.indexOf(END_MARKER_BYTES) !== -1;
  if (containsStartMarker && !isEqualBytes(contentBytes, START_MARKER_BYTES)) {
    throw new Error("The moldea start marker must occupy its complete line");
  }
  if (containsEndMarker && !isEqualBytes(contentBytes, END_MARKER_BYTES)) {
    throw new Error("The moldea end marker must occupy its complete line");
  }
  if (containsStartMarker && containsEndMarker) {
    throw new Error("The moldea markers must occupy separate lines");
  }
  if (containsStartMarker) {
    return { kind: "start", markerStart: lineStart + markerOffset };
  }
  if (containsEndMarker) {
    return { kind: "end", markerStart: lineStart + markerOffset };
  }
  return void 0;
};
var parseManagedRegion = (documentBytes, fileName) => {
  if (!Buffer.isBuffer(documentBytes)) {
    throw new TypeError(
      `${fileName === "README.md" ? "README" : fileName} content must be a Buffer`
    );
  }
  if (documentBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }
  decodeUtf8(documentBytes, fileName);
  const starts = [];
  const ends = [];
  let lineStart = 0;
  let isFirstLine = true;
  while (lineStart < documentBytes.length) {
    const newlineIndex = documentBytes.indexOf(10, lineStart);
    const lineEnd = newlineIndex === -1 ? documentBytes.length : newlineIndex + 1;
    const contentEnd = newlineIndex !== -1 && documentBytes[newlineIndex - 1] === 13 ? newlineIndex - 1 : newlineIndex === -1 ? documentBytes.length : newlineIndex;
    const marker = parseMarkerLine(
      documentBytes.subarray(lineStart, contentEnd),
      lineStart,
      isFirstLine
    );
    if (marker?.kind === "start") {
      starts.push({
        markerStart: marker.markerStart,
        lineEnding: newlineIndex === -1 ? Buffer.alloc(0) : documentBytes.subarray(contentEnd, lineEnd)
      });
    } else if (marker?.kind === "end") {
      ends.push({ markerStart: marker.markerStart, lineEnd });
    }
    lineStart = lineEnd;
    isFirstLine = false;
  }
  if (starts.length === 0 && ends.length === 0) {
    return void 0;
  }
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(`${fileName} must contain exactly one moldea marker pair`);
  }
  const start = starts[0];
  const end = ends[0];
  if (start.markerStart >= end.markerStart) {
    throw new Error("The moldea markers are reversed");
  }
  if (start.lineEnding.length === 0) {
    throw new Error("The moldea start marker must end with a line ending");
  }
  return {
    regionStart: start.markerStart,
    regionEnd: end.lineEnd,
    lineEnding: isEqualBytes(start.lineEnding, CRLF_BYTES) ? CRLF_BYTES : LF_BYTES
  };
};
var getAppendLineEnding = (documentBytes) => {
  let newlineCount = 0;
  let crlfCount = 0;
  for (let index = 0; index < documentBytes.length; index += 1) {
    if (documentBytes[index] === 10) {
      newlineCount += 1;
      if (index > 0 && documentBytes[index - 1] === 13) {
        crlfCount += 1;
      }
    }
  }
  return newlineCount > 0 && newlineCount === crlfCount ? CRLF_BYTES : LF_BYTES;
};
var getAppendSeparator = (documentBytes, lineEndingBytes) => {
  if (documentBytes.length === 0 || isUtf8Bom(documentBytes)) {
    return Buffer.alloc(0);
  }
  return Buffer.concat([
    documentBytes[documentBytes.length - 1] === 10 ? Buffer.alloc(0) : lineEndingBytes,
    lineEndingBytes
  ]);
};
var assertManagedBlock = (block, description = "README", requiresBlankLine = true) => {
  if (typeof block !== "string") {
    throw new TypeError(`The canonical managed ${description} block must be a string`);
  }
  const blockBytes = Buffer.from(block, "utf8");
  if (blockBytes.length > MAX_MANAGED_BLOCK_BYTES) {
    throw new Error(
      `The canonical managed ${description} block exceeds the ${MAX_MANAGED_BLOCK_BYTES}-byte limit`
    );
  }
  if (block.includes("\r") || !block.endsWith("\n") || block.endsWith("\n\n")) {
    throw new Error(
      `The canonical managed ${description} block must use LF and end with exactly one newline`
    );
  }
  const lines = block.slice(0, -1).split("\n");
  if (lines.length < (requiresBlankLine ? 4 : 3) || lines[0] !== START_MARKER || requiresBlankLine && lines[1] !== "" || lines.at(-1) !== END_MARKER || lines.filter((line) => line === START_MARKER).length !== 1 || lines.filter((line) => line === END_MARKER).length !== 1) {
    throw new Error(
      `The canonical managed ${description} block must contain one ordered marker pair${requiresBlankLine ? " and a blank line after the opening marker" : ""}`
    );
  }
};
var hasManagedBlock = (documentBytes, block, fileName = "README.md") => {
  try {
    assertManagedBlock(
      block,
      fileName === "README.md" ? "README" : fileName,
      fileName === "README.md"
    );
    const region = parseManagedRegion(documentBytes, fileName);
    if (region === void 0) {
      return false;
    }
    const expectedBytes = renderBlock(block, region.lineEnding);
    return isEqualBytes(
      documentBytes.subarray(region.regionStart, region.regionEnd),
      expectedBytes
    );
  } catch {
    return false;
  }
};
var createManagedBlockBytes = (documentBytes, block, fileName = "README.md") => {
  assertManagedBlock(
    block,
    fileName === "README.md" ? "README" : fileName,
    fileName === "README.md"
  );
  const region = parseManagedRegion(documentBytes, fileName);
  if (region !== void 0) {
    const updatedBytes2 = Buffer.concat([
      documentBytes.subarray(0, region.regionStart),
      renderBlock(block, region.lineEnding),
      documentBytes.subarray(region.regionEnd)
    ]);
    if (updatedBytes2.length > MAX_DOCUMENT_BYTES) {
      throw new Error(`Updated ${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
    }
    return updatedBytes2;
  }
  const lineEnding = getAppendLineEnding(documentBytes);
  const updatedBytes = Buffer.concat([
    documentBytes,
    getAppendSeparator(documentBytes, lineEnding),
    renderBlock(block, lineEnding)
  ]);
  if (updatedBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`Updated ${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }
  return updatedBytes;
};
var readManagedFile = async (filePath) => {
  const pathStats = await lstat(filePath);
  if (!pathStats.isFile()) {
    throw new Error(`${basename(filePath)} must be a regular file`);
  }
  if (pathStats.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${basename(filePath)} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }
  const fileHandle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const openStats = await fileHandle.stat();
    if (!openStats.isFile() || openStats.dev !== pathStats.dev || openStats.ino !== pathStats.ino) {
      throw new Error(`${basename(filePath)} changed while it was being opened`);
    }
    const boundedBytes = Buffer.allocUnsafe(MAX_DOCUMENT_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < boundedBytes.length) {
      const result = await fileHandle.read(
        boundedBytes,
        bytesRead,
        boundedBytes.length - bytesRead,
        null
      );
      if (result.bytesRead === 0) {
        break;
      }
      bytesRead += result.bytesRead;
    }
    if (bytesRead > MAX_DOCUMENT_BYTES) {
      throw new Error(`${basename(filePath)} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
    }
    return {
      bytes: Buffer.from(boundedBytes.subarray(0, bytesRead)),
      mode: pathStats.mode & 4095,
      dev: pathStats.dev,
      ino: pathStats.ino
    };
  } finally {
    await fileHandle.close();
  }
};
var writeAtomically = async (filePath, bytes, mode, expected) => {
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx", mode });
    await chmod(temporaryPath, mode);
    let observed;
    try {
      observed = await readManagedFile(filePath);
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    if (expected === void 0 ? observed !== void 0 : observed === void 0 || observed.dev !== expected.dev || observed.ino !== expected.ino || observed.mode !== expected.mode || !observed.bytes.equals(expected.bytes)) {
      throw new Error(`${basename(filePath)} changed before replacement`);
    }
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};
var updateManagedFile = async (repositoryRoot, block, fileName = "README.md") => {
  if (typeof repositoryRoot !== "string" || !isAbsolute(repositoryRoot) || resolve(repositoryRoot) !== repositoryRoot) {
    throw new Error("The repository root must be a normalized absolute path");
  }
  const rootStats = await lstat(repositoryRoot);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error("The repository root must be a regular directory");
  }
  assertManagedBlock(
    block,
    fileName === "README.md" ? "README" : fileName,
    fileName === "README.md"
  );
  const targetPath = join(repositoryRoot, fileName);
  let currentBytes = Buffer.alloc(0);
  let currentMode = 420;
  let status = "created";
  let expected;
  try {
    const currentFile = await readManagedFile(targetPath);
    expected = currentFile;
    currentBytes = currentFile.bytes;
    currentMode = currentFile.mode;
    status = "updated";
  } catch (error) {
    if (error === null || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
  const updatedBytes = createManagedBlockBytes(currentBytes, block, fileName);
  if (isEqualBytes(currentBytes, updatedBytes)) {
    return "unchanged";
  }
  await writeAtomically(targetPath, updatedBytes, currentMode, expected);
  return status;
};
var isMissingFile = (error) => error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";

// src/portable/managed-agents/managed-agents.ts
import { isPathWithin, resolveRepositoryFile } from "./repository-files.mjs";
var MANAGED_AGENTS_TEMPLATE = "<!-- moldea:start -->\n\nThis project uses moldea for project context. Explicit moldea operations and direct agent, skill, or project-context work follow the skill's own routing. For other repository planning, implementation, or review, once you know the involved files and before editing or giving conclusions, run:\n\nnode \"<repo-root>/{{skill-path}}/scripts/relevance-gate.mjs\" --repository \"<repo-root>\" --path \"<file>\" [--path \"<file>\" ...]\n\n<repo-root> is the absolute repository root. Pass file paths relative to that root, even from a subdirectory. Use only already-known paths; do not scan or run Git for this. With no known paths, skip this precheck.\n\n- Output 1: read <repo-root>/{{skill-path}}/SKILL.md; retain the checked paths and result.\n- Output 0 or an error: continue without moldea and do not mention it.\n\nIf the task involves new files later, check only that new batch once before acting. Reuse unchanged results.\n<!-- moldea:end -->\n";
var renderManagedAgentsBlock = async (repositoryRoot) => {
  if (!isAbsolute2(repositoryRoot)) throw new Error("The repository root must be an absolute path.");
  const root = await realpath(repositoryRoot);
  const skillRoot = await realpath(resolve2(dirname2(fileURLToPath(import.meta.url)), ".."));
  if (root === skillRoot || !isPathWithin(root, skillRoot))
    throw new Error("The skill must be installed inside the repository.");
  await Promise.all(
    ["SKILL.md", "scripts/relevance-gate.mjs"].map(
      (file) => resolveRepositoryFile(root, join2(skillRoot, file), 2097152)
    )
  );
  const skillPath = relative(root, skillRoot).split(sep).join("/");
  if (!/^[A-Za-z0-9._/-]+$/u.test(skillPath))
    throw new Error("The skill installation path cannot be represented safely in the command.");
  const block = MANAGED_AGENTS_TEMPLATE.replaceAll("{{skill-path}}", skillPath);
  assertManagedBlock(block, "AGENTS.md", false);
  return block;
};
var checkManagedAgents = async (repositoryRoot, block) => {
  try {
    const { bytes } = await readManagedFile(join2(repositoryRoot, "AGENTS.md"));
    return hasManagedBlock(bytes, block, "AGENTS.md") ? "ready" : "warning: AGENTS.md moldea block is missing or differs from this installation";
  } catch (error) {
    if (isMissingFile(error)) return "warning: AGENTS.md is missing";
    if (error instanceof Error && !("code" in error)) return `warning: ${error.message}`;
    throw error;
  }
};
var isDirectExecution = process.argv[1] !== void 0 && await realpath(resolve2(process.argv[1])) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  try {
    const arguments_ = process.argv.slice(2);
    if (arguments_[0] !== "--repository" || arguments_[1] === void 0 || !isAbsolute2(arguments_[1]) || arguments_.length < 2 || arguments_.length > 3 || arguments_.length === 3 && arguments_[2] !== "--print" && arguments_[2] !== "--check")
      throw new Error("Usage: managed-agents.mjs --repository <absolute-root> [--print | --check]");
    const repositoryRoot = await realpath(arguments_[1]);
    const block = await renderManagedAgentsBlock(repositoryRoot);
    if (arguments_[2] === "--print") process.stdout.write(block);
    else if (arguments_[2] === "--check")
      process.stdout.write(`${await checkManagedAgents(repositoryRoot, block)}
`);
    else process.stdout.write(`${await updateManagedFile(repositoryRoot, block, "AGENTS.md")}
`);
  } catch (error) {
    process.stderr.write(
      `managed AGENTS update failed: ${error instanceof Error ? error.message : "Unknown failure"}
`
    );
    process.exitCode = 1;
  }
}
export {
  checkManagedAgents,
  renderManagedAgentsBlock
};
