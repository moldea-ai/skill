#!/usr/bin/env node

// src/portable/relevance-gate.ts
import { realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { hasCanonicalManagedReadmeBlock } from "./managed-readme.mjs";
import { matchManifestScope } from "./manifest-scope.cjs";
import { readRepositoryFile, resolveRepositoryFile } from "./repository-files.mjs";
var MAX_MANIFEST_BYTES = 2097152;
var MAX_PATH_INPUT_BYTES = 2097152;
var MAX_README_BYTES = 2097152;
var utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
var MANIFEST_LOGICAL_PATH = "/moldea/moldea.yaml";
var hasInitializedProject = async (repositoryRoot) => {
  await Promise.all([
    resolveRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, "moldea", "moldea.yaml"),
      MAX_MANIFEST_BYTES,
      "reject"
    ),
    resolveRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, "moldea", "project.md"),
      MAX_README_BYTES,
      "reject"
    )
  ]);
  return hasCanonicalManagedReadmeBlock(
    await readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, "README.md"),
      MAX_README_BYTES,
      "reject"
    )
  );
};
var readPathInput = async () => {
  const chunks = [];
  let byteLength = 0;
  const inputStream = process.stdin;
  for await (const chunk of inputStream) {
    const inputChunk = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    byteLength += inputChunk.byteLength;
    if (byteLength > MAX_PATH_INPUT_BYTES) {
      throw new Error("path input is too large");
    }
    chunks.push(inputChunk);
  }
  const input = Buffer.concat(chunks, byteLength);
  if (input.byteLength === 0 || input.at(-1) !== 0) {
    throw new Error("invalid path input");
  }
  const paths = utf8Decoder.decode(input.subarray(0, -1)).split("\0");
  if (paths.some((path) => path.length === 0)) {
    throw new Error("invalid path input");
  }
  return paths.map((path) => {
    if (/^[A-Za-z]:/u.test(path) || path.startsWith("\\\\")) {
      throw new Error("invalid path input");
    }
    return path.startsWith("/") ? path : `/${path}`;
  });
};
var parseArguments = () => {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length < 2 || arguments_.length > 3 || arguments_[0] !== "--repository" || arguments_[1] === void 0 || !isAbsolute(arguments_[1]) || arguments_.length === 3 && arguments_[2] !== "--adoption-only") {
    throw new Error("invalid arguments");
  }
  return {
    isAdoptionOnly: arguments_[2] === "--adoption-only",
    repositoryRoot: resolve(arguments_[1])
  };
};
var evaluateGate = async () => {
  const parsed = parseArguments();
  const repositoryRoot = await realpath(parsed.repositoryRoot);
  if (!await hasInitializedProject(repositoryRoot)) {
    return false;
  }
  if (parsed.isAdoptionOnly) {
    return true;
  }
  const [manifest, paths] = await Promise.all([
    readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, "moldea", "moldea.yaml"),
      MAX_MANIFEST_BYTES,
      "reject"
    ),
    readPathInput()
  ]);
  const result = await matchManifestScope({
    manifest: {
      content: manifest,
      path: MANIFEST_LOGICAL_PATH
    },
    paths
  });
  return result.valid && result.relevant;
};
var isRelevant = await evaluateGate().catch(() => false);
process.stdout.write(isRelevant ? "1\n" : "0\n");
