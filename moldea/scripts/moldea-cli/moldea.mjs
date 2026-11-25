import { c as validateByteLimit, d as ERRORS, f as Exception, l as isIntegerValid, m as hasErrorCode, n as CoreOperationException, t as CoreConfigurationException, u as isObjectValid } from "./chunk-728df961.mjs";
import { A as formatMoldeaCliJsonScopeResult, B as ERRORS$2, C as formatMoldeaCliHumanInspectResult, D as formatMoldeaCliJsonContentResult, E as formatMoldeaCliJsonCompositionResult, F as isRepositoryDirectoryInputValid, H as MOLDEA_CLI_COMMANDS, I as createMoldeaCliOutputPage, L as calculateMoldeaCliJsonDigest, M as createMoldeaCliOwnedError, N as MOLDEA_CLI_GIT_WORKING_TREE_SOURCE, O as formatMoldeaCliJsonError, P as parseMoldeaCliArguments, R as decodeMoldeaCliCursor, S as formatMoldeaCliHumanError, T as formatMoldeaCliHumanValidateResult, U as ERRORS$1, V as MoldeaCliOutputPageException, _ as createMoldeaCliInspectProjection, a as require_semver, b as formatMoldeaCliHumanCompositionResult, c as checkGitResult, d as listUntrackedFiles, f as readConfigBoolean, g as createMoldeaCliDiagnosticRecord, h as runGit, j as formatMoldeaCliJsonValidateResult, k as formatMoldeaCliJsonInspectResult, l as createGitFailure, m as readTopLevel, o as MoldeaCliCompositionException, p as readIndexEntries, s as createGitVersionPreflight, u as readGit, v as createMoldeaCliValidateProjection, w as formatMoldeaCliHumanScopeResult, x as formatMoldeaCliHumanContentResult, y as formatMoldeaCliHelp, z as encodeMoldeaCliCursor } from "./chunk-d5af3eda.mjs";
import { g as countUtf8Bytes } from "./chunk-a5514957.mjs";
import { n as createCore } from "./chunk-459da9cf.mjs";
import { a as compareRepositoryPaths$1, c as isRepositoryPath, i as RepositorySourceException, l as parseRepositoryPath, n as REPOSITORY_ROOT, o as createRepositoryComparison, r as RepositoryPathException } from "./chunk-8d6114d2.mjs";
import path from "node:path";
import process$1 from "node:process";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";
import { constants as constants$1 } from "node:os";
import { TextDecoder as TextDecoder$1 } from "node:util";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { lstat, open, opendir, readdir, readlink, realpath, stat } from "node:fs/promises";
import { Buffer as Buffer$1 } from "node:buffer";
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/byte-cache.js
var cloneBytes = (bytes) => new Uint8Array(bytes);
var createByteCache = ({ maxBytes, maxEntries }) => {
	validateByteLimit(maxBytes);
	if (maxEntries !== void 0 && (!Number.isSafeInteger(maxEntries) || maxEntries < 1)) throw new Exception("The entry limit must be a positive safe integer.", {
		code: ERRORS.INVALID_BYTE_LIMIT,
		data: { maxEntries: String(maxEntries) }
	});
	const entryLimit = maxEntries ?? Number.POSITIVE_INFINITY;
	const entries = new Map();
	let byteLength = 0;
	let retainedBytes = 0;
	let retainedEntries = 0;
	const evict = (key, entry) => {
		entries.delete(key);
		byteLength -= entry.bytes.byteLength;
	};
	return {
		get: (key) => {
			const entry = entries.get(key);
			if (entry === void 0) return;
			entries.delete(key);
			entries.set(key, entry);
			return cloneBytes(entry.bytes);
		},
		set: (key, bytes) => {
			const existing = entries.get(key);
			if (existing !== void 0 && existing.retentions > 0) return false;
			if (retainedBytes + bytes.byteLength > maxBytes || retainedEntries + 1 > entryLimit) return false;
			if (existing !== void 0) evict(key, existing);
			for (const [oldestKey, oldest] of entries) {
				if (byteLength + bytes.byteLength <= maxBytes && entries.size < entryLimit) break;
				if (oldest.retentions === 0) evict(oldestKey, oldest);
			}
			entries.set(key, {
				bytes: cloneBytes(bytes),
				retentions: 0
			});
			byteLength += bytes.byteLength;
			return true;
		},
		retain: (key) => {
			let entry = entries.get(key);
			if (entry === void 0) return;
			if (entry.retentions === 0) {
				retainedBytes += entry.bytes.byteLength;
				retainedEntries += 1;
			}
			entry.retentions += 1;
			return {
				copyBytes: () => entry === void 0 ? void 0 : cloneBytes(entry.bytes),
				release: () => {
					if (entry === void 0) return;
					entry.retentions -= 1;
					if (entry.retentions === 0) {
						retainedBytes -= entry.bytes.byteLength;
						retainedEntries -= 1;
					}
					entry = void 0;
				}
			};
		},
		get byteLength() {
			return byteLength;
		}
	};
};
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/constants.js
var MAX_TIMEOUT_MS = 2147483647;
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/request-coordinator.js
var assertQueueLimit = (limit, name) => {
	if (!isIntegerValid(limit, 0)) throw new Exception("The queue limit must be an integer of at least 0.", {
		code: ERRORS.INVALID_QUEUE_LIMIT,
		data: { [name]: String(limit) }
	});
};
var toDeadlineMs = (deadline) => {
	const deadlineMs = deadline instanceof Date ? deadline.getTime() : deadline;
	if (typeof deadlineMs !== "number" || Number.isNaN(new Date(deadlineMs).getTime())) throw new Exception("The deadline must be a valid Date or epoch milliseconds a Date accepts.", {
		code: ERRORS.INVALID_DATE,
		data: { deadline: String(deadline) }
	});
	return deadlineMs;
};
var createRequestCoordinator = ({ maxConcurrent, maxQueued }) => {
	if (!isIntegerValid(maxConcurrent, 1)) throw new Exception("The concurrency limit must be an integer of at least 1.", {
		code: ERRORS.INVALID_CONCURRENCY_LIMIT,
		data: { maxConcurrent: String(maxConcurrent) }
	});
	assertQueueLimit(maxQueued, "maxQueued");
	let activeCount = 0;
	let cooldownUntil = 0;
	let timer;
	let isClosed = false;
	const waiters = [];
	const createCooldownError = () => new Exception("Requests are paused until the cooldown ends.", {
		code: ERRORS.REQUEST_COOLDOWN_ACTIVE,
		data: { retryAt: new Date(cooldownUntil).toISOString() }
	});
	const createClosedError = () => new Exception("The request coordinator is closed.", { code: ERRORS.REQUEST_COORDINATOR_CLOSED });
	const clearTimer = () => {
		if (timer !== void 0) {
			clearTimeout(timer);
			timer = void 0;
		}
	};
	const schedule = () => {
		clearTimer();
		if (waiters.length === 0) return;
		const remainingMs = cooldownUntil - Date.now();
		if (remainingMs > 0) {
			for (let index = waiters.length - 1; index >= 0; index -= 1) {
				const waiter = waiters[index];
				if (waiter?.rejectDuringCooldown === true) {
					waiters.splice(index, 1);
					waiter.detach();
					waiter.reject(createCooldownError());
				}
			}
			if (waiters.length > 0) timer = setTimeout(schedule, Math.min(remainingMs, MAX_TIMEOUT_MS));
			return;
		}
		while (activeCount < maxConcurrent) {
			const waiter = waiters.shift();
			if (waiter === void 0) return;
			waiter.detach();
			if (waiter.signal?.aborted === true) waiter.reject(waiter.signal.reason);
			else {
				activeCount += 1;
				waiter.resolve();
			}
		}
	};
	const acquire = ({ signal, caller, maxQueuedForCaller, rejectDuringCooldown = false }) => {
		if (isClosed) return Promise.reject(createClosedError());
		if (signal?.aborted === true) return Promise.reject(signal.reason);
		if (maxQueuedForCaller !== void 0) assertQueueLimit(maxQueuedForCaller, "maxQueuedForCaller");
		const isCoolingDown = cooldownUntil > Date.now();
		if (isCoolingDown && rejectDuringCooldown) return Promise.reject(createCooldownError());
		if (!isCoolingDown && activeCount < maxConcurrent && waiters.length === 0) {
			activeCount += 1;
			return Promise.resolve();
		}
		if (maxQueuedForCaller !== void 0) {
			const callerQueued = waiters.filter((waiter) => waiter.caller === caller).length;
			if (callerQueued >= maxQueuedForCaller) return Promise.reject(new Exception("The request queue is full.", {
				code: ERRORS.REQUEST_QUEUE_FULL,
				data: {
					scope: "caller",
					queued: callerQueued,
					limit: maxQueuedForCaller
				}
			}));
		}
		if (waiters.length >= maxQueued) return Promise.reject(new Exception("The request queue is full.", {
			code: ERRORS.REQUEST_QUEUE_FULL,
			data: {
				scope: "global",
				queued: waiters.length,
				limit: maxQueued
			}
		}));
		return new Promise((resolve, reject) => {
			const onAbort = () => {
				waiters.splice(waiters.indexOf(waiter), 1);
				waiter.detach();
				schedule();
				reject(signal?.reason);
			};
			const waiter = {
				caller,
				signal,
				rejectDuringCooldown,
				resolve,
				reject,
				detach: () => signal?.removeEventListener("abort", onAbort)
			};
			waiters.push(waiter);
			signal?.addEventListener("abort", onAbort, { once: true });
			schedule();
		});
	};
	return {
		run: async (task, options = {}) => {
			await acquire(options);
			try {
				return await task();
			} finally {
				activeCount -= 1;
				schedule();
			}
		},
		deferUntil: (deadline) => {
			cooldownUntil = Math.max(cooldownUntil, toDeadlineMs(deadline));
			schedule();
		},
		isIdle: () => activeCount === 0 && waiters.length === 0 && cooldownUntil <= Date.now(),
		close: () => {
			isClosed = true;
			clearTimer();
			for (const waiter of waiters.splice(0)) {
				waiter.detach();
				waiter.reject(createClosedError());
			}
		}
	};
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/shutdown-signal/constants.js
var DEFAULT_SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"];
var UNHANDLEABLE_SIGNALS = new Set(["SIGKILL", "SIGSTOP"]);
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/shutdown-signal/shutdown-signal.js
var createInvalidSignalError = () => new Exception("The shutdown needs a non-empty list of signals Node.js can listen for, such as SIGINT, other than SIGKILL and SIGSTOP, and an onSignal that's a function when it's given.", { code: ERRORS$1.INVALID_SIGNAL });
var readSignals = (signals) => {
	const unique = Array.isArray(signals) ? [...new Set(signals)] : [];
	if (!(unique.length > 0 && unique.every((signal) => typeof signal === "string" && Object.hasOwn(constants$1.signals, signal) && !UNHANDLEABLE_SIGNALS.has(signal)))) throw createInvalidSignalError();
	return unique;
};
var createShutdownSignal = ({ signals = DEFAULT_SHUTDOWN_SIGNALS, onSignal, setExitCode = true, forceOnRepeat = false, disconnect = false } = {}) => {
	if (onSignal !== void 0 && typeof onSignal !== "function") throw createInvalidSignalError();
	const listenedSignals = readSignals(signals);
	const controller = new AbortController();
	let received = null;
	let isDisposed = false;
	const toExitCode = (signal) => 128 + constants$1.signals[signal];
	const onDisconnect = () => {
		onProcessSignal("SIGTERM");
	};
	const onProcessSignal = (signal) => {
		if (received !== null) return;
		received = signal;
		const exitCode = toExitCode(signal);
		if (setExitCode) process.exitCode = exitCode;
		if (forceOnRepeat) dispose();
		controller.abort(new Exception(`The process was interrupted by ${signal}.`, {
			code: ERRORS$1.PROCESS_INTERRUPTED,
			data: {
				signal,
				exitCode
			}
		}));
		try {
			Promise.resolve(onSignal?.(signal)).catch(() => void 0);
		} catch {}
	};
	const dispose = () => {
		if (isDisposed) return;
		isDisposed = true;
		for (const signal of listenedSignals) process.off(signal, onProcessSignal);
		process.off("disconnect", onDisconnect);
	};
	for (const signal of listenedSignals) process.on(signal, onProcessSignal);
	if (disconnect && process.send !== void 0) {
		if (process.connected) process.on("disconnect", onDisconnect);
		else onDisconnect();
	}
	return {
		signal: controller.signal,
		receivedSignal: () => received,
		exitCode: () => received === null ? null : toExitCode(received),
		dispose
	};
};
//#endregion
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/command-line/stdin.js
var readStdin = ({ maxBytes, signal }) => new Promise((resolve, reject) => {
	if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
		reject(new Exception("The stdin limit must be a positive safe integer.", {
			code: ERRORS$1.INVALID_PROCESS_OPTIONS,
			data: { maxBytes: String(maxBytes) }
		}));
		return;
	}
	const { stdin } = process;
	const chunks = [];
	let byteLength = 0;
	const cleanUp = () => {
		stdin.off("data", onData);
		stdin.off("end", onEnd);
		stdin.off("error", onError);
		signal?.removeEventListener("abort", onAbort);
	};
	const fail = (error) => {
		cleanUp();
		stdin.destroy();
		reject(error);
	};
	const onData = (chunk) => {
		byteLength += chunk.length;
		if (byteLength > maxBytes) {
			fail(new Exception(`The input on stdin is larger than ${maxBytes} bytes.`, {
				code: ERRORS$1.STDIN_TOO_LARGE,
				data: { maxBytes }
			}));
			return;
		}
		chunks.push(chunk);
	};
	const onEnd = () => {
		cleanUp();
		resolve(Buffer.concat(chunks));
	};
	const onError = (error) => {
		fail(error);
	};
	const onAbort = () => {
		fail(signal?.reason);
	};
	if (signal?.aborted) {
		fail(signal.reason);
		return;
	}
	signal?.addEventListener("abort", onAbort, { once: true });
	stdin.on("data", onData);
	stdin.once("end", onEnd);
	stdin.once("error", onError);
});
//#endregion
//#region src/cli-execution/constants.ts
var MOLDEA_CLI_EXIT_CODES = {
	Interrupted: 130,
	OperationalError: 3,
	StructuralInvalid: 1,
	Success: 0,
	Terminated: 143,
	UsageError: 2
};
//#endregion
//#region ../../node_modules/.pnpm/jg-crypto@0.3.0/node_modules/jg-crypto/dist/hmac/utilities.js
var SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;
var computeHmac = (message, secret, { domain }) => {
	if (!(typeof secret === "string" ? secret.length > 0 : secret instanceof Uint8Array && secret.length > 0)) throw new Exception("The HMAC secret must be a non-empty string or byte array.", { code: ERRORS$2.INVALID_HMAC_SECRET });
	if (domain !== void 0 && (typeof domain !== "string" || domain.length === 0)) throw new Exception("The HMAC domain must be a non-empty string when it's given.", { code: ERRORS$2.INVALID_HMAC_DOMAIN });
	const key = domain === void 0 ? secret : createHmac("sha256", secret).update(domain).digest();
	return createHmac("sha256", key).update(message).digest();
};
//#endregion
//#region ../../node_modules/.pnpm/jg-crypto@0.3.0/node_modules/jg-crypto/dist/hmac/hmac.js
var signHmac = (message, secret, options = {}) => computeHmac(message, secret, options).toString("hex");
var verifyHmac = (message, signature, secret, options = {}) => {
	const expected = computeHmac(message, secret, options);
	if (typeof signature !== "string" || !SIGNATURE_PATTERN.test(signature)) return false;
	return timingSafeEqual(Buffer.from(signature, "hex"), expected);
};
//#endregion
//#region src/json-output-contract/guard.ts
var assertMoldeaCliJsonResultIsContentFree = (value, canonicalBodies = []) => {
	const pending = [value];
	const visited = new Set();
	const bodies = new Set(canonicalBodies.filter((body) => body.length > 0));
	while (pending.length > 0) {
		const current = pending.pop();
		if (typeof current === "string") {
			if (bodies.has(current)) throw new TypeError("A non-content CLI result contains canonical document text.");
			continue;
		}
		if (typeof current !== "object" || current === null || visited.has(current)) continue;
		visited.add(current);
		if (Array.isArray(current)) {
			for (const item of current) pending.push(item);
			continue;
		}
		const record = current;
		if (Object.hasOwn(record, "content")) throw new TypeError("A non-content CLI result contains a content property.");
		pending.push(...Object.values(record));
	}
};
//#endregion
//#region src/git-working-tree/constants.ts
var MAX_GIT_DISCOVERY_OUTPUT_BYTES = 262144;
//#endregion
//#region src/git-working-tree/parser.ts
var UTF8_BYTE_ORDER_MARK = [
	239,
	187,
	191
];
var decodeGitOutput = (output) => {
	if (output.byteLength === 0 || output.byteLength > 262144 || UTF8_BYTE_ORDER_MARK.every((byte, index) => output[index] === byte)) return null;
	let decodedOutput;
	try {
		decodedOutput = new TextDecoder("utf-8", {
			fatal: true,
			ignoreBOM: true
		}).decode(output);
	} catch {
		return null;
	}
	if (decodedOutput.includes("\0") || !decodedOutput.isWellFormed()) return null;
	return decodedOutput;
};
var parseGitPathOutput = (output) => {
	const decodedOutput = decodeGitOutput(output);
	if (decodedOutput === null || !decodedOutput.endsWith("\n")) return null;
	const gitPath = process$1.platform === "win32" && decodedOutput.endsWith("\r\n") ? decodedOutput.slice(0, -2) : decodedOutput.slice(0, -1);
	return gitPath.length === 0 ? null : gitPath;
};
var parseGitAbsolutePathOutput = (output) => {
	const gitPath = parseGitPathOutput(output);
	if (gitPath === null || !path.isAbsolute(gitPath)) return null;
	return gitPath;
};
//#endregion
//#region src/git-working-tree/starting-directory.ts
var mapFilesystemFailure$3 = (error) => {
	const errorCode = error?.code?.toUpperCase();
	if (errorCode === "ENOENT" || errorCode === "ENOTDIR") return Object.freeze({
		errorCode: "GIT_REPOSITORY_NOT_FOUND",
		kind: "failed"
	});
	if (errorCode === "EACCES" || errorCode === "EPERM") return Object.freeze({
		errorCode: "GIT_ACCESS_DENIED",
		kind: "failed"
	});
	return Object.freeze({
		errorCode: "GIT_COMMAND_FAILED",
		kind: "failed"
	});
};
var createGitStartingDirectoryInspector = (inspectPath = stat) => async (input) => {
	if (!path.isAbsolute(input.invocationDirectory) || input.invocationDirectory.includes("\0") || !input.invocationDirectory.isWellFormed() || input.repositoryDirectory !== null && !isRepositoryDirectoryInputValid(input.repositoryDirectory)) return Object.freeze({
		errorCode: "GIT_REPOSITORY_NOT_FOUND",
		kind: "failed"
	});
	const selectedDirectory = input.repositoryDirectory === null ? input.invocationDirectory : path.isAbsolute(input.repositoryDirectory) ? input.repositoryDirectory : path.resolve(input.invocationDirectory, input.repositoryDirectory);
	try {
		if (!(await inspectPath(selectedDirectory)).isDirectory()) return Object.freeze({
			errorCode: "GIT_REPOSITORY_NOT_FOUND",
			kind: "failed"
		});
	} catch (error) {
		return mapFilesystemFailure$3(error);
	}
	return Object.freeze({
		directory: selectedDirectory,
		kind: "found"
	});
};
var inspectGitStartingDirectory = createGitStartingDirectoryInspector();
//#endregion
//#region src/git-command/run-git-command.ts
var runGitCommand = async (args, { cwd, input, maxOutputBytes, signal }) => {
	const subcommand = args[0];
	const execution = await readGit(() => runGit(args, {
		cwd,
		encoding: "buffer",
		maxOutputBytes,
		timeoutSeconds: 300,
		...input === void 0 ? {} : { input },
		...signal === void 0 ? {} : { signal }
	}), signal, subcommand);
	if (execution.kind === "failed") return execution;
	const reason = checkGitResult(execution.value, subcommand ?? "");
	return reason === null ? Object.freeze({
		kind: "completed",
		value: execution.value.stdout
	}) : createGitFailure(reason, subcommand);
};
//#endregion
//#region src/git-working-tree/discovery.ts
var GIT_DISCOVERY_READS = Object.freeze({
	readConfigBoolean,
	readTopLevel
});
var mapGitFailure$5 = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var createDiscoveryFailure = (errorCode) => Object.freeze({
	errorCode,
	kind: "failed"
});
var createGitWorkingTreeDiscovery = (git = GIT_DISCOVERY_READS, startingDirectoryInspector = inspectGitStartingDirectory, gitVersionPreflight = createGitVersionPreflight()) => async (input) => {
	const startingDirectoryResult = await startingDirectoryInspector(input);
	if (startingDirectoryResult.kind === "failed") return createDiscoveryFailure(startingDirectoryResult.errorCode);
	const gitOptions = {
		maxOutputBytes: MAX_GIT_DISCOVERY_OUTPUT_BYTES,
		timeoutSeconds: 300,
		...input.signal === void 0 ? {} : { signal: input.signal }
	};
	const rootResult = await readGit(() => git.readTopLevel(startingDirectoryResult.directory, gitOptions), input.signal);
	if (rootResult.kind === "failed") return createDiscoveryFailure(mapGitFailure$5(rootResult.reason));
	if (rootResult.value === null) return createDiscoveryFailure("GIT_WORK_TREE_REQUIRED");
	const repositoryRoot = rootResult.value;
	if (!path.isAbsolute(repositoryRoot)) return createDiscoveryFailure("GIT_OUTPUT_INVALID");
	const rootDirectoryResult = await startingDirectoryInspector({
		invocationDirectory: startingDirectoryResult.directory,
		repositoryDirectory: repositoryRoot
	});
	if (rootDirectoryResult.kind === "failed") return createDiscoveryFailure(rootDirectoryResult.errorCode);
	const versionResult = await gitVersionPreflight(rootDirectoryResult.directory, input.signal);
	if (versionResult.kind === "failed") return createDiscoveryFailure(versionResult.errorCode);
	const sparseCheckoutResult = await readGit(() => git.readConfigBoolean(rootDirectoryResult.directory, "core.sparseCheckout", false, gitOptions), input.signal);
	if (sparseCheckoutResult.kind === "failed") return createDiscoveryFailure(mapGitFailure$5(sparseCheckoutResult.reason));
	if (sparseCheckoutResult.value) return createDiscoveryFailure("GIT_SPARSE_CHECKOUT_UNSUPPORTED");
	return Object.freeze({
		kind: "discovered",
		repositoryRoot
	});
};
var discoverGitWorkingTree = createGitWorkingTreeDiscovery();
//#endregion
//#region src/host-path-identity/utilities.ts
var areHostPathsEquivalent = (left, right, hostPathOperations = path) => hostPathOperations.relative(hostPathOperations.resolve(left), hostPathOperations.resolve(right)) === "";
var haveSameHostPathIdentity = (left, right) => left.ino !== 0n && left.dev === right.dev && left.ino === right.ino;
//#endregion
//#region src/git-working-tree/identity/comparator.ts
var areLocationsEqual = (left, right) => haveSameHostPathIdentity(left, right);
var areGitWorkingTreeIdentitiesEqual = (left, right) => areLocationsEqual(left.repositoryRoot, right.repositoryRoot) && areLocationsEqual(left.gitDirectory, right.gitDirectory) && areLocationsEqual(left.commonDirectory, right.commonDirectory);
//#endregion
//#region src/git-working-tree/identity/constants.ts
var GIT_WORKING_TREE_IDENTITY_ARGUMENTS = Object.freeze({
	CommonDirectory: Object.freeze(["rev-parse", "--git-common-dir"]),
	GitDirectory: Object.freeze(["rev-parse", "--absolute-git-dir"]),
	RepositoryRoot: Object.freeze(["rev-parse", "--show-toplevel"])
});
//#endregion
//#region src/git-working-tree/identity/inspector.ts
var inspectDirectoryIdentity = async (hostPath) => stat(hostPath, { bigint: true });
var createInspectionFailure$2 = (errorCode) => Object.freeze({
	errorCode,
	kind: "failed"
});
var mapGitFailure$4 = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var mapFilesystemFailure$2 = (error) => {
	let errorCode;
	try {
		if (typeof error === "object" && error !== null && "code" in error) {
			const unknownCode = error.code;
			errorCode = typeof unknownCode === "string" ? unknownCode.toUpperCase() : void 0;
		}
	} catch {
		return "GIT_COMMAND_FAILED";
	}
	if (errorCode === "ENOENT" || errorCode === "ENOTDIR") return "GIT_REPOSITORY_NOT_FOUND";
	if (errorCode === "EACCES" || errorCode === "EPERM") return "GIT_ACCESS_DENIED";
	return "GIT_COMMAND_FAILED";
};
var queryGitPath = async (runGit, repositoryRoot, arguments_, isAbsoluteRequired, signal) => {
	const result = await runGit(arguments_, {
		cwd: repositoryRoot,
		maxOutputBytes: MAX_GIT_DISCOVERY_OUTPUT_BYTES,
		...signal === void 0 ? {} : { signal }
	});
	if (result.kind === "failed") return createInspectionFailure$2(mapGitFailure$4(result.reason));
	return (isAbsoluteRequired ? parseGitAbsolutePathOutput(result.value) : parseGitPathOutput(result.value)) ?? createInspectionFailure$2("GIT_OUTPUT_INVALID");
};
var captureLocation = async (inspectPath, hostPath, invalidTypeCode) => {
	try {
		const statistics = await inspectPath(hostPath);
		if (!statistics.isDirectory() || statistics.ino === 0n) return createInspectionFailure$2(invalidTypeCode);
		return Object.freeze({
			dev: statistics.dev,
			ino: statistics.ino,
			path: hostPath
		});
	} catch (error) {
		return createInspectionFailure$2(mapFilesystemFailure$2(error));
	}
};
var isInspectionFailure$1 = (result) => typeof result === "object" && "kind" in result && result.kind === "failed";
var createGitWorkingTreeIdentityInspector = (runGit = runGitCommand, inspectPath = inspectDirectoryIdentity) => {
	return async (input) => {
		if (!path.isAbsolute(input.repositoryRoot) || input.repositoryRoot.includes("\0") || !input.repositoryRoot.isWellFormed()) return createInspectionFailure$2("GIT_OUTPUT_INVALID");
		const discoveredRoot = await queryGitPath(runGit, input.repositoryRoot, GIT_WORKING_TREE_IDENTITY_ARGUMENTS.RepositoryRoot, true, input.signal);
		if (isInspectionFailure$1(discoveredRoot)) return discoveredRoot;
		const repositoryRoot = await captureLocation(inspectPath, discoveredRoot, "GIT_WORK_TREE_REQUIRED");
		if (input.signal?.aborted) return createInspectionFailure$2("GIT_OPERATION_ABORTED");
		if (isInspectionFailure$1(repositoryRoot)) return repositoryRoot;
		if (!areHostPathsEquivalent(discoveredRoot, input.repositoryRoot)) {
			const selectedRepositoryRoot = await captureLocation(inspectPath, input.repositoryRoot, "GIT_WORK_TREE_REQUIRED");
			if (input.signal?.aborted) return createInspectionFailure$2("GIT_OPERATION_ABORTED");
			if (isInspectionFailure$1(selectedRepositoryRoot)) return selectedRepositoryRoot;
			if (!haveSameHostPathIdentity(repositoryRoot, selectedRepositoryRoot)) return Object.freeze({ kind: "mismatched" });
		}
		const gitDirectoryPath = await queryGitPath(runGit, input.repositoryRoot, GIT_WORKING_TREE_IDENTITY_ARGUMENTS.GitDirectory, true, input.signal);
		if (isInspectionFailure$1(gitDirectoryPath)) return gitDirectoryPath;
		const commonDirectoryOutput = await queryGitPath(runGit, input.repositoryRoot, GIT_WORKING_TREE_IDENTITY_ARGUMENTS.CommonDirectory, false, input.signal);
		if (isInspectionFailure$1(commonDirectoryOutput)) return commonDirectoryOutput;
		const commonDirectoryPath = path.isAbsolute(commonDirectoryOutput) ? commonDirectoryOutput : path.resolve(input.repositoryRoot, commonDirectoryOutput);
		const gitDirectory = await captureLocation(inspectPath, gitDirectoryPath, "GIT_OUTPUT_INVALID");
		if (input.signal?.aborted) return createInspectionFailure$2("GIT_OPERATION_ABORTED");
		if (isInspectionFailure$1(gitDirectory)) return gitDirectory;
		const commonDirectory = await captureLocation(inspectPath, commonDirectoryPath, "GIT_OUTPUT_INVALID");
		if (input.signal?.aborted) return createInspectionFailure$2("GIT_OPERATION_ABORTED");
		if (isInspectionFailure$1(commonDirectory)) return commonDirectory;
		return Object.freeze({
			identity: Object.freeze({
				commonDirectory,
				gitDirectory,
				repositoryRoot
			}),
			kind: "inspected"
		});
	};
};
var inspectGitWorkingTreeIdentity = createGitWorkingTreeIdentityInspector();
//#endregion
//#region src/project-content/exception.ts
var MoldeaCliProjectContentException = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "MoldeaCliProjectContentException";
	}
};
//#endregion
//#region src/project-content/validations.ts
var CONTEXT_PATH_PATTERN = /^\/moldea\/context\/(?:[^/]+\/)*[^/]+\.md$/u;
var DECISION_PATH_PATTERN = /^\/moldea\/decisions\/[^/]+\.md$/u;
var AGENT_PATH_PATTERN = /^\/moldea\/agents\/[^/]+\/(?:description|instruction)\.md$/u;
var isMoldeaCliCanonicalContentPath = (path) => {
	if (/[?*[\]{}]/u.test(path)) return false;
	return path === "/moldea/moldea.yaml" || path === "/moldea/project.md" || CONTEXT_PATH_PATTERN.test(path) || DECISION_PATH_PATTERN.test(path) || AGENT_PATH_PATTERN.test(path);
};
var parseMoldeaCliCanonicalContentPath = (input) => {
	let path;
	try {
		path = parseRepositoryPath(input);
	} catch {
		throw new MoldeaCliProjectContentException("CONTENT_PATH_INVALID");
	}
	if (!isMoldeaCliCanonicalContentPath(path)) throw new MoldeaCliProjectContentException("CONTENT_PATH_INVALID");
	return path;
};
//#endregion
//#region src/project-content/executor.ts
var createMoldeaCliProjectContentExecutor = (coreFactory = createCore) => {
	return async (input) => {
		return coreFactory({ limits: Object.freeze({
			maxDiagnostics: input.resourceLimits.maxDiagnostics,
			maxEntries: input.resourceLimits.maxEntries,
			maxCoverage: input.resourceLimits.maxCoverage,
			maxFileBytes: input.resourceLimits.maxFileBytes,
			maxManifestBytes: input.resourceLimits.maxManifestBytes,
			maxTotalBytesRead: input.resourceLimits.maxTotalBytes
		}) }).readCanonicalContentPage({
			maxBytes: input.maxBytes,
			offset: input.offset,
			path: input.path,
			repository: input.repository,
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
	};
};
var executeMoldeaCliProjectContent = createMoldeaCliProjectContentExecutor();
//#endregion
//#region src/project-content/page.ts
var createCandidate = (input, scalars, scalarEnd, snapshotDigest) => {
	const content = scalars.slice(0, scalarEnd).join("");
	const byteEnd = input.page.byteStart + Buffer.byteLength(content, "utf8");
	const isComplete = byteEnd === input.page.totalBytes;
	return {
		asset: {
			contentIdentity: input.page.contentIdentity,
			path: input.page.path,
			totalBytes: input.page.totalBytes
		},
		chunk: {
			byteEnd,
			byteStart: input.page.byteStart,
			content
		},
		cursor: isComplete ? null : encodeMoldeaCliCursor("content", { path: input.page.path }, snapshotDigest, `byte:${byteEnd}`, `byte:${byteEnd}`),
		snapshotDigest
	};
};
var createSnapshotDigest = (input) => calculateMoldeaCliJsonDigest({
	contentIdentity: input.page.contentIdentity,
	path: input.page.path,
	totalBytes: input.page.totalBytes
});
var createMoldeaCliContentPage = (input) => {
	const snapshotDigest = createSnapshotDigest(input);
	const cursorState = input.cursor === null ? null : decodeMoldeaCliCursor({
		command: "content",
		cursor: input.cursor,
		filters: { path: input.page.path },
		snapshotDigest
	});
	const expectedSourceCursor = `byte:${input.page.byteStart}`;
	if (cursorState === null && input.page.byteStart !== 0 || cursorState !== null && cursorState.sourceCursor !== expectedSourceCursor) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
	const scalars = Array.from(input.page.content);
	const emptyResult = createCandidate(input, scalars, 0, snapshotDigest);
	if (scalars.length === 0) {
		if (!input.page.isComplete || input.measure(emptyResult) > input.maxOutputBytes) throw new MoldeaCliOutputPageException("OUTPUT_BUDGET_TOO_SMALL");
		return Object.freeze({
			...emptyResult,
			asset: Object.freeze(emptyResult.asset),
			chunk: Object.freeze(emptyResult.chunk)
		});
	}
	let lower = 1;
	let upper = scalars.length;
	let selected = null;
	while (lower <= upper) {
		const scalarEnd = lower + Math.floor((upper - lower) / 2);
		const candidate = createCandidate(input, scalars, scalarEnd, snapshotDigest);
		if (input.measure(candidate) <= input.maxOutputBytes) {
			selected = candidate;
			lower = scalarEnd + 1;
		} else upper = scalarEnd - 1;
	}
	if (selected === null) throw new MoldeaCliOutputPageException("OUTPUT_BUDGET_TOO_SMALL");
	return Object.freeze({
		...selected,
		asset: Object.freeze(selected.asset),
		chunk: Object.freeze(selected.chunk)
	});
};
//#endregion
//#region src/project-scope/constants.ts
var MOLDEA_MANIFEST_PATH = parseRepositoryPath("/moldea/moldea.yaml");
//#endregion
//#region src/project-scope/exception.ts
var MoldeaCliProjectScopeException = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "MoldeaCliProjectScopeException";
	}
};
//#endregion
//#region src/project-scope/paths.ts
var parseMoldeaCliScopePathBytes = (input, maxEntries) => {
	if (input.byteLength === 0) return Object.freeze([]);
	let text;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(input);
	} catch {
		throw new MoldeaCliProjectScopeException("PATH_INPUT_INVALID");
	}
	if (!text.endsWith("\0")) throw new MoldeaCliProjectScopeException("PATH_INPUT_INVALID");
	const paths = text.slice(0, -1).split("\0");
	if (paths.length > maxEntries || paths.some((path) => path.length === 0)) throw new MoldeaCliProjectScopeException("PATH_INPUT_INVALID");
	return Object.freeze(paths);
};
//#endregion
//#region src/project-scope/executor.ts
var readBoundedManifest = async (input) => {
	const operationOptions = input.signal === void 0 ? void 0 : { signal: input.signal };
	const entry = await input.repository.getEntry(MOLDEA_MANIFEST_PATH, operationOptions);
	if (entry === null) throw new RepositorySourceException({
		code: "ENTRY_NOT_FOUND",
		operation: "read-file-page",
		path: MOLDEA_MANIFEST_PATH,
		retryable: false
	});
	if (entry.type !== "file" || entry.byteLength === null) throw new RepositorySourceException({
		code: "ENTRY_NOT_FILE",
		operation: "read-file-page",
		path: MOLDEA_MANIFEST_PATH,
		retryable: false
	});
	const maxBytes = Math.min(input.resourceLimits.maxManifestBytes, input.resourceLimits.maxTotalBytes);
	if (entry.byteLength > maxBytes) throw new RepositorySourceException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "read-file-page",
		path: MOLDEA_MANIFEST_PATH,
		retryable: false
	});
	const chunks = [];
	let byteLength = 0;
	let nextOffset = 0;
	let isComplete = false;
	while (!isComplete) {
		const page = await input.repository.readFilePage(MOLDEA_MANIFEST_PATH, {
			maxBytes: Math.max(1, entry.byteLength - byteLength),
			offset: nextOffset,
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
		if (page.snapshot.id !== input.repository.snapshot.id || page.offset !== nextOffset || page.totalBytes !== entry.byteLength || page.bytes.byteLength > entry.byteLength - byteLength || page.bytes.byteLength === 0 && !page.isComplete || !page.isComplete && page.nextOffset !== page.offset + page.bytes.byteLength) throw new RepositorySourceException({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path: MOLDEA_MANIFEST_PATH,
			retryable: false
		});
		chunks.push(page.bytes);
		byteLength += page.bytes.byteLength;
		nextOffset = page.nextOffset ?? byteLength;
		isComplete = page.isComplete;
	}
	if (byteLength !== entry.byteLength) throw new RepositorySourceException({
		code: "PROVIDER_INCOMPLETE",
		operation: "read-file-page",
		path: MOLDEA_MANIFEST_PATH,
		retryable: false
	});
	const manifestBytes = new Uint8Array(byteLength);
	let writeOffset = 0;
	for (const chunk of chunks) {
		manifestBytes.set(chunk, writeOffset);
		writeOffset += chunk.byteLength;
	}
	return manifestBytes;
};
var createMoldeaCliProjectScopeExecutor = (coreFactory = createCore) => {
	return async (input) => {
		const manifestBytes = await readBoundedManifest(input);
		const scope = await coreFactory({ limits: Object.freeze({
			maxDiagnostics: input.resourceLimits.maxDiagnostics,
			maxEntries: input.resourceLimits.maxEntries,
			maxCoverage: input.resourceLimits.maxCoverage,
			maxFileBytes: input.resourceLimits.maxFileBytes,
			maxManifestBytes: input.resourceLimits.maxManifestBytes,
			maxTotalBytesRead: input.resourceLimits.maxTotalBytes
		}) }).matchManifestScope({
			manifest: {
				content: manifestBytes,
				path: MOLDEA_MANIFEST_PATH
			},
			paths: input.paths
		});
		return Object.freeze({
			manifestContent: new TextDecoder("utf-8").decode(manifestBytes),
			scope
		});
	};
};
var executeMoldeaCliProjectScope = createMoldeaCliProjectScopeExecutor();
//#endregion
//#region src/project-scope/transformers.ts
var compareKeys = (left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
var createMatchKey = (match) => JSON.stringify([
	"match",
	match.owner.kind,
	match.owner.agentId,
	match.owner.id,
	match.field,
	match.declaration.kind === "exact" ? match.declaration.path : match.declaration.pattern,
	match.inputPath,
	match.pointer
]);
var createMoldeaCliScopeProjection = (execution) => {
	const records = [...execution.scope.diagnostics.map((diagnostic, index) => createMoldeaCliDiagnosticRecord(diagnostic, index)), ...execution.scope.matches.map((match) => ({
		key: createMatchKey(match),
		kind: "match",
		match
	}))].sort(compareKeys);
	const snapshotDigest = calculateMoldeaCliJsonDigest({
		inputDigest: execution.scope.inputDigest,
		manifestDigest: execution.scope.manifestDigest,
		records,
		valid: execution.scope.valid
	});
	return Object.freeze({
		canonicalBodies: Object.freeze([execution.manifestContent]),
		counts: Object.freeze({
			...execution.scope.counts,
			diagnostics: execution.scope.diagnostics.length
		}),
		inputDigest: execution.scope.inputDigest,
		manifestDigest: execution.scope.manifestDigest,
		records: Object.freeze(records),
		relevant: execution.scope.relevant,
		snapshotDigest,
		valid: execution.scope.valid
	});
};
//#endregion
//#region src/repository-content-transformation-guard/exception.ts
var GitContentTransformUnsupportedException = class extends RepositorySourceException {
	constructor(path) {
		super({
			code: "SOURCE_UNAVAILABLE",
			operation: "read-file-page",
			path,
			retryable: false
		});
		this.name = "GitContentTransformUnsupportedException";
	}
};
//#endregion
//#region src/repository-content-transformation-guard/reader.ts
var throwIfAborted$2 = (signal, path) => {
	if (!signal?.aborted) return;
	throw new RepositorySourceException({
		cause: signal.reason,
		code: "ABORTED",
		operation: "read-file-page",
		path,
		retryable: false
	});
};
var createInvalidSourceException = (path) => new RepositorySourceException({
	code: "INVALID_SOURCE_DATA",
	operation: "read-file-page",
	path,
	retryable: false
});
var GitContentTransformationGuardRepositoryReader = class {
	snapshot;
	#guardedPaths;
	#reader;
	constructor(reader, guardedPaths) {
		this.#reader = reader;
		this.#guardedPaths = guardedPaths;
		this.snapshot = reader.snapshot;
	}
	compare(candidate, options) {
		return createRepositoryComparison(this, candidate, options);
	}
	getEntry(path, options) {
		return this.#reader.getEntry(path, options);
	}
	async readFilePage(path, options) {
		const parsedPath = parseRepositoryPath(path);
		if (!this.#guardedPaths.has(parsedPath)) return this.#reader.readFilePage(parsedPath, options);
		throwIfAborted$2(options?.signal, parsedPath);
		const entry = await this.#reader.getEntry(parsedPath, options);
		throwIfAborted$2(options?.signal, parsedPath);
		if (entry !== null && (entry.path !== parsedPath || entry.type !== "file" && entry.type !== "directory" && entry.type !== "symlink")) throw createInvalidSourceException(parsedPath);
		if (entry?.type !== "file") return this.#reader.readFilePage(parsedPath, options);
		throw new GitContentTransformUnsupportedException(parsedPath);
	}
	readLinkText(path, options) {
		return this.#reader.readLinkText(path, options);
	}
	listEntriesPage(options) {
		return this.#reader.listEntriesPage(options);
	}
};
var createGitContentTransformationGuardRepositoryReader = (reader, guardedPaths) => {
	const parsedGuardedPaths = new Set();
	for (const guardedPath of guardedPaths) {
		const parsedPath = parseRepositoryPath(guardedPath);
		if (parsedPath === REPOSITORY_ROOT) throw new RepositorySourceException({
			code: "INVALID_SOURCE_DATA",
			operation: "create-reader",
			path: parsedPath,
			retryable: false
		});
		parsedGuardedPaths.add(parsedPath);
	}
	return Object.freeze(new GitContentTransformationGuardRepositoryReader(reader, parsedGuardedPaths));
};
//#endregion
//#region src/operational-error/constants.ts
var REPOSITORY_SOURCE_ERROR_MESSAGES = Object.freeze({
	ABORTED: "The repository operation was aborted.",
	ACCESS_DENIED: "Access to the repository source was denied.",
	ENTRY_NOT_DIRECTORY: "The requested repository entry is not a directory.",
	ENTRY_NOT_FILE: "The requested repository entry is not a file.",
	ENTRY_NOT_FOUND: "The requested repository entry was not found.",
	ENTRY_NOT_LINK: "The requested repository entry is not a symlink.",
	INVALID_PAGE_REQUEST: "The repository page request is invalid.",
	INVALID_SOURCE_DATA: "The repository source returned invalid data.",
	PROVIDER_INCOMPLETE: "The repository provider could not expose a complete result.",
	RESOURCE_LIMIT_EXCEEDED: "A repository reading resource limit was exceeded.",
	SNAPSHOT_CHANGED: "The repository snapshot changed during the operation.",
	SOURCE_UNAVAILABLE: "The repository source is unavailable."
});
var CORE_CONFIGURATION_ERROR_MESSAGES = Object.freeze({ INVALID_RESOURCE_LIMIT: "A Core resource limit is invalid." });
var CORE_OPERATION_ERROR_MESSAGES = Object.freeze({
	ABORTED: "The Core operation was aborted.",
	CONTENT_INVALID: "The requested canonical content is invalid.",
	INVALID_ARGUMENT: "The Core operation received an invalid argument.",
	INSPECTION_BUSY: "Project inspection capacity is busy. Try again shortly.",
	INSPECTION_TIMEOUT: "The isolated project inspection timed out.",
	INSPECTION_PROCESS_FAILED: "The isolated project inspection failed.",
	RESOURCE_LIMIT_EXCEEDED: "A Core resource limit was exceeded."
});
//#endregion
//#region src/operational-error/mapper.ts
var EMPTY_ERROR_DETAILS = Object.freeze({});
var createCoreErrorDetails = (error) => {
	const details = { operation: error.operation };
	if (error instanceof CoreOperationException) {
		if (error.limit !== null) details["limit"] = error.limit;
		if (error.limitMaximum !== null) details["limitMaximum"] = error.limitMaximum;
		if (error.nextAction !== null) details["nextAction"] = error.nextAction;
		if (error.observedUsage !== null || error.nextAction === "review-inspection-capacity") details["observedUsage"] = error.observedUsage;
	}
	return Object.freeze(details);
};
var mapMoldeaCliOperationalError = (error) => {
	if (error instanceof MoldeaCliCompositionException || error instanceof MoldeaCliOutputPageException || error instanceof MoldeaCliProjectContentException || error instanceof MoldeaCliProjectScopeException) return createMoldeaCliOwnedError(error.code);
	if (error instanceof GitContentTransformUnsupportedException) return Object.freeze({
		...createMoldeaCliOwnedError("GIT_CONTENT_TRANSFORM_UNSUPPORTED"),
		path: isRepositoryPath(error.path) ? error.path : null
	});
	if (error instanceof RepositorySourceException) return Object.freeze({
		code: error.code,
		details: EMPTY_ERROR_DETAILS,
		message: REPOSITORY_SOURCE_ERROR_MESSAGES[error.code],
		path: error.path !== null && isRepositoryPath(error.path) ? error.path : null,
		retryable: error.retryable,
		source: "repository"
	});
	if (error instanceof CoreConfigurationException) return Object.freeze({
		code: error.code,
		details: createCoreErrorDetails(error),
		message: CORE_CONFIGURATION_ERROR_MESSAGES[error.code],
		path: null,
		retryable: false,
		source: "core"
	});
	if (error instanceof CoreOperationException) return Object.freeze({
		code: error.code,
		details: createCoreErrorDetails(error),
		message: CORE_OPERATION_ERROR_MESSAGES[error.code],
		path: null,
		retryable: error.retryable,
		source: "core"
	});
	return createMoldeaCliOwnedError("INTERNAL_ERROR");
};
//#endregion
//#region src/git-inventory/constants.ts
var GIT_IGNORED_INVENTORY_ARGUMENTS = [
	"ls-files",
	"--others",
	"--ignored",
	"--exclude-standard",
	"--full-name",
	"--no-recurse-submodules",
	"-z",
	"--"
];
var GIT_INVENTORY_LISTING_SUBCOMMAND = "ls-files";
var INSTRUCTION_PATHS = Object.freeze([
	"/AGENTS.md",
	"/CLAUDE.md",
	"/.claude/CLAUDE.md",
	"/CLAUDE.local.md"
].map((path) => parseRepositoryPath(path)));
var GIT_TRACKED_ENTRY_MODES = [
	"100644",
	"100755",
	"120000",
	"160000"
];
//#endregion
//#region src/git-inventory/content-transformation/constants.ts
var GIT_CONTENT_TRANSFORMATION_ATTRIBUTES = [
	"filter",
	"working-tree-encoding",
	"ident"
];
var GIT_CONTENT_TRANSFORMATION_ARGUMENTS = [
	"check-attr",
	"--stdin",
	"-z",
	...GIT_CONTENT_TRANSFORMATION_ATTRIBUTES
];
//#endregion
//#region src/git-inventory/content-transformation/parser.ts
var concatenateField = (fragments, byteLength) => {
	const field = new Uint8Array(byteLength);
	let offset = 0;
	for (const fragment of fragments) {
		field.set(fragment, offset);
		offset += fragment.byteLength;
	}
	return field;
};
var decodeField = (field) => {
	try {
		return new TextDecoder("utf-8", {
			fatal: true,
			ignoreBOM: true
		}).decode(field);
	} catch {
		return null;
	}
};
var resolveAttribute = (candidate) => {
	return GIT_CONTENT_TRANSFORMATION_ATTRIBUTES.find((attribute) => attribute === candidate) ?? null;
};
var storeAttribute = (values, attribute, value) => {
	const property = attribute === "working-tree-encoding" ? "workingTreeEncoding" : attribute;
	if (Object.hasOwn(values, property)) return false;
	values[property] = value;
	return true;
};
var hasCompleteValues = (values) => Object.hasOwn(values, "filter") && Object.hasOwn(values, "ident") && Object.hasOwn(values, "workingTreeEncoding");
var createGitContentTransformationParser = (input) => {
	const paths = [...input.paths];
	const valuesByPath = new Map();
	let fields = [];
	let isFailed = false;
	let pendingByteLength = 0;
	let pendingFragments = [];
	for (const path of paths) {
		if (path.length === 0 || path.includes("\0") || valuesByPath.has(path)) {
			isFailed = true;
			continue;
		}
		valuesByPath.set(path, {});
	}
	const consumeRecord = () => {
		if (isFailed || fields.length !== 3) return;
		const path = decodeField(fields[0] ?? new Uint8Array());
		const attributeCandidate = decodeField(fields[1] ?? new Uint8Array());
		const value = decodeField(fields[2] ?? new Uint8Array());
		fields = [];
		if (path === null || attributeCandidate === null || value === null) {
			isFailed = true;
			return;
		}
		const attribute = resolveAttribute(attributeCandidate);
		const values = valuesByPath.get(path);
		if (attribute === null || values === void 0 || !storeAttribute(values, attribute, value)) isFailed = true;
	};
	const consumeField = () => {
		if (isFailed) return;
		fields.push(concatenateField(pendingFragments, pendingByteLength));
		pendingByteLength = 0;
		pendingFragments = [];
		if (fields.length === 3) consumeRecord();
	};
	return {
		consume: (chunk) => {
			if (isFailed) return;
			let fragmentStart = 0;
			for (let index = 0; index < chunk.byteLength; index += 1) {
				if (chunk[index] !== 0) continue;
				const fragment = chunk.subarray(fragmentStart, index);
				pendingFragments.push(Uint8Array.from(fragment));
				pendingByteLength += fragment.byteLength;
				consumeField();
				if (isFailed) return;
				fragmentStart = index + 1;
			}
			const trailingFragment = chunk.subarray(fragmentStart);
			if (trailingFragment.byteLength > 0) {
				pendingFragments.push(Uint8Array.from(trailingFragment));
				pendingByteLength += trailingFragment.byteLength;
			}
		},
		finish: () => {
			if (isFailed || pendingByteLength > 0 || fields.length > 0) return Object.freeze({ kind: "failed" });
			const attributes = [];
			for (const path of paths) {
				const values = valuesByPath.get(path);
				if (values === void 0 || !hasCompleteValues(values)) return Object.freeze({ kind: "failed" });
				attributes.push(Object.freeze({
					filter: values.filter,
					ident: values.ident,
					path,
					workingTreeEncoding: values.workingTreeEncoding
				}));
			}
			return Object.freeze({
				attributes: Object.freeze(attributes),
				kind: "completed"
			});
		}
	};
};
//#endregion
//#region src/git-inventory/content-transformation/classifier.ts
var createClassificationFailure = (errorCode, subcommand) => Object.freeze({
	errorCode,
	kind: "failed",
	...subcommand === void 0 ? {} : { subcommand }
});
var mapGitFailure$3 = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var isGuardedAttributeValue = (attributeValue) => attributeValue !== "unset" && attributeValue !== "unspecified";
var encodePaths = (paths) => {
	const encoder = new TextEncoder();
	const encodedPaths = [];
	let byteLength = 0;
	for (const path of paths) {
		if (path.length === 0 || path.includes("\0")) return null;
		const encodedPath = encoder.encode(path);
		if (!Number.isSafeInteger(byteLength + encodedPath.byteLength + 1)) return null;
		encodedPaths.push(encodedPath);
		byteLength += encodedPath.byteLength + 1;
	}
	const stdin = new Uint8Array(byteLength);
	let offset = 0;
	for (const encodedPath of encodedPaths) {
		stdin.set(encodedPath, offset);
		offset += encodedPath.byteLength + 1;
	}
	return stdin;
};
var createClassification = (filter, ident, workingTreeEncoding) => Object.freeze({
	filter,
	ident,
	isGuarded: isGuardedAttributeValue(filter) || isGuardedAttributeValue(ident) || isGuardedAttributeValue(workingTreeEncoding),
	workingTreeEncoding
});
var createGitContentTransformationClassifier = (runGit = runGitCommand) => {
	return async (input) => {
		if (input.signal?.aborted) return createClassificationFailure("GIT_OPERATION_ABORTED");
		if (!Number.isSafeInteger(input.maxMetadataBytes) || input.maxMetadataBytes < 0) return createClassificationFailure("RESOURCE_LIMIT_EXCEEDED");
		if (input.entries.length === 0) return Object.freeze({
			entries: Object.freeze([]),
			gitMetadataBytes: 0,
			kind: "classified"
		});
		const paths = input.entries.map((entry) => entry.path);
		const stdin = encodePaths(paths);
		if (stdin === null) return createClassificationFailure("GIT_OUTPUT_INVALID");
		const result = await runGit(GIT_CONTENT_TRANSFORMATION_ARGUMENTS, {
			cwd: input.repositoryRoot,
			input: stdin,
			maxOutputBytes: Math.max(input.maxMetadataBytes, 1),
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
		if (result.kind === "failed") return createClassificationFailure(mapGitFailure$3(result.reason), result.subcommand);
		if (result.value.byteLength > input.maxMetadataBytes) return createClassificationFailure("RESOURCE_LIMIT_EXCEEDED");
		const parser = createGitContentTransformationParser({ paths });
		parser.consume(result.value);
		const parserResult = parser.finish();
		if (parserResult.kind === "failed" || parserResult.attributes.length !== input.entries.length) return createClassificationFailure("GIT_OUTPUT_INVALID");
		const entries = input.entries.map((entry, index) => {
			const attributes = parserResult.attributes[index];
			if (attributes === void 0 || attributes.path !== entry.path) return null;
			return Object.freeze({
				...entry,
				contentTransformation: createClassification(attributes.filter, attributes.ident, attributes.workingTreeEncoding)
			});
		});
		if (entries.some((entry) => entry === null)) return createClassificationFailure("GIT_OUTPUT_INVALID");
		return Object.freeze({
			entries: Object.freeze(entries.filter((entry) => entry !== null)),
			gitMetadataBytes: result.value.byteLength,
			kind: "classified"
		});
	};
};
//#endregion
//#region src/git-inventory/entry-type/candidate-collapser.ts
var createCollapseFailure = () => Object.freeze({ kind: "failed" });
var collapseGitInventoryCandidates = (candidates) => {
	const candidatesByPath = new Map();
	for (const candidate of candidates) {
		const existingCandidate = candidatesByPath.get(candidate.path);
		if (candidate.kind === "untracked") {
			if (existingCandidate !== void 0) return createCollapseFailure();
			candidatesByPath.set(candidate.path, {
				kind: "untracked",
				path: candidate.path
			});
			continue;
		}
		if (candidate.mode === "160000" || existingCandidate?.kind === "untracked") return createCollapseFailure();
		const trackedCandidate = existingCandidate ?? {
			indexEntriesByStage: new Map(),
			kind: "tracked",
			path: candidate.path
		};
		if (trackedCandidate.indexEntriesByStage.has(candidate.stage)) return createCollapseFailure();
		trackedCandidate.indexEntriesByStage.set(candidate.stage, Object.freeze({
			mode: candidate.mode,
			stage: candidate.stage
		}));
		candidatesByPath.set(candidate.path, trackedCandidate);
	}
	const collapsedCandidates = [];
	for (const candidate of candidatesByPath.values()) {
		if (candidate.kind === "untracked") {
			collapsedCandidates.push(Object.freeze(candidate));
			continue;
		}
		if (candidate.indexEntriesByStage.has(0) && candidate.indexEntriesByStage.size !== 1) return createCollapseFailure();
		const indexEntries = [...candidate.indexEntriesByStage.values()].sort((left, right) => left.stage - right.stage);
		if (indexEntries.length === 0) return createCollapseFailure();
		collapsedCandidates.push(Object.freeze({
			indexEntries: Object.freeze(indexEntries),
			kind: "tracked",
			path: candidate.path
		}));
	}
	return Object.freeze({
		candidates: Object.freeze(collapsedCandidates),
		kind: "collapsed"
	});
};
//#endregion
//#region src/git-inventory/entry-type/entry-inspector.ts
var createInspectionFailure$1 = (errorCode) => Object.freeze({
	errorCode,
	kind: "failed"
});
var mapFilesystemFailure$1 = (error) => {
	const errorCode = error?.code?.toUpperCase();
	if (errorCode === "ENOENT" || errorCode === "ENOTDIR") return null;
	if (errorCode === "EACCES" || errorCode === "EPERM") return createInspectionFailure$1("GIT_ACCESS_DENIED");
	if (errorCode === "ELOOP") return createInspectionFailure$1("GIT_OUTPUT_INVALID");
	return createInspectionFailure$1("GIT_COMMAND_FAILED");
};
var inspectHostEntry = async (hostPath) => lstat(hostPath);
var createGitInventoryEntryInspector = (inspectEntry = inspectHostEntry) => {
	return async (repositoryRoot, candidatePath) => {
		let statistics;
		try {
			statistics = await inspectEntry(path.join(repositoryRoot, candidatePath));
		} catch (error) {
			return mapFilesystemFailure$1(error) ?? Object.freeze({ kind: "missing" });
		}
		if (statistics.isSymbolicLink()) return Object.freeze({
			entryType: "symlink",
			kind: "inspected"
		});
		if (statistics.isFile()) return Object.freeze({
			entryType: "file",
			kind: "inspected"
		});
		return Object.freeze({
			entryType: "unsupported",
			kind: "inspected"
		});
	};
};
var inspectGitInventoryEntry = createGitInventoryEntryInspector();
//#endregion
//#region src/git-inventory/entry-type/symlink-configuration.ts
var GIT_CONFIG_SUBCOMMAND = "config";
var createConfigurationFailure = (errorCode, subcommand) => Object.freeze({
	errorCode,
	kind: "failed",
	...subcommand === void 0 ? {} : { subcommand }
});
var mapGitFailure$2 = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "repository-not-found":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var createGitSymlinkConfigurationResolver = (readBoolean = readConfigBoolean) => {
	return async (input) => {
		if (input.signal?.aborted) return createConfigurationFailure("GIT_OPERATION_ABORTED");
		if (!Number.isSafeInteger(input.maxMetadataBytes) || input.maxMetadataBytes < 0) return createConfigurationFailure("RESOURCE_LIMIT_EXCEEDED");
		const result = await readGit(() => readBoolean(input.repositoryRoot, "core.symlinks", true, {
			maxOutputBytes: Math.max(input.maxMetadataBytes, 1),
			timeoutSeconds: 300,
			...input.signal === void 0 ? {} : { signal: input.signal }
		}), input.signal, GIT_CONFIG_SUBCOMMAND);
		if (result.kind === "failed") return createConfigurationFailure(mapGitFailure$2(result.reason), result.subcommand);
		const gitMetadataBytes = result.value ? 5 : 6;
		if (gitMetadataBytes > input.maxMetadataBytes) return createConfigurationFailure("RESOURCE_LIMIT_EXCEEDED");
		return Object.freeze({
			gitMetadataBytes,
			isEnabled: result.value,
			kind: "resolved"
		});
	};
};
var resolveGitSymlinkConfiguration = createGitSymlinkConfigurationResolver();
//#endregion
//#region src/git-inventory/entry-type/normalizer.ts
var createNormalizationFailure = (errorCode) => Object.freeze({
	errorCode,
	kind: "failed"
});
var hasSymlinkMode = (candidate) => candidate.indexEntries.some(({ mode }) => mode === "120000");
var hasRegularFileMode = (candidate) => candidate.indexEntries.some(({ mode }) => mode === "100644" || mode === "100755");
var createGitInventoryEntryTypeNormalizer = (entryInspector = inspectGitInventoryEntry, symlinkConfigurationResolver = resolveGitSymlinkConfiguration) => {
	return async (input) => {
		if (input.signal?.aborted) return createNormalizationFailure("GIT_OPERATION_ABORTED");
		if (!Number.isSafeInteger(input.maxMetadataBytes) || input.maxMetadataBytes < 0) return createNormalizationFailure("RESOURCE_LIMIT_EXCEEDED");
		const collapseResult = collapseGitInventoryCandidates(input.candidates);
		if (collapseResult.kind === "failed") return createNormalizationFailure("GIT_OUTPUT_INVALID");
		const entries = [];
		let symlinkConfiguration = null;
		for (const candidate of collapseResult.candidates) {
			if (input.signal?.aborted) return createNormalizationFailure("GIT_OPERATION_ABORTED");
			const inspectionResult = await entryInspector(input.repositoryRoot, candidate.path);
			if (input.signal?.aborted) return createNormalizationFailure("GIT_OPERATION_ABORTED");
			if (inspectionResult.kind === "failed") return inspectionResult;
			if (inspectionResult.kind === "missing") continue;
			if (inspectionResult.entryType === "unsupported") return createNormalizationFailure("GIT_OUTPUT_INVALID");
			if (candidate.kind === "untracked") {
				entries.push(Object.freeze({
					entryType: inspectionResult.entryType,
					kind: "untracked",
					path: candidate.path,
					requiresSymlinkOverlay: false
				}));
				continue;
			}
			if (inspectionResult.entryType === "symlink" || !hasSymlinkMode(candidate)) {
				entries.push(Object.freeze({
					entryType: inspectionResult.entryType,
					indexEntries: candidate.indexEntries,
					kind: "tracked",
					path: candidate.path,
					requiresSymlinkOverlay: false
				}));
				continue;
			}
			symlinkConfiguration ??= await symlinkConfigurationResolver({
				maxMetadataBytes: input.maxMetadataBytes,
				repositoryRoot: input.repositoryRoot,
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			if (symlinkConfiguration.kind === "failed") return symlinkConfiguration;
			if (!Number.isSafeInteger(symlinkConfiguration.gitMetadataBytes) || symlinkConfiguration.gitMetadataBytes < 0 || symlinkConfiguration.gitMetadataBytes > input.maxMetadataBytes) return createNormalizationFailure("GIT_OUTPUT_INVALID");
			if (!symlinkConfiguration.isEnabled && hasRegularFileMode(candidate)) return createNormalizationFailure("GIT_OUTPUT_INVALID");
			const requiresSymlinkOverlay = !symlinkConfiguration.isEnabled;
			entries.push(Object.freeze({
				entryType: requiresSymlinkOverlay ? "symlink" : "file",
				indexEntries: candidate.indexEntries,
				kind: "tracked",
				path: candidate.path,
				requiresSymlinkOverlay
			}));
		}
		return Object.freeze({
			entries: Object.freeze(entries),
			gitMetadataBytes: symlinkConfiguration?.kind === "resolved" ? symlinkConfiguration.gitMetadataBytes : 0,
			kind: "normalized"
		});
	};
};
//#endregion
//#region src/git-inventory/link-ancestors/shadower.ts
var createAbortedFailure = () => Object.freeze({
	errorCode: "GIT_OPERATION_ABORTED",
	kind: "failed"
});
var listProperAncestors = (candidatePath) => {
	const segments = candidatePath.replace(/\/$/u, "").split("/");
	return segments.slice(0, -1).map((_segment, index) => segments.slice(0, index + 1).join("/"));
};
var isBeneathLink = (candidatePath, links) => listProperAncestors(candidatePath).some((ancestor) => links.has(ancestor));
var createGitLinkAncestorShadower = (inspectEntry = inspectGitInventoryEntry) => {
	return async (input) => {
		if (input.signal?.aborted) return createAbortedFailure();
		const ancestors = [...new Set(input.candidates.flatMap(({ path }) => listProperAncestors(path)))].sort((left, right) => left.split("/").length - right.split("/").length);
		const links = new Set();
		for (const ancestor of ancestors) {
			if (isBeneathLink(ancestor, links)) continue;
			const inspection = await inspectEntry(input.repositoryRoot, ancestor);
			if (input.signal?.aborted) return createAbortedFailure();
			if (inspection.kind === "failed") return inspection;
			if (inspection.kind === "inspected" && inspection.entryType === "symlink") links.add(ancestor);
		}
		if (links.size === 0) return Object.freeze({
			candidates: input.candidates,
			kind: "shadowed"
		});
		const remainingCandidates = input.candidates.filter(({ path }) => !isBeneathLink(path, links));
		const remainingPaths = new Set(remainingCandidates.map(({ path }) => path));
		const linkCandidates = [...links].filter((link) => !remainingPaths.has(link)).map((link) => Object.freeze({
			kind: "untracked",
			path: link
		}));
		return Object.freeze({
			candidates: Object.freeze([...remainingCandidates, ...linkCandidates]),
			kind: "shadowed"
		});
	};
};
var shadowGitLinkAncestors = createGitLinkAncestorShadower();
//#endregion
//#region src/git-inventory/logical-path/normalizer.ts
var createLogicalPathFailure = () => Object.freeze({
	errorCode: "GIT_OUTPUT_INVALID",
	kind: "failed"
});
var resolveRepositoryPath = (gitPath) => {
	const logicalPath = `/${gitPath}`;
	return logicalPath !== "/" && isRepositoryPath(logicalPath) ? logicalPath : null;
};
var resolveCandidateRepositoryPath = (candidate) => {
	return resolveRepositoryPath(candidate.kind === "untracked" && candidate.path.endsWith("/") ? candidate.path.slice(0, -1) : candidate.path);
};
var compareRepositoryPaths = (left, right) => {
	const leftScalars = left[Symbol.iterator]();
	const rightScalars = right[Symbol.iterator]();
	while (true) {
		const leftScalar = leftScalars.next();
		const rightScalar = rightScalars.next();
		if (leftScalar.done === true) return rightScalar.done === true ? 0 : -1;
		if (rightScalar.done === true) return 1;
		const leftCodePoint = leftScalar.value.codePointAt(0) ?? 0;
		const rightCodePoint = rightScalar.value.codePointAt(0) ?? 0;
		if (leftCodePoint !== rightCodePoint) return leftCodePoint < rightCodePoint ? -1 : 1;
	}
};
var filterGitInventoryCandidateLogicalPaths = (input) => {
	const candidates = [];
	for (const candidate of input.candidates) {
		if (resolveCandidateRepositoryPath(candidate) === null) {
			if (candidate.path === "moldea" || candidate.path.startsWith("moldea/")) return createLogicalPathFailure();
			continue;
		}
		candidates.push(candidate);
	}
	return Object.freeze({
		candidates: Object.freeze(candidates),
		kind: "filtered"
	});
};
var normalizeGitInventoryLogicalPaths = (input) => {
	const entries = [];
	const logicalPaths = new Set();
	for (const entry of input.entries) {
		const logicalPath = resolveRepositoryPath(entry.path);
		if (logicalPath === null || logicalPaths.has(logicalPath)) return createLogicalPathFailure();
		logicalPaths.add(logicalPath);
		entries.push(Object.freeze({
			...entry,
			path: logicalPath
		}));
	}
	entries.sort((left, right) => compareRepositoryPaths(left.path, right.path));
	return Object.freeze({
		entries: Object.freeze(entries),
		kind: "normalized"
	});
};
//#endregion
//#region src/git-inventory/parser.ts
var decodeGitPath = (pathBytes) => {
	if (pathBytes.byteLength === 0) return null;
	try {
		return new TextDecoder("utf-8", {
			fatal: true,
			ignoreBOM: true
		}).decode(pathBytes);
	} catch {
		return null;
	}
};
var concatenateRecord = (fragments, byteLength) => {
	const record = new Uint8Array(byteLength);
	let offset = 0;
	for (const fragment of fragments) {
		record.set(fragment, offset);
		offset += fragment.byteLength;
	}
	return record;
};
var parseUntrackedCandidate = (record) => {
	const path = decodeGitPath(record);
	if (path === null || !path.isWellFormed()) return null;
	return Object.freeze({
		kind: "untracked",
		path
	});
};
var createGitInventoryParser = (maxEntries, parseCandidate) => {
	const candidates = [];
	let failureReason = null;
	let pendingByteLength = 0;
	let pendingFragments = [];
	const consumeRecord = () => {
		if (failureReason !== null) return;
		if (candidates.length >= maxEntries) {
			failureReason = "entry-limit-exceeded";
			pendingByteLength = 0;
			pendingFragments = [];
			return;
		}
		const candidate = parseCandidate(concatenateRecord(pendingFragments, pendingByteLength));
		pendingByteLength = 0;
		pendingFragments = [];
		if (candidate === null) {
			failureReason = "invalid";
			return;
		}
		candidates.push(candidate);
	};
	return {
		consume: (chunk) => {
			if (failureReason !== null) return;
			let fragmentStart = 0;
			for (let index = 0; index < chunk.byteLength; index += 1) {
				if (chunk[index] !== 0) continue;
				const fragment = chunk.subarray(fragmentStart, index);
				pendingFragments.push(fragment);
				pendingByteLength += fragment.byteLength;
				consumeRecord();
				if (failureReason !== null) return;
				fragmentStart = index + 1;
			}
			const trailingFragment = chunk.subarray(fragmentStart);
			if (trailingFragment.byteLength > 0) {
				pendingFragments.push(trailingFragment);
				pendingByteLength += trailingFragment.byteLength;
			}
		},
		finish: () => {
			if (failureReason === null && pendingByteLength > 0) failureReason = "invalid";
			if (failureReason !== null) return Object.freeze({
				kind: "failed",
				reason: failureReason
			});
			return Object.freeze({
				candidates: Object.freeze([...candidates]),
				kind: "completed"
			});
		}
	};
};
var createUntrackedGitInventoryParser = (maxEntries) => createGitInventoryParser(maxEntries, parseUntrackedCandidate);
//#endregion
//#region src/git-inventory/repository-ownership/boundary-inspector.ts
var GIT_CONTROL_SEGMENT = ".git";
var TOP_LEVEL_OUTPUT_OVERHEAD_BYTES = 6;
var isInspectionFailure = (result) => "kind" in result;
var createInspectionFailure = (errorCode) => Object.freeze({
	errorCode,
	kind: "failed"
});
var mapFilesystemFailure = (error) => {
	const errorCode = error?.code?.toUpperCase();
	if (errorCode === "EACCES" || errorCode === "EPERM") return "GIT_ACCESS_DENIED";
	if (errorCode === "ENOENT" || errorCode === "ENOTDIR" || errorCode === "ELOOP") return "GIT_OUTPUT_INVALID";
	return "GIT_COMMAND_FAILED";
};
var mapGitFailure$1 = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "repository-not-found":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var readDirectoryNames = async (hostPath, readDirectory) => {
	try {
		const encodedNames = await readDirectory(hostPath);
		return Object.freeze({
			encodedNameKeys: new Set(encodedNames.map((encodedName) => encodedName.toString("hex"))),
			kind: "read"
		});
	} catch (error) {
		return createInspectionFailure(mapFilesystemFailure(error));
	}
};
var inspectPath = async (hostPath, inspectHostPath) => {
	try {
		return Object.freeze({
			kind: "inspected",
			statistics: await inspectHostPath(hostPath)
		});
	} catch (error) {
		return createInspectionFailure(mapFilesystemFailure(error));
	}
};
var hasExactDirectoryName = (encodedNameKeys, segment) => encodedNameKeys.has(Buffer$1.from(segment, "utf8").toString("hex"));
var hasStableDirectoryIdentity = (initialStatistics, revalidatedStatistics) => initialStatistics.isDirectory() && !initialStatistics.isSymbolicLink() && revalidatedStatistics.isDirectory() && !revalidatedStatistics.isSymbolicLink() && initialStatistics.dev === revalidatedStatistics.dev && initialStatistics.ino === revalidatedStatistics.ino;
var validateGitBoundary = async (directory, repositoryRoot, directoryStatistics, maxMetadataBytes, readRoot, inspectHostPath, signal) => {
	if (signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
	if (!Number.isSafeInteger(maxMetadataBytes) || maxMetadataBytes < 0) return createInspectionFailure("RESOURCE_LIMIT_EXCEEDED");
	const rootResult = await readGit(() => readRoot(directory, {
		maxOutputBytes: Math.max(maxMetadataBytes, 1),
		timeoutSeconds: 300,
		...signal === void 0 ? {} : { signal }
	}), signal);
	if (rootResult.kind === "failed") return createInspectionFailure(mapGitFailure$1(rootResult.reason));
	if (rootResult.value === null) return createInspectionFailure("GIT_COMMAND_FAILED");
	const discoveredRoot = rootResult.value;
	const gitMetadataBytes = TOP_LEVEL_OUTPUT_OVERHEAD_BYTES + countUtf8Bytes(discoveredRoot);
	if (gitMetadataBytes > maxMetadataBytes) return createInspectionFailure("RESOURCE_LIMIT_EXCEEDED");
	if (!path.isAbsolute(discoveredRoot)) return createInspectionFailure("GIT_OUTPUT_INVALID");
	if (areHostPathsEquivalent(discoveredRoot, directory)) return Object.freeze({
		gitMetadataBytes,
		kind: "validated",
		ownership: "nested-repository"
	});
	if (areHostPathsEquivalent(discoveredRoot, repositoryRoot)) return Object.freeze({
		gitMetadataBytes,
		kind: "validated",
		ownership: "selected-repository"
	});
	const discoveredRootInspection = await inspectPath(discoveredRoot, inspectHostPath);
	if (signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
	if (discoveredRootInspection.kind === "failed") return discoveredRootInspection;
	if (!discoveredRootInspection.statistics.isDirectory() || discoveredRootInspection.statistics.isSymbolicLink()) return createInspectionFailure("GIT_OUTPUT_INVALID");
	if (haveSameHostPathIdentity(discoveredRootInspection.statistics, directoryStatistics)) return Object.freeze({
		gitMetadataBytes,
		kind: "validated",
		ownership: "nested-repository"
	});
	const repositoryRootInspection = await inspectPath(repositoryRoot, inspectHostPath);
	if (signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
	if (repositoryRootInspection.kind === "failed") return repositoryRootInspection;
	if (repositoryRootInspection.statistics.isDirectory() && !repositoryRootInspection.statistics.isSymbolicLink() && haveSameHostPathIdentity(discoveredRootInspection.statistics, repositoryRootInspection.statistics)) return Object.freeze({
		gitMetadataBytes,
		kind: "validated",
		ownership: "selected-repository"
	});
	return createInspectionFailure("GIT_OUTPUT_INVALID");
};
var inspectOwnershipPath = async (hostPath) => lstat(hostPath, { bigint: true });
var readOwnershipDirectory = async (hostPath) => readdir(hostPath, { encoding: "buffer" });
var createGitInventoryBoundaryInspector = (readRoot = readTopLevel, inspectHostPath = inspectOwnershipPath, readDirectory = readOwnershipDirectory) => {
	return async (input) => {
		if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
		const directoryObservations = new Map();
		const ownership = [];
		let gitMetadataBytes = 0;
		let rootEncodedNameKeys = null;
		const getRootEncodedNames = async () => {
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			if (rootEncodedNameKeys !== null) return Object.freeze({
				encodedNameKeys: rootEncodedNameKeys,
				kind: "read"
			});
			const readResult = await readDirectoryNames(input.repositoryRoot, readDirectory);
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			if (readResult.kind === "read") rootEncodedNameKeys = readResult.encodedNameKeys;
			return readResult;
		};
		const inspectDirectory = async (parentObservation, parentPrefix, segment) => {
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			const prefix = parentPrefix.length === 0 ? segment : `${parentPrefix}/${segment}`;
			const cachedObservation = directoryObservations.get(prefix);
			if (cachedObservation !== void 0) return cachedObservation;
			const parentNamesResult = parentObservation === null ? await getRootEncodedNames() : Object.freeze({
				encodedNameKeys: parentObservation.encodedNameKeys,
				kind: "read"
			});
			if (parentNamesResult.kind === "failed") return parentNamesResult;
			if (!hasExactDirectoryName(parentNamesResult.encodedNameKeys, segment)) return createInspectionFailure("GIT_OUTPUT_INVALID");
			const parentHostPath = parentObservation?.hostPath ?? input.repositoryRoot;
			const hostPath = path.join(parentHostPath, segment);
			const initialInspection = await inspectPath(hostPath, inspectHostPath);
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			if (initialInspection.kind === "failed") return initialInspection;
			if (!initialInspection.statistics.isDirectory() || initialInspection.statistics.isSymbolicLink()) return createInspectionFailure("GIT_OUTPUT_INVALID");
			const directoryNamesResult = await readDirectoryNames(hostPath, readDirectory);
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			if (directoryNamesResult.kind === "failed") return directoryNamesResult;
			const revalidatedInspection = await inspectPath(hostPath, inspectHostPath);
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			if (revalidatedInspection.kind === "failed") return revalidatedInspection;
			if (!hasStableDirectoryIdentity(initialInspection.statistics, revalidatedInspection.statistics)) return createInspectionFailure("GIT_OUTPUT_INVALID");
			const gitControlPath = path.join(hostPath, GIT_CONTROL_SEGMENT);
			const hasExactGitControlSegment = hasExactDirectoryName(directoryNamesResult.encodedNameKeys, GIT_CONTROL_SEGMENT);
			let directoryOwnership = "selected-repository";
			if (!hasExactGitControlSegment) try {
				await inspectHostPath(gitControlPath);
				if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
				return createInspectionFailure("GIT_OUTPUT_INVALID");
			} catch (error) {
				const errorCode = error?.code?.toUpperCase();
				if (errorCode !== "ENOENT" && errorCode !== "ENOTDIR") return createInspectionFailure(mapFilesystemFailure(error));
			}
			else {
				const gitControlInspection = await inspectPath(gitControlPath, inspectHostPath);
				if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
				if (gitControlInspection.kind === "failed") return gitControlInspection;
				if (gitControlInspection.statistics.isSymbolicLink() || !gitControlInspection.statistics.isDirectory() && !gitControlInspection.statistics.isFile()) return createInspectionFailure("GIT_OUTPUT_INVALID");
				const boundaryValidation = await validateGitBoundary(hostPath, input.repositoryRoot, revalidatedInspection.statistics, input.maxMetadataBytes - gitMetadataBytes, readRoot, inspectHostPath, input.signal);
				if (boundaryValidation.kind === "failed") return boundaryValidation;
				gitMetadataBytes += boundaryValidation.gitMetadataBytes;
				directoryOwnership = boundaryValidation.ownership;
			}
			const observation = Object.freeze({
				encodedNameKeys: directoryNamesResult.encodedNameKeys,
				hostPath,
				ownership: directoryOwnership
			});
			directoryObservations.set(prefix, observation);
			return observation;
		};
		for (const plan of input.plans) {
			if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
			let candidateOwnership = "selected-repository";
			let parentObservation = null;
			let parentPrefix = "";
			for (const segment of plan.directorySegments) {
				if (input.signal?.aborted) return createInspectionFailure("GIT_OPERATION_ABORTED");
				const observation = await inspectDirectory(parentObservation, parentPrefix, segment);
				if (isInspectionFailure(observation)) return observation;
				parentObservation = observation;
				parentPrefix = parentPrefix.length === 0 ? segment : `${parentPrefix}/${segment}`;
				if (observation.ownership === "nested-repository") {
					candidateOwnership = "nested-repository";
					break;
				}
			}
			if (plan.isDirectoryRecord && candidateOwnership !== "nested-repository") return createInspectionFailure("GIT_OUTPUT_INVALID");
			ownership.push(candidateOwnership);
		}
		return Object.freeze({
			gitMetadataBytes,
			kind: "inspected",
			ownership: Object.freeze([...ownership])
		});
	};
};
var inspectGitInventoryBoundaries = createGitInventoryBoundaryInspector();
//#endregion
//#region src/git-inventory/repository-ownership/path-planner.ts
var planGitInventoryOwnershipPath = (candidate) => {
	const isDirectoryRecord = candidate.path.endsWith("/");
	if (candidate.path.length === 0 || candidate.path.startsWith("/") || candidate.path.includes("\\") || candidate.kind === "tracked" && isDirectoryRecord) return Object.freeze({ kind: "failed" });
	const segments = (isDirectoryRecord ? candidate.path.slice(0, -1) : candidate.path).split("/");
	if (segments.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return Object.freeze({ kind: "failed" });
	const frozenSegments = Object.freeze([...segments]);
	const directorySegments = Object.freeze(isDirectoryRecord ? [...segments] : segments.slice(0, -1));
	return Object.freeze({
		kind: "planned",
		plan: Object.freeze({
			candidate,
			directorySegments,
			hasGitControlSegment: segments.includes(".git"),
			isDirectoryRecord,
			segments: frozenSegments
		})
	});
};
//#endregion
//#region src/git-inventory/repository-ownership/ownership-filter.ts
var createOwnershipFailure = (errorCode = "GIT_OUTPUT_INVALID") => Object.freeze({
	errorCode,
	kind: "failed"
});
var createGitlinkTrie = (rootSegments) => {
	const trie = {
		children: new Map(),
		isRoot: false
	};
	for (const segments of rootSegments) {
		let node = trie;
		for (const segment of segments) {
			let childNode = node.children.get(segment);
			if (childNode === void 0) {
				childNode = {
					children: new Map(),
					isRoot: false
				};
				node.children.set(segment, childNode);
			}
			node = childNode;
		}
		node.isRoot = true;
	}
	return trie;
};
var isAtOrBelowGitlink = (candidateSegments, gitlinkTrie) => {
	let node = gitlinkTrie;
	for (const segment of candidateSegments) {
		const childNode = node.children.get(segment);
		if (childNode === void 0) return false;
		if (childNode.isRoot) return true;
		node = childNode;
	}
	return false;
};
var createGitInventoryOwnershipFilter = (boundaryInspector = inspectGitInventoryBoundaries) => {
	return async (input) => {
		const plannedCandidates = [];
		for (const [candidateIndex, candidate] of input.candidates.entries()) {
			if (input.signal?.aborted) return createOwnershipFailure("GIT_OPERATION_ABORTED");
			const planResult = planGitInventoryOwnershipPath(candidate);
			if (planResult.kind === "failed") return createOwnershipFailure();
			plannedCandidates.push({
				candidateIndex,
				plan: planResult.plan
			});
		}
		const gitlinkTrie = createGitlinkTrie(plannedCandidates.filter(({ plan }) => !plan.hasGitControlSegment && plan.candidate.kind === "tracked" && plan.candidate.mode === "160000").map(({ plan }) => plan.segments));
		const includedCandidates = Array.from({ length: input.candidates.length }, () => false);
		const untrackedPlans = [];
		for (const { candidateIndex, plan } of plannedCandidates) {
			if (plan.hasGitControlSegment || isAtOrBelowGitlink(plan.segments, gitlinkTrie)) continue;
			if (plan.candidate.kind === "tracked") {
				includedCandidates[candidateIndex] = true;
				continue;
			}
			untrackedPlans.push({
				candidate: plan.candidate,
				candidateIndex,
				plan
			});
		}
		const boundaryResult = await boundaryInspector({
			maxMetadataBytes: input.maxMetadataBytes,
			plans: untrackedPlans.map(({ plan }) => plan),
			repositoryRoot: input.repositoryRoot,
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
		if (boundaryResult.kind === "failed") return boundaryResult;
		if (boundaryResult.ownership.length !== untrackedPlans.length) return createOwnershipFailure();
		for (const [ownershipIndex, ownership] of boundaryResult.ownership.entries()) {
			if (input.signal?.aborted) return createOwnershipFailure("GIT_OPERATION_ABORTED");
			const untrackedPlan = untrackedPlans[ownershipIndex];
			if (untrackedPlan === void 0) return createOwnershipFailure();
			if (ownership === "selected-repository") includedCandidates[untrackedPlan.candidateIndex] = true;
		}
		const candidates = input.candidates.filter((_candidate, candidateIndex) => includedCandidates[candidateIndex] === true);
		return Object.freeze({
			candidates: Object.freeze(candidates),
			gitMetadataBytes: boundaryResult.gitMetadataBytes,
			kind: "filtered"
		});
	};
};
//#endregion
//#region src/git-inventory/probe.ts
var GIT_INVENTORY_LISTING_READS = Object.freeze({
	listUntrackedFiles,
	readIndexEntries,
	runGit: runGitCommand
});
var mapGitFailure = (reason) => {
	switch (reason) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
};
var isTrackedEntryMode = (mode) => GIT_TRACKED_ENTRY_MODES.includes(mode);
var toTrackedCandidates = (entries) => {
	const candidates = [];
	for (const { mode, path, stage } of entries) {
		if (!isTrackedEntryMode(mode)) return null;
		candidates.push(Object.freeze({
			kind: "tracked",
			mode,
			path,
			stage
		}));
	}
	return Object.freeze(candidates);
};
var measureTrackedOutput = (entries) => entries.reduce((bytes, { path }) => bytes + 75 + countUtf8Bytes(path), 0);
var measureUntrackedOutput = (paths) => paths.reduce((bytes, path) => bytes + countUtf8Bytes(path) + 1, 0);
var createProbeFailure = (errorCode, subcommand) => Object.freeze({
	errorCode,
	kind: "failed",
	...subcommand === void 0 ? {} : { subcommand }
});
var resolveParserResult = (parserResult) => {
	if (parserResult.kind === "completed") return parserResult.candidates;
	return createProbeFailure(parserResult.reason === "entry-limit-exceeded" ? "RESOURCE_LIMIT_EXCEEDED" : "GIT_OUTPUT_INVALID");
};
var isProbeFailure = (result) => !Array.isArray(result);
var createGitInventoryProbe = (git = GIT_INVENTORY_LISTING_READS, ownershipFilter = createGitInventoryOwnershipFilter(createGitInventoryBoundaryInspector()), entryTypeNormalizer = createGitInventoryEntryTypeNormalizer(inspectGitInventoryEntry, createGitSymlinkConfigurationResolver()), contentTransformationClassifier = createGitContentTransformationClassifier(), logicalPathNormalizer = normalizeGitInventoryLogicalPaths, linkAncestorShadower = shadowGitLinkAncestors) => async (input) => {
	if (input.signal?.aborted) return createProbeFailure("GIT_OPERATION_ABORTED");
	const selectionPaths = (input.selectionPaths ?? []).map((selectionPath) => selectionPath.slice(1));
	let remainingMetadataBytes = input.maxMetadataBytes;
	const createReadOptions = () => ({
		maxOutputBytes: Math.max(remainingMetadataBytes, 1),
		timeoutSeconds: 300,
		...selectionPaths.length === 0 ? {} : { paths: selectionPaths },
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	const trackedResult = await readGit(() => git.readIndexEntries(input.repositoryRoot, createReadOptions()), input.signal, GIT_INVENTORY_LISTING_SUBCOMMAND);
	if (trackedResult.kind === "failed") return createProbeFailure(mapGitFailure(trackedResult.reason), trackedResult.subcommand);
	remainingMetadataBytes -= measureTrackedOutput(trackedResult.value);
	if (trackedResult.value.length > input.maxEntries || remainingMetadataBytes < 0) return createProbeFailure("RESOURCE_LIMIT_EXCEEDED");
	const trackedCandidates = toTrackedCandidates(trackedResult.value);
	if (trackedCandidates === null) return createProbeFailure("GIT_OUTPUT_INVALID");
	const untrackedResult = await readGit(() => git.listUntrackedFiles(input.repositoryRoot, createReadOptions()), input.signal, GIT_INVENTORY_LISTING_SUBCOMMAND);
	if (untrackedResult.kind === "failed") return createProbeFailure(mapGitFailure(untrackedResult.reason), untrackedResult.subcommand);
	remainingMetadataBytes -= measureUntrackedOutput(untrackedResult.value);
	if (trackedCandidates.length + untrackedResult.value.length > input.maxEntries || remainingMetadataBytes < 0) return createProbeFailure("RESOURCE_LIMIT_EXCEEDED");
	if (untrackedResult.value.some((path) => path.length === 0)) return createProbeFailure("GIT_OUTPUT_INVALID");
	const untrackedCandidates = Object.freeze(untrackedResult.value.map((path) => Object.freeze({
		kind: "untracked",
		path
	})));
	let ignoredCandidates = [];
	if (input.includeIgnored === true && selectionPaths.length > 0) {
		const ignoredResult = await git.runGit([...GIT_IGNORED_INVENTORY_ARGUMENTS, ...selectionPaths], {
			cwd: input.repositoryRoot,
			maxOutputBytes: Math.max(remainingMetadataBytes, 1),
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
		if (ignoredResult.kind === "failed") return createProbeFailure(mapGitFailure(ignoredResult.reason), ignoredResult.subcommand);
		remainingMetadataBytes -= ignoredResult.value.byteLength;
		if (remainingMetadataBytes < 0) return createProbeFailure("RESOURCE_LIMIT_EXCEEDED");
		const ignoredParser = createUntrackedGitInventoryParser(input.maxEntries - trackedCandidates.length - untrackedCandidates.length);
		ignoredParser.consume(ignoredResult.value);
		const parsedIgnoredCandidates = resolveParserResult(ignoredParser.finish());
		if (isProbeFailure(parsedIgnoredCandidates)) return parsedIgnoredCandidates;
		const untrackedPaths = new Set(untrackedCandidates.map((candidate) => candidate.path));
		ignoredCandidates = parsedIgnoredCandidates.filter((candidate) => !untrackedPaths.has(candidate.path));
	}
	const logicalPathFilterResult = filterGitInventoryCandidateLogicalPaths({ candidates: Object.freeze([
		...trackedCandidates,
		...untrackedCandidates,
		...ignoredCandidates
	]) });
	if (logicalPathFilterResult.kind === "failed") return logicalPathFilterResult;
	const shadowResult = await linkAncestorShadower({
		candidates: logicalPathFilterResult.candidates,
		repositoryRoot: input.repositoryRoot,
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	if (shadowResult.kind === "failed") return shadowResult;
	const ownershipResult = await ownershipFilter({
		candidates: shadowResult.candidates,
		maxMetadataBytes: remainingMetadataBytes,
		repositoryRoot: input.repositoryRoot,
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	if (ownershipResult.kind === "failed") return ownershipResult;
	const entryTypeResult = await entryTypeNormalizer({
		candidates: ownershipResult.candidates,
		maxMetadataBytes: remainingMetadataBytes - ownershipResult.gitMetadataBytes,
		repositoryRoot: input.repositoryRoot,
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	if (entryTypeResult.kind === "failed") return entryTypeResult;
	const contentTransformationResult = await contentTransformationClassifier({
		entries: entryTypeResult.entries,
		maxMetadataBytes: remainingMetadataBytes - ownershipResult.gitMetadataBytes - entryTypeResult.gitMetadataBytes,
		repositoryRoot: input.repositoryRoot,
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	if (contentTransformationResult.kind === "failed") return contentTransformationResult;
	const logicalPathResult = logicalPathNormalizer({ entries: contentTransformationResult.entries });
	if (logicalPathResult.kind === "failed") return logicalPathResult;
	return Object.freeze({
		entries: logicalPathResult.entries,
		kind: "probed"
	});
};
var probeGitInventory = createGitInventoryProbe();
//#endregion
//#region src/git-inventory/comparison/comparator.ts
var areContentTransformationsEqual = (left, right) => left.filter === right.filter && left.ident === right.ident && left.isGuarded === right.isGuarded && left.workingTreeEncoding === right.workingTreeEncoding;
var areIndexEntriesEqual = (left, right) => left.length === right.length && left.every((leftEntry, index) => leftEntry.mode === right[index]?.mode && leftEntry.stage === right[index]?.stage);
var areInventoryEntriesEqual = (left, right) => {
	if (left.kind !== right.kind || left.path !== right.path || left.entryType !== right.entryType || left.requiresSymlinkOverlay !== right.requiresSymlinkOverlay || !areContentTransformationsEqual(left.contentTransformation, right.contentTransformation)) return false;
	if (left.kind === "untracked" || right.kind === "untracked") return left.kind === right.kind;
	return areIndexEntriesEqual(left.indexEntries, right.indexEntries);
};
var areGitInventoriesEqual = (left, right) => left.length === right.length && left.every((leftEntry, index) => {
	const rightEntry = right[index];
	return rightEntry !== void 0 && areInventoryEntriesEqual(leftEntry, rightEntry);
});
//#endregion
//#region ../repository-fs/dist/index.js
var DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS = Object.freeze({
	maxCachedBytes: 67108864,
	maxConcurrentOperations: 16,
	maxDirectoryEntries: 131072,
	maxEntries: 131072,
	maxPageEntries: 4096,
	maxQueuedOperations: 256,
	maxReadBytes: 1048576
});
var isAbsoluteHostRootDirectory = (candidate) => {
	return typeof candidate === "string" && candidate.length > 0 && !candidate.includes("\0") && candidate.isWellFormed() && path.isAbsolute(candidate);
};
var OPTION_PROPERTY_NAMES = new Set([
	"limits",
	"rootDirectory",
	"selection",
	"signal"
]);
var DIRECTORY_SELECTION_PROPERTY_NAMES = new Set(["kind"]);
var PATH_SELECTION_PROPERTY_NAMES = new Set(["kind", "paths"]);
var LIMIT_PROPERTY_NAMES = [
	"maxCachedBytes",
	"maxConcurrentOperations",
	"maxDirectoryEntries",
	"maxEntries",
	"maxPageEntries",
	"maxQueuedOperations",
	"maxReadBytes"
];
var LIMIT_PROPERTY_NAME_SET = new Set(LIMIT_PROPERTY_NAMES);
var throwInvalidSourceData = (path = null) => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation: "create-reader",
		path,
		retryable: false
	});
};
var isArray = (candidate) => {
	try {
		return Array.isArray(candidate);
	} catch {
		return throwInvalidSourceData();
	}
};
var isUnknownRecord = (candidate) => {
	return typeof candidate === "object" && candidate !== null && !isArray(candidate);
};
var hasExactOwnProperties = (candidate, allowedPropertyNames) => {
	try {
		return Reflect.ownKeys(candidate).every((propertyName) => typeof propertyName === "string" && allowedPropertyNames.has(propertyName));
	} catch {
		return throwInvalidSourceData();
	}
};
var hasOwnProperty = (candidate, propertyName) => {
	try {
		return Object.hasOwn(candidate, propertyName);
	} catch {
		return throwInvalidSourceData();
	}
};
var readOwnProperty = (candidate, propertyName) => {
	try {
		return Reflect.get(candidate, propertyName);
	} catch {
		return throwInvalidSourceData();
	}
};
var parseSelectedPath = (candidate) => {
	if (typeof candidate !== "string") throw new RepositoryPathException();
	return parseRepositoryPath(candidate);
};
var normalizePathSelection = (selection) => {
	if (!hasExactOwnProperties(selection, PATH_SELECTION_PROPERTY_NAMES) || !hasOwnProperty(selection, "paths")) return throwInvalidSourceData();
	const pathCandidates = readOwnProperty(selection, "paths");
	if (!isArray(pathCandidates)) return throwInvalidSourceData();
	const pathCount = readOwnProperty(pathCandidates, "length");
	if (typeof pathCount !== "number" || !Number.isSafeInteger(pathCount) || pathCount < 0) return throwInvalidSourceData();
	const paths = [];
	for (let index = 0; index < pathCount; index += 1) {
		const propertyName = String(index);
		if (!hasOwnProperty(pathCandidates, propertyName)) return throwInvalidSourceData();
		paths.push(parseSelectedPath(readOwnProperty(pathCandidates, propertyName)));
	}
	const uniquePaths = new Set();
	for (const selectedPath of paths) {
		if (selectedPath === REPOSITORY_ROOT || uniquePaths.has(selectedPath)) return throwInvalidSourceData();
		uniquePaths.add(selectedPath);
	}
	paths.sort();
	return Object.freeze({
		kind: "paths",
		paths: Object.freeze(paths)
	});
};
var normalizeSelection = (candidate) => {
	if (!isUnknownRecord(candidate) || !hasOwnProperty(candidate, "kind")) return throwInvalidSourceData();
	const kind = readOwnProperty(candidate, "kind");
	if (kind === "directory") {
		if (!hasExactOwnProperties(candidate, DIRECTORY_SELECTION_PROPERTY_NAMES)) return throwInvalidSourceData();
		return Object.freeze({ kind: "directory" });
	}
	if (kind === "paths") return normalizePathSelection(candidate);
	return throwInvalidSourceData();
};
var isPositiveSafeInteger = (candidate) => {
	return typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate > 0;
};
var normalizeLimits = (candidate) => {
	if (candidate === void 0) return DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS;
	if (!isUnknownRecord(candidate) || !hasExactOwnProperties(candidate, LIMIT_PROPERTY_NAME_SET)) return throwInvalidSourceData();
	const limits = {
		maxCachedBytes: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxCachedBytes,
		maxConcurrentOperations: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxConcurrentOperations,
		maxDirectoryEntries: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxDirectoryEntries,
		maxEntries: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxEntries,
		maxPageEntries: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxPageEntries,
		maxQueuedOperations: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxQueuedOperations,
		maxReadBytes: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxReadBytes
	};
	for (const propertyName of LIMIT_PROPERTY_NAMES) {
		if (!hasOwnProperty(candidate, propertyName)) continue;
		const configuredLimit = readOwnProperty(candidate, propertyName);
		if (!isPositiveSafeInteger(configuredLimit)) return throwInvalidSourceData();
		limits[propertyName] = configuredLimit;
	}
	return Object.freeze(limits);
};
var normalizeSignal = (candidate) => {
	try {
		if (candidate === void 0 || candidate instanceof AbortSignal) return candidate;
	} catch {
		return throwInvalidSourceData();
	}
	return throwInvalidSourceData();
};
var normalizeFilesystemRepositoryOptions = (candidate) => {
	let normalizedOptions;
	try {
		if (!isUnknownRecord(candidate) || !hasExactOwnProperties(candidate, OPTION_PROPERTY_NAMES) || !hasOwnProperty(candidate, "rootDirectory") || !hasOwnProperty(candidate, "selection")) return throwInvalidSourceData();
		const rootDirectory = readOwnProperty(candidate, "rootDirectory");
		const selection = readOwnProperty(candidate, "selection");
		const limits = hasOwnProperty(candidate, "limits") ? readOwnProperty(candidate, "limits") : void 0;
		const signal = hasOwnProperty(candidate, "signal") ? readOwnProperty(candidate, "signal") : void 0;
		if (!isAbsoluteHostRootDirectory(rootDirectory)) return throwInvalidSourceData();
		normalizedOptions = {
			limits: normalizeLimits(limits),
			rootDirectory,
			selection: normalizeSelection(selection),
			signal: normalizeSignal(signal)
		};
	} catch (cause) {
		if (cause instanceof RepositoryPathException) throw cause;
		return throwInvalidSourceData();
	}
	if (normalizedOptions.selection.kind === "paths") {
		for (const selectedPath of normalizedOptions.selection.paths) if (selectedPath.slice(1).split("/").includes(".git")) return throwInvalidSourceData(selectedPath);
	}
	return Object.freeze(normalizedOptions);
};
var decoder$1 = new TextDecoder$1("utf-8", {
	fatal: true,
	ignoreBOM: true
});
var MAX_CURSOR_BYTES = 65536;
var DIRECTORY_CURSOR_KEYS = new Set([
	"frames",
	"kind",
	"prefix",
	"snapshotId",
	"version"
]);
var CURSOR_FRAME_KEYS = new Set([
	"lastName",
	"namesIdentity",
	"path",
	"pathIdentity"
]);
var PATH_CURSOR_KEYS = new Set([
	"kind",
	"lastPath",
	"prefix",
	"snapshotId",
	"version"
]);
var hasOnlyKeys = (record, keys) => Reflect.ownKeys(record).every((key) => typeof key === "string" && keys.has(key));
var hashParts = (parts) => {
	const hash = createHash("sha256");
	for (const part of parts) {
		hash.update(part);
		hash.update("\0");
	}
	return `sha256:${hash.digest("hex")}`;
};
var getErrorCode = (cause) => {
	if (typeof cause !== "object" || cause === null || !("code" in cause)) return;
	const code = cause.code;
	return typeof code === "string" ? code : void 0;
};
var throwSource = (code, operation, logicalPath, retryable, cause, resource) => {
	throw new RepositorySourceException({
		cause,
		code,
		operation,
		path: logicalPath,
		...resource === void 0 ? {} : { resource },
		retryable
	});
};
var throwMappedHostError = (cause, operation, logicalPath) => {
	const code = getErrorCode(cause);
	if (code === "EACCES" || code === "EPERM") return throwSource("ACCESS_DENIED", operation, logicalPath, true, cause);
	if (operation !== "create-reader" && (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP")) return throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true, cause);
	if (operation === "create-reader" && (code === "ENOENT" || code === "ENOTDIR")) return throwSource("ENTRY_NOT_FOUND", operation, logicalPath, true, cause);
	return throwSource("SOURCE_UNAVAILABLE", operation, logicalPath, true, cause);
};
var throwIfAborted$1 = (signal, operation, logicalPath) => {
	if (signal?.aborted) throwSource("ABORTED", operation, logicalPath, false, signal.reason);
};
var getStatisticsIdentity = (statistics, type) => {
	return hashParts([
		type,
		statistics.dev.toString(),
		statistics.ino.toString(),
		statistics.mode.toString(),
		statistics.size.toString(),
		statistics.mtimeNs.toString(),
		statistics.ctimeNs.toString()
	]);
};
var classifyStatistics = (statistics, operation, logicalPath) => {
	if (statistics.isFile()) return "file";
	if (statistics.isDirectory()) return "directory";
	if (statistics.isSymbolicLink()) return "symlink";
	return throwSource("INVALID_SOURCE_DATA", operation, logicalPath, false);
};
var decodeName = (encodedName, operation, parentPath) => {
	try {
		const name = decoder$1.decode(encodedName);
		parseRepositoryPath(parentPath === REPOSITORY_ROOT ? `/${name}` : `${parentPath}/${name}`);
		return name;
	} catch (cause) {
		return throwSource("INVALID_SOURCE_DATA", operation, parentPath, false, cause);
	}
};
var openBufferDirectory = async (hostPath) => {
	return await opendir(hostPath, { encoding: "buffer" });
};
var getParentPaths = (logicalPath) => {
	const segments = logicalPath.slice(1).split("/");
	const parents = [REPOSITORY_ROOT];
	for (let index = 1; index < segments.length; index += 1) parents.push(parseRepositoryPath(`/${segments.slice(0, index).join("/")}`));
	return parents;
};
var findFirstPathAfter = (paths, logicalPath) => {
	let lowerIndex = 0;
	let upperIndex = paths.length;
	while (lowerIndex < upperIndex) {
		const middleIndex = lowerIndex + Math.floor((upperIndex - lowerIndex) / 2);
		const middlePath = paths[middleIndex];
		if (middlePath !== void 0 && compareRepositoryPaths$1(middlePath, logicalPath) <= 0) lowerIndex = middleIndex + 1;
		else upperIndex = middleIndex;
	}
	return lowerIndex;
};
var findSortedName = (names, target) => {
	let lowerIndex = 0;
	let upperIndex = names.length;
	while (lowerIndex < upperIndex) {
		const middleIndex = lowerIndex + Math.floor((upperIndex - lowerIndex) / 2);
		const middleName = names[middleIndex];
		if (middleName !== void 0 && middleName < target) lowerIndex = middleIndex + 1;
		else upperIndex = middleIndex;
	}
	return names[lowerIndex] === target ? lowerIndex : -1;
};
var FilesystemRepositoryReader = class {
	snapshot;
	#cache;
	#cursorKey = randomBytes(32);
	#coordinator;
	#limits;
	#observations = new Map();
	#rootDirectory;
	#selection;
	#selectedPaths;
	#selectedPathSet;
	#explicitSelectedPaths;
	#selectedNamesByParent = new Map();
	#selectedDirectoryProofs = new Map();
	constructor(options, rootDirectory, rootIdentity) {
		this.#limits = options.limits;
		this.#rootDirectory = rootDirectory;
		this.#selection = options.selection;
		this.#cache = createByteCache({
			maxBytes: options.limits.maxCachedBytes,
			maxEntries: 4096
		});
		this.#coordinator = createRequestCoordinator({
			maxConcurrent: options.limits.maxConcurrentOperations,
			maxQueued: options.limits.maxQueuedOperations
		});
		this.snapshot = Object.freeze({
			id: hashParts([rootIdentity, randomBytes(32)]),
			sourceKind: "filesystem"
		});
		this.#observations.set(REPOSITORY_ROOT, rootIdentity);
		this.#selectedPaths = options.selection.kind === "paths" ? this.#createVisibleSelectedPaths(options.selection.paths) : [];
		this.#selectedPathSet = new Set(this.#selectedPaths);
		this.#explicitSelectedPaths = new Set(options.selection.kind === "paths" ? options.selection.paths : []);
		for (const logicalPath of this.#selectedPaths) {
			if (logicalPath === REPOSITORY_ROOT) continue;
			const separatorIndex = logicalPath.lastIndexOf("/");
			const parentPath = parseRepositoryPath(logicalPath.slice(0, separatorIndex) || "/");
			const names = this.#selectedNamesByParent.get(parentPath) ?? new Set();
			names.add(logicalPath.slice(separatorIndex + 1));
			this.#selectedNamesByParent.set(parentPath, names);
		}
	}
	async initialize(signal) {
		if (this.#selection.kind !== "paths") return;
		for (const logicalPath of this.#selectedPaths) {
			throwIfAborted$1(signal, "create-reader", logicalPath);
			const entry = await this.#observeEntry(logicalPath, "create-reader", void 0, signal);
			if (entry === null) return throwSource("ENTRY_NOT_FOUND", "create-reader", logicalPath, true);
			if (logicalPath !== REPOSITORY_ROOT && !this.#explicitSelectedPaths.has(logicalPath) && entry.type !== "directory") throwSource("ENTRY_NOT_DIRECTORY", "create-reader", logicalPath, false);
		}
	}
	async compare(candidate, options) {
		return createRepositoryComparison(this, candidate, options);
	}
	async getEntry(logicalPath, options) {
		const parsedPath = parseRepositoryPath(logicalPath);
		if (!this.#isVisible(parsedPath)) return null;
		return this.#run("get-entry", parsedPath, options?.signal, () => this.#observeEntry(parsedPath, "get-entry", void 0, options?.signal));
	}
	async listEntriesPage(options) {
		const prefix = options.prefix === void 0 ? REPOSITORY_ROOT : parseRepositoryPath(options.prefix);
		return this.#run("list-entries-page", prefix, options.signal, async () => {
			const maxEntries = this.#parseBoundedPositiveInteger(options.maxEntries, this.#limits.maxPageEntries, "pageEntries", "list-entries-page", prefix);
			const prefixEntry = await this.#observeEntry(prefix, "list-entries-page", void 0, options.signal);
			if (prefixEntry === null || !this.#isVisible(prefix)) return throwSource("ENTRY_NOT_FOUND", "list-entries-page", prefix, false);
			if (prefixEntry.type !== "directory") throwSource("ENTRY_NOT_DIRECTORY", "list-entries-page", prefix, false);
			return this.#selection.kind === "paths" ? this.#listSelectedEntries(prefix, maxEntries, options.cursor, options.signal) : this.#listDirectoryEntries(prefix, maxEntries, options.cursor, options.signal);
		});
	}
	async readFilePage(logicalPath, options) {
		const parsedPath = parseRepositoryPath(logicalPath);
		return this.#run("read-file-page", parsedPath, options.signal, async () => {
			const offset = this.#parseOffset(options.offset, parsedPath);
			const maxBytes = this.#parseBoundedPositiveInteger(options.maxBytes, this.#limits.maxReadBytes, "readBytes", "read-file-page", parsedPath);
			if (!this.#isVisible(parsedPath)) throwSource("ENTRY_NOT_FOUND", "read-file-page", parsedPath, false);
			const entry = await this.#observeEntry(parsedPath, "read-file-page", void 0, options.signal);
			if (entry === null) return throwSource("ENTRY_NOT_FOUND", "read-file-page", parsedPath, false);
			if (entry.type !== "file" || entry.byteLength === null) return throwSource("ENTRY_NOT_FILE", "read-file-page", parsedPath, false);
			const entryIdentity = this.#observations.get(parsedPath);
			if (entryIdentity === void 0) return throwSource("INVALID_SOURCE_DATA", "read-file-page", parsedPath, false);
			if (offset > entry.byteLength) throwSource("INVALID_PAGE_REQUEST", "read-file-page", parsedPath, false);
			const bytesToRead = Math.min(maxBytes, entry.byteLength - offset);
			const cacheKey = `${parsedPath}\0${entryIdentity}\0${offset}\0${bytesToRead}`;
			const cached = this.#cache.get(cacheKey);
			if (cached !== void 0) return this.#createFilePage(cached, entry.byteLength, offset);
			const bytes = await this.#readExactRange(parsedPath, entryIdentity, offset, bytesToRead, options.signal);
			if (bytes.byteLength > 0) this.#cache.set(cacheKey, bytes);
			return this.#createFilePage(bytes, entry.byteLength, offset);
		});
	}
	async readLinkText(logicalPath, options) {
		const parsedPath = parseRepositoryPath(logicalPath);
		return this.#run("read-link-text", parsedPath, options?.signal, async () => {
			if (!this.#isVisible(parsedPath)) return throwSource("ENTRY_NOT_FOUND", "read-link-text", parsedPath, false);
			const entry = await this.#observeEntry(parsedPath, "read-link-text", void 0, options?.signal);
			if (entry === null) return throwSource("ENTRY_NOT_FOUND", "read-link-text", parsedPath, false);
			if (entry.type !== "symlink") return throwSource("ENTRY_NOT_LINK", "read-link-text", parsedPath, false);
			let text;
			try {
				text = await readlink(this.#getHostPath(parsedPath), { encoding: "buffer" });
			} catch (cause) {
				return throwMappedHostError(cause, "read-link-text", parsedPath);
			}
			await this.#observeEntry(parsedPath, "read-link-text", void 0, options?.signal);
			if (text.byteLength > 4096) return null;
			let decodedText;
			try {
				decodedText = decoder$1.decode(text);
			} catch {
				return null;
			}
			return process.platform === "win32" ? decodedText.replaceAll("\\", "/") : decodedText;
		});
	}
	#createFilePage(bytes, totalBytes, offset) {
		const nextOffset = offset + bytes.byteLength;
		const isComplete = nextOffset === totalBytes;
		return {
			bytes,
			isComplete,
			nextOffset: isComplete ? null : nextOffset,
			offset,
			snapshot: this.snapshot,
			totalBytes
		};
	}
	#createVisibleSelectedPaths(selectedPaths) {
		const visiblePaths = new Set([REPOSITORY_ROOT]);
		for (const selectedPath of selectedPaths) {
			visiblePaths.add(selectedPath);
			for (const parentPath of getParentPaths(selectedPath)) visiblePaths.add(parentPath);
		}
		if (visiblePaths.size - 1 > this.#limits.maxEntries) throwSource("RESOURCE_LIMIT_EXCEEDED", "create-reader", null, false, void 0, {
			dimension: "selectedEntries",
			limit: this.#limits.maxEntries,
			observed: visiblePaths.size - 1
		});
		return Object.freeze([...visiblePaths].sort(compareRepositoryPaths$1));
	}
	#decodeCursor(cursor, prefix) {
		try {
			if (Buffer.byteLength(cursor, "utf8") > MAX_CURSOR_BYTES) throw new Error("cursor exceeds the encoded limit");
			const separatorIndex = cursor.lastIndexOf(".");
			if (separatorIndex <= 0) throw new Error("cursor signature is missing");
			const encodedPayload = cursor.slice(0, separatorIndex);
			if (!verifyHmac(encodedPayload, cursor.slice(separatorIndex + 1), this.#cursorKey)) throw new Error("cursor signature does not match");
			const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
			if (!isObjectValid(parsed, true) || parsed["version"] !== 1 || parsed["snapshotId"] !== this.snapshot.id || parsed["prefix"] !== prefix) throw new Error("cursor belongs to another snapshot or prefix");
			if (parsed["kind"] === "paths" && hasOnlyKeys(parsed, PATH_CURSOR_KEYS)) {
				const lastPath = parseRepositoryPath(parsed["lastPath"]);
				const descendantPrefix = prefix === REPOSITORY_ROOT ? REPOSITORY_ROOT : `${prefix}/`;
				if (lastPath === prefix || !lastPath.startsWith(descendantPrefix)) throw new Error("cursor path is outside the requested prefix");
				return {
					kind: "paths",
					lastPath,
					prefix,
					snapshotId: this.snapshot.id,
					version: 1
				};
			}
			if (parsed["kind"] === "directory" && hasOnlyKeys(parsed, DIRECTORY_CURSOR_KEYS) && Array.isArray(parsed["frames"])) return {
				frames: parsed["frames"].map((candidate) => {
					if (!isObjectValid(candidate, true)) throw new Error("cursor frame is invalid");
					const frame = candidate;
					if (!hasOnlyKeys(frame, CURSOR_FRAME_KEYS) || typeof frame["lastName"] !== "string" && frame["lastName"] !== null || typeof frame["namesIdentity"] !== "string" || typeof frame["path"] !== "string" || typeof frame["pathIdentity"] !== "string") throw new Error("cursor frame is invalid");
					return {
						lastName: frame["lastName"],
						namesIdentity: frame["namesIdentity"],
						path: parseRepositoryPath(frame["path"]),
						pathIdentity: frame["pathIdentity"]
					};
				}),
				kind: "directory",
				prefix,
				snapshotId: this.snapshot.id,
				version: 1
			};
			throw new Error("cursor payload is invalid");
		} catch (cause) {
			return throwSource("INVALID_PAGE_REQUEST", "list-entries-page", prefix, false, cause);
		}
	}
	#encodeCursor(cursor) {
		const encodedPayload = Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
		const encodedCursor = `${encodedPayload}.${signHmac(encodedPayload, this.#cursorKey)}`;
		if (Buffer.byteLength(encodedCursor, "utf8") > MAX_CURSOR_BYTES) throwSource("RESOURCE_LIMIT_EXCEEDED", "list-entries-page", cursor.prefix, false, void 0, {
			dimension: "cursorBytes",
			limit: MAX_CURSOR_BYTES,
			observed: Buffer.byteLength(encodedCursor, "utf8")
		});
		return encodedCursor;
	}
	#getHostPath(logicalPath) {
		if (logicalPath === REPOSITORY_ROOT) return this.#rootDirectory;
		const hostPath = path.resolve(this.#rootDirectory, ...logicalPath.slice(1).split("/"));
		const relativePath = path.relative(this.#rootDirectory, hostPath);
		if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) throwSource("INVALID_SOURCE_DATA", "get-entry", logicalPath, false);
		return hostPath;
	}
	#isVisible(logicalPath) {
		return this.#selection.kind === "directory" || this.#selectedPathSet.has(logicalPath);
	}
	async #listDirectoryEntries(prefix, maxEntries, encodedCursor, signal) {
		let frames;
		const directoryFrames = new Map();
		if (encodedCursor === void 0) {
			const initialFrame = await this.#createDirectoryFrame(prefix, null, "list-entries-page", directoryFrames, signal);
			frames = [initialFrame];
			directoryFrames.set(prefix, initialFrame);
		} else {
			const cursor = this.#decodeCursor(encodedCursor, prefix);
			if (cursor.kind !== "directory" || cursor.frames.length === 0) return throwSource("INVALID_PAGE_REQUEST", "list-entries-page", prefix, false);
			frames = [];
			for (const frame of cursor.frames) {
				const restored = await this.#restoreDirectoryFrame(frame, directoryFrames, signal);
				frames.push(restored);
				directoryFrames.set(restored.path, restored);
			}
		}
		const entries = [];
		while (frames.length > 0 && entries.length < maxEntries) {
			throwIfAborted$1(signal, "list-entries-page", prefix);
			const frame = frames.at(-1);
			if (frame === void 0) break;
			if (frame.nextIndex >= frame.names.length) {
				frames.pop();
				directoryFrames.delete(frame.path);
				continue;
			}
			const name = frame.names[frame.nextIndex];
			if (name === void 0) return throwSource("INVALID_SOURCE_DATA", "list-entries-page", frame.path, false);
			frames[frames.length - 1] = {
				...frame,
				lastName: name,
				nextIndex: frame.nextIndex + 1
			};
			const childPath = parseRepositoryPath(frame.path === REPOSITORY_ROOT ? `/${name}` : `${frame.path}/${name}`);
			const entry = await this.#observeEntry(childPath, "list-entries-page", directoryFrames, signal);
			if (entry === null) return throwSource("SNAPSHOT_CHANGED", "list-entries-page", childPath, true);
			entries.push(entry);
			if (entry.type === "directory") {
				const childFrame = await this.#createDirectoryFrame(childPath, null, "list-entries-page", directoryFrames, signal);
				frames.push(childFrame);
				directoryFrames.set(childPath, childFrame);
			}
		}
		const isComplete = frames.length === 0;
		return {
			entries,
			isComplete,
			nextCursor: isComplete ? null : this.#encodeCursor({
				frames: frames.map(({ lastName, namesIdentity, path: framePath, pathIdentity }) => ({
					lastName,
					namesIdentity,
					path: framePath,
					pathIdentity
				})),
				kind: "directory",
				prefix,
				snapshotId: this.snapshot.id,
				version: 1
			}),
			snapshot: this.snapshot
		};
	}
	async #listSelectedEntries(prefix, maxEntries, encodedCursor, signal) {
		let lastPath = null;
		if (encodedCursor !== void 0) {
			const cursor = this.#decodeCursor(encodedCursor, prefix);
			if (cursor.kind !== "paths" || !this.#selectedPathSet.has(cursor.lastPath)) return throwSource("INVALID_PAGE_REQUEST", "list-entries-page", prefix, false);
			lastPath = cursor.lastPath;
		}
		const descendantPrefix = prefix === REPOSITORY_ROOT ? REPOSITORY_ROOT : `${prefix}/`;
		let pathIndex = findFirstPathAfter(this.#selectedPaths, lastPath ?? prefix);
		const entries = [];
		while (entries.length < maxEntries) {
			throwIfAborted$1(signal, "list-entries-page", prefix);
			const logicalPath = this.#selectedPaths[pathIndex];
			if (logicalPath === void 0 || !logicalPath.startsWith(descendantPrefix)) break;
			const entry = await this.#observeEntry(logicalPath, "list-entries-page", void 0, signal);
			if (entry === null) return throwSource("SNAPSHOT_CHANGED", "list-entries-page", logicalPath, true);
			entries.push(entry);
			pathIndex += 1;
		}
		const nextPath = this.#selectedPaths[pathIndex];
		const isComplete = nextPath === void 0 || !nextPath.startsWith(descendantPrefix);
		const finalEntry = entries.at(-1);
		if (!isComplete && finalEntry === void 0) return throwSource("INVALID_SOURCE_DATA", "list-entries-page", prefix, false);
		return {
			entries,
			isComplete,
			nextCursor: isComplete ? null : this.#encodeCursor({
				kind: "paths",
				lastPath: finalEntry?.path ?? prefix,
				prefix,
				snapshotId: this.snapshot.id,
				version: 1
			}),
			snapshot: this.snapshot
		};
	}
	#parseBoundedPositiveInteger(candidate, limit, dimension, operation, logicalPath) {
		if (!Number.isSafeInteger(candidate) || candidate <= 0) throwSource("INVALID_PAGE_REQUEST", operation, logicalPath, false);
		if (candidate > limit) throwSource("RESOURCE_LIMIT_EXCEEDED", operation, logicalPath, false, void 0, {
			dimension,
			limit,
			observed: candidate
		});
		return candidate;
	}
	#parseOffset(candidate, logicalPath) {
		if (!Number.isSafeInteger(candidate) || candidate < 0) throwSource("INVALID_PAGE_REQUEST", "read-file-page", logicalPath, false);
		return candidate;
	}
	async #createDirectoryFrame(logicalPath, lastName, operation, directoryFrames, signal) {
		const entry = await this.#observeEntry(logicalPath, operation, directoryFrames, signal);
		if (entry === null || entry.type !== "directory") throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
		const names = await this.#readDirectoryNames(logicalPath, operation, directoryFrames, signal);
		const nextIndex = lastName === null ? 0 : findSortedName(names, lastName) + 1;
		if (nextIndex === 0 && lastName !== null) throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
		return {
			lastName,
			names,
			namesIdentity: hashParts(names),
			nextIndex,
			path: logicalPath,
			pathIdentity: this.#observations.get(logicalPath) ?? ""
		};
	}
	async #restoreDirectoryFrame(frame, directoryFrames, signal) {
		const restored = await this.#createDirectoryFrame(parseRepositoryPath(frame.path), frame.lastName, "list-entries-page", directoryFrames, signal);
		if (restored.pathIdentity !== frame.pathIdentity || restored.namesIdentity !== frame.namesIdentity) throwSource("SNAPSHOT_CHANGED", "list-entries-page", frame.path, true);
		return restored;
	}
	async #readDirectoryNames(logicalPath, operation, directoryFrames, signal) {
		try {
			const directory = await openBufferDirectory(this.#getHostPath(logicalPath));
			const names = [];
			let observedEntries = 0;
			for await (const directoryEntry of directory) {
				throwIfAborted$1(signal, operation, logicalPath);
				observedEntries += 1;
				if (observedEntries > this.#limits.maxDirectoryEntries) throwSource("RESOURCE_LIMIT_EXCEEDED", operation, logicalPath, false, void 0, {
					dimension: "directoryEntries",
					limit: this.#limits.maxDirectoryEntries,
					observed: observedEntries
				});
				const name = decodeName(directoryEntry.name, operation, logicalPath);
				if (name !== ".git") names.push(name);
			}
			await this.#observeEntry(logicalPath, operation, directoryFrames, signal);
			return names.sort();
		} catch (cause) {
			if (cause instanceof RepositorySourceException) throw cause;
			return throwMappedHostError(cause, operation, logicalPath);
		}
	}
	async #hasExactChildName(logicalPath, targetName, operation, parentIdentity, directoryFrames, signal) {
		const frame = directoryFrames?.get(logicalPath);
		if (frame !== void 0) {
			if (frame.pathIdentity !== parentIdentity) throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
			return findSortedName(frame.names, targetName) >= 0;
		}
		const selectedNames = this.#selectedNamesByParent.get(logicalPath);
		const isSelectedName = selectedNames?.has(targetName) === true;
		const proof = isSelectedName ? this.#selectedDirectoryProofs.get(logicalPath) : void 0;
		if (proof !== void 0) {
			if (proof.identity !== parentIdentity) throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
			throwIfAborted$1(signal, operation, logicalPath);
			return proof.names.has(targetName);
		}
		try {
			const directory = await openBufferDirectory(this.#getHostPath(logicalPath));
			const targets = isSelectedName && selectedNames !== void 0 ? selectedNames : new Set([targetName]);
			const names = new Set();
			let observedEntries = 0;
			for await (const directoryEntry of directory) {
				throwIfAborted$1(signal, operation, logicalPath);
				observedEntries += 1;
				if (observedEntries > this.#limits.maxDirectoryEntries) throwSource("RESOURCE_LIMIT_EXCEEDED", operation, logicalPath, false, void 0, {
					dimension: "directoryEntries",
					limit: this.#limits.maxDirectoryEntries,
					observed: observedEntries
				});
				let name;
				try {
					name = decodeName(directoryEntry.name, operation, logicalPath);
				} catch (cause) {
					if (cause instanceof RepositorySourceException && cause.code === "INVALID_SOURCE_DATA") continue;
					throw cause;
				}
				if (name !== ".git" && targets.has(name)) {
					names.add(name);
					if (names.size === targets.size) break;
				}
			}
			if (isSelectedName) {
				const statistics = await lstat(this.#getHostPath(logicalPath), { bigint: true });
				if (!statistics.isDirectory() || getStatisticsIdentity(statistics, "directory") !== parentIdentity) throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
				this.#selectedDirectoryProofs.set(logicalPath, {
					identity: parentIdentity,
					names
				});
			}
			throwIfAborted$1(signal, operation, logicalPath);
			return names.has(targetName);
		} catch (cause) {
			if (cause instanceof RepositorySourceException) throw cause;
			return throwMappedHostError(cause, operation, logicalPath);
		}
	}
	async #readExactEntryStatistics(logicalPath, operation, directoryFrames, signal) {
		const rootStatistics = await this.#assertRootUnchanged(operation, logicalPath);
		if (logicalPath === REPOSITORY_ROOT) return rootStatistics;
		const segments = logicalPath.slice(1).split("/");
		let currentPath = REPOSITORY_ROOT;
		let statistics = null;
		const parentIdentities = [];
		for (const [index, segment] of segments.entries()) {
			throwIfAborted$1(signal, operation, logicalPath);
			const parentIdentity = getStatisticsIdentity(statistics ?? rootStatistics, "directory");
			if (!await this.#hasExactChildName(currentPath, segment, operation, parentIdentity, directoryFrames, signal)) return null;
			currentPath = parseRepositoryPath(currentPath === REPOSITORY_ROOT ? `/${segment}` : `${currentPath}/${segment}`);
			try {
				statistics = await lstat(this.#getHostPath(currentPath), { bigint: true });
			} catch (cause) {
				return throwMappedHostError(cause, operation, currentPath);
			}
			if (index < segments.length - 1 && !statistics.isDirectory()) return null;
			if (index < segments.length - 1) parentIdentities.push({
				identity: getStatisticsIdentity(statistics, "directory"),
				path: currentPath
			});
		}
		for (const parent of parentIdentities) {
			throwIfAborted$1(signal, operation, logicalPath);
			let currentStatistics;
			try {
				currentStatistics = await lstat(this.#getHostPath(parent.path), { bigint: true });
			} catch (cause) {
				return throwMappedHostError(cause, operation, parent.path);
			}
			if (!currentStatistics.isDirectory() || getStatisticsIdentity(currentStatistics, "directory") !== parent.identity) return throwSource("SNAPSHOT_CHANGED", operation, parent.path, true);
		}
		await this.#assertRootUnchanged(operation, logicalPath);
		return statistics;
	}
	async #assertRootUnchanged(operation, logicalPath) {
		try {
			const statistics = await lstat(this.#rootDirectory, { bigint: true });
			const rootIdentity = this.#observations.get(REPOSITORY_ROOT);
			if (!statistics.isDirectory() || rootIdentity === void 0 || getStatisticsIdentity(statistics, "directory") !== rootIdentity) return throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
			return statistics;
		} catch (cause) {
			if (cause instanceof RepositorySourceException) throw cause;
			return throwMappedHostError(cause, operation, logicalPath);
		}
	}
	async #observeEntry(logicalPath, operation, directoryFrames, signal) {
		const statistics = await this.#readExactEntryStatistics(logicalPath, operation, directoryFrames, signal);
		throwIfAborted$1(signal, operation, logicalPath);
		if (statistics === null) return this.#observations.has(logicalPath) ? throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true) : null;
		const type = classifyStatistics(statistics, operation, logicalPath);
		const identity = getStatisticsIdentity(statistics, type);
		const previousIdentity = this.#observations.get(logicalPath);
		if (previousIdentity !== void 0 && previousIdentity !== identity) throwSource("SNAPSHOT_CHANGED", operation, logicalPath, true);
		if (previousIdentity === void 0) {
			if (this.#observations.size - 1 >= this.#limits.maxEntries) throwSource("RESOURCE_LIMIT_EXCEEDED", operation, logicalPath, false, void 0, {
				dimension: "observedEntries",
				limit: this.#limits.maxEntries,
				observed: this.#observations.size
			});
			this.#observations.set(logicalPath, identity);
		}
		return {
			byteLength: type === "file" ? Number(statistics.size) : null,
			contentIdentity: null,
			path: logicalPath,
			type
		};
	}
	async #readExactRange(logicalPath, entryIdentity, offset, bytesToRead, signal) {
		let handle;
		try {
			const noFollow = "O_NOFOLLOW" in constants ? constants.O_NOFOLLOW : 0;
			handle = await open(this.#getHostPath(logicalPath), constants.O_RDONLY | noFollow);
			const before = await handle.stat({ bigint: true });
			if (getStatisticsIdentity(before, classifyStatistics(before, "read-file-page", logicalPath)) !== entryIdentity) throwSource("SNAPSHOT_CHANGED", "read-file-page", logicalPath, true);
			const bytes = new Uint8Array(bytesToRead);
			let totalRead = 0;
			while (totalRead < bytesToRead) {
				throwIfAborted$1(signal, "read-file-page", logicalPath);
				const result = await handle.read(bytes, totalRead, bytesToRead - totalRead, offset + totalRead);
				if (result.bytesRead === 0) throwSource("SNAPSHOT_CHANGED", "read-file-page", logicalPath, true);
				totalRead += result.bytesRead;
			}
			const after = await handle.stat({ bigint: true });
			if (getStatisticsIdentity(after, classifyStatistics(after, "read-file-page", logicalPath)) !== entryIdentity) throwSource("SNAPSHOT_CHANGED", "read-file-page", logicalPath, true);
			await this.#observeEntry(logicalPath, "read-file-page");
			return bytes;
		} catch (cause) {
			if (cause instanceof RepositorySourceException) throw cause;
			return throwMappedHostError(cause, "read-file-page", logicalPath);
		} finally {
			await handle?.close().catch(() => void 0);
		}
	}
	async #run(operation, logicalPath, signal, callback) {
		let isStarted = false;
		try {
			return await this.#coordinator.run(async () => {
				isStarted = true;
				throwIfAborted$1(signal, operation, logicalPath);
				return callback();
			}, signal === void 0 ? {} : { signal });
		} catch (cause) {
			if (isStarted) throw cause;
			if (getErrorCode(cause) === ERRORS.REQUEST_QUEUE_FULL) return throwSource("RESOURCE_LIMIT_EXCEEDED", operation, logicalPath, true, void 0, {
				dimension: "queuedOperations",
				limit: this.#limits.maxQueuedOperations,
				observed: this.#limits.maxQueuedOperations + 1
			});
			return throwSource("ABORTED", operation, logicalPath, false, cause);
		}
	}
};
var prepareRoot = async (options) => {
	throwIfAborted$1(options.signal, "create-reader", null);
	try {
		const rootDirectory = await realpath(options.rootDirectory);
		const statistics = await lstat(rootDirectory, { bigint: true });
		if (!statistics.isDirectory()) throwSource("ENTRY_NOT_DIRECTORY", "create-reader", null, false);
		return {
			identity: getStatisticsIdentity(statistics, "directory"),
			rootDirectory
		};
	} catch (cause) {
		if (cause instanceof RepositorySourceException) throw cause;
		return throwMappedHostError(cause, "create-reader", null);
	}
};
var createFilesystemRepositoryReader = async (rawOptions) => {
	const options = normalizeFilesystemRepositoryOptions(rawOptions);
	const root = await prepareRoot(options);
	const reader = new FilesystemRepositoryReader(options, root.rootDirectory, root.identity);
	await reader.initialize(options.signal);
	throwIfAborted$1(options.signal, "create-reader", null);
	return Object.freeze(reader);
};
//#endregion
//#region src/repository-symlink-overlay/reader.ts
var decoder = new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
var throwIfAborted = (signal, operation, path) => {
	if (!signal?.aborted) return;
	throw new RepositorySourceException({
		cause: signal.reason,
		code: "ABORTED",
		operation,
		path,
		retryable: false
	});
};
var createInvalidOverlayException = (operation, path) => new RepositorySourceException({
	code: "INVALID_SOURCE_DATA",
	operation,
	path,
	retryable: false
});
var validateOverlayEntry = (entry, operation, path) => {
	if (entry?.type !== "file" || entry.path !== path) throw createInvalidOverlayException(operation, path);
};
var overlayEntry = (entry, operation, path) => {
	validateOverlayEntry(entry, operation, path);
	return Object.freeze({
		byteLength: null,
		contentIdentity: null,
		path,
		type: "symlink"
	});
};
var GitSymlinkOverlayRepositoryReader = class {
	snapshot;
	#overlayPaths;
	#reader;
	constructor(reader, overlayPaths) {
		this.#reader = reader;
		this.#overlayPaths = overlayPaths;
		this.snapshot = reader.snapshot;
	}
	compare(candidate, options) {
		return createRepositoryComparison(this, candidate, options);
	}
	async getEntry(path, options) {
		const entry = await this.#reader.getEntry(path, options);
		if (!this.#overlayPaths.has(path)) return entry;
		return overlayEntry(entry, "get-entry", path);
	}
	async readFilePage(path, options) {
		const parsedPath = parseRepositoryPath(path);
		if (!this.#overlayPaths.has(parsedPath)) return this.#reader.readFilePage(parsedPath, options);
		throwIfAborted(options.signal, "read-file-page", parsedPath);
		validateOverlayEntry(await this.#reader.getEntry(parsedPath, options), "read-file-page", parsedPath);
		throwIfAborted(options.signal, "read-file-page", parsedPath);
		throw new RepositorySourceException({
			code: "ENTRY_NOT_FILE",
			operation: "read-file-page",
			path: parsedPath,
			retryable: false
		});
	}
	async readLinkText(path, options) {
		const parsedPath = parseRepositoryPath(path);
		if (!this.#overlayPaths.has(parsedPath)) return this.#reader.readLinkText(parsedPath, options);
		throwIfAborted(options?.signal, "read-link-text", parsedPath);
		const entry = await this.#reader.getEntry(parsedPath, options);
		validateOverlayEntry(entry, "read-link-text", parsedPath);
		throwIfAborted(options?.signal, "read-link-text", parsedPath);
		const byteLength = entry?.byteLength ?? null;
		if (byteLength === null) throw createInvalidOverlayException("read-link-text", parsedPath);
		if (byteLength > 4096) return null;
		if (byteLength === 0) return "";
		const page = await this.#reader.readFilePage(parsedPath, {
			maxBytes: byteLength,
			offset: 0,
			...options?.signal === void 0 ? {} : { signal: options.signal }
		});
		throwIfAborted(options?.signal, "read-link-text", parsedPath);
		if (!page.isComplete || page.totalBytes !== byteLength || page.bytes.byteLength !== byteLength) throw createInvalidOverlayException("read-link-text", parsedPath);
		try {
			return decoder.decode(page.bytes);
		} catch {
			return null;
		}
	}
	async listEntriesPage(options) {
		const prefix = options.prefix === void 0 ? REPOSITORY_ROOT : parseRepositoryPath(options.prefix);
		if (this.#overlayPaths.has(prefix)) {
			throwIfAborted(options.signal, "list-entries-page", prefix);
			const operationOptions = options.signal === void 0 ? void 0 : { signal: options.signal };
			validateOverlayEntry(await this.#reader.getEntry(prefix, operationOptions), "list-entries-page", prefix);
			throwIfAborted(options.signal, "list-entries-page", prefix);
			throw new RepositorySourceException({
				code: "ENTRY_NOT_DIRECTORY",
				operation: "list-entries-page",
				path: prefix,
				retryable: false
			});
		}
		const page = await this.#reader.listEntriesPage(options);
		const entries = page.entries.map((entry) => this.#overlayPaths.has(entry.path) ? overlayEntry(entry, "list-entries-page", entry.path) : entry);
		return Object.freeze({
			entries: Object.freeze(entries),
			isComplete: page.isComplete,
			nextCursor: page.nextCursor,
			snapshot: this.snapshot
		});
	}
};
var createGitSymlinkOverlayRepositoryReader = (reader, symlinkPaths) => {
	const overlayPaths = new Set();
	for (const symlinkPath of symlinkPaths) {
		const parsedPath = parseRepositoryPath(symlinkPath);
		if (parsedPath === REPOSITORY_ROOT) throw new RepositorySourceException({
			code: "INVALID_SOURCE_DATA",
			operation: "create-reader",
			path: parsedPath,
			retryable: false
		});
		overlayPaths.add(parsedPath);
	}
	return Object.freeze(new GitSymlinkOverlayRepositoryReader(reader, overlayPaths));
};
//#endregion
//#region src/repository-reader/factory.ts
var composeWorkingTreeReader = async (input, filesystemReaderFactory, symlinkOverlayFactory, contentTransformationGuardFactory) => {
	const selectedPaths = Object.freeze(input.entries.map((entry) => entry.path));
	const symlinkOverlayPaths = Object.freeze(input.entries.reduce((paths, entry) => {
		if (entry.requiresSymlinkOverlay) paths.push(entry.path);
		return paths;
	}, []));
	const guardedPaths = Object.freeze(input.entries.reduce((paths, entry) => {
		if (entry.contentTransformation.isGuarded) paths.push(entry.path);
		return paths;
	}, []));
	return contentTransformationGuardFactory(symlinkOverlayFactory(await filesystemReaderFactory({
		limits: Object.freeze({
			maxCachedBytes: input.resourceLimits.maxTotalBytes,
			maxDirectoryEntries: input.resourceLimits.maxEntries,
			maxEntries: input.resourceLimits.maxEntries,
			maxPageEntries: Math.min(4096, input.resourceLimits.maxEntries),
			maxReadBytes: input.resourceLimits.maxFileBytes
		}),
		rootDirectory: input.repositoryRoot,
		selection: Object.freeze({
			kind: "paths",
			paths: selectedPaths
		}),
		...input.signal === void 0 ? {} : { signal: input.signal }
	}), symlinkOverlayPaths), guardedPaths);
};
var createWorkingTreeRepositoryReaderFactory = (filesystemReaderFactory = createFilesystemRepositoryReader, symlinkOverlayFactory = createGitSymlinkOverlayRepositoryReader, contentTransformationGuardFactory = createGitContentTransformationGuardRepositoryReader) => (input) => composeWorkingTreeReader(input, filesystemReaderFactory, symlinkOverlayFactory, contentTransformationGuardFactory);
var createWorkingTreeRepositoryReader = createWorkingTreeRepositoryReaderFactory();
var createWorkingTreeInstructionSourceFactory = (filesystemReaderFactory = createFilesystemRepositoryReader, symlinkOverlayFactory = createGitSymlinkOverlayRepositoryReader, contentTransformationGuardFactory = createGitContentTransformationGuardRepositoryReader) => (input) => composeWorkingTreeReader(input, filesystemReaderFactory, symlinkOverlayFactory, contentTransformationGuardFactory);
var createWorkingTreeInstructionSource = createWorkingTreeInstructionSourceFactory();
//#endregion
//#region src/working-tree-snapshot/executor.ts
var createSnapshotFailure = (errorCode, subcommand) => Object.freeze({
	errorCode,
	kind: "failed",
	...subcommand === void 0 ? {} : { subcommand }
});
var isSnapshotChanged = (error) => error instanceof RepositorySourceException && error.code === "SNAPSHOT_CHANGED";
var isCreationInventoryRace = (error) => error instanceof RepositorySourceException && error.operation === "create-reader" && (error.code === "ENTRY_NOT_FOUND" || error.code === "ENTRY_NOT_DIRECTORY");
var isPinnedIdentityUnavailable = (errorCode) => errorCode === "GIT_REPOSITORY_NOT_FOUND" || errorCode === "GIT_WORK_TREE_REQUIRED";
var createWorkingTreeSnapshotExecutor = (identityInspector = inspectGitWorkingTreeIdentity, inventoryProbe = probeGitInventory, repositoryReaderFactory = createWorkingTreeRepositoryReader, compareInventories = areGitInventoriesEqual, instructionSourceFactory = createWorkingTreeInstructionSource) => {
	const executeSnapshot = async (input) => {
		if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
		const repositoryRoot = input.repositoryRoot;
		const resourceLimits = Object.freeze({ ...input.resourceLimits });
		const pinnedIdentityResult = await identityInspector({
			repositoryRoot,
			...input.signal === void 0 ? {} : { signal: input.signal }
		});
		if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
		if (pinnedIdentityResult.kind === "failed") return createSnapshotFailure(pinnedIdentityResult.errorCode);
		if (pinnedIdentityResult.kind === "mismatched") return createSnapshotFailure("GIT_OUTPUT_INVALID");
		const pinnedIdentity = pinnedIdentityResult.identity;
		const probeInventory = async () => {
			const result = await inventoryProbe({
				maxEntries: resourceLimits.maxEntries,
				maxMetadataBytes: resourceLimits.maxTotalBytes,
				repositoryRoot,
				...input.selectionPaths === void 0 ? {} : { selectionPaths: input.selectionPaths },
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			return result.kind === "failed" ? createSnapshotFailure(result.errorCode, result.subcommand) : result;
		};
		const probeInstructions = async () => {
			if (input.includeInstructions !== true) return null;
			const result = await inventoryProbe({
				includeIgnored: true,
				maxEntries: resourceLimits.maxEntries,
				maxMetadataBytes: resourceLimits.maxTotalBytes,
				repositoryRoot,
				selectionPaths: INSTRUCTION_PATHS,
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			return result.kind === "failed" ? createSnapshotFailure(result.errorCode, result.subcommand) : result;
		};
		for (let attempt = 0; attempt < 3; attempt += 1) {
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			const currentIdentityResult = await identityInspector({
				repositoryRoot,
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			if (currentIdentityResult.kind === "failed") return createSnapshotFailure(isPinnedIdentityUnavailable(currentIdentityResult.errorCode) ? "WORKING_TREE_UNSTABLE" : currentIdentityResult.errorCode);
			if (currentIdentityResult.kind === "mismatched" || !areGitWorkingTreeIdentitiesEqual(pinnedIdentity, currentIdentityResult.identity)) return createSnapshotFailure("WORKING_TREE_UNSTABLE");
			const firstInventoryResult = await probeInventory();
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			if (firstInventoryResult.kind === "failed") return firstInventoryResult;
			const firstInstructionResult = await probeInstructions();
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			if (firstInstructionResult?.kind === "failed") return firstInstructionResult;
			let reader;
			let instructions;
			try {
				reader = await repositoryReaderFactory({
					entries: firstInventoryResult.entries,
					repositoryRoot,
					resourceLimits,
					...input.signal === void 0 ? {} : { signal: input.signal }
				});
				instructions = firstInstructionResult === null ? void 0 : await instructionSourceFactory({
					entries: firstInstructionResult.entries,
					repositoryRoot,
					resourceLimits,
					...input.signal === void 0 ? {} : { signal: input.signal }
				});
			} catch (error) {
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				if (isSnapshotChanged(error)) continue;
				if (!isCreationInventoryRace(error)) throw error;
				const freshInventoryResult = await probeInventory();
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				if (freshInventoryResult.kind === "failed") return freshInventoryResult;
				const freshInstructionResult = await probeInstructions();
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				if (freshInstructionResult?.kind === "failed") return freshInstructionResult;
				if (!compareInventories(firstInventoryResult.entries, freshInventoryResult.entries) || firstInstructionResult !== null && freshInstructionResult !== null && !compareInventories(firstInstructionResult.entries, freshInstructionResult.entries)) continue;
				throw error;
			}
			const secondInventoryResult = await probeInventory();
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			if (secondInventoryResult.kind === "failed") return secondInventoryResult;
			if (!compareInventories(firstInventoryResult.entries, secondInventoryResult.entries)) continue;
			const secondInstructionResult = await probeInstructions();
			if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
			if (secondInstructionResult?.kind === "failed") return secondInstructionResult;
			if (firstInstructionResult !== null && secondInstructionResult !== null && !compareInventories(firstInstructionResult.entries, secondInstructionResult.entries)) continue;
			try {
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				const result = instructions !== void 0 ? await input.operation(reader, input.signal, instructions) : input.signal === void 0 ? await input.operation(reader) : await input.operation(reader, input.signal);
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				return Object.freeze({
					kind: "completed",
					result
				});
			} catch (error) {
				if (input.signal?.aborted) return createSnapshotFailure("GIT_OPERATION_ABORTED");
				if (!isSnapshotChanged(error)) throw error;
			}
		}
		return createSnapshotFailure("WORKING_TREE_UNSTABLE");
	};
	return executeSnapshot;
};
var executeWorkingTreeSnapshot = createWorkingTreeSnapshotExecutor();
//#endregion
//#region src/cli-execution/results.ts
var measureOutput = (output) => Buffer.byteLength(output, "utf8");
var measurePagedOutput = (page, serializedRecordsUtf8Bytes, isJson, formatJson, formatHuman) => {
	if (!isJson) return measureOutput(formatHuman(page));
	return measureOutput(formatJson(Object.freeze({
		cursor: page.cursor,
		records: Object.freeze([])
	}))) - 2 + serializedRecordsUtf8Bytes;
};
var createMoldeaCliCompositionExecutionResult = (result, cliVersion, isJson) => Object.freeze({
	exitCode: MOLDEA_CLI_EXIT_CODES.Success,
	stderr: "",
	stdout: isJson ? formatMoldeaCliJsonCompositionResult(result, cliVersion) : formatMoldeaCliHumanCompositionResult(result, cliVersion)
});
var createMoldeaCliErrorResult = (error, command, cliVersion, isJson, exitCode) => Object.freeze(isJson ? {
	exitCode,
	stderr: "",
	stdout: formatMoldeaCliJsonError(error, command, cliVersion)
} : {
	exitCode,
	stderr: formatMoldeaCliHumanError(error),
	stdout: ""
});
var createMoldeaCliValidateExecutionResult = (inspection, cliVersion, isJson, cursor, maxOutputBytes) => {
	const projection = createMoldeaCliValidateProjection(inspection);
	const createResult = (page) => ({
		diagnosticCount: projection.diagnosticCount,
		acceptedWarningCount: projection.acceptedWarningCount,
		errorCount: projection.errorCount,
		formatVersion: projection.formatVersion,
		page,
		snapshotDigest: projection.snapshotDigest,
		source: projection.source,
		coverageCounts: projection.coverageCounts,
		valid: projection.valid,
		warningCount: projection.warningCount
	});
	const page = createMoldeaCliOutputPage({
		command: "validate",
		cursor,
		filters: {},
		maxOutputBytes,
		measure: (candidate, serializedRecordsUtf8Bytes) => measurePagedOutput(candidate, serializedRecordsUtf8Bytes, isJson, (page) => formatMoldeaCliJsonValidateResult(createResult(page), cliVersion), (page) => formatMoldeaCliHumanValidateResult(createResult(page))),
		records: projection.records,
		snapshotDigest: projection.snapshotDigest
	});
	const result = Object.freeze(createResult(page));
	assertMoldeaCliJsonResultIsContentFree(result);
	return Object.freeze({
		exitCode: result.valid ? MOLDEA_CLI_EXIT_CODES.Success : MOLDEA_CLI_EXIT_CODES.StructuralInvalid,
		stderr: "",
		stdout: isJson ? formatMoldeaCliJsonValidateResult(result, cliVersion) : formatMoldeaCliHumanValidateResult(result)
	});
};
var createMoldeaCliInspectExecutionResult = (inspection, cliVersion, isJson, cursor, maxOutputBytes) => {
	const projection = createMoldeaCliInspectProjection(inspection);
	const createResult = (page) => ({
		counts: projection.counts,
		formatVersion: projection.formatVersion,
		page,
		project: projection.project,
		snapshotDigest: projection.snapshotDigest,
		source: projection.source,
		coverageCounts: projection.coverageCounts,
		valid: projection.valid,
		view: projection.view
	});
	const page = createMoldeaCliOutputPage({
		command: "inspect",
		cursor,
		filters: {},
		maxOutputBytes,
		measure: (candidate, serializedRecordsUtf8Bytes) => measurePagedOutput(candidate, serializedRecordsUtf8Bytes, isJson, (page) => formatMoldeaCliJsonInspectResult(createResult(page), cliVersion), (page) => formatMoldeaCliHumanInspectResult(createResult(page))),
		records: projection.records,
		sourceCursorForRecord: projection.getSourceCursor,
		snapshotDigest: projection.snapshotDigest
	});
	const result = Object.freeze(createResult(page));
	assertMoldeaCliJsonResultIsContentFree(result);
	return Object.freeze({
		exitCode: inspection.valid ? MOLDEA_CLI_EXIT_CODES.Success : MOLDEA_CLI_EXIT_CODES.StructuralInvalid,
		stderr: "",
		stdout: isJson ? formatMoldeaCliJsonInspectResult(result, cliVersion) : formatMoldeaCliHumanInspectResult(result)
	});
};
var createMoldeaCliScopeExecutionResult = (execution, cliVersion, isJson, cursor, maxOutputBytes) => {
	const projection = createMoldeaCliScopeProjection(execution);
	const createResult = (page) => ({
		counts: projection.counts,
		inputDigest: projection.inputDigest,
		manifestDigest: projection.manifestDigest,
		page,
		relevant: projection.relevant,
		snapshotDigest: projection.snapshotDigest,
		source: MOLDEA_CLI_GIT_WORKING_TREE_SOURCE,
		valid: projection.valid
	});
	const page = createMoldeaCliOutputPage({
		command: "scope",
		cursor,
		filters: { inputDigest: projection.inputDigest },
		maxOutputBytes,
		measure: (candidate, serializedRecordsUtf8Bytes) => measurePagedOutput(candidate, serializedRecordsUtf8Bytes, isJson, (page) => formatMoldeaCliJsonScopeResult(createResult(page), cliVersion), (page) => formatMoldeaCliHumanScopeResult(createResult(page))),
		records: projection.records,
		snapshotDigest: projection.snapshotDigest
	});
	const result = Object.freeze(createResult(page));
	assertMoldeaCliJsonResultIsContentFree(result, projection.canonicalBodies);
	return Object.freeze({
		exitCode: projection.valid ? MOLDEA_CLI_EXIT_CODES.Success : MOLDEA_CLI_EXIT_CODES.StructuralInvalid,
		stderr: "",
		stdout: isJson ? formatMoldeaCliJsonScopeResult(result, cliVersion) : formatMoldeaCliHumanScopeResult(result)
	});
};
var createMoldeaCliContentExecutionResult = (pageResult, cliVersion, isJson, cursor, maxOutputBytes) => {
	const result = createMoldeaCliContentPage({
		cursor,
		maxOutputBytes,
		measure: (candidate) => measureOutput(isJson ? formatMoldeaCliJsonContentResult(candidate, cliVersion) : formatMoldeaCliHumanContentResult(candidate)),
		page: pageResult
	});
	return Object.freeze({
		exitCode: MOLDEA_CLI_EXIT_CODES.Success,
		stderr: "",
		stdout: isJson ? formatMoldeaCliJsonContentResult(result, cliVersion) : formatMoldeaCliHumanContentResult(result)
	});
};
//#endregion
//#region src/cli-execution/command-executor.ts
var executeLazyCoreInspection = async (input) => {
	const { executeMoldeaCliCoreInspection } = await import("./chunk-c13db66a.mjs");
	return executeMoldeaCliCoreInspection(input);
};
var loadInstalledComposition = async (input) => {
	const { resolveInstalledMoldeaCliComposition } = await import("./chunk-90403e67.mjs");
	return resolveInstalledMoldeaCliComposition(input);
};
var createOperationalErrorResult = (code, input, details) => createMoldeaCliErrorResult(createMoldeaCliOwnedError(code, details), input.invocation.command, input.packageMetadata.version, input.invocation.options.isJson, MOLDEA_CLI_EXIT_CODES.OperationalError);
var createMoldeaCliCommandExecutor = (workingTreeDiscovery = discoverGitWorkingTree, workingTreeSnapshotExecutor = executeWorkingTreeSnapshot, coreInspectionExecutor = executeLazyCoreInspection, compositionLoader = loadInstalledComposition, projectScopeExecutor = executeMoldeaCliProjectScope, projectContentExecutor = executeMoldeaCliProjectContent) => {
	return async (input) => {
		const command = input.invocation.command;
		const options = input.invocation.options;
		try {
			if (command === MOLDEA_CLI_COMMANDS.Composition || command === MOLDEA_CLI_COMMANDS.Inspect || command === MOLDEA_CLI_COMMANDS.Validate) {
				const compositionResolution = await compositionLoader({
					packageMetadata: input.packageMetadata,
					...input.signal === void 0 ? {} : { signal: input.signal }
				});
				if (compositionResolution.kind === "invalid") return createOperationalErrorResult("COMPOSITION_STATE_INVALID", input);
				if (command === MOLDEA_CLI_COMMANDS.Composition) return createMoldeaCliCompositionExecutionResult(compositionResolution.result, input.packageMetadata.version, options.isJson);
			}
			let scopePaths = null;
			let contentPath = null;
			let contentOffset = 0;
			const inspectionCursor = command === MOLDEA_CLI_COMMANDS.Inspect && options.cursor !== null ? decodeMoldeaCliCursor({
				command: "inspect",
				cursor: options.cursor,
				filters: {}
			}).sourceCursor : null;
			if (command === MOLDEA_CLI_COMMANDS.Scope) {
				if (options.pathsInput === "path" && options.path !== null) scopePaths = Object.freeze([options.path]);
				else if (options.pathsInput === "stdin" && input.stdin !== void 0) {
					if (input.stdin.byteLength > options.resourceLimits.maxTotalBytes) return createOperationalErrorResult("RESOURCE_LIMIT_EXCEEDED", input);
					scopePaths = parseMoldeaCliScopePathBytes(input.stdin, options.resourceLimits.maxEntries);
				} else return createOperationalErrorResult("PATH_INPUT_INVALID", input);
				if (scopePaths.some((path) => !isRepositoryPath(path))) return createOperationalErrorResult("PATH_INPUT_INVALID", input);
			}
			if (command === MOLDEA_CLI_COMMANDS.Content) {
				if (options.path === null) return createOperationalErrorResult("CONTENT_PATH_INVALID", input);
				contentPath = parseMoldeaCliCanonicalContentPath(options.path);
				if (options.cursor !== null) {
					const sourceCursor = decodeMoldeaCliCursor({
						command: "content",
						cursor: options.cursor,
						filters: { path: contentPath }
					}).sourceCursor;
					const match = sourceCursor === null ? null : /^byte:(0|[1-9][0-9]*)$/u.exec(sourceCursor);
					if (match === null) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
					contentOffset = Number(match[1]);
					if (!Number.isSafeInteger(contentOffset)) throw new MoldeaCliOutputPageException("CURSOR_INVALID");
				}
			}
			const discoveryResult = await workingTreeDiscovery({
				invocationDirectory: input.invocationDirectory,
				repositoryDirectory: options.repositoryDirectory,
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			if (discoveryResult.kind === "failed") return createOperationalErrorResult(discoveryResult.errorCode, input);
			const resourceLimits = options.resourceLimits;
			const snapshotResult = await workingTreeSnapshotExecutor({
				operation: async (repository, signal, instructions) => {
					if (command === MOLDEA_CLI_COMMANDS.Scope && scopePaths !== null) return projectScopeExecutor({
						paths: scopePaths,
						repository,
						resourceLimits,
						...signal === void 0 ? {} : { signal }
					});
					if (command === MOLDEA_CLI_COMMANDS.Content && contentPath !== null) return projectContentExecutor({
						maxBytes: Math.min(resourceLimits.maxFileBytes, resourceLimits.maxTotalBytes, Math.max(1, Math.floor(options.maxOutputBytes / 2))),
						offset: contentOffset,
						path: contentPath,
						repository,
						resourceLimits,
						...signal === void 0 ? {} : { signal }
					});
					return coreInspectionExecutor({
						packageMetadata: input.packageMetadata,
						command: command === MOLDEA_CLI_COMMANDS.Inspect ? "inspect" : "validate",
						...inspectionCursor === null ? {} : { cursor: inspectionCursor },
						...instructions === void 0 ? {} : { instructions },
						repository,
						resourceLimits,
						...signal === void 0 ? {} : { signal }
					});
				},
				repositoryRoot: discoveryResult.repositoryRoot,
				resourceLimits,
				...command === MOLDEA_CLI_COMMANDS.Validate || command === MOLDEA_CLI_COMMANDS.Inspect ? { includeInstructions: true } : {},
				...command === MOLDEA_CLI_COMMANDS.Scope ? { selectionPaths: [MOLDEA_MANIFEST_PATH] } : contentPath === null ? {} : { selectionPaths: [contentPath] },
				...input.signal === void 0 ? {} : { signal: input.signal }
			});
			if (snapshotResult.kind === "failed") return createOperationalErrorResult(snapshotResult.errorCode, input, snapshotResult.subcommand === void 0 ? void 0 : { subcommand: snapshotResult.subcommand });
			if (command === MOLDEA_CLI_COMMANDS.Validate) return createMoldeaCliValidateExecutionResult(snapshotResult.result, input.packageMetadata.version, options.isJson, options.cursor, options.maxOutputBytes);
			if (command === MOLDEA_CLI_COMMANDS.Inspect) return createMoldeaCliInspectExecutionResult(snapshotResult.result, input.packageMetadata.version, options.isJson, options.cursor, options.maxOutputBytes);
			if (command === MOLDEA_CLI_COMMANDS.Scope) return createMoldeaCliScopeExecutionResult(snapshotResult.result, input.packageMetadata.version, options.isJson, options.cursor, options.maxOutputBytes);
			return createMoldeaCliContentExecutionResult(snapshotResult.result, input.packageMetadata.version, options.isJson, options.cursor, options.maxOutputBytes);
		} catch (error) {
			return createMoldeaCliErrorResult(mapMoldeaCliOperationalError(error), command, input.packageMetadata.version, options.isJson, MOLDEA_CLI_EXIT_CODES.OperationalError);
		}
	};
};
var executeMoldeaCliCommand = createMoldeaCliCommandExecutor();
//#endregion
//#region src/cli-execution/runner.ts
var runMoldeaCli = async (options) => {
	const parseResult = parseMoldeaCliArguments(options.commandLineArguments);
	if (parseResult.kind === "help") return {
		exitCode: MOLDEA_CLI_EXIT_CODES.Success,
		stderr: "",
		stdout: formatMoldeaCliHelp(parseResult.command)
	};
	if (parseResult.kind === "version") return {
		exitCode: MOLDEA_CLI_EXIT_CODES.Success,
		stderr: "",
		stdout: `${options.packageMetadata.version}\n`
	};
	if (parseResult.kind === "error") return createMoldeaCliErrorResult(createMoldeaCliOwnedError(parseResult.code), parseResult.command, options.packageMetadata.version, parseResult.isJson, MOLDEA_CLI_EXIT_CODES.UsageError);
	const executeCommand = options.executeCommand ?? executeMoldeaCliCommand;
	try {
		let stdin;
		if (parseResult.invocation.options.pathsInput === "stdin") {
			if (options.readStdin === void 0) return createMoldeaCliErrorResult(createMoldeaCliOwnedError("PATH_INPUT_INVALID"), parseResult.invocation.command, options.packageMetadata.version, parseResult.invocation.options.isJson, MOLDEA_CLI_EXIT_CODES.UsageError);
			const stdinResult = await options.readStdin(parseResult.invocation.options.resourceLimits.maxTotalBytes, options.signal);
			if (stdinResult.kind === "limit-exceeded") return createMoldeaCliErrorResult(createMoldeaCliOwnedError("RESOURCE_LIMIT_EXCEEDED"), parseResult.invocation.command, options.packageMetadata.version, parseResult.invocation.options.isJson, MOLDEA_CLI_EXIT_CODES.OperationalError);
			stdin = stdinResult.bytes;
		}
		return await executeCommand({
			invocationDirectory: options.invocationDirectory,
			invocation: parseResult.invocation,
			packageMetadata: options.packageMetadata,
			...options.signal === void 0 ? {} : { signal: options.signal },
			...stdin === void 0 ? {} : { stdin }
		});
	} catch {
		return createMoldeaCliErrorResult(createMoldeaCliOwnedError("INTERNAL_ERROR"), parseResult.invocation.command, options.packageMetadata.version, parseResult.invocation.options.isJson, MOLDEA_CLI_EXIT_CODES.OperationalError);
	}
};
require_semver();
//#endregion
//#region src/bin/index.ts
var executableDirectory = path.dirname(fileURLToPath(import.meta.url));
path.resolve(executableDirectory, "..", "package.json");
var shutdown = createShutdownSignal({ setExitCode: false });
var readProcessStdin = async (maxBytes, signal) => {
	try {
		return {
			bytes: await readStdin({
				maxBytes,
				signal
			}),
			kind: "completed"
		};
	} catch (error) {
		if (hasErrorCode(error, ERRORS$1.STDIN_TOO_LARGE)) return { kind: "limit-exceeded" };
		if (signal?.aborted === true) return {
			bytes: new Uint8Array(),
			kind: "completed"
		};
		throw error;
	}
};
var writeProcessOutput = async (outputStream, output) => {
	if (output.length === 0) return;
	await new Promise((resolve, reject) => {
		outputStream.write(output, (error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
};
try {
	const invocationDirectory = process$1.cwd();
	const executionResult = await runMoldeaCli({
		commandLineArguments: process$1.argv.slice(2),
		invocationDirectory,
		packageMetadata: {
			"dependencies": {
				"@moldea.ai/core": "workspace:^10.0.0",
				"@moldea.ai/repository": "workspace:^4.0.0",
				"@moldea.ai/repository-fs": "workspace:^4.0.0",
				"jg-crypto": "0.3.0",
				"jg-exception": "1.7.1",
				"jg-git-commands": "0.4.0",
				"jg-process": "1.6.2",
				"jg-utilities": "1.7.2",
				"semver": "7.8.5"
			},
			"installedPackageVersions": {
				"@moldea.ai/core": "10.0.0",
				"@moldea.ai/repository": "4.0.1",
				"@moldea.ai/repository-fs": "4.0.1"
			},
			"supportedNodeRange": ">=22.17.0",
			"version": "14.0.0"
		},
		readStdin: readProcessStdin,
		signal: shutdown.signal
	});
	if (shutdown.receivedSignal() === null) {
		await writeProcessOutput(process$1.stdout, executionResult.stdout);
		if (shutdown.receivedSignal() === null) await writeProcessOutput(process$1.stderr, executionResult.stderr);
	}
	process$1.exitCode = shutdown.exitCode() ?? executionResult.exitCode;
} catch {
	const signalExitCode = shutdown.exitCode();
	if (signalExitCode === null) await writeProcessOutput(process$1.stderr, formatMoldeaCliHumanError(createMoldeaCliOwnedError("INTERNAL_ERROR"))).catch(() => void 0);
	process$1.exitCode = signalExitCode ?? 3;
} finally {
	shutdown.dispose();
}
//#endregion
export {};
