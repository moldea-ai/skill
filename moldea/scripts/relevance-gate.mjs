#!/usr/bin/env node

// src/portable/relevance-gate.ts
import { realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { hasCanonicalManagedReadmeBlock } from "./managed-readme.mjs";
import { matchManifestScope } from "./manifest-scope.cjs";
import { readRepositoryFile, resolveRepositoryFile } from "./repository-files.mjs";

// src/portable/scope-path-input.ts
var MAXIMUM_PATH_INPUT_BYTES = 2097152;
var utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
var normalizeScopePath = (path) => {
  if (path.length === 0 || path.includes("\0") || /^[A-Za-z]:/u.test(path) || path.startsWith("\\\\")) {
    throw new Error("Invalid scope path input.");
  }
  return path.startsWith("/") ? path : `/${path}`;
};
var readScopePathInput = async (inputStream) => {
  const chunks = [];
  let byteLength = 0;
  for await (const chunk of inputStream) {
    const inputChunk = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    byteLength += inputChunk.byteLength;
    if (byteLength > MAXIMUM_PATH_INPUT_BYTES) {
      throw new Error("Scope path input exceeds its byte limit.");
    }
    chunks.push(inputChunk);
  }
  const input = Buffer.concat(chunks, byteLength);
  if (input.byteLength === 0 || input.at(-1) !== 0) {
    throw new Error("Invalid scope path input.");
  }
  let text;
  try {
    text = utf8Decoder.decode(input.subarray(0, -1));
  } catch (error) {
    throw new Error("Invalid scope path input.", { cause: error });
  }
  return text.split("\0").map(normalizeScopePath);
};

// src/portable/relevance-gate.ts
var MAX_MANIFEST_BYTES = 2097152;
var MAX_README_BYTES = 2097152;
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
    readScopePathInput(process.stdin)
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
