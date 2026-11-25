import { t as __commonJSMin } from "./chunk-2ba7e89e.mjs";
import { f as Exception, p as getErrorCode, s as stringifyJsonDeterministically } from "./chunk-728df961.mjs";
import { m as takeWithinByteBudget, n as SUPPORTED_REPOSITORY_FORMAT_VERSIONS, p as deepFreeze } from "./chunk-a5514957.mjs";
import { execFile, spawn } from "node:child_process";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import { createHash, timingSafeEqual } from "node:crypto";
import { stat } from "node:fs/promises";
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/shared/constants.js
var DEFAULT_MAX_OUTPUT_BYTES = 1048576;
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/shared/errors.js
var ERRORS$2 = {
	PROCESS_START_FAILED: "PROCESS_START_FAILED",
	PROCESS_TIMED_OUT: "PROCESS_TIMED_OUT",
	PROCESS_OUTPUT_TOO_LARGE: "PROCESS_OUTPUT_TOO_LARGE",
	PROCESS_TREE_SURVIVED: "PROCESS_TREE_SURVIVED",
	INVALID_PORT: "INVALID_PORT",
	PORT_RESERVATION_FAILED: "PORT_RESERVATION_FAILED",
	UNSUPPORTED_PACKAGE_MANAGER: "UNSUPPORTED_PACKAGE_MANAGER",
	PACKAGE_MANAGER_NOT_FOUND: "PACKAGE_MANAGER_NOT_FOUND",
	INVALID_READINESS_OPTIONS: "INVALID_READINESS_OPTIONS",
	PROCESS_NOT_READY: "PROCESS_NOT_READY",
	PROCESS_EXITED_BEFORE_READY: "PROCESS_EXITED_BEFORE_READY",
	PROCESS_INTERRUPTED: "PROCESS_INTERRUPTED",
	INVALID_SIGNAL: "INVALID_SIGNAL",
	INVALID_PROCESS_OPTIONS: "INVALID_PROCESS_OPTIONS",
	INVALID_PROCESS_ID: "INVALID_PROCESS_ID",
	INVALID_ARGUMENTS: "INVALID_ARGUMENTS",
	STDIN_TOO_LARGE: "STDIN_TOO_LARGE"
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/process-tree/constants.js
var WINDOWS_PROCESS_LIST_COMMAND = "Get-CimInstance -ClassName Win32_Process | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.ParentProcessId, $(if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc() } else { 0 }) }";
var WINDOWS_PROCESS_LINE_PATTERN = /^(\d+) (\d+) (\d+)$/u;
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/process-tree/utilities.js
var hasExited = (child) => child.exitCode !== null || child.signalCode !== null;
var waitFor = async (condition, milliseconds) => {
	const deadline = Date.now() + milliseconds;
	while (!condition()) {
		if (Date.now() >= deadline) return false;
		await setTimeout$1(50);
	}
	return true;
};
var treeSurvived = (pid) => new Exception(`The process tree of pid ${pid} is still running after it was force-stopped.`, { code: ERRORS$2.PROCESS_TREE_SURVIVED });
var parseWindowsProcessList = (output) => output.split(/\r?\n/u).flatMap((line) => {
	const match = WINDOWS_PROCESS_LINE_PATTERN.exec(line.trim());
	if (match === null) return [];
	const [, pid = "", parentPid = "", createdAt = ""] = match;
	return [{
		pid: Number(pid),
		parentPid: Number(parentPid),
		createdAt: BigInt(createdAt)
	}];
});
var findWindowsDescendants = (processes, pid) => {
	const childrenByParent = new Map();
	for (const entry of processes) {
		const siblings = childrenByParent.get(entry.parentPid);
		if (siblings === void 0) childrenByParent.set(entry.parentPid, [entry]);
		else siblings.push(entry);
	}
	const root = processes.find((entry) => entry.pid === pid);
	if (root === void 0) return [];
	const tree = [root];
	const seen = new Set([pid]);
	for (const parent of tree) for (const entry of childrenByParent.get(parent.pid) ?? []) if (!seen.has(entry.pid) && entry.createdAt >= parent.createdAt) {
		seen.add(entry.pid);
		tree.push(entry);
	}
	return tree.slice(1).map((entry) => entry.pid);
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/process-tree/stop-windows-tree.js
var listWindowsDescendants = (pid) => new Promise((resolve) => {
	execFile("powershell.exe", [
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		WINDOWS_PROCESS_LIST_COMMAND
	], {
		timeout: 1e4,
		windowsHide: true
	}, (error, stdout) => {
		resolve(error === null ? findWindowsDescendants(parseWindowsProcessList(stdout), pid) : []);
	});
});
var isOwnProcessRunning = (pid) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};
var stopWindowsTree = async (child, pid) => {
	if (hasExited(child)) return;
	const descendants = new Set(await listWindowsDescendants(pid));
	if (hasExited(child)) return;
	await new Promise((resolve) => {
		execFile("taskkill", [
			"/PID",
			String(pid),
			"/T",
			"/F"
		], {
			timeout: 1e4,
			windowsHide: true
		}, () => resolve());
	});
	const isStopped = () => {
		for (const descendant of descendants) if (!isOwnProcessRunning(descendant)) descendants.delete(descendant);
		return hasExited(child) && descendants.size === 0;
	};
	if (!await waitFor(isStopped, 1e4)) throw treeSurvived(pid);
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/process-tree/process-tree.js
var IS_WINDOWS = process.platform === "win32";
var exists = (target) => {
	try {
		process.kill(target, 0);
		return true;
	} catch (error) {
		return error.code === "EPERM";
	}
};
var sendSignal = (target, signal) => {
	try {
		process.kill(target, signal);
		return true;
	} catch {
		return false;
	}
};
var isTreeStopped = (child, pid) => hasExited(child) && !exists(-pid);
var signalTree = (child, pid, signal) => {
	if (!sendSignal(-pid, signal) && !hasExited(child)) sendSignal(pid, signal);
};
var stopPosixTree = async (child, pid, gracePeriodSeconds) => {
	const isStopped = () => isTreeStopped(child, pid);
	if (isStopped()) return;
	signalTree(child, pid, "SIGTERM");
	if (await waitFor(isStopped, gracePeriodSeconds * 1e3)) return;
	signalTree(child, pid, "SIGKILL");
	if (await waitFor(isStopped, 2e3)) return;
	throw treeSurvived(pid);
};
var stopProcessTree = async (child, gracePeriodSeconds = 5) => {
	const { pid } = child;
	if (pid === void 0) return;
	if (IS_WINDOWS) {
		await stopWindowsTree(child, pid);
		return;
	}
	await stopPosixTree(child, pid, gracePeriodSeconds);
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/run-process/constants.js
var IGNORED_STDIN_ERROR_CODES = [
	"EPIPE",
	"EOF",
	"ERR_STREAM_DESTROYED"
];
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/run-process/run-process.js
var startFailed = (command, cause) => new Exception(`Unable to start '${command}'.`, {
	code: ERRORS$2.PROCESS_START_FAILED,
	cause
});
var outputTooLarge = (command, maxOutputBytes) => new Exception(`The process '${command}' wrote more than ${maxOutputBytes} bytes of output.`, { code: ERRORS$2.PROCESS_OUTPUT_TOO_LARGE });
var validateLimits = (timeoutSeconds, maxOutputBytes) => {
	if (!(timeoutSeconds === void 0 || typeof timeoutSeconds === "number" && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 && timeoutSeconds <= 2147483) || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) throw new Exception("The timeout must be a positive number of at most 2,147,483 seconds, and the output limit a positive safe integer.", {
		code: ERRORS$2.INVALID_PROCESS_OPTIONS,
		data: {
			timeoutSeconds: String(timeoutSeconds),
			maxOutputBytes: String(maxOutputBytes)
		}
	});
};
var decodeOutput = (chunks, encoding) => {
	const output = Buffer.concat(chunks);
	return encoding === "buffer" ? output : output.toString("utf-8");
};
var destroyStdio = (child) => {
	child.stdin?.destroy();
	child.stdout?.destroy();
	child.stderr?.destroy();
};
var waitForClose = (child, isClosed, milliseconds) => new Promise((resolve) => {
	if (isClosed()) {
		resolve(true);
		return;
	}
	const onClose = () => {
		clearTimeout(timer);
		resolve(true);
	};
	const timer = setTimeout(() => {
		child.off("close", onClose);
		resolve(false);
	}, milliseconds);
	child.once("close", onClose);
});
var stopTree = async (child) => {
	try {
		await stopProcessTree(child);
	} catch (error) {
		destroyStdio(child);
		throw error;
	}
};
var runProcess = async (options) => {
	const { command, args, cwd, env, input, timeoutSeconds, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES, signal, encoding = "utf-8" } = options;
	validateLimits(timeoutSeconds, maxOutputBytes);
	signal?.throwIfAborted();
	const startedAt = performance.now();
	const child = spawn(command, args, {
		cwd,
		env,
		stdio: "pipe",
		detached: process.platform !== "win32",
		windowsHide: true
	});
	const stdout = [];
	const stderr = [];
	let outputBytes = 0;
	let isClosed = false;
	child.once("close", () => {
		isClosed = true;
	});
	const outcome = await new Promise((resolve) => {
		let timer;
		const onAbort = () => {
			clearTimeout(timer);
			resolve({
				kind: "failed",
				error: signal?.reason
			});
		};
		const settle = (value) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			resolve(value);
		};
		const collect = (chunks) => (chunk) => {
			outputBytes += chunk.length;
			if (outputBytes > maxOutputBytes) {
				settle({
					kind: "failed",
					error: outputTooLarge(command, maxOutputBytes)
				});
				return;
			}
			chunks.push(chunk);
		};
		child.stdout.on("data", collect(stdout));
		child.stderr.on("data", collect(stderr));
		child.stdout.on("error", () => void 0);
		child.stderr.on("error", () => void 0);
		child.on("error", (error) => settle({
			kind: "failed",
			error: startFailed(command, error)
		}));
		child.once("exit", (exitCode, signalCode) => settle({
			kind: "exited",
			exitCode,
			signalCode
		}));
		child.stdin.on("error", (error) => {
			if (!IGNORED_STDIN_ERROR_CODES.includes(error.code ?? "")) settle({
				kind: "failed",
				error: startFailed(command, error)
			});
		});
		if (timeoutSeconds !== void 0) timer = setTimeout(() => settle({
			kind: "failed",
			error: new Exception(`The process '${command}' didn't finish within ${timeoutSeconds} seconds.`, { code: ERRORS$2.PROCESS_TIMED_OUT })
		}), timeoutSeconds * 1e3);
		signal?.addEventListener("abort", onAbort, { once: true });
		child.stdin.end(input);
	});
	if (outcome.kind === "failed") {
		await stopTree(child);
		destroyStdio(child);
		throw outcome.error;
	}
	await stopTree(child);
	if (!await waitForClose(child, () => isClosed, 5e3)) {
		destroyStdio(child);
		throw new Exception(`A process started by '${command}' kept its output open after it exited.`, { code: ERRORS$2.PROCESS_TREE_SURVIVED });
	}
	if (outputBytes > maxOutputBytes) throw outputTooLarge(command, maxOutputBytes);
	return {
		exitCode: outcome.exitCode,
		signalCode: outcome.signalCode,
		stdout: decodeOutput(stdout, encoding),
		stderr: decodeOutput(stderr, encoding),
		durationMs: Math.round(performance.now() - startedAt)
	};
};
//#endregion
//#region src/command-line/constants.ts
var MOLDEA_CLI_COMMANDS = {
	Composition: "composition",
	Content: "content",
	Inspect: "inspect",
	Scope: "scope",
	Validate: "validate"
};
var MOLDEA_CLI_OPTIONS = {
	Help: "--help",
	Json: "--json",
	Cursor: "--cursor",
	MaxDiagnostics: "--max-diagnostics",
	MaxEntries: "--max-entries",
	MaxCoverage: "--max-coverage",
	MaxFileBytes: "--max-file-bytes",
	MaxManifestBytes: "--max-manifest-bytes",
	MaxOutputBytes: "--max-output-bytes",
	MaxTotalBytes: "--max-total-bytes",
	NoColor: "--no-color",
	Path: "--path",
	PathsStdin: "--paths-stdin",
	Repository: "--repository",
	Version: "--version"
};
var DEFAULT_MOLDEA_CLI_RESOURCE_LIMITS = Object.freeze({
	maxDiagnostics: 1e4,
	maxEntries: 1e5,
	maxCoverage: 1e4,
	maxFileBytes: 8388608,
	maxManifestBytes: 2097152,
	maxTotalBytes: 134217728
});
var MOLDEA_CLI_DEFAULT_OUTPUT_BYTES = 65536;
//#endregion
//#region src/output-page/exception.ts
var MoldeaCliOutputPageException = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "MoldeaCliOutputPageException";
	}
};
//#endregion
//#region ../../node_modules/.pnpm/jg-crypto@0.3.0/node_modules/jg-crypto/dist/shared/errors.js
var ERRORS$1 = {
	UNSUPPORTED_HASH_ALGORITHM: "UNSUPPORTED_HASH_ALGORITHM",
	INVALID_BYTE_LENGTH: "INVALID_BYTE_LENGTH",
	UNSUPPORTED_ENCODING: "UNSUPPORTED_ENCODING",
	INVALID_DIGIT_COUNT: "INVALID_DIGIT_COUNT",
	INVALID_HMAC_SECRET: "INVALID_HMAC_SECRET",
	INVALID_HMAC_DOMAIN: "INVALID_HMAC_DOMAIN",
	INVALID_TOTP_SECRET: "INVALID_TOTP_SECRET",
	TOTP_INVALID: "TOTP_INVALID",
	TOTP_ALREADY_USED: "TOTP_ALREADY_USED"
};
//#endregion
//#region ../../node_modules/.pnpm/jg-crypto@0.3.0/node_modules/jg-crypto/dist/hashing/hashing.js
var HASH_ALGORITHMS = [
	"sha256",
	"sha384",
	"sha512"
];
var hashValue = (value, algorithm = "sha256") => {
	if (!HASH_ALGORITHMS.includes(algorithm)) throw new Exception("The hash algorithm must be sha256, sha384, or sha512.", {
		code: ERRORS$1.UNSUPPORTED_HASH_ALGORITHM,
		data: { algorithm: String(algorithm) }
	});
	return createHash(algorithm).update(value).digest("hex");
};
//#endregion
//#region src/output-page/cursor.ts
var SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
var BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
var CURSOR_DOCUMENT_KEYS = Object.freeze([
	"checksum",
	"command",
	"filtersDigest",
	"lastKey",
	"snapshotDigest",
	"sourceCursor",
	"version"
]);
var calculateMoldeaCliJsonDigest = (value) => {
	return `sha256:${hashValue(stringifyJsonDeterministically(value, { strict: true }))}`;
};
var calculateCursorChecksum = (payload) => {
	return calculateMoldeaCliJsonDigest(payload);
};
var areChecksumsEqual = (left, right) => {
	const leftBytes = Buffer.from(left, "utf8");
	const rightBytes = Buffer.from(right, "utf8");
	return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};
var isCursorDocument = (value) => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const record = value;
	const keys = Object.keys(record).sort();
	return keys.length === CURSOR_DOCUMENT_KEYS.length && keys.every((key, index) => key === CURSOR_DOCUMENT_KEYS[index]) && record["version"] === 2 && (record["command"] === "content" || record["command"] === "inspect" || record["command"] === "scope" || record["command"] === "validate") && typeof record["filtersDigest"] === "string" && SHA256_PATTERN.test(record["filtersDigest"]) && typeof record["lastKey"] === "string" && record["lastKey"].length > 0 && (record["sourceCursor"] === null || typeof record["sourceCursor"] === "string") && typeof record["snapshotDigest"] === "string" && SHA256_PATTERN.test(record["snapshotDigest"]) && typeof record["checksum"] === "string" && SHA256_PATTERN.test(record["checksum"]);
};
var encodeMoldeaCliCursor = (command, filters, snapshotDigest, lastKey, sourceCursor = null) => {
	const payload = {
		command,
		filtersDigest: calculateMoldeaCliJsonDigest(filters),
		lastKey,
		sourceCursor,
		snapshotDigest,
		version: 2
	};
	const document = {
		...payload,
		checksum: calculateCursorChecksum(payload)
	};
	return Buffer.from(stringifyJsonDeterministically(document, { strict: true }), "utf8").toString("base64url");
};
var decodeMoldeaCliCursor = (input) => {
	let decoded;
	try {
		if (!BASE64URL_PATTERN.test(input.cursor)) throw new TypeError("The cursor is not canonical base64url.");
		const bytes = Buffer.from(input.cursor, "base64url");
		if (bytes.toString("base64url") !== input.cursor) throw new TypeError("The cursor is not canonical base64url.");
		const text = bytes.toString("utf8");
		decoded = JSON.parse(text);
	} catch {
		throw new MoldeaCliOutputPageException("CURSOR_INVALID");
	}
	if (!isCursorDocument(decoded)) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
	const { checksum, ...payload } = decoded;
	if (!areChecksumsEqual(checksum, calculateCursorChecksum(payload)) || decoded.command !== input.command || decoded.filtersDigest !== calculateMoldeaCliJsonDigest(input.filters)) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
	if (input.snapshotDigest !== void 0 && decoded.snapshotDigest !== input.snapshotDigest) throw new MoldeaCliOutputPageException("CURSOR_SNAPSHOT_CHANGED");
	return Object.freeze({
		lastKey: decoded.lastKey,
		snapshotDigest: decoded.snapshotDigest,
		sourceCursor: decoded.sourceCursor
	});
};
//#endregion
//#region src/output-page/page.ts
var assertRecordOrder = (records) => {
	for (let index = 0; index < records.length; index += 1) {
		const key = records[index]?.key;
		const previousKey = records[index - 1]?.key;
		if (key === void 0 || key.length === 0 || previousKey !== void 0 && key <= previousKey) throw new TypeError("Output records must have unique keys in ascending order.");
	}
};
var createMoldeaCliOutputPage = (input) => {
	assertRecordOrder(input.records);
	const cursorState = input.cursor === null ? null : decodeMoldeaCliCursor({
		command: input.command,
		cursor: input.cursor,
		filters: input.filters,
		snapshotDigest: input.snapshotDigest
	});
	const startIndex = cursorState === null ? 0 : cursorState.sourceCursor !== null ? 0 : input.records.findIndex(({ key }) => key === cursorState.lastKey) + 1;
	if (cursorState !== null && cursorState.sourceCursor === null && startIndex === 0) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
	const emptyRecords = Object.freeze([]);
	const emptyPage = Object.freeze({
		cursor: null,
		records: emptyRecords
	});
	if (startIndex === input.records.length) {
		if (input.measure(emptyPage, 2) > input.maxOutputBytes) throw new MoldeaCliOutputPageException("OUTPUT_BUDGET_TOO_SMALL");
		return emptyPage;
	}
	const createCursor = (record, endIndex) => {
		const sourceCursor = input.sourceCursorForRecord?.(record) ?? null;
		return (input.sourceCursorForRecord === void 0 ? endIndex < input.records.length : sourceCursor !== null) ? encodeMoldeaCliCursor(input.command, input.filters, input.snapshotDigest, record.key, sourceCursor) : null;
	};
	const selectedRecords = takeWithinByteBudget(input.records.slice(startIndex), {
		maxBytes: input.maxOutputBytes,
		measurePage: (page, itemsBytes) => input.measure(Object.freeze({
			cursor: createCursor(page[page.length - 1], startIndex + page.length),
			records: page
		}), itemsBytes)
	});
	const lastRecord = selectedRecords[selectedRecords.length - 1];
	if (lastRecord === void 0) throw new MoldeaCliOutputPageException("OUTPUT_BUDGET_TOO_SMALL");
	return Object.freeze({
		cursor: createCursor(lastRecord, startIndex + selectedRecords.length),
		records: Object.freeze(selectedRecords)
	});
};
//#endregion
//#region src/command-line/validations.ts
var POSITIVE_INTEGER_PATTERN = /^\d+$/u;
var parsePositiveSafeInteger = (input) => {
	if (!POSITIVE_INTEGER_PATTERN.test(input)) return null;
	const parsedInteger = Number(input);
	return Number.isSafeInteger(parsedInteger) && parsedInteger > 0 ? parsedInteger : null;
};
var parseMoldeaCliOutputByteLimit = (input) => {
	const parsed = parsePositiveSafeInteger(input);
	return parsed !== null && parsed >= 4096 && parsed <= 1048576 ? parsed : null;
};
var areMoldeaCliResourceLimitsConsistent = (limits) => {
	return limits.maxManifestBytes <= limits.maxFileBytes && limits.maxFileBytes <= limits.maxTotalBytes;
};
var isRepositoryDirectoryInputValid = (input) => {
	return input.length > 0 && !input.includes("\0") && input.isWellFormed();
};
var isMoldeaCliCursorInputValid = (input) => {
	return input.length > 0 && input.length <= 16384 && !input.includes("\0") && input.isWellFormed();
};
//#endregion
//#region src/command-line/parser.ts
var COMMAND_NAMES = new Set(Object.values(MOLDEA_CLI_COMMANDS));
var RESOURCE_OPTION_FIELDS = {
	[MOLDEA_CLI_OPTIONS.MaxDiagnostics]: "maxDiagnostics",
	[MOLDEA_CLI_OPTIONS.MaxEntries]: "maxEntries",
	[MOLDEA_CLI_OPTIONS.MaxCoverage]: "maxCoverage",
	[MOLDEA_CLI_OPTIONS.MaxFileBytes]: "maxFileBytes",
	[MOLDEA_CLI_OPTIONS.MaxManifestBytes]: "maxManifestBytes",
	[MOLDEA_CLI_OPTIONS.MaxTotalBytes]: "maxTotalBytes"
};
var createArgumentError = (code, command, isJson) => ({
	code,
	command,
	isJson,
	kind: "error"
});
var isMoldeaCliCommand = (input) => {
	return input !== void 0 && COMMAND_NAMES.has(input);
};
var parseMoldeaCliArguments = (commandLineArguments) => {
	const isJson = commandLineArguments.includes(MOLDEA_CLI_OPTIONS.Json);
	if (commandLineArguments.length === 0) return {
		command: null,
		kind: "help"
	};
	const firstArgument = commandLineArguments[0];
	if (firstArgument === MOLDEA_CLI_OPTIONS.Help) return commandLineArguments.length === 1 ? {
		command: null,
		kind: "help"
	} : createArgumentError("INVALID_ARGUMENT", null, isJson);
	if (firstArgument === MOLDEA_CLI_OPTIONS.Version) return commandLineArguments.length === 1 ? { kind: "version" } : createArgumentError("INVALID_ARGUMENT", null, isJson);
	const command = isMoldeaCliCommand(firstArgument) ? firstArgument : null;
	if (command === null) return createArgumentError("INVALID_ARGUMENT", null, isJson);
	if (commandLineArguments.length === 2 && commandLineArguments[1] === MOLDEA_CLI_OPTIONS.Help) return {
		command,
		kind: "help"
	};
	const seenOptions = new Set();
	const resourceLimits = { ...DEFAULT_MOLDEA_CLI_RESOURCE_LIMITS };
	let isColorDisabled = false;
	let cursor = null;
	let maxOutputBytes = MOLDEA_CLI_DEFAULT_OUTPUT_BYTES;
	let path = null;
	let pathsInput = "none";
	let repositoryDirectory = null;
	for (let index = 1; index < commandLineArguments.length; index += 1) {
		const option = commandLineArguments[index];
		if (option === void 0 || seenOptions.has(option)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
		seenOptions.add(option);
		if (option === MOLDEA_CLI_OPTIONS.Json) continue;
		if (option === MOLDEA_CLI_OPTIONS.NoColor) {
			isColorDisabled = true;
			continue;
		}
		if (option === MOLDEA_CLI_OPTIONS.PathsStdin) {
			pathsInput = "stdin";
			continue;
		}
		if (option === MOLDEA_CLI_OPTIONS.Help || option === MOLDEA_CLI_OPTIONS.Version) return createArgumentError("INVALID_ARGUMENT", command, isJson);
		const resourceField = RESOURCE_OPTION_FIELDS[option];
		const isRepositoryOption = option === MOLDEA_CLI_OPTIONS.Repository;
		const isCursorOption = option === MOLDEA_CLI_OPTIONS.Cursor;
		const isOutputLimitOption = option === MOLDEA_CLI_OPTIONS.MaxOutputBytes;
		const isPathOption = option === MOLDEA_CLI_OPTIONS.Path;
		if (resourceField === void 0 && !isRepositoryOption && !isCursorOption && !isOutputLimitOption && !isPathOption) return createArgumentError("INVALID_ARGUMENT", command, isJson);
		if (command === MOLDEA_CLI_COMMANDS.Composition) return createArgumentError("INVALID_ARGUMENT", command, isJson);
		const optionValue = commandLineArguments[index + 1];
		if (optionValue === void 0 || optionValue.startsWith("--")) return createArgumentError("INVALID_ARGUMENT", command, isJson);
		index += 1;
		if (isCursorOption) {
			if (!isMoldeaCliCursorInputValid(optionValue)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
			cursor = optionValue;
			continue;
		}
		if (isOutputLimitOption) {
			const parsedOutputLimit = parseMoldeaCliOutputByteLimit(optionValue);
			if (parsedOutputLimit === null) return createArgumentError("RESOURCE_LIMIT_CONFIGURATION_INVALID", command, isJson);
			maxOutputBytes = parsedOutputLimit;
			continue;
		}
		if (isPathOption) {
			if (!isRepositoryDirectoryInputValid(optionValue)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
			path = optionValue;
			pathsInput = "path";
			continue;
		}
		if (isRepositoryOption) {
			if (!isRepositoryDirectoryInputValid(optionValue)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
			repositoryDirectory = optionValue;
			continue;
		}
		const parsedLimit = parsePositiveSafeInteger(optionValue);
		if (parsedLimit === null || resourceField === void 0) return createArgumentError("RESOURCE_LIMIT_CONFIGURATION_INVALID", command, isJson);
		resourceLimits[resourceField] = parsedLimit;
	}
	if (!areMoldeaCliResourceLimitsConsistent(resourceLimits)) return createArgumentError("RESOURCE_LIMIT_CONFIGURATION_INVALID", command, isJson);
	const isScope = command === MOLDEA_CLI_COMMANDS.Scope;
	const isContent = command === MOLDEA_CLI_COMMANDS.Content;
	const hasPathInput = path !== null;
	const hasStdinInput = seenOptions.has(MOLDEA_CLI_OPTIONS.PathsStdin);
	if ((hasPathInput || hasStdinInput) && !isScope && !isContent) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	if (isScope && hasPathInput === hasStdinInput) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	if (isContent && (!hasPathInput || hasStdinInput)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	if (isScope && seenOptions.has(MOLDEA_CLI_OPTIONS.MaxCoverage)) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	if (isContent && [
		MOLDEA_CLI_OPTIONS.MaxDiagnostics,
		MOLDEA_CLI_OPTIONS.MaxCoverage,
		MOLDEA_CLI_OPTIONS.MaxManifestBytes
	].some((option) => seenOptions.has(option))) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	if (!isJson && (cursor !== null || seenOptions.has(MOLDEA_CLI_OPTIONS.MaxOutputBytes))) return createArgumentError("INVALID_ARGUMENT", command, isJson);
	const options = {
		cursor,
		isColorDisabled,
		isJson,
		maxOutputBytes,
		path,
		pathsInput,
		repositoryDirectory,
		resourceLimits: Object.freeze({ ...resourceLimits })
	};
	return {
		invocation: Object.freeze({
			command,
			options: Object.freeze(options)
		}),
		kind: "command"
	};
};
//#endregion
//#region src/presentation/constants.ts
var MOLDEA_CLI_ERROR_DEFINITIONS = Object.freeze({
	COMPOSITION_STATE_INVALID: Object.freeze({
		message: "The installed composition state is invalid.",
		retryable: false,
		source: "cli"
	}),
	CONTENT_INVALID: Object.freeze({
		message: "The requested canonical asset is not valid moldea text.",
		retryable: false,
		source: "cli"
	}),
	CONTENT_PATH_INVALID: Object.freeze({
		message: "The content path must identify one canonical moldea text asset.",
		retryable: false,
		source: "cli"
	}),
	CURSOR_INVALID: Object.freeze({
		message: "The continuation cursor is invalid for this request.",
		retryable: false,
		source: "cli"
	}),
	CURSOR_SNAPSHOT_CHANGED: Object.freeze({
		message: "The continuation cursor belongs to a different repository snapshot.",
		retryable: true,
		source: "cli"
	}),
	GIT_ACCESS_DENIED: Object.freeze({
		message: "Git access was denied.",
		retryable: true,
		source: "git"
	}),
	GIT_COMMAND_FAILED: Object.freeze({
		message: "The Git command failed.",
		retryable: true,
		source: "git"
	}),
	GIT_CONTENT_TRANSFORM_UNSUPPORTED: Object.freeze({
		message: "The requested file uses an unsupported Git content transformation.",
		retryable: false,
		source: "git"
	}),
	GIT_NOT_FOUND: Object.freeze({
		message: "The Git executable is unavailable.",
		retryable: false,
		source: "git"
	}),
	GIT_OPERATION_ABORTED: Object.freeze({
		message: "The Git operation was aborted.",
		retryable: true,
		source: "git"
	}),
	GIT_OUTPUT_INVALID: Object.freeze({
		message: "Git returned invalid output.",
		retryable: false,
		source: "git"
	}),
	GIT_REPOSITORY_NOT_FOUND: Object.freeze({
		message: "The selected path is not inside a Git repository.",
		retryable: false,
		source: "git"
	}),
	GIT_SPARSE_CHECKOUT_UNSUPPORTED: Object.freeze({
		message: "Sparse Git checkouts are unsupported.",
		retryable: false,
		source: "git"
	}),
	GIT_VERSION_INVALID: Object.freeze({
		message: "The Git version output is invalid.",
		retryable: false,
		source: "git"
	}),
	GIT_VERSION_UNSUPPORTED: Object.freeze({
		message: "The installed Git version is unsupported.",
		retryable: false,
		source: "git"
	}),
	GIT_WORK_TREE_REQUIRED: Object.freeze({
		message: "A usable Git working tree is required.",
		retryable: false,
		source: "git"
	}),
	INTERNAL_ERROR: Object.freeze({
		message: "The command could not be completed.",
		retryable: false,
		source: "cli"
	}),
	INVALID_ARGUMENT: Object.freeze({
		message: "The command invocation is invalid.",
		retryable: false,
		source: "cli"
	}),
	OUTPUT_BUDGET_TOO_SMALL: Object.freeze({
		message: "The output byte budget cannot contain the next complete result.",
		retryable: false,
		source: "cli"
	}),
	PATH_INPUT_INVALID: Object.freeze({
		message: "The scope path input is invalid. Use leading-slash repository-logical paths and NUL-delimited UTF-8 on stdin.",
		retryable: false,
		source: "cli"
	}),
	RESOURCE_LIMIT_CONFIGURATION_INVALID: Object.freeze({
		message: "The resource-limit configuration is invalid.",
		retryable: false,
		source: "cli"
	}),
	RESOURCE_LIMIT_EXCEEDED: Object.freeze({
		message: "A resource limit was exceeded.",
		retryable: false,
		source: "cli"
	}),
	WORKING_TREE_UNSTABLE: Object.freeze({
		message: "The working tree did not remain stable.",
		retryable: true,
		source: "cli"
	})
});
var MOLDEA_CLI_GIT_WORKING_TREE_SOURCE = Object.freeze({ kind: "git-working-tree" });
var MOLDEA_CLI_TOP_LEVEL_HELP = `Usage: moldea <command> [options]

Commands:
  validate       Validate the current moldea project.
  inspect        Inspect content-free project metadata.
  scope          Match changed paths to declared moldea relationships.
  content        Read one canonical moldea asset explicitly.
  composition    Report the installed CLI composition state.

Global options:
  --help     Show top-level help.
  --version  Show the CLI version.

Run "moldea <command> --help" for command-specific options.
`;
var REPOSITORY_OPTIONS_HELP = `  --repository <path>                Select a Git working-tree directory.
  --json                             Emit one machine-readable JSON result.
  --no-color                         Disable ANSI styling in human output.
`;
var BASE_RESOURCE_OPTIONS_HELP = `  --max-entries <integer>            Override the repository entry limit.
  --max-file-bytes <integer>         Override the per-file byte limit.
  --max-total-bytes <integer>        Override the total cached-byte limit.
`;
var INSPECTION_RESOURCE_OPTIONS_HELP = `${BASE_RESOURCE_OPTIONS_HELP}  --max-manifest-bytes <integer>     Override the manifest byte limit.
  --max-diagnostics <integer>        Override the diagnostic count limit.
`;
var PAGINATION_OPTIONS_HELP = `  --max-output-bytes <integer>       Bound JSON output from 4096 to 1048576 bytes.
  --cursor <opaque-cursor>           Continue a prior JSON result page.
`;
var COMPLETE_INSPECTION_OPTIONS_HELP = `${REPOSITORY_OPTIONS_HELP}${INSPECTION_RESOURCE_OPTIONS_HELP}  --max-coverage <integer>           Override the binding coverage count limit.
${PAGINATION_OPTIONS_HELP}`;
var SCOPE_OPTIONS_HELP = `${REPOSITORY_OPTIONS_HELP}${INSPECTION_RESOURCE_OPTIONS_HELP}${PAGINATION_OPTIONS_HELP}`;
var CONTENT_OPTIONS_HELP = `${REPOSITORY_OPTIONS_HELP}${BASE_RESOURCE_OPTIONS_HELP}${PAGINATION_OPTIONS_HELP}`;
var MOLDEA_CLI_COMMAND_HELP = {
	[MOLDEA_CLI_COMMANDS.Composition]: `Usage: moldea composition [options]

Report the installed CLI composition state.

Options:
  --json      Emit one machine-readable JSON result.
  --no-color  Disable ANSI styling in human output.
  --help      Show this help.
`,
	[MOLDEA_CLI_COMMANDS.Inspect]: `Usage: moldea inspect [options]

Inspect content-free metadata for the current moldea project.

Options:
${COMPLETE_INSPECTION_OPTIONS_HELP}  --help                             Show this help.
`,
	[MOLDEA_CLI_COMMANDS.Scope]: `Usage: moldea scope (--path <logical-path> | --paths-stdin) [options]

Match changed repository paths to declared moldea relationships. The stdin form accepts NUL-delimited UTF-8 logical paths.

Options:
${SCOPE_OPTIONS_HELP}  --path <logical-path>               Match one repository-logical path.
  --paths-stdin                      Read NUL-delimited paths from stdin.
  --help                             Show this help.
`,
	[MOLDEA_CLI_COMMANDS.Content]: `Usage: moldea content --path <canonical-logical-path> [options]

Read one canonical moldea text asset in bounded Unicode-safe chunks.

Options:
${CONTENT_OPTIONS_HELP}  --path <canonical-logical-path>     Select exactly one canonical moldea file.
  --help                             Show this help.
`,
	[MOLDEA_CLI_COMMANDS.Validate]: `Usage: moldea validate [options]

Validate the current moldea project.

Options:
${COMPLETE_INSPECTION_OPTIONS_HELP}  --help                             Show this help.
`
};
//#endregion
//#region src/presentation/errors.ts
var EMPTY_ERROR_DETAILS = Object.freeze({});
var createMoldeaCliOwnedError = (code, details = EMPTY_ERROR_DETAILS) => {
	const definition = MOLDEA_CLI_ERROR_DEFINITIONS[code];
	return Object.freeze({
		code,
		details: Object.freeze({ ...details }),
		message: definition.message,
		path: null,
		retryable: definition.retryable,
		source: definition.source
	});
};
//#endregion
//#region src/json-output-contract/document.ts
var createMoldeaCliJsonEnvelope = (input) => Object.freeze({
	cliVersion: input.cliVersion,
	command: input.command,
	error: input.error,
	result: input.result,
	schemaVersion: 8,
	status: input.status
});
var serializeMoldeaCliJsonEnvelope = (input) => `${stringifyJsonDeterministically(createMoldeaCliJsonEnvelope(input), { strict: true })}\n`;
//#endregion
//#region src/presentation/formatters.ts
var DIAGNOSTIC_ENTITY_KEYS = [
	"agentId",
	"capabilityKind",
	"capabilityId",
	"decisionId",
	"contextPath",
	"integrationPath"
];
var formatMoldeaCliHumanDiagnosticEntity = (entity) => DIAGNOSTIC_ENTITY_KEYS.flatMap((key) => {
	const identifier = entity[key];
	return identifier === void 0 ? [] : [`${key}=${identifier}`];
}).join(", ");
var formatMoldeaCliHumanDiagnostic = (diagnostic) => {
	const location = diagnostic.path === null ? "" : diagnostic.range === null ? ` ${diagnostic.path}` : ` ${diagnostic.path}:${diagnostic.range.start.line}:${diagnostic.range.start.column}`;
	const lines = [`${diagnostic.source}:${diagnostic.code}${location} ${diagnostic.message}`];
	if (diagnostic.pointer !== null) lines.push(`  pointer: ${diagnostic.pointer}`);
	if (diagnostic.entity !== null) lines.push(`  entity: ${formatMoldeaCliHumanDiagnosticEntity(diagnostic.entity)}`);
	if (diagnostic.severity === "warning") {
		lines.push(`  subject: ${diagnostic.subject}`);
		if (diagnostic.qualifier !== null) lines.push(`  qualifier: ${diagnostic.qualifier}`);
	}
	return lines.join("\n");
};
var createMoldeaCliHumanStatusLines = (isValid, formatVersion, warningCount = 0) => {
	const lines = [`The moldea project is ${isValid ? warningCount > 0 ? "valid with warnings" : "valid" : "invalid"}.`];
	if (formatVersion !== null) lines.push(`Repository format: ${formatVersion}`);
	return lines;
};
var formatMoldeaCliHumanCount = (count, singularLabel, pluralLabel) => `${count === 1 ? singularLabel : pluralLabel}: ${count}`;
var formatMoldeaCliHelp = (command) => {
	return command === null ? MOLDEA_CLI_TOP_LEVEL_HELP : MOLDEA_CLI_COMMAND_HELP[command];
};
var formatMoldeaCliHumanError = (error) => `${error.source}:${error.code} ${error.message}\n`;
var formatMoldeaCliJsonResult = (command, result, error, status, cliVersion) => serializeMoldeaCliJsonEnvelope({
	cliVersion,
	command,
	error,
	result,
	status
});
var formatMoldeaCliJsonError = (error, command, cliVersion) => formatMoldeaCliJsonResult(command, null, error, "error", cliVersion);
var formatMoldeaCliHumanCompositionResult = (result, cliVersion) => {
	return `${[
		"The installed CLI composition state is valid.",
		`CLI version: ${cliVersion}`,
		`Supported Node.js: ${result.supportedNodeRange}`,
		`JSON output schema: 8`,
		`Minimum Git: ${result.minimumGitVersion}`,
		`Repository formats: ${result.repositoryFormatVersions.join(", ")}`,
		"Packages:",
		...result.packages.map(({ name, version }) => `  ${name}: ${version}`)
	].join("\n")}\n`;
};
var formatMoldeaCliJsonCompositionResult = (result, cliVersion) => formatMoldeaCliJsonResult(MOLDEA_CLI_COMMANDS.Composition, result, null, "valid", cliVersion);
var formatCoverage = (counts) => `Coverage: ${counts.bindings} bindings, ${counts.exportsPassed} exports confirmed, ${counts.exportsFailed} exports missing, ${counts.exportsNotChecked} not checked`;
var formatMoldeaCliHumanValidateResult = (result) => {
	const lines = createMoldeaCliHumanStatusLines(result.valid, result.formatVersion, result.warningCount);
	lines.push(formatCoverage(result.coverageCounts));
	for (const record of result.page.records) if (record.kind === "diagnostic" && !(record.severity === "warning" && record.accepted)) lines.push(formatMoldeaCliHumanDiagnostic(record));
	lines.push(formatMoldeaCliHumanCount(result.diagnosticCount, "Diagnostic", "Diagnostics"));
	lines.push(formatMoldeaCliHumanCount(result.errorCount, "Error", "Errors"));
	lines.push(formatMoldeaCliHumanCount(result.warningCount, "Warning", "Warnings"));
	lines.push(`${result.acceptedWarningCount} accepted ${result.acceptedWarningCount === 1 ? "warning" : "warnings"}`);
	if (result.page.cursor !== null) lines.push("Additional records are available through JSON pagination.");
	return `${lines.join("\n")}\n`;
};
var formatMoldeaCliJsonValidateResult = (result, cliVersion) => formatMoldeaCliJsonResult(MOLDEA_CLI_COMMANDS.Validate, result, null, result.valid ? "valid" : "invalid", cliVersion);
var formatMoldeaCliHumanInspectResult = (result) => {
	const lines = createMoldeaCliHumanStatusLines(result.valid, result.formatVersion, result.counts.warnings);
	lines.push(formatCoverage(result.coverageCounts));
	lines.push(`${result.counts.acceptedWarnings} accepted ${result.counts.acceptedWarnings === 1 ? "warning" : "warnings"}`);
	for (const record of result.page.records) if (record.kind === "diagnostic" && !(record.severity === "warning" && record.accepted)) lines.push(formatMoldeaCliHumanDiagnostic(record));
	for (const [label, count] of Object.entries(result.counts)) lines.push(`${label}: ${count}`);
	return `${lines.join("\n")}\n`;
};
var formatMoldeaCliJsonInspectResult = (result, cliVersion) => formatMoldeaCliJsonResult(MOLDEA_CLI_COMMANDS.Inspect, result, null, result.valid ? "valid" : "invalid", cliVersion);
var formatMoldeaCliHumanScopeResult = (result) => {
	return `${[
		`The moldea scope result is ${result.valid ? "valid" : "invalid"}.`,
		`Relevant: ${result.relevant ? "yes" : "no"}`,
		...Object.entries(result.counts).map(([label, count]) => `${label}: ${count}`)
	].join("\n")}\n`;
};
var formatMoldeaCliJsonScopeResult = (result, cliVersion) => formatMoldeaCliJsonResult(MOLDEA_CLI_COMMANDS.Scope, result, null, result.valid ? "valid" : "invalid", cliVersion);
var formatMoldeaCliHumanContentResult = (result) => {
	return `${[
		`Path: ${result.asset.path}`,
		`Content identity: ${result.asset.contentIdentity ?? "unavailable"}`,
		`Bytes: ${result.chunk.byteStart}-${result.chunk.byteEnd} of ${result.asset.totalBytes}`,
		result.cursor === null ? "Cursor: none" : `Cursor: ${result.cursor}`,
		...result.cursor === null ? [] : ["Continue this asset by passing the cursor to a JSON content request."],
		"",
		result.chunk.content
	].join("\n")}\n`;
};
var formatMoldeaCliJsonContentResult = (result, cliVersion) => formatMoldeaCliJsonResult(MOLDEA_CLI_COMMANDS.Content, result, null, "valid", cliVersion);
//#endregion
//#region src/presentation/transformers.ts
var assertProjectValidationInvariant = (validation) => {
	const observedErrorCount = validation.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
	if (!(Number.isSafeInteger(validation.errorCount) && Number.isSafeInteger(validation.warningCount) && validation.errorCount === observedErrorCount && validation.acceptedWarningCount === validation.diagnostics.filter((diagnostic) => diagnostic.severity === "warning" && diagnostic.accepted === true).length && validation.warningCount === validation.diagnostics.length - observedErrorCount - validation.acceptedWarningCount && validation.diagnosticCount === validation.errorCount + validation.warningCount + validation.acceptedWarningCount && validation.valid === (validation.summary !== null && validation.errorCount === 0) && (validation.valid || validation.errorCount > 0))) throw new TypeError("The Core validation result is internally inconsistent.");
};
var createRecordKey = (kind, ...parts) => JSON.stringify([kind, ...parts]);
var createMoldeaCliDiagnosticRecord = (diagnostic, occurrence = 0) => {
	const record = {
		code: diagnostic.code,
		group: diagnostic.group,
		entity: diagnostic.entity,
		key: createRecordKey("diagnostic", diagnostic.source, diagnostic.severity, diagnostic.code, diagnostic.path, diagnostic.pointer, diagnostic.severity === "warning" ? [
			diagnostic.subject,
			diagnostic.qualifier,
			diagnostic.accepted === true,
			diagnostic.accepted === true ? diagnostic.reason : null
		] : null, occurrence),
		kind: "diagnostic",
		message: diagnostic.message,
		path: diagnostic.path,
		pointer: diagnostic.pointer,
		range: diagnostic.range,
		source: diagnostic.source
	};
	if (diagnostic.severity === "warning") return Object.freeze({
		...record,
		severity: "warning",
		subject: diagnostic.subject,
		qualifier: diagnostic.qualifier,
		acceptable: diagnostic.acceptable,
		accepted: diagnostic.accepted === true,
		reason: diagnostic.accepted === true ? diagnostic.reason : null
	});
	return Object.freeze({
		...record,
		severity: "error"
	});
};
var createCoverageRecord = (coverage, index, order = "coverage") => Object.freeze({
	entity: coverage.entity,
	relationship: coverage.relationship,
	path: coverage.path,
	symbol: coverage.symbol,
	fileCheck: coverage.fileCheck,
	...coverage.exportCheck === "not-checked" ? {
		exportCheck: coverage.exportCheck,
		exportNotCheckedReason: coverage.exportNotCheckedReason
	} : { exportCheck: coverage.exportCheck },
	key: createRecordKey(order, "coverage", coverage.relationship, coverage.entity, coverage.path, coverage.symbol, index),
	kind: "coverage"
});
var createInspectRecord = (item, index) => {
	const order = index.toString().padStart(6, "0");
	if (item.kind === "agent") {
		const record = {
			agentId: item.agent.agentId,
			key: createRecordKey(order, "agent", item.agent.agentId),
			kind: "agent"
		};
		return Object.freeze(record);
	}
	if (item.kind === "diagnostic") return Object.freeze({
		...createMoldeaCliDiagnosticRecord(item.diagnostic, index),
		key: createRecordKey(order, "diagnostic", item.diagnostic.source, item.diagnostic.severity, item.diagnostic.code, createMoldeaCliDiagnosticRecord(item.diagnostic, index).key)
	});
	if (item.kind === "coverage") return createCoverageRecord(item.coverage, index, order);
	const metadata = item.metadata;
	const record = {
		agentId: metadata.agentId,
		byteLength: metadata.byteLength,
		canonicalDigest: metadata.canonicalDigest,
		decisionId: metadata.decisionId,
		digest: metadata.digest,
		key: createRecordKey(order, "metadata", metadata.path, metadata.kind, metadata.agentId),
		kind: "metadata",
		metadataKind: metadata.kind,
		path: metadata.path,
		scalarLength: metadata.scalarLength
	};
	return Object.freeze(record);
};
var createMoldeaCliValidateProjection = (validation) => {
	assertProjectValidationInvariant(validation);
	const diagnostics = validation.diagnostics.map((diagnostic, index) => {
		const record = createMoldeaCliDiagnosticRecord(diagnostic, index);
		return Object.freeze({
			...record,
			key: createRecordKey(index.toString().padStart(6, "0"), "diagnostic", record.key)
		});
	});
	const records = Object.freeze([...diagnostics, ...validation.coverage.map((coverage, index) => createCoverageRecord(coverage, index, (diagnostics.length + index).toString().padStart(6, "0")))]);
	const snapshotDigest = calculateMoldeaCliJsonDigest({
		records,
		coverageCounts: validation.coverageCounts,
		acceptedWarningCount: validation.acceptedWarningCount,
		errorCount: validation.errorCount,
		formatVersion: validation.formatVersion,
		summary: validation.summary,
		valid: validation.valid,
		warningCount: validation.warningCount
	});
	return Object.freeze({
		records,
		diagnosticCount: validation.diagnosticCount,
		acceptedWarningCount: validation.acceptedWarningCount,
		coverageCounts: validation.coverageCounts,
		errorCount: validation.errorCount,
		formatVersion: validation.formatVersion,
		snapshotDigest,
		source: MOLDEA_CLI_GIT_WORKING_TREE_SOURCE,
		valid: validation.valid,
		warningCount: validation.warningCount
	});
};
var createMoldeaCliInspectProjection = (inspection) => {
	const project = inspection.summary === null ? null : Object.freeze({
		manifest: Object.freeze({
			digest: inspection.summary.manifestDigest,
			path: inspection.summary.manifestPath
		}),
		project: Object.freeze({
			digest: inspection.summary.projectDigest,
			path: inspection.summary.projectPath
		})
	});
	const records = Object.freeze(inspection.page.records.map(({ item }, index) => createInspectRecord(item, index)));
	const sourceCursors = new Map(inspection.page.records.map((record, index) => {
		const projected = records[index];
		if (projected === void 0) throw new TypeError("A projected inspection record is missing.");
		return [projected.key, record.nextCursor];
	}));
	const snapshotDigest = inspection.inspectionDigest;
	return Object.freeze({
		counts: inspection.counts,
		formatVersion: inspection.formatVersion,
		getSourceCursor: (record) => sourceCursors.get(record.key) ?? null,
		project,
		records,
		snapshotDigest,
		source: MOLDEA_CLI_GIT_WORKING_TREE_SOURCE,
		coverageCounts: inspection.coverageCounts,
		valid: inspection.valid,
		view: inspection.view
	});
};
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/shared/constants.js
var GIT_NULL_DEVICE = "/dev/null";
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/shared/errors.js
var ERRORS = {
	GIT_NOT_FOUND: "GIT_NOT_FOUND",
	GIT_COMMAND_FAILED: "GIT_COMMAND_FAILED",
	GIT_INVALID_ARGUMENT: "GIT_INVALID_ARGUMENT",
	GIT_OUTPUT_INVALID: "GIT_OUTPUT_INVALID",
	GIT_REPOSITORY_NOT_FOUND: "GIT_REPOSITORY_NOT_FOUND",
	GIT_ACCESS_DENIED: "GIT_ACCESS_DENIED"
};
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/shared/utilities.js
var invalidArgument = (name) => new Exception("An argument isn't valid.", {
	code: ERRORS.GIT_INVALID_ARGUMENT,
	data: { argument: name }
});
var invalidOutput = (subcommand) => new Exception("Git's output isn't in the expected format.", {
	code: ERRORS.GIT_OUTPUT_INVALID,
	data: { subcommand }
});
var isArgumentValid = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0");
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/environment/constants.js
var DEFAULT_GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o ConnectTimeout=10";
var NON_INTERACTIVE_VARIABLES = {
	GIT_TERMINAL_PROMPT: "0",
	GIT_ASKPASS: "",
	GCM_INTERACTIVE: "never",
	GIT_OPTIONAL_LOCKS: "0",
	GIT_NO_REPLACE_OBJECTS: "1",
	GIT_NO_LAZY_FETCH: "1",
	GIT_LITERAL_PATHSPECS: "1",
	GIT_ALLOW_PROTOCOL: "",
	LC_ALL: "C",
	LANG: "C",
	LANGUAGE: "C"
};
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/environment/environment.js
var SET_VARIABLES = new Set(Object.keys(NON_INTERACTIVE_VARIABLES));
var isBaseVariableKept = (key) => {
	const name = key.toUpperCase();
	return !name.startsWith("GIT_") && !name.startsWith("SSH_ASKPASS") && !SET_VARIABLES.has(name);
};
var createGitEnvironment = ({ isolateConfig = false, sshCommand = DEFAULT_GIT_SSH_COMMAND, baseEnv = process.env } = {}) => ({
	...Object.fromEntries(Object.entries(baseEnv).filter(([key]) => isBaseVariableKept(key))),
	...NON_INTERACTIVE_VARIABLES,
	GIT_SSH_COMMAND: sshCommand,
	...isolateConfig ? {
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_CONFIG_GLOBAL: GIT_NULL_DEVICE,
		GIT_ATTR_NOSYSTEM: "1"
	} : {}
});
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/run-git/constants.js
var DEFAULT_GIT_MAX_OUTPUT_BYTES = 1048576;
var FIXED_CONFIG_ARGS = [
	"-c",
	"core.fsmonitor=",
	"-c",
	"core.askPass=",
	"-c",
	"core.pager=cat",
	"-c",
	"color.ui=false",
	"-c",
	"submodule.recurse=false"
];
var NO_CREDENTIAL_HELPERS_ARGS = ["-c", "credential.helper="];
var REPOSITORY_NOT_FOUND_PATTERN = /^fatal: not a git repository/mu;
var ACCESS_DENIED_PATTERN = /^fatal: (?:detected dubious ownership in repository at |.*: Permission denied\r?$)/mu;
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/run-git/run-git.js
var isDirectory = async (path) => {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
};
var areArgsValid = (args) => Array.isArray(args) && args.every((arg) => typeof arg === "string" && !arg.includes("\0"));
var isCallerVariable = (key) => {
	const name = key.toUpperCase();
	return name !== "GIT_ASKPASS" && name !== "GIT_TERMINAL_PROMPT" && name !== "GCM_INTERACTIVE" && !name.startsWith("SSH_ASKPASS");
};
var runGit = async (args, { cwd, timeoutSeconds = 30, maxOutputBytes = DEFAULT_GIT_MAX_OUTPUT_BYTES, input, signal, isolateConfig = false, useCredentialHelpers = false, env, encoding }) => {
	if (!areArgsValid(args)) throw invalidArgument("args");
	if (!isArgumentValid(cwd) || !await isDirectory(cwd)) throw invalidArgument("cwd");
	const gitEnv = {
		...createGitEnvironment({ isolateConfig }),
		...Object.fromEntries(Object.entries(env ?? {}).filter(([key]) => isCallerVariable(key)))
	};
	try {
		return await runProcess({
			command: "git",
			args: [
				...FIXED_CONFIG_ARGS,
				...isolateConfig ? ["-c", `core.attributesFile=${GIT_NULL_DEVICE}`] : [],
				...useCredentialHelpers ? [] : NO_CREDENTIAL_HELPERS_ARGS,
				"--no-pager",
				...args
			],
			cwd,
			env: gitEnv,
			timeoutSeconds,
			maxOutputBytes,
			...input === void 0 ? {} : { input },
			...signal === void 0 ? {} : { signal },
			...encoding === void 0 ? {} : { encoding }
		});
	} catch (error) {
		const isNotFound = getErrorCode(error) === ERRORS$2.PROCESS_START_FAILED && getErrorCode(error.cause) === "ENOENT";
		if (isNotFound && process.platform === "win32" && cwd.length >= 260) throw invalidArgument("cwd");
		if (isNotFound) throw new Exception("Git isn't installed, or isn't on the PATH.", {
			code: ERRORS.GIT_NOT_FOUND,
			cause: error
		});
		throw error;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/run-git/assert-succeeded.js
var assertGitSucceeded = (result, subcommand) => {
	if (result.exitCode === 0) return;
	const stderr = typeof result.stderr === "string" ? result.stderr : result.stderr.toString("utf8");
	const data = {
		subcommand,
		exitCode: result.exitCode
	};
	if (REPOSITORY_NOT_FOUND_PATTERN.test(stderr)) throw new Exception("The directory isn't in a Git repository.", {
		code: ERRORS.GIT_REPOSITORY_NOT_FOUND,
		data
	});
	if (ACCESS_DENIED_PATTERN.test(stderr)) throw new Exception("Git can't access the repository.", {
		code: ERRORS.GIT_ACCESS_DENIED,
		data
	});
	throw new Exception("The git command failed.", {
		code: ERRORS.GIT_COMMAND_FAILED,
		data
	});
};
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/commands/utilities.js
var INDEX_ENTRY_HEADER_PATTERN = /^([0-7]{6}) [0-9a-f]{40,64} ([0-3])$/;
var readSuccessfulOutput = (result, subcommand) => {
	assertGitSucceeded(result, subcommand);
	return result.stdout;
};
var readCompleteOutput = (result, subcommand) => {
	const stdout = readSuccessfulOutput(result, subcommand);
	if (result.stderr.length > 0) throw invalidOutput(subcommand);
	return stdout;
};
var decodeText = (output, subcommand) => {
	try {
		return new TextDecoder("utf-8", {
			fatal: true,
			ignoreBOM: true
		}).decode(output);
	} catch {
		throw invalidOutput(subcommand);
	}
};
var decodeRecords = (output, subcommand) => {
	const text = decodeText(output, subcommand);
	if (text === "") return [];
	const records = text.split("\0");
	if (records.pop() !== "") throw invalidOutput(subcommand);
	return records;
};
var parseIndexEntries = (records) => records.map((record) => {
	const tab = record.indexOf("	");
	const header = tab === -1 ? null : INDEX_ENTRY_HEADER_PATTERN.exec(record.slice(0, tab));
	if (header === null || tab === record.length - 1) throw invalidOutput("ls-files");
	return {
		mode: header[1],
		stage: Number(header[2]),
		path: record.slice(tab + 1)
	};
});
//#endregion
//#region ../../node_modules/.pnpm/jg-git-commands@0.4.0/node_modules/jg-git-commands/dist/commands/commands.js
var GIT_VERSION_PATTERN = /^git version (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[.-][0-9A-Za-z]+)*(?: \([0-9A-Za-z](?:[0-9A-Za-z ._+/-]*[0-9A-Za-z])?\))?\r?\n$/;
var toPathspecArgs = (paths) => {
	if (paths === void 0) return ["--"];
	if (!Array.isArray(paths) || !paths.every(isArgumentValid)) throw invalidArgument("paths");
	return ["--", ...paths];
};
var readIndexEntries = async (cwd, { paths, ...options } = {}) => {
	return parseIndexEntries(decodeRecords(readCompleteOutput(await runGit([
		"ls-files",
		"--cached",
		"--stage",
		"--full-name",
		"-z",
		...toPathspecArgs(paths)
	], {
		...options,
		cwd,
		encoding: "buffer"
	}), "ls-files"), "ls-files"));
};
var listUntrackedFiles = async (cwd, { paths, ...options } = {}) => {
	return decodeRecords(readCompleteOutput(await runGit([
		"ls-files",
		"--others",
		"--exclude-standard",
		"--full-name",
		"-z",
		...toPathspecArgs(paths)
	], {
		...options,
		cwd,
		encoding: "buffer"
	}), "ls-files"), "ls-files");
};
var readTopLevel = async (cwd, options = {}) => {
	const inside = readSuccessfulOutput(await runGit(["rev-parse", "--is-inside-work-tree"], {
		...options,
		cwd
	}), "rev-parse").trim();
	if (inside === "false") return null;
	if (inside !== "true") throw invalidOutput("rev-parse");
	const output = decodeText(readSuccessfulOutput(await runGit(["rev-parse", "--show-toplevel"], {
		...options,
		cwd,
		encoding: "buffer"
	}), "rev-parse"), "rev-parse");
	const root = output.endsWith("\n") ? output.slice(0, -1) : "";
	if (root === "" || root.includes("\n")) throw invalidOutput("rev-parse");
	return root;
};
var readConfigBoolean = async (cwd, key, defaultValue, options = {}) => {
	if (!isArgumentValid(key) || key.startsWith("-") || /\s/.test(key)) throw invalidArgument("key");
	if (typeof defaultValue !== "boolean") throw invalidArgument("defaultValue");
	const value = readSuccessfulOutput(await runGit([
		"config",
		"--type=bool",
		`--default=${String(defaultValue)}`,
		"--get",
		key
	], {
		...options,
		cwd
	}), "config");
	if (value !== "true\n" && value !== "false\n") throw invalidOutput("config");
	return value === "true\n";
};
var readGitVersion = async (cwd, options = {}) => {
	const output = readSuccessfulOutput(await runGit(["version"], {
		...options,
		cwd
	}), "version");
	const match = GIT_VERSION_PATTERN.exec(output);
	const version = {
		major: Number(match?.[1]),
		minor: Number(match?.[2]),
		patch: Number(match?.[3])
	};
	if (!Object.values(version).every(Number.isSafeInteger)) throw invalidOutput("version");
	return version;
};
//#endregion
//#region src/git-command/utilities.ts
var createGitFailure = (reason, subcommand) => Object.freeze({
	kind: "failed",
	reason,
	...subcommand === void 0 ? {} : { subcommand }
});
var classifyGitFailure = (error, signal) => {
	if (signal?.aborted === true) return "aborted";
	switch (getErrorCode(error)) {
		case ERRORS.GIT_NOT_FOUND: return "not-found";
		case ERRORS.GIT_REPOSITORY_NOT_FOUND: return "repository-not-found";
		case ERRORS.GIT_ACCESS_DENIED: return "access-denied";
		case ERRORS.GIT_OUTPUT_INVALID: return "output-invalid";
		case ERRORS$2.PROCESS_OUTPUT_TOO_LARGE: return "output-limit-exceeded";
		case ERRORS$2.PROCESS_START_FAILED: {
			const causeCode = getErrorCode(error.cause);
			return causeCode === "EACCES" || causeCode === "EPERM" ? "access-denied" : "command-failed";
		}
		default: return "command-failed";
	}
};
var readGit = async (read, signal, subcommand) => {
	try {
		return Object.freeze({
			kind: "completed",
			value: await read()
		});
	} catch (error) {
		return createGitFailure(classifyGitFailure(error, signal), subcommand);
	}
};
var checkGitResult = (result, subcommand) => {
	if (result.stderr.byteLength > 4096) return "output-invalid";
	try {
		assertGitSucceeded(result, subcommand);
	} catch (error) {
		return classifyGitFailure(error);
	}
	return result.stderr.byteLength === 0 ? null : "output-invalid";
};
//#endregion
//#region src/git-version/constants.ts
var MINIMUM_GIT_VERSION_COMPONENTS = Object.freeze({
	major: 2,
	minor: 32,
	patch: 0
});
var MINIMUM_GIT_VERSION = `${MINIMUM_GIT_VERSION_COMPONENTS.major}.${MINIMUM_GIT_VERSION_COMPONENTS.minor}.${MINIMUM_GIT_VERSION_COMPONENTS.patch}`;
var MAX_GIT_VERSION_OUTPUT_BYTES = 4096;
//#endregion
//#region src/git-version/preflight.ts
var mapGitFailure = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_VERSION_INVALID";
		case "repository-not-found":
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var isGitVersionSupported = (version) => {
	if (version.major !== MINIMUM_GIT_VERSION_COMPONENTS.major) return version.major > MINIMUM_GIT_VERSION_COMPONENTS.major;
	if (version.minor !== MINIMUM_GIT_VERSION_COMPONENTS.minor) return version.minor > MINIMUM_GIT_VERSION_COMPONENTS.minor;
	return version.patch >= MINIMUM_GIT_VERSION_COMPONENTS.patch;
};
var createGitVersionPreflight = (readVersion = readGitVersion) => async (directory, signal) => {
	const versionResult = await readGit(() => readVersion(directory, {
		maxOutputBytes: MAX_GIT_VERSION_OUTPUT_BYTES,
		timeoutSeconds: 300,
		...signal === void 0 ? {} : { signal }
	}), signal);
	if (versionResult.kind === "failed") return Object.freeze({
		errorCode: mapGitFailure(versionResult.reason),
		kind: "failed"
	});
	if (!isGitVersionSupported(versionResult.value)) return Object.freeze({
		errorCode: "GIT_VERSION_UNSUPPORTED",
		kind: "failed"
	});
	return Object.freeze({
		kind: "supported",
		version: Object.freeze({ ...versionResult.value })
	});
};
//#endregion
//#region src/composition/exception.ts
var MoldeaCliCompositionException = class extends Error {
	code = "COMPOSITION_STATE_INVALID";
	constructor() {
		super(createMoldeaCliOwnedError("COMPOSITION_STATE_INVALID").message);
		this.name = "MoldeaCliCompositionException";
	}
};
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/constants.js
var require_constants = __commonJSMin(((exports, module) => {
	module.exports = {
		MAX_LENGTH: 256,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: 250,
		MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER || 9007199254740991,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION: "2.0.0",
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/debug.js
var require_debug = __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/re.js
var require_re = __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
	var debug = require_debug();
	exports = module.exports = {};
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug(name, index, value);
		t[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
	createToken("FULL", `^${src[t.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
	createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t.COERCE], true);
	createToken("COERCERTLFULL", src[t.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/semver.js
var require_semver$1 = __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re, t } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	var isPrereleaseIdentifier = (prerelease, identifier) => {
		const identifiers = identifier.split(".");
		if (identifiers.length > prerelease.length) return false;
		for (let i = 0; i < identifiers.length; i++) if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) return false;
		return true;
	};
	module.exports = class SemVer {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer) {
				if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
				else version = version.version;
			} else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease = [identifier, base];
						if (identifierBase === false) prerelease = [identifier];
						if (isPrereleaseIdentifier(this.prerelease, identifier)) {
							const prereleaseBase = this.prerelease[identifier.split(".").length];
							if (isNaN(prereleaseBase)) this.prerelease = prerelease;
						} else this.prerelease = prerelease;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/parse.js
var require_parse = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = (version, options, throwErrors = false) => {
		if (version instanceof SemVer) return version;
		try {
			return new SemVer(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/valid.js
var require_valid$1 = __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var valid = (version, options) => {
		const v = parse(version, options);
		return v ? v.version : null;
	};
	module.exports = valid;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/clean.js
var require_clean = __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var clean = (version, options) => {
		const s = parse(version.trim().replace(/^[=v]+/, ""), options);
		return s ? s.version : null;
	};
	module.exports = clean;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/inc.js
var require_inc = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/diff.js
var require_diff = __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var diff = (version1, version2) => {
		const v1 = parse(version1, null, true);
		const v2 = parse(version2, null, true);
		const comparison = v1.compare(v2);
		if (comparison === 0) return null;
		const v1Higher = comparison > 0;
		const highVersion = v1Higher ? v1 : v2;
		const lowVersion = v1Higher ? v2 : v1;
		const highHasPre = !!highVersion.prerelease.length;
		if (!!lowVersion.prerelease.length && !highHasPre) {
			if (!lowVersion.patch && !lowVersion.minor) return "major";
			if (lowVersion.compareMain(highVersion) === 0) {
				if (lowVersion.minor && !lowVersion.patch) return "minor";
				return "patch";
			}
		}
		const prefix = highHasPre ? "pre" : "";
		if (v1.major !== v2.major) return prefix + "major";
		if (v1.minor !== v2.minor) return prefix + "minor";
		if (v1.patch !== v2.patch) return prefix + "patch";
		return "prerelease";
	};
	module.exports = diff;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/major.js
var require_major = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var major = (a, loose) => new SemVer(a, loose).major;
	module.exports = major;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/minor.js
var require_minor = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var minor = (a, loose) => new SemVer(a, loose).minor;
	module.exports = minor;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/patch.js
var require_patch = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var patch = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var prerelease = (version, options) => {
		const parsed = parse(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare.js
var require_compare = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
	module.exports = compare;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var rcompare = (a, b, loose) => compare(b, a, loose);
	module.exports = rcompare;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var compareLoose = (a, b) => compare(a, b, true);
	module.exports = compareLoose;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var compareBuild = (a, b, loose) => {
		const versionA = new SemVer(a, loose);
		const versionB = new SemVer(b, loose);
		return versionA.compare(versionB) || versionA.compareBuild(versionB);
	};
	module.exports = compareBuild;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/sort.js
var require_sort = __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
	module.exports = sort;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/rsort.js
var require_rsort = __commonJSMin(((exports, module) => {
	var compareBuild = require_compare_build();
	var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
	module.exports = rsort;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gt.js
var require_gt = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gt = (a, b, loose) => compare(a, b, loose) > 0;
	module.exports = gt;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lt.js
var require_lt = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lt = (a, b, loose) => compare(a, b, loose) < 0;
	module.exports = lt;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/eq.js
var require_eq = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var eq = (a, b, loose) => compare(a, b, loose) === 0;
	module.exports = eq;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/neq.js
var require_neq = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var neq = (a, b, loose) => compare(a, b, loose) !== 0;
	module.exports = neq;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gte.js
var require_gte = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gte = (a, b, loose) => compare(a, b, loose) >= 0;
	module.exports = gte;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lte.js
var require_lte = __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lte = (a, b, loose) => compare(a, b, loose) <= 0;
	module.exports = lte;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/cmp.js
var require_cmp = __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var neq = require_neq();
	var gt = require_gt();
	var gte = require_gte();
	var lt = require_lt();
	var lte = require_lte();
	var cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/coerce.js
var require_coerce = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var parse = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		return parse(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/truncate.js
var require_truncate = __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var truncate = (version, truncation, options) => {
		if (!constants.RELEASE_TYPES.includes(truncation)) return null;
		const clonedVersion = cloneInputVersion(version, options);
		return clonedVersion && doTruncation(clonedVersion, truncation);
	};
	var cloneInputVersion = (version, options) => {
		return parse(version instanceof SemVer ? version.version : version, options);
	};
	var doTruncation = (version, truncation) => {
		if (isPrerelease(truncation)) return version.version;
		version.prerelease = [];
		switch (truncation) {
			case "major":
				version.minor = 0;
				version.patch = 0;
				break;
			case "minor": version.patch = 0;
		}
		return version.format();
	};
	var isPrerelease = (type) => {
		return type.startsWith("pre");
	};
	module.exports = truncate;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJSMin(((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			if (!this.delete(key) && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/range.js
var require_range = __commonJSMin(((exports, module) => {
	var SPACE_CHARACTERS = /\s+/g;
	module.exports = class Range {
		constructor(range, options) {
			options = parseOptions(options);
			if (range instanceof Range) {
				if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
				else return new Range(range.raw, options);
			}
			if (range instanceof Comparator) {
				this.raw = range.value;
				this.set = [[range]];
				this.formatted = void 0;
				return this;
			}
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
			this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
			if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				const first = this.set[0];
				this.set = this.set.filter((c) => !isNullSet(c[0]));
				if (this.set.length === 0) this.set = [first];
				else if (this.set.length > 1) {
					for (const c of this.set) if (c.length === 1 && isAny(c[0])) {
						this.set = [c];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let i = 0; i < this.set.length; i++) {
					if (i > 0) this.formatted += "||";
					const comps = this.set[i];
					for (let k = 0; k < comps.length; k++) {
						if (k > 0) this.formatted += " ";
						this.formatted += comps[k].toString().trim();
					}
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(range) {
			range = range.replace(BUILDSTRIPRE, "");
			const memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range;
			const cached = cache.get(memoKey);
			if (cached) return cached;
			const loose = this.options.loose;
			const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
			range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
			debug("hyphen replace", range);
			range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
			debug("comparator trim", range);
			range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
			debug("tilde trim", range);
			range = range.replace(re[t.CARETTRIM], caretTrimReplace);
			debug("caret trim", range);
			let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
			if (loose) rangeList = rangeList.filter((comp) => {
				debug("loose invalid filter", comp, this.options);
				return !!comp.match(re[t.COMPARATORLOOSE]);
			});
			debug("range list", rangeList);
			const rangeMap = new Map();
			const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
			for (const comp of comparators) {
				if (isNullSet(comp)) return [comp];
				rangeMap.set(comp.value, comp);
			}
			if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
			const result = [...rangeMap.values()];
			cache.set(memoKey, result);
			return result;
		}
		intersects(range, options) {
			if (!(range instanceof Range)) throw new TypeError("a Range is required");
			return this.set.some((thisComparators) => {
				return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
					return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
						return rangeComparators.every((rangeComparator) => {
							return thisComparator.intersects(rangeComparator, options);
						});
					});
				});
			});
		}
		test(version) {
			if (!version) return false;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
			return false;
		}
	};
	var cache = new (require_lrucache())();
	var parseOptions = require_parse_options();
	var Comparator = require_comparator();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var { safeRe: re, src, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
	var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
	var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
	var isNullSet = (c) => c.value === "<0.0.0-0";
	var isAny = (c) => c.value === "";
	var isSatisfiable = (comparators, options) => {
		let result = true;
		const remainingComparators = comparators.slice();
		let testComparator = remainingComparators.pop();
		while (result && remainingComparators.length) {
			result = remainingComparators.every((otherComparator) => {
				return testComparator.intersects(otherComparator, options);
			});
			testComparator = remainingComparators.pop();
		}
		return result;
	};
	var parseComparator = (comp, options) => {
		comp = comp.replace(re[t.BUILD], "");
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	};
	var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
	var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
	var replaceTildes = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
	};
	var replaceTilde = (comp, options) => {
		const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("tilde", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
			} else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
			debug("tilde return", ret);
			return ret;
		});
	};
	var replaceCarets = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
	};
	var replaceCaret = (comp, options) => {
		debug("caret", comp, options);
		const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("caret", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) {
				if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
			} else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") {
					if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
					else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
				} else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
			} else {
				debug("no pr");
				if (M === "0") {
					if (m === "0") ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
					else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
				} else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
			}
			debug("caret return", ret);
			return ret;
		});
	};
	var replaceXRanges = (comp, options) => {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
	};
	var replaceXRange = (comp, options) => {
		comp = comp.trim();
		const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
		return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			if (invalidXRangeOrder(M, m, p)) return comp;
			const xM = isX(M);
			const xm = xM || isX(m);
			const xp = xm || isX(p);
			const anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			pr = options.includePrerelease ? "-0" : "";
			if (xM) {
				if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
				else ret = "*";
			} else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				if (gtlt === "<") pr = "-0";
				ret = `${gtlt + M}.${m}.${p}${pr}`;
			} else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
			else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
			debug("xRange return", ret);
			return ret;
		});
	};
	var replaceStars = (comp, options) => {
		debug("replaceStars", comp, options);
		return comp.trim().replace(re[t.STAR], "");
	};
	var replaceGTE0 = (comp, options) => {
		debug("replaceGTE0", comp, options);
		return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
	};
	var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
		else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
		else if (fpr) from = `>=${from}`;
		else from = `>=${from}${incPr ? "-0" : ""}`;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
		else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
		else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
		else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	};
	var testSet = (set, version, options) => {
		for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (let i = 0; i < set.length; i++) {
				debug(set[i].semver);
				if (set[i].semver === Comparator.ANY) continue;
				if (set[i].semver.prerelease.length > 0) {
					const allowed = set[i].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/comparator.js
var require_comparator = __commonJSMin(((exports, module) => {
	var ANY = Symbol("SemVer ANY");
	module.exports = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) {
				if (comp.loose === !!options.loose) return comp;
				else comp = comp.value;
			}
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	var parseOptions = require_parse_options();
	var { safeRe: re, t } = require_re();
	var cmp = require_cmp();
	var debug = require_debug();
	var SemVer = require_semver$1();
	var Range = require_range();
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJSMin(((exports, module) => {
	var Range = require_range();
	var satisfies = (version, range, options) => {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	};
	module.exports = satisfies;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJSMin(((exports, module) => {
	var Range = require_range();
	var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
	module.exports = toComparators;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var maxSatisfying = (versions, range, options) => {
		let max = null;
		let maxSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!max || maxSV.compare(v) === -1) {
					max = v;
					maxSV = new SemVer(max, options);
				}
			}
		});
		return max;
	};
	module.exports = maxSatisfying;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var minSatisfying = (versions, range, options) => {
		let min = null;
		let minSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!min || minSV.compare(v) === 1) {
					min = v;
					minSV = new SemVer(min, options);
				}
			}
		});
		return min;
	};
	module.exports = minSatisfying;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Range = require_range();
	var gt = require_gt();
	var minVersion = (range, loose) => {
		range = new Range(range, loose);
		let minver = new SemVer("0.0.0");
		if (range.test(minver)) return minver;
		minver = new SemVer("0.0.0-0");
		if (range.test(minver)) return minver;
		minver = null;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let setMin = null;
			comparators.forEach((comparator) => {
				const compver = new SemVer(comparator.semver.version);
				switch (comparator.operator) {
					case ">":
						if (compver.prerelease.length === 0) compver.patch++;
						else compver.prerelease.push(0);
						compver.raw = compver.format();
					case "":
					case ">=":
						if (!setMin || gt(compver, setMin)) setMin = compver;
						break;
					case "<":
					case "<=": break;
					default: throw new Error(`Unexpected operation: ${comparator.operator}`);
				}
			});
			if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
		}
		if (minver && range.test(minver)) return minver;
		return null;
	};
	module.exports = minVersion;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/valid.js
var require_valid = __commonJSMin(((exports, module) => {
	var Range = require_range();
	var validRange = (range, options) => {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	};
	module.exports = validRange;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/outside.js
var require_outside = __commonJSMin(((exports, module) => {
	var SemVer = require_semver$1();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var Range = require_range();
	var satisfies = require_satisfies();
	var gt = require_gt();
	var lt = require_lt();
	var lte = require_lte();
	var gte = require_gte();
	var outside = (version, range, hilo, options) => {
		version = new SemVer(version, options);
		range = new Range(range, options);
		let gtfn, ltefn, ltfn, comp, ecomp;
		switch (hilo) {
			case ">":
				gtfn = gt;
				ltefn = lte;
				ltfn = lt;
				comp = ">";
				ecomp = ">=";
				break;
			case "<":
				gtfn = lt;
				ltefn = gte;
				ltfn = gt;
				comp = "<";
				ecomp = "<=";
				break;
			default: throw new TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (satisfies(version, range, options)) return false;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let high = null;
			let low = null;
			comparators.forEach((comparator) => {
				if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
				high = high || comparator;
				low = low || comparator;
				if (gtfn(comparator.semver, high.semver, options)) high = comparator;
				else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
			});
			if (high.operator === comp || high.operator === ecomp) return false;
			if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
			else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
		}
		return true;
	};
	module.exports = outside;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var gtr = (version, range, options) => outside(version, range, ">", options);
	module.exports = gtr;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJSMin(((exports, module) => {
	var outside = require_outside();
	var ltr = (version, range, options) => outside(version, range, "<", options);
	module.exports = ltr;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJSMin(((exports, module) => {
	var Range = require_range();
	var intersects = (r1, r2, options) => {
		r1 = new Range(r1, options);
		r2 = new Range(r2, options);
		return r1.intersects(r2, options);
	};
	module.exports = intersects;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJSMin(((exports, module) => {
	var satisfies = require_satisfies();
	var compare = require_compare();
	module.exports = (versions, range, options) => {
		const set = [];
		let first = null;
		let prev = null;
		const v = versions.sort((a, b) => compare(a, b, options));
		for (const version of v) if (satisfies(version, range, options)) {
			prev = version;
			if (!first) first = version;
		} else {
			if (prev) set.push([first, prev]);
			prev = null;
			first = null;
		}
		if (first) set.push([first, null]);
		const ranges = [];
		for (const [min, max] of set) if (min === max) ranges.push(min);
		else if (!max && min === v[0]) ranges.push("*");
		else if (!max) ranges.push(`>=${min}`);
		else if (min === v[0]) ranges.push(`<=${max}`);
		else ranges.push(`${min} - ${max}`);
		const simplified = ranges.join(" || ");
		const original = typeof range.raw === "string" ? range.raw : String(range);
		return simplified.length < original.length ? simplified : range;
	};
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/subset.js
var require_subset = __commonJSMin(((exports, module) => {
	var Range = require_range();
	var Comparator = require_comparator();
	var { ANY } = Comparator;
	var satisfies = require_satisfies();
	var compare = require_compare();
	var subset = (sub, dom, options = {}) => {
		if (sub === dom) return true;
		sub = new Range(sub, options);
		dom = new Range(dom, options);
		let sawNonNull = false;
		OUTER: for (const simpleSub of sub.set) {
			for (const simpleDom of dom.set) {
				const isSub = simpleSubset(simpleSub, simpleDom, options);
				sawNonNull = sawNonNull || isSub !== null;
				if (isSub) continue OUTER;
			}
			if (sawNonNull) return false;
		}
		return true;
	};
	var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
	var minimumVersion = [new Comparator(">=0.0.0")];
	var simpleSubset = (sub, dom, options) => {
		if (sub === dom) return true;
		if (sub.length === 1 && sub[0].semver === ANY) {
			if (dom.length === 1 && dom[0].semver === ANY) return true;
			else if (options.includePrerelease) sub = minimumVersionWithPreRelease;
			else sub = minimumVersion;
		}
		if (dom.length === 1 && dom[0].semver === ANY) {
			if (options.includePrerelease) return true;
			else dom = minimumVersion;
		}
		const eqSet = new Set();
		let gt, lt;
		for (const c of sub) if (c.operator === ">" || c.operator === ">=") gt = higherGT(gt, c, options);
		else if (c.operator === "<" || c.operator === "<=") lt = lowerLT(lt, c, options);
		else eqSet.add(c.semver);
		if (eqSet.size > 1) return null;
		let gtltComp;
		if (gt && lt) {
			gtltComp = compare(gt.semver, lt.semver, options);
			if (gtltComp > 0) return null;
			else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) return null;
		}
		for (const eq of eqSet) {
			if (gt && !satisfies(eq, String(gt), options)) return null;
			if (lt && !satisfies(eq, String(lt), options)) return null;
			for (const c of dom) if (!satisfies(eq, String(c), options)) return false;
			return true;
		}
		let higher, lower;
		let hasDomLT, hasDomGT;
		let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
		let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
		if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) needDomLTPre = false;
		for (const c of dom) {
			hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
			hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
			if (gt) {
				if (needDomGTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) needDomGTPre = false;
				}
				if (c.operator === ">" || c.operator === ">=") {
					higher = higherGT(gt, c, options);
					if (higher === c && higher !== gt) return false;
				} else if (gt.operator === ">=" && !c.test(gt.semver)) return false;
			}
			if (lt) {
				if (needDomLTPre) {
					if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) needDomLTPre = false;
				}
				if (c.operator === "<" || c.operator === "<=") {
					lower = lowerLT(lt, c, options);
					if (lower === c && lower !== lt) return false;
				} else if (lt.operator === "<=" && !c.test(lt.semver)) return false;
			}
			if (!c.operator && (lt || gt) && gtltComp !== 0) return false;
		}
		if (gt && hasDomLT && !lt && gtltComp !== 0) return false;
		if (lt && hasDomGT && !gt && gtltComp !== 0) return false;
		if (needDomGTPre || needDomLTPre) return false;
		return true;
	};
	var higherGT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
	};
	var lowerLT = (a, b, options) => {
		if (!a) return b;
		const comp = compare(a.semver, b.semver, options);
		return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
	};
	module.exports = subset;
}));
//#endregion
//#region ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/index.js
var require_semver = __commonJSMin(((exports, module) => {
	var internalRe = require_re();
	var constants = require_constants();
	var SemVer = require_semver$1();
	var identifiers = require_identifiers();
	module.exports = {
		parse: require_parse(),
		valid: require_valid$1(),
		clean: require_clean(),
		inc: require_inc(),
		diff: require_diff(),
		major: require_major(),
		minor: require_minor(),
		patch: require_patch(),
		prerelease: require_prerelease(),
		compare: require_compare(),
		rcompare: require_rcompare(),
		compareLoose: require_compare_loose(),
		compareBuild: require_compare_build(),
		sort: require_sort(),
		rsort: require_rsort(),
		gt: require_gt(),
		lt: require_lt(),
		eq: require_eq(),
		neq: require_neq(),
		gte: require_gte(),
		lte: require_lte(),
		cmp: require_cmp(),
		coerce: require_coerce(),
		truncate: require_truncate(),
		Comparator: require_comparator(),
		Range: require_range(),
		satisfies: require_satisfies(),
		toComparators: require_to_comparators(),
		maxSatisfying: require_max_satisfying(),
		minSatisfying: require_min_satisfying(),
		minVersion: require_min_version(),
		validRange: require_valid(),
		outside: require_outside(),
		gtr: require_gtr(),
		ltr: require_ltr(),
		intersects: require_intersects(),
		simplifyRange: require_simplify(),
		subset: require_subset(),
		SemVer,
		re: internalRe.re,
		src: internalRe.src,
		tokens: internalRe.t,
		SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
		RELEASE_TYPES: constants.RELEASE_TYPES,
		compareIdentifiers: identifiers.compareIdentifiers,
		rcompareIdentifiers: identifiers.rcompareIdentifiers
	};
}));
//#endregion
//#region src/composition/constants.ts
var import_semver = require_semver();
var MOLDEA_CLI_FOUNDATIONAL_PACKAGE_NAMES = Object.freeze([
	"@moldea.ai/core",
	"@moldea.ai/repository",
	"@moldea.ai/repository-fs"
]);
var MOLDEA_CLI_FIRST_CLASS_PACKAGE_RANGES = Object.freeze({
	"@moldea.ai/core": "^10.0.0",
	"@moldea.ai/repository": "^4.0.0",
	"@moldea.ai/repository-fs": "^4.0.0"
});
//#endregion
//#region src/composition/validations.ts
var hasExactStringSet = (left, right) => {
	if (left.length !== right.length || new Set(left).size !== left.length || new Set(right).size !== right.length) return false;
	const rightValues = new Set(right);
	return left.every((entry) => rightValues.has(entry));
};
var hasUniquePositiveIntegers = (entries) => entries.length > 0 && entries.every((entry) => Number.isSafeInteger(entry) && entry > 0) && new Set(entries).size === entries.length;
var isMoldeaCliCompositionStateValid = (input) => {
	const { dependencies, installedPackageVersions, supportedNodeRange, version } = input.packageMetadata;
	if ((0, import_semver.valid)(version) === null || supportedNodeRange === null || (0, import_semver.validRange)(supportedNodeRange) === null || (0, import_semver.valid)(input.minimumGitVersion) === null || input.outputSchemaVersion !== 8 || dependencies === null || installedPackageVersions === null || !hasUniquePositiveIntegers(input.coreSupportedRepositoryFormatVersions)) return false;
	const expectedPackageNames = [...MOLDEA_CLI_FOUNDATIONAL_PACKAGE_NAMES];
	const declaredPackageNames = Object.keys(dependencies).filter((packageName) => packageName.startsWith("@moldea.ai/"));
	const resolvedPackageNames = Object.keys(installedPackageVersions);
	if (!hasExactStringSet(declaredPackageNames, expectedPackageNames) || !hasExactStringSet(resolvedPackageNames, expectedPackageNames)) return false;
	return expectedPackageNames.every((packageName) => {
		const resolvedVersion = installedPackageVersions[packageName];
		const declaredRange = dependencies[packageName];
		const supportedRange = MOLDEA_CLI_FIRST_CLASS_PACKAGE_RANGES[packageName];
		return resolvedVersion !== void 0 && (0, import_semver.valid)(resolvedVersion) !== null && supportedRange !== void 0 && (declaredRange === supportedRange || declaredRange === `workspace:${supportedRange}`) && (0, import_semver.satisfies)(resolvedVersion, supportedRange);
	});
};
//#endregion
//#region src/composition/transformers.ts
var compareIdentifiers = (left, right) => left < right ? -1 : left > right ? 1 : 0;
var createMoldeaCliCompositionResult = (input) => {
	const packages = Object.entries(input.packageMetadata.installedPackageVersions ?? {}).map(([name, version]) => ({
		name,
		version
	})).sort((left, right) => compareIdentifiers(left.name, right.name));
	return deepFreeze({
		minimumGitVersion: input.minimumGitVersion,
		packages,
		repositoryFormatVersions: [...input.coreSupportedRepositoryFormatVersions].sort((left, right) => left - right),
		supportedNodeRange: input.packageMetadata.supportedNodeRange ?? ""
	});
};
//#endregion
//#region src/composition/composition.ts
var INVALID_COMPOSITION_RESOLUTION = Object.freeze({ kind: "invalid" });
var resolveMoldeaCliComposition = (input) => {
	try {
		if (!isMoldeaCliCompositionStateValid(input)) return INVALID_COMPOSITION_RESOLUTION;
		return Object.freeze({
			kind: "valid",
			result: createMoldeaCliCompositionResult(input)
		});
	} catch {
		return INVALID_COMPOSITION_RESOLUTION;
	}
};
var resolveInstalledMoldeaCliComposition = (input) => resolveMoldeaCliComposition({
	coreSupportedRepositoryFormatVersions: SUPPORTED_REPOSITORY_FORMAT_VERSIONS,
	minimumGitVersion: MINIMUM_GIT_VERSION,
	outputSchemaVersion: 8,
	packageMetadata: input.packageMetadata
});
//#endregion
export { formatMoldeaCliJsonScopeResult as A, ERRORS$1 as B, formatMoldeaCliHumanInspectResult as C, formatMoldeaCliJsonContentResult as D, formatMoldeaCliJsonCompositionResult as E, isRepositoryDirectoryInputValid as F, MOLDEA_CLI_COMMANDS as H, createMoldeaCliOutputPage as I, calculateMoldeaCliJsonDigest as L, createMoldeaCliOwnedError as M, MOLDEA_CLI_GIT_WORKING_TREE_SOURCE as N, formatMoldeaCliJsonError as O, parseMoldeaCliArguments as P, decodeMoldeaCliCursor as R, formatMoldeaCliHumanError as S, formatMoldeaCliHumanValidateResult as T, ERRORS$2 as U, MoldeaCliOutputPageException as V, createMoldeaCliInspectProjection as _, require_semver as a, formatMoldeaCliHumanCompositionResult as b, checkGitResult as c, listUntrackedFiles as d, readConfigBoolean as f, createMoldeaCliDiagnosticRecord as g, runGit as h, isMoldeaCliCompositionStateValid as i, formatMoldeaCliJsonValidateResult as j, formatMoldeaCliJsonInspectResult as k, createGitFailure as l, readTopLevel as m, resolveMoldeaCliComposition as n, MoldeaCliCompositionException as o, readIndexEntries as p, createMoldeaCliCompositionResult as r, createGitVersionPreflight as s, resolveInstalledMoldeaCliComposition as t, readGit as u, createMoldeaCliValidateProjection as v, formatMoldeaCliHumanScopeResult as w, formatMoldeaCliHumanContentResult as x, formatMoldeaCliHelp as y, encodeMoldeaCliCursor as z };
