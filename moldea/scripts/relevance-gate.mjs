#!/usr/bin/env node

// src/portable/relevance-gate.ts
import { realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { matchManifestScope } from "./manifest-scope.cjs";
import { readRepositoryFile, resolveRepositoryFile } from "./repository-files.mjs";

// src/portable/scope-path-input.ts
import { posix, win32 } from "node:path";
var MAXIMUM_PATH_INPUT_BYTES = 2097152;
var utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
var normalizeScopePath = (path, context) => {
  const isDriveAbsolute = /^[A-Za-z]:[\\/]/u.test(path);
  const normalizedPath = path.replace(/^(?:\.\/)+/u, "");
  const segments = normalizedPath.split(isDriveAbsolute ? /[\\/]/u : "/");
  if (normalizedPath.length === 0 || path.includes("\0") || path.startsWith("./") && normalizedPath.startsWith("/") || normalizedPath.startsWith("//") || !isDriveAbsolute && (normalizedPath.includes("\\") || /^[A-Za-z]:/u.test(normalizedPath)) || segments.some(
    (segment, index) => segment === "." || segment === ".." || segment === "" && !(index === 0 && normalizedPath.startsWith("/"))
  )) {
    throw new Error("Invalid scope path input.");
  }
  const usesWindowsPaths = /^[A-Za-z]:[\\/]|^\\\\/u.test(context.resolvedRepositoryRoot);
  if (isDriveAbsolute && !usesWindowsPaths) throw new Error("Invalid scope path input.");
  const pathApi = usesWindowsPaths ? win32 : posix;
  if (isDriveAbsolute || !usesWindowsPaths && normalizedPath.startsWith("/")) {
    for (const root of [context.repositoryRoot, context.resolvedRepositoryRoot]) {
      const relativePath = pathApi.relative(root, normalizedPath);
      if (relativePath === "") throw new Error("Invalid scope path input.");
      if (!pathApi.isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${pathApi.sep}`)) {
        return `/${relativePath.split(pathApi.sep).join("/")}`;
      }
    }
    if (isDriveAbsolute) throw new Error("Invalid scope path input.");
  }
  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
};
var readScopePathInput = async (inputStream, context) => {
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
  return text.split("\0").map((path) => normalizeScopePath(path, context));
};
var normalizeScopePathArguments = (paths, context) => {
  if (paths.length === 0) throw new Error("Invalid scope path input.");
  let byteLength = 0;
  return paths.map((path) => {
    byteLength += Buffer.byteLength(path, "utf8") + 1;
    if (byteLength > MAXIMUM_PATH_INPUT_BYTES)
      throw new Error("Scope path input exceeds its byte limit.");
    return normalizeScopePath(path, context);
  });
};

// src/portable/relevance-gate.ts
var MAX_FOUNDATION_BYTES = 2097152;
var hasInitializedProject = async (repositoryRoot) => {
  try {
    await Promise.all(
      ["moldea.yaml", "project.md"].map(
        (fileName) => resolveRepositoryFile(
          repositoryRoot,
          join(repositoryRoot, "moldea", fileName),
          MAX_FOUNDATION_BYTES,
          "reject"
        )
      )
    );
    return true;
  } catch (error) {
    if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return false;
    throw error;
  }
};
var parseArguments = () => {
  const arguments_ = process.argv.slice(2);
  if (arguments_[0] !== "--repository" || arguments_[1] === void 0 || !isAbsolute(arguments_[1]))
    throw new Error("Invalid gate arguments.");
  let isAdoptionOnly = false;
  let hasDiagnosticFlag = false;
  const paths = [];
  for (let index = 2; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === "--adoption-only" && !isAdoptionOnly) isAdoptionOnly = true;
    else if (argument === "--diagnose" && !hasDiagnosticFlag) hasDiagnosticFlag = true;
    else if (argument === "--path" && arguments_[index + 1] !== void 0 && !arguments_[index + 1].startsWith("--"))
      paths.push(arguments_[++index]);
    else throw new Error("Invalid gate arguments.");
  }
  if (isAdoptionOnly && paths.length > 0) throw new Error("Adoption-only does not accept paths.");
  return {
    isAdoptionOnly,
    repositoryRoot: resolve(arguments_[1]),
    paths: paths.length === 0 ? void 0 : paths
  };
};
var evaluateGate = async () => {
  const parsed = parseArguments();
  const repositoryRoot = await realpath(parsed.repositoryRoot);
  const context = { repositoryRoot: parsed.repositoryRoot, resolvedRepositoryRoot: repositoryRoot };
  const argvPaths = parsed.paths === void 0 ? void 0 : normalizeScopePathArguments(parsed.paths, context);
  if (!await hasInitializedProject(repositoryRoot)) return false;
  if (parsed.isAdoptionOnly) return true;
  const [manifest, paths] = await Promise.all([
    readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, "moldea", "moldea.yaml"),
      MAX_FOUNDATION_BYTES,
      "reject"
    ),
    argvPaths ?? readScopePathInput(process.stdin, context)
  ]);
  const result = await matchManifestScope({
    manifest: {
      content: manifest,
      path: "/moldea/moldea.yaml"
    },
    paths
  });
  if (!result.valid) throw new Error("Invalid manifest or relationship path input.");
  return result.relevant;
};
try {
  process.stdout.write(await evaluateGate() ? "1\n" : "0\n");
} catch {
  if (process.argv.slice(2).includes("--diagnose")) {
    process.stderr.write(
      "moldea gate failed: check arguments, canonical files, and relationship paths.\n"
    );
    process.exitCode = 1;
  } else process.stdout.write("0\n");
}
