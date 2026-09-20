#!/usr/bin/env node

// src/portable/managed-readme.ts
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, open, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
var MAX_README_BYTES = 2 * 1024 * 1024;
var MAX_MANAGED_BLOCK_BYTES = 4 * 1024;
var README_FILE_NAME = "README.md";
var START_MARKER = "<!-- moldea:start -->";
var END_MARKER = "<!-- moldea:end -->";
var DEFAULT_MANAGED_README_BLOCK = "<!-- moldea:start -->\n\nFor every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.\nCanonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.\n<!-- moldea:end -->\n";
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
var renderManagedReadmeBlock = (managedReadmeBlock, lineEndingBytes) => Buffer.from(
  managedReadmeBlock.replaceAll("\n", lineEndingBytes === CRLF_BYTES ? "\r\n" : "\n"),
  "utf8"
);
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
var parseManagedRegion = (readmeBytes) => {
  if (!Buffer.isBuffer(readmeBytes)) {
    throw new TypeError("README content must be a Buffer");
  }
  if (readmeBytes.length > MAX_README_BYTES) {
    throw new Error(`README.md exceeds the ${MAX_README_BYTES}-byte limit`);
  }
  decodeUtf8(readmeBytes, "README.md");
  const starts = [];
  const ends = [];
  let lineStart = 0;
  let isFirstLine = true;
  while (lineStart < readmeBytes.length) {
    const newlineIndex = readmeBytes.indexOf(10, lineStart);
    const lineEnd = newlineIndex === -1 ? readmeBytes.length : newlineIndex + 1;
    const contentEnd = newlineIndex !== -1 && readmeBytes[newlineIndex - 1] === 13 ? newlineIndex - 1 : newlineIndex === -1 ? readmeBytes.length : newlineIndex;
    const marker = parseMarkerLine(
      readmeBytes.subarray(lineStart, contentEnd),
      lineStart,
      isFirstLine
    );
    if (marker?.kind === "start") {
      starts.push({
        markerStart: marker.markerStart,
        lineEnding: newlineIndex === -1 ? Buffer.alloc(0) : readmeBytes.subarray(contentEnd, lineEnd)
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
    throw new Error("README.md must contain exactly one moldea marker pair");
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
var getAppendLineEnding = (readmeBytes) => {
  let newlineCount = 0;
  let crlfCount = 0;
  for (let index = 0; index < readmeBytes.length; index += 1) {
    if (readmeBytes[index] === 10) {
      newlineCount += 1;
      if (index > 0 && readmeBytes[index - 1] === 13) {
        crlfCount += 1;
      }
    }
  }
  return newlineCount > 0 && newlineCount === crlfCount ? CRLF_BYTES : LF_BYTES;
};
var getAppendSeparator = (readmeBytes, lineEndingBytes) => {
  if (readmeBytes.length === 0 || isUtf8Bom(readmeBytes)) {
    return Buffer.alloc(0);
  }
  return Buffer.concat([
    readmeBytes[readmeBytes.length - 1] === 10 ? Buffer.alloc(0) : lineEndingBytes,
    lineEndingBytes
  ]);
};
var assertCanonicalManagedReadmeBlock = (managedReadmeBlock) => {
  if (typeof managedReadmeBlock !== "string") {
    throw new TypeError("The canonical managed README block must be a string");
  }
  const managedReadmeBytes = Buffer.from(managedReadmeBlock, "utf8");
  if (managedReadmeBytes.length > MAX_MANAGED_BLOCK_BYTES) {
    throw new Error(
      `The canonical managed README block exceeds the ${MAX_MANAGED_BLOCK_BYTES}-byte limit`
    );
  }
  if (managedReadmeBlock.includes("\r") || !managedReadmeBlock.endsWith("\n") || managedReadmeBlock.endsWith("\n\n")) {
    throw new Error(
      "The canonical managed README block must use LF and end with exactly one newline"
    );
  }
  const lines = managedReadmeBlock.slice(0, -1).split("\n");
  if (lines.length < 4 || lines[0] !== START_MARKER || lines[1] !== "" || lines.at(-1) !== END_MARKER || lines.filter((line) => line === START_MARKER).length !== 1 || lines.filter((line) => line === END_MARKER).length !== 1) {
    throw new Error(
      "The canonical managed README block must contain one ordered marker pair and a blank line after the opening marker"
    );
  }
};
var hasCanonicalManagedReadmeBlock = (readmeBytes, managedReadmeBlock = DEFAULT_MANAGED_README_BLOCK) => {
  try {
    assertCanonicalManagedReadmeBlock(managedReadmeBlock);
    const region = parseManagedRegion(readmeBytes);
    if (region === void 0) {
      return false;
    }
    const expectedBytes = renderManagedReadmeBlock(managedReadmeBlock, region.lineEnding);
    return isEqualBytes(readmeBytes.subarray(region.regionStart, region.regionEnd), expectedBytes);
  } catch {
    return false;
  }
};
var createManagedReadmeBytes = (readmeBytes, managedReadmeBlock = DEFAULT_MANAGED_README_BLOCK) => {
  assertCanonicalManagedReadmeBlock(managedReadmeBlock);
  const region = parseManagedRegion(readmeBytes);
  if (region !== void 0) {
    const updatedBytes2 = Buffer.concat([
      readmeBytes.subarray(0, region.regionStart),
      renderManagedReadmeBlock(managedReadmeBlock, region.lineEnding),
      readmeBytes.subarray(region.regionEnd)
    ]);
    if (updatedBytes2.length > MAX_README_BYTES) {
      throw new Error(`Updated README.md exceeds the ${MAX_README_BYTES}-byte limit`);
    }
    return updatedBytes2;
  }
  const lineEnding = getAppendLineEnding(readmeBytes);
  const updatedBytes = Buffer.concat([
    readmeBytes,
    getAppendSeparator(readmeBytes, lineEnding),
    renderManagedReadmeBlock(managedReadmeBlock, lineEnding)
  ]);
  if (updatedBytes.length > MAX_README_BYTES) {
    throw new Error(`Updated README.md exceeds the ${MAX_README_BYTES}-byte limit`);
  }
  return updatedBytes;
};
var readBoundedRegularFile = async (filePath) => {
  const pathStats = await lstat(filePath);
  if (!pathStats.isFile()) {
    throw new Error(`${basename(filePath)} must be a regular file`);
  }
  if (pathStats.size > MAX_README_BYTES) {
    throw new Error(`${basename(filePath)} exceeds the ${MAX_README_BYTES}-byte limit`);
  }
  const fileHandle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const openStats = await fileHandle.stat();
    if (!openStats.isFile() || openStats.dev !== pathStats.dev || openStats.ino !== pathStats.ino) {
      throw new Error(`${basename(filePath)} changed while it was being opened`);
    }
    const boundedBytes = Buffer.allocUnsafe(MAX_README_BYTES + 1);
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
    if (bytesRead > MAX_README_BYTES) {
      throw new Error(`${basename(filePath)} exceeds the ${MAX_README_BYTES}-byte limit`);
    }
    return {
      bytes: Buffer.from(boundedBytes.subarray(0, bytesRead)),
      mode: pathStats.mode & 4095
    };
  } finally {
    await fileHandle.close();
  }
};
var writeAtomically = async (filePath, bytes, mode) => {
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx", mode });
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};
var updateManagedReadme = async (repositoryRoot, managedReadmeBlock = DEFAULT_MANAGED_README_BLOCK) => {
  if (typeof repositoryRoot !== "string" || !isAbsolute(repositoryRoot) || resolve(repositoryRoot) !== repositoryRoot) {
    throw new Error("The repository root must be a normalized absolute path");
  }
  const rootStats = await lstat(repositoryRoot);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error("The repository root must be a regular directory");
  }
  assertCanonicalManagedReadmeBlock(managedReadmeBlock);
  const readmePath = join(repositoryRoot, README_FILE_NAME);
  let currentBytes = Buffer.alloc(0);
  let currentMode = 420;
  let status = "created";
  try {
    const currentFile = await readBoundedRegularFile(readmePath);
    currentBytes = currentFile.bytes;
    currentMode = currentFile.mode;
    status = "updated";
  } catch (error) {
    if (error === null || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
  const updatedBytes = createManagedReadmeBytes(currentBytes, managedReadmeBlock);
  if (isEqualBytes(currentBytes, updatedBytes)) {
    return "unchanged";
  }
  await writeAtomically(readmePath, updatedBytes, currentMode);
  return status;
};
var parseArguments = (argumentsList) => {
  if (argumentsList.length !== 2 || argumentsList[0] !== "--repository" || typeof argumentsList[1] !== "string") {
    throw new Error("Usage: managed-readme.mjs --repository <normalized-absolute-root>");
  }
  return argumentsList[1];
};
var isDirectExecution = process.argv[1] !== void 0 && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  try {
    const repositoryRoot = parseArguments(process.argv.slice(2));
    const status = await updateManagedReadme(repositoryRoot);
    process.stdout.write(`${status}
`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    process.stderr.write(`managed README update failed: ${message}
`);
    process.exitCode = 1;
  }
}
export {
  assertCanonicalManagedReadmeBlock,
  createManagedReadmeBytes,
  hasCanonicalManagedReadmeBlock,
  updateManagedReadme
};
