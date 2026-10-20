#!/usr/bin/env node

// src/portable/repair-git/constants.ts
var REPAIR_GIT_INDEX_ARGUMENTS = ["ls-files", "-z", "--", "."];
var REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS = [
  "config",
  "--null",
  "--get",
  "attr.tree"
];
var REPAIR_GIT_INDEX_BYTES = 4194304;
var REPAIR_GIT_OUTPUT_BYTES = 262144;
var REPAIR_GIT_RESPONSE_BYTES = 65536;
var REPAIR_GIT_ATTRIBUTE_BYTES = 32768;
var REPAIR_GIT_ATTRIBUTE_PATHS = 65536;

// src/portable/repair-git/repair-git.ts
import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

// src/portable/git-command/constants.ts
var HARDENED_GIT_CONFIGURATIONS = [
  "core.attributesFile=/dev/null",
  // empty disables the monitor on every supported Git; before Git 2.36, false names a hook
  "core.fsmonitor=",
  "core.pager=cat",
  "filter.lfs.clean=",
  "filter.lfs.process=",
  "filter.lfs.required=false",
  "filter.lfs.smudge="
];
var HARDENED_GIT_DIFF_CONFIGURATION = "diff.external=";
var REMOVED_GIT_ENVIRONMENT_NAMES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_ATTR_SOURCE",
  "GIT_CONFIG",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_COUNT",
  "GIT_GLOB_PATHSPECS",
  "GIT_NOGLOB_PATHSPECS",
  "GIT_ICASE_PATHSPECS"
];
var CLI_REMOVED_GIT_ENVIRONMENT_NAMES = [
  "GIT_CEILING_DIRECTORIES",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_NAMESPACE",
  "GIT_SHALLOW_FILE",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_EXEC_PATH",
  "GIT_LITERAL_PATHSPECS"
];

// src/portable/git-command/git-command.ts
import { spawnSync } from "node:child_process";
var GitCommandError = class extends Error {
};
var createEnvironment = (repositoryRoot2, configScope) => {
  const removedNames = new Set(
    configScope === "cli" ? [...REMOVED_GIT_ENVIRONMENT_NAMES, ...CLI_REMOVED_GIT_ENVIRONMENT_NAMES] : REMOVED_GIT_ENVIRONMENT_NAMES
  );
  const environment = {};
  for (const [name, value] of Object.entries(process.env)) {
    const upperName = name.toUpperCase();
    if (removedNames.has(upperName) || /^GIT_CONFIG_(?:KEY|VALUE)_/u.test(upperName) || configScope === "cli" && upperName.startsWith("GIT_TRACE"))
      continue;
    environment[name] = value;
  }
  return {
    ...environment,
    // reads never fetch missing objects; Git without GIT_NO_LAZY_FETCH needs the empty protocol list
    GIT_ALLOW_PROTOCOL: "",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_WORK_TREE: repositoryRoot2,
    GIT_LITERAL_PATHSPECS: "1",
    ...configScope === "repository" ? { GIT_ATTR_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } : {}
  };
};
var runGitCommand = (repositoryRoot2, gitArguments, options) => {
  if (process.platform === "win32" && repositoryRoot2.length >= 260)
    throw new GitCommandError(
      "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path."
    );
  const configurations = [...HARDENED_GIT_CONFIGURATIONS];
  if (gitArguments[0] === "diff") configurations.push(HARDENED_GIT_DIFF_CONFIGURATION);
  const result = spawnSync(
    "git",
    [...configurations.flatMap((setting) => ["-c", setting]), "--no-pager", ...gitArguments],
    {
      cwd: repositoryRoot2,
      encoding: "buffer",
      env: createEnvironment(repositoryRoot2, options.configScope),
      maxBuffer: options.maxOutputBytes,
      timeout: 3e4,
      windowsHide: true
    }
  );
  if (result.error && "code" in result.error && result.error.code === "ENOBUFS")
    throw new RangeError("Git output exceeds its bounded capture limit.");
  const acceptedExitCodes = options.acceptedExitCodes ?? [0];
  if (result.error || result.status === null || !acceptedExitCodes.includes(result.status)) {
    const firstErrorLine = (result.stderr?.subarray(0, 512).toString("utf8") || result.error?.message || "").split(/[\r\n]/u, 1)[0].replace(/[\p{Cc}]/gu, " ").trim();
    throw new GitCommandError(
      `The bounded Git read failed or exceeded its limit.${firstErrorLine ? ` ${firstErrorLine}` : ""}`,
      { cause: result.error }
    );
  }
  return { status: result.status, stdout: result.stdout };
};

// src/portable/repair-git/repair-git.ts
import { isPathWithin, readRepositoryFile } from "./repository-files.mjs";
var OBJECT_ID_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
var validateEvidencePath = (path) => {
  if (path.length === 0 || isAbsolute(path) || /^[a-z]:/iu.test(path) || path.includes("\0") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Git returned unsupported repository path evidence.");
  }
  return path;
};
var validatePath = (path) => {
  validateEvidencePath(path);
  if (/[\\\p{Cc}]/u.test(path))
    throw new Error("Written-file review path is excluded or unsupported.");
  return path;
};
var readGit = (repositoryRoot2, arguments_2) => {
  const isAttributeSourceRead = arguments_2.length === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS.length && arguments_2.every(
    (argument, index) => argument === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS[index]
  );
  const { status, stdout } = runGitCommand(repositoryRoot2, arguments_2, {
    configScope: "repository",
    maxOutputBytes: arguments_2[0] === "ls-files" ? REPAIR_GIT_INDEX_BYTES : REPAIR_GIT_OUTPUT_BYTES,
    // an unset attribute source exits with 1, which means there is none
    ...isAttributeSourceRead ? { acceptedExitCodes: [0, 1] } : {}
  });
  return status === 1 ? Buffer.alloc(0) : stdout;
};
var readPaths = (bytes) => {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text).equals(bytes) || text !== "" && !text.endsWith("\0")) {
    throw new Error("Git returned incomplete or unsupported path evidence.");
  }
  return text.split("\0").filter(Boolean).map(validateEvidencePath);
};
var assertAttributeSafety = async (repositoryRoot2) => {
  const gitPath = join(repositoryRoot2, ".git");
  const gitStat = await lstat(gitPath);
  let gitDirectory = gitPath;
  if (gitStat.isFile()) {
    const declaration = (await readRepositoryFile(repositoryRoot2, gitPath, REPAIR_GIT_ATTRIBUTE_BYTES, "reject")).toString("utf8");
    const match = /^gitdir: ([^\0\r\n]+)\r?\n?$/u.exec(declaration);
    if (!match) throw new Error("Git directory evidence is invalid.");
    gitDirectory = resolve(repositoryRoot2, match[1]);
  } else if (!gitStat.isDirectory()) {
    throw new Error("Git directory safety is unavailable for this repository.");
  }
  if (await realpath(gitDirectory) !== gitDirectory)
    throw new Error("Git metadata directory safety is unavailable.");
  let commonDirectory = gitDirectory;
  try {
    const declaration = (await readRepositoryFile(
      gitDirectory,
      join(gitDirectory, "commondir"),
      REPAIR_GIT_ATTRIBUTE_BYTES,
      "reject"
    )).toString("utf8").trim();
    if (!declaration || /[\0\r\n]/u.test(declaration))
      throw new Error("Git common directory evidence is invalid.");
    commonDirectory = resolve(gitDirectory, declaration);
    if (await realpath(commonDirectory) !== commonDirectory)
      throw new Error("Git common directory safety is unavailable.");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (!(await lstat(commonDirectory)).isDirectory())
    throw new Error("Git common directory safety is unavailable.");
  if (readGit(repositoryRoot2, REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS).length > 0)
    throw new Error("Stored Git attribute sources cannot be verified safely.");
  const paths = readPaths(readGit(repositoryRoot2, REPAIR_GIT_INDEX_ARGUMENTS));
  const attributes = /* @__PURE__ */ new Set([join(repositoryRoot2, ".gitattributes")]);
  for (const path of paths) {
    if (path.split("/").at(-1) === ".gitattributes") {
      const attributePath = join(repositoryRoot2, path);
      if (!(await lstat(attributePath)).isFile())
        throw new Error("Git attribute fallback is unverified.");
    }
    let directory = dirname(join(repositoryRoot2, path));
    while (directory !== repositoryRoot2) {
      if (!isPathWithin(repositoryRoot2, directory))
        throw new Error("Git attribute path escapes the repository.");
      const attribute = join(directory, ".gitattributes");
      if (attributes.has(attribute)) break;
      attributes.add(attribute);
      if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS)
        throw new RangeError("Git attribute inspection exceeds its path limit.");
      directory = dirname(directory);
    }
  }
  const infoAttributes = join(commonDirectory, "info", "attributes");
  attributes.add(infoAttributes);
  if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS)
    throw new RangeError("Git attribute inspection exceeds its path limit.");
  let totalBytes = 0;
  for (const path of attributes) {
    let bytes;
    try {
      bytes = await readRepositoryFile(
        path === infoAttributes ? commonDirectory : repositoryRoot2,
        path,
        REPAIR_GIT_ATTRIBUTE_BYTES,
        "reject"
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    totalBytes += bytes.length;
    if (totalBytes > REPAIR_GIT_OUTPUT_BYTES)
      throw new RangeError("Git attribute inspection exceeds its aggregate byte limit.");
    if (bytes.includes(Buffer.from("filter"))) {
      throw new Error(
        "Repository attribute safety is unavailable; no worktree Git read was performed."
      );
    }
  }
};
var readStatus = (bytes) => {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text).equals(bytes) || !text.endsWith("\0"))
    throw new Error("Git status evidence is incomplete.");
  const records = text.split("\0").slice(0, -1);
  let commit = null;
  const paths = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.startsWith("# branch.oid ")) {
      const oid = record.slice("# branch.oid ".length);
      if (!OBJECT_ID_PATTERN.test(oid)) {
        if (oid === "(initial)") return { commit: "", paths: [] };
        throw new Error("The checkpoint commit is unavailable.");
      }
      if (commit !== null) throw new Error("Git returned multiple commit identities.");
      commit = oid;
    } else if (record.startsWith("# ")) {
      continue;
    } else if (record.startsWith("? ")) {
      paths.push(validateEvidencePath(record.slice(2).replace(/\/$/u, "")));
    } else {
      const fields = record[0] === "1" ? 7 : record[0] === "2" ? 8 : record[0] === "u" ? 9 : null;
      const match = fields === null ? null : new RegExp(`^[12u](?: [^ ]+){${fields}} (.+)$`, "su").exec(record);
      if (match === null) throw new Error("Git returned unsupported status evidence.");
      paths.push(validateEvidencePath(match[1]));
      if (record[0] === "2") paths.push(validateEvidencePath(records[++index] ?? ""));
    }
  }
  if (commit === null) throw new Error("The checkpoint commit is unavailable.");
  return { commit, paths: [...new Set(paths)].sort() };
};
var collectRepairGitEvidence = async (options) => {
  let reasonCode = "arguments";
  try {
    if (!isAbsolute(options.repositoryRoot))
      throw new Error("An absolute repository root is required.");
    const repositoryRoot2 = await realpath(resolve(options.repositoryRoot));
    if (!(await lstat(repositoryRoot2)).isDirectory())
      throw new Error("A repository directory is required.");
    if (["continue", "verify"].includes(options.mode) && !OBJECT_ID_PATTERN.test(options.checkpoint ?? "")) {
      throw new Error("Continuation requires the supplied full checkpoint object ID.");
    }
    if (!["checkpoint", "continue", "review", "verify"].includes(options.mode))
      throw new Error("Unsupported repair Git operation.");
    const paths = (options.paths ?? []).map(validatePath);
    if (options.mode === "review" !== paths.length > 0)
      throw new Error("Only written-file review accepts literal paths.");
    for (const path of paths) {
      if (!isPathWithin(repositoryRoot2, resolve(repositoryRoot2, path)))
        throw new Error("Written-file review path escapes the repository.");
      let directory = repositoryRoot2;
      for (const component of path.split("/").slice(0, -1)) {
        directory = join(directory, component);
        try {
          if (!(await lstat(directory)).isDirectory())
            throw new Error("Written-file review cannot follow directory links.");
        } catch (error) {
          if (error instanceof Error && "code" in error && error.code === "ENOENT") break;
          throw error;
        }
      }
      try {
        const stat = await lstat(join(repositoryRoot2, path));
        if (!stat.isFile())
          throw new Error("Written-file review requires regular files or deleted paths.");
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
    }
    reasonCode = "attribute-safety";
    await assertAttributeSafety(repositoryRoot2);
    reasonCode = "git-read";
    if (options.mode === "verify" || options.mode === "continue") {
      if (readGit(repositoryRoot2, ["cat-file", "-t", options.checkpoint]).toString("utf8").trim() !== "commit")
        throw new Error("The supplied checkpoint does not name a commit object.");
      if (options.mode === "verify")
        return {
          kind: "moldea-repair-git",
          mode: "verify",
          status: "available",
          commit: options.checkpoint,
          uncommittedPaths: [],
          changedPaths: [],
          manifestDiff: "",
          uncommittedManifestDiff: "",
          writtenDiff: ""
        };
    }
    const status = readStatus(
      readGit(repositoryRoot2, [
        "status",
        "--porcelain=v2",
        "-z",
        "--ignore-submodules=all",
        "--untracked-files=all",
        "--branch"
      ])
    );
    if (!status.commit)
      return {
        kind: "moldea-repair-git",
        mode: options.mode,
        status: "unavailable",
        reasonCode: "commit-unavailable",
        reason: "The checkpoint commit is unavailable in an unborn repository; reassess every completed owner."
      };
    const diffPrefix = ["diff", "--no-ext-diff", "--no-textconv", "--ignore-submodules=all"];
    const uncommittedManifestDiff = options.mode === "review" ? "" : readGit(repositoryRoot2, [
      ...diffPrefix,
      status.commit,
      "--",
      "moldea/moldea.yaml"
    ]).toString("utf8");
    const changedPaths = options.mode === "continue" ? readPaths(
      readGit(repositoryRoot2, [
        ...diffPrefix,
        "--name-only",
        "--no-renames",
        "-z",
        options.checkpoint,
        "--",
        "."
      ])
    ) : [];
    const evidence = {
      kind: "moldea-repair-git",
      mode: options.mode,
      status: "available",
      commit: status.commit,
      uncommittedPaths: status.paths,
      changedPaths: [.../* @__PURE__ */ new Set([...changedPaths, ...status.paths])].sort(),
      manifestDiff: options.mode === "continue" ? readGit(repositoryRoot2, [
        ...diffPrefix,
        options.checkpoint,
        "--",
        "moldea/moldea.yaml"
      ]).toString("utf8") : "",
      uncommittedManifestDiff,
      writtenDiff: options.mode === "review" ? readGit(repositoryRoot2, [...diffPrefix, "--", ...paths]).toString("utf8") : ""
    };
    if (Buffer.byteLength(JSON.stringify(evidence)) > REPAIR_GIT_RESPONSE_BYTES - 1) {
      reasonCode = "output-limit";
      throw new Error("Repair Git evidence exceeds the bounded response limit.");
    }
    return evidence;
  } catch (error) {
    if (error instanceof RangeError) reasonCode = "output-limit";
    if (error instanceof GitCommandError) reasonCode = "git-read";
    const reason = error instanceof Error ? error.message : "Repair Git evidence is unavailable.";
    return {
      kind: "moldea-repair-git",
      mode: options.mode,
      status: "unavailable",
      reasonCode,
      reason: reason.slice(0, 512)
    };
  }
};

// src/portable/repair-git/entry.ts
var arguments_ = process.argv.slice(2);
var [repositoryFlag, repositoryRoot, separator, mode, ...remaining] = arguments_;
if (repositoryFlag !== "--repository" || !repositoryRoot || separator !== "--" || !["checkpoint", "continue", "review", "verify"].includes(mode ?? "") || mode === "checkpoint" && remaining.length !== 0 || ["continue", "verify"].includes(mode ?? "") && (remaining.length !== 2 || remaining[0] !== "--checkpoint") || mode === "review" && (remaining.length === 0 || remaining.length % 2 !== 0 || remaining.some((part, index) => index % 2 === 0 && part !== "--path"))) {
  process.stderr.write(
    "Usage: repair-git --repository <absolute-root> -- checkpoint | continue --checkpoint <full-oid> | verify --checkpoint <full-oid> | review --path <written-file> [--path <written-file>]\n"
  );
  process.exitCode = 2;
} else {
  const evidence = await collectRepairGitEvidence({
    repositoryRoot,
    mode,
    ...["continue", "verify"].includes(mode ?? "") ? { checkpoint: remaining[1] } : {},
    ...mode === "review" ? { paths: remaining.filter((_, index) => index % 2 === 1) } : {}
  });
  process.stdout.write(`${JSON.stringify(evidence)}
`);
  if (evidence.status === "unavailable") process.exitCode = 1;
}
