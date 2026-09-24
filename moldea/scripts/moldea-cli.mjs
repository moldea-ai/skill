#!/usr/bin/env node

// src/portable/moldea-cli.ts
import { spawn } from "node:child_process";
import { isAbsolute } from "node:path";
import { resolveRepositoryCli } from "./repository-package.mjs";
var MINIMUM_OUTPUT_BYTES = 4096;
var MAXIMUM_OUTPUT_BYTES = 1048576;
var MAXIMUM_STDERR_BYTES = 32768;
var MAXIMUM_CURSOR_BYTES = 8192;
var DEFAULT_COMPOSITION_OUTPUT_BYTES = 65536;
var PROCESS_TERMINATION_GRACE_PERIOD_MS = 5e3;
var VALUE_OPTIONS = /* @__PURE__ */ new Set(["--cursor", "--max-output-bytes", "--path"]);
var COMMAND_CONTRACTS = Object.freeze({
  composition: {
    allowedFlags: /* @__PURE__ */ new Set(["--json"]),
    allowedValues: /* @__PURE__ */ new Set(),
    requiresOutputBudget: false
  },
  content: {
    allowedFlags: /* @__PURE__ */ new Set(["--json"]),
    allowedValues: /* @__PURE__ */ new Set(["--cursor", "--max-output-bytes", "--path"]),
    requiresOutputBudget: true
  },
  inspect: {
    allowedFlags: /* @__PURE__ */ new Set(["--json"]),
    allowedValues: /* @__PURE__ */ new Set(["--cursor", "--max-output-bytes"]),
    requiresOutputBudget: true
  },
  scope: {
    allowedFlags: /* @__PURE__ */ new Set(["--json", "--paths-stdin"]),
    allowedValues: /* @__PURE__ */ new Set(["--cursor", "--max-output-bytes", "--path"]),
    requiresOutputBudget: true
  },
  validate: {
    allowedFlags: /* @__PURE__ */ new Set(["--json"]),
    allowedValues: /* @__PURE__ */ new Set(["--cursor", "--max-output-bytes"]),
    requiresOutputBudget: true
  }
});
var isLauncherCommand = (command) => command !== void 0 && Object.hasOwn(COMMAND_CONTRACTS, command);
var parseArguments = () => {
  const arguments_ = process.argv.slice(2);
  const repositoryRoot = arguments_[1];
  if (arguments_.length < 5 || arguments_[0] !== "--repository" || repositoryRoot === void 0 || !isAbsolute(repositoryRoot) || arguments_[2] !== "--") {
    throw new Error("Usage: moldea-cli --repository <absolute-path> -- <command> [arguments].");
  }
  const command = arguments_[3];
  if (!isLauncherCommand(command)) {
    throw new Error("The requested moldea command is not supported by this launcher.");
  }
  const contract = COMMAND_CONTRACTS[command];
  const commandArguments = arguments_.slice(4);
  const values = /* @__PURE__ */ new Map();
  const flags = /* @__PURE__ */ new Set();
  for (let index = 0; index < commandArguments.length; index += 1) {
    const argument = commandArguments[index];
    if (argument !== void 0 && VALUE_OPTIONS.has(argument)) {
      if (!contract.allowedValues.has(argument) || values.has(argument)) {
        throw new Error(`Unsupported or duplicate launcher option: ${argument}.`);
      }
      const optionValue = commandArguments[index + 1];
      if (optionValue === void 0 || optionValue === "" || optionValue.startsWith("--")) {
        throw new Error(`Launcher option ${argument} requires one value.`);
      }
      values.set(argument, optionValue);
      index += 1;
      continue;
    }
    if (argument === void 0 || !contract.allowedFlags.has(argument) || flags.has(argument)) {
      throw new Error(`Unsupported or duplicate launcher option: ${argument}.`);
    }
    flags.add(argument);
  }
  if (!flags.has("--json")) {
    throw new Error("The launcher requires machine-readable JSON output.");
  }
  const outputBudgetValue = values.get("--max-output-bytes");
  const outputByteLimit = contract.requiresOutputBudget ? Number(outputBudgetValue) : DEFAULT_COMPOSITION_OUTPUT_BYTES;
  if (contract.requiresOutputBudget && (outputBudgetValue === void 0 || !/^\d+$/u.test(outputBudgetValue) || !Number.isSafeInteger(outputByteLimit) || outputByteLimit < MINIMUM_OUTPUT_BYTES || outputByteLimit > MAXIMUM_OUTPUT_BYTES)) {
    throw new Error(
      `The launcher output budget must be between ${MINIMUM_OUTPUT_BYTES} and ${MAXIMUM_OUTPUT_BYTES} bytes.`
    );
  }
  const cursor = values.get("--cursor");
  if (cursor !== void 0 && Buffer.byteLength(cursor, "utf8") > MAXIMUM_CURSOR_BYTES) {
    throw new Error("The launcher cursor exceeds its byte limit.");
  }
  const logicalPath = values.get("--path");
  if (logicalPath !== void 0 && (!logicalPath.startsWith("/") || logicalPath.includes("\\") || logicalPath.includes("\0"))) {
    throw new Error("The launcher requires one canonical repository-logical path.");
  }
  if (command === "content" && logicalPath === void 0) {
    throw new Error("The content command requires --path.");
  }
  if (command === "scope" && Number(flags.has("--paths-stdin")) + Number(logicalPath !== void 0) !== 1) {
    throw new Error("The scope command requires exactly one of --path or --paths-stdin.");
  }
  return { command, commandArguments, outputByteLimit, repositoryRoot };
};
var runCli = async () => {
  const parsed = parseArguments();
  const resolvedCli = await resolveRepositoryCli(parsed.repositoryRoot);
  const cliArguments = parsed.command === "composition" ? [parsed.command, ...parsed.commandArguments] : [parsed.command, "--repository", resolvedCli.repositoryRoot, ...parsed.commandArguments];
  const child = spawn(process.execPath, [resolvedCli.cliBinaryPath, ...cliArguments], {
    cwd: resolvedCli.repositoryRoot,
    env: process.env,
    shell: false,
    stdio: ["inherit", "pipe", "pipe"]
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutByteCount = 0;
  let stderrByteCount = 0;
  let outputLimitExceeded = false;
  let cancellationSignal;
  let hasChildClosed = false;
  let forcedTerminationTimer;
  const requestTermination = (signal) => {
    if (hasChildClosed) return;
    child.kill(signal);
    forcedTerminationTimer ??= setTimeout(() => {
      if (!hasChildClosed) child.kill("SIGKILL");
    }, PROCESS_TERMINATION_GRACE_PERIOD_MS);
  };
  const terminateForLimit = () => {
    if (!outputLimitExceeded) {
      outputLimitExceeded = true;
      requestTermination("SIGTERM");
    }
  };
  child.stdout.on("data", (chunk) => {
    stdoutByteCount += chunk.byteLength;
    if (stdoutByteCount > parsed.outputByteLimit) terminateForLimit();
    else stdoutChunks.push(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrByteCount += chunk.byteLength;
    if (stderrByteCount > MAXIMUM_STDERR_BYTES) terminateForLimit();
    else stderrChunks.push(chunk);
  });
  const cancelInvocation = (signal) => {
    cancellationSignal ??= signal;
    requestTermination(signal);
  };
  const relayInterrupt = () => cancelInvocation("SIGINT");
  const relayTermination = () => cancelInvocation("SIGTERM");
  process.once("SIGINT", relayInterrupt);
  process.once("SIGTERM", relayTermination);
  const completion = await new Promise((resolveCompletion, rejectCompletion) => {
    child.once("error", rejectCompletion);
    child.once("close", (exitCode, signal) => {
      hasChildClosed = true;
      resolveCompletion({ exitCode, signal });
    });
  }).finally(() => {
    clearTimeout(forcedTerminationTimer);
    process.removeListener("SIGINT", relayInterrupt);
    process.removeListener("SIGTERM", relayTermination);
  });
  if (outputLimitExceeded) {
    process.stderr.write("moldea CLI output exceeded the launcher boundary.\n");
    process.exitCode = 3;
    return;
  }
  const terminationSignal = cancellationSignal ?? completion.signal;
  if (terminationSignal !== null) {
    process.stderr.write(Buffer.concat(stderrChunks, stderrByteCount));
    process.stderr.write(`moldea CLI terminated by ${terminationSignal}.
`);
    process.exitCode = 3;
    return;
  }
  process.stdout.write(Buffer.concat(stdoutChunks, stdoutByteCount));
  process.stderr.write(Buffer.concat(stderrChunks, stderrByteCount));
  process.exitCode = completion.exitCode ?? 3;
};
try {
  await runCli();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "moldea CLI launcher failed."}
`
  );
  process.exitCode = 3;
}
