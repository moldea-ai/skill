import { n as CoreOperationException, u as isObjectValid } from "./chunk-728df961.mjs";
import { o as MoldeaCliCompositionException, t as resolveInstalledMoldeaCliComposition } from "./chunk-d5af3eda.mjs";
import { p as deepFreeze, u as normalizeCoreOptions } from "./chunk-a5514957.mjs";
import { i as RepositorySourceException } from "./chunk-8d6114d2.mjs";
import { a as createInspectionProcessFailure, i as NODE_INSPECTION_TRANSPORT_BYTES, l as serializeInspectionFailure, n as NODE_INSPECTION_LIFETIME_MS, o as decodeInspectionMessage, s as deserializeInspectionFailure } from "./chunk-ec3f49d3.mjs";
import { n as createInspectionSender, r as superviseInspectionChild, t as createInspectionEnvironment } from "./chunk-94b5ac22.mjs";
import { t as executeRepositoryRpc } from "./chunk-131f8005.mjs";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";
import { randomBytes } from "node:crypto";
//#region ../core/dist/node.js
var activeInspectionCount = 0;
var createCompletion = () => {
	const completion = Promise.withResolvers();
	completion.promise.catch(() => {});
	return completion;
};
var isSnapshot = (input) => isObjectValid(input, true) && typeof input["id"] === "string" && input["id"].length > 0 && typeof input["sourceKind"] === "string" && input["sourceKind"].length > 0;
var describeInstructions = (instructions) => {
	if (instructions === void 0) return null;
	if (!isObjectValid(instructions, true) || typeof instructions["getEntry"] !== "function" || typeof instructions["readFilePage"] !== "function" || typeof instructions["readLinkText"] !== "function" || !isSnapshot(instructions["snapshot"])) return void 0;
	return { snapshot: {
		id: instructions["snapshot"].id,
		sourceKind: instructions["snapshot"].sourceKind
	} };
};
var aborted = (cause) => new CoreOperationException({
	code: "ABORTED",
	operation: "create-project-inspection",
	...cause === void 0 ? {} : { cause }
});
var createNodeProjectInspection = async (input) => {
	if (input === null || typeof input !== "object" || input.repository === null || typeof input.repository !== "object" || typeof input.repository.getEntry !== "function" || typeof input.repository.listEntriesPage !== "function" || typeof input.repository.readFilePage !== "function" || typeof input.repository.readLinkText !== "function" || input.repository.snapshot === null || typeof input.repository.snapshot !== "object" || typeof input.repository.snapshot.id !== "string" || input.repository.snapshot.id.length === 0 || typeof input.repository.snapshot.sourceKind !== "string" || input.repository.snapshot.sourceKind.length === 0) throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	const instructions = describeInstructions(input.instructions);
	if (instructions === void 0) throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let sources = {
		repository: input.repository,
		...input.instructions === void 0 ? {} : { instructions: input.instructions }
	};
	const snapshot = {
		id: input.repository.snapshot.id,
		sourceKind: input.repository.snapshot.sourceKind
	};
	const signal = input.signal;
	if (signal !== void 0 && (signal === null || typeof signal !== "object" || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function")) throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	const { limits } = normalizeCoreOptions({ ...input.limits === void 0 ? {} : { limits: input.limits } });
	if (input.deadline !== void 0 && (!Number.isSafeInteger(input.deadline) || input.deadline < 0)) throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	const configuredMaximum = input.maxConcurrentInspections;
	const maxConcurrentInspections = configuredMaximum === void 0 ? 1 : configuredMaximum;
	if (!Number.isSafeInteger(maxConcurrentInspections) || maxConcurrentInspections < 1) throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	if (signal?.aborted === true) throw aborted(signal.reason);
	if (activeInspectionCount >= maxConcurrentInspections) throw new CoreOperationException({
		code: "INSPECTION_BUSY",
		operation: "create-project-inspection"
	});
	if (limits.maxRetainedBytes <= 50331648) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "create-project-inspection",
		limit: "maxRetainedBytes",
		limitMaximum: limits.maxRetainedBytes,
		observedUsage: NODE_INSPECTION_TRANSPORT_BYTES,
		nextAction: "reduce-input-or-increase-limit"
	});
	const deadline = Math.min(Date.now() + NODE_INSPECTION_LIFETIME_MS, input.deadline ?? Infinity);
	if (deadline <= Date.now()) throw new CoreOperationException({
		code: "INSPECTION_TIMEOUT",
		operation: "create-project-inspection"
	});
	activeInspectionCount++;
	const controller = new AbortController();
	const attemptId = randomBytes(16).toString("hex");
	const prepared = createCompletion();
	let pendingPage;
	let pageRequestId = 0;
	let lastReaderRequestId = -1;
	let hasAcknowledgedHeap = false;
	let heapMaximum;
	let hasPrepared = false;
	let isClosing = false;
	let failure;
	let cleanupPromise;
	const readerWork = new Set();
	const relayWork = new Set();
	const child = (() => {
		try {
			return fork(fileURLToPath(new URL("./node-runner.mjs", import.meta.url).href), [], {
				execPath: process.execPath,
				execArgv: [],
				env: createInspectionEnvironment(),
				serialization: "advanced",
				stdio: [
					"ignore",
					"ignore",
					"pipe",
					"ipc"
				]
			});
		} catch (cause) {
			activeInspectionCount--;
			throw createInspectionProcessFailure(cause);
		}
	})();
	const send = createInspectionSender((frame, callback) => {
		if (!child.connected) throw createInspectionProcessFailure();
		child.send(frame, callback);
	});
	const supervision = superviseInspectionChild(child, () => {
		send({
			attemptId,
			kind: "dispose"
		}).catch(() => {
			child.kill("SIGKILL");
		});
	});
	const cleanup = () => {
		cleanupPromise ??= (async () => {
			isClosing = true;
			controller.abort(failure?.cause);
			supervision.terminate();
			await supervision.closed;
			await Promise.allSettled([...readerWork, ...relayWork]);
			sources = void 0;
			clearTimeout(timer);
			if (failure === void 0 && Date.now() >= deadline) fail(new CoreOperationException({
				code: "INSPECTION_TIMEOUT",
				operation: "create-project-inspection"
			}));
			signal?.removeEventListener("abort", handleAbort);
			child.removeAllListeners("message");
			child.removeAllListeners("error");
			child.stderr?.removeAllListeners("data");
			activeInspectionCount--;
		})();
		return cleanupPromise;
	};
	const fail = (cause) => {
		if (failure === void 0) failure = { cause: cause instanceof Error ? cause : createInspectionProcessFailure(cause) };
		prepared.reject(failure.cause);
		pendingPage?.reject(failure.cause);
		cleanup();
	};
	const getFailureCause = () => failure?.cause;
	const handleAbort = () => {
		fail(aborted(signal?.reason));
	};
	const timer = setTimeout(() => {
		fail(new CoreOperationException({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
	}, Math.max(1, deadline - Date.now()));
	signal?.addEventListener("abort", handleAbort, { once: true });
	const isCallerAborted = () => signal?.aborted === true;
	if (isCallerAborted()) handleAbort();
	child.once("error", (cause) => {
		fail(createInspectionProcessFailure(cause));
	});
	supervision.closed.then(() => {
		if (!isClosing) fail(createInspectionProcessFailure());
	});
	let stderrBytes = 0;
	child.stderr?.on("data", (chunk) => {
		stderrBytes += chunk.byteLength;
		if (stderrBytes > 32768) fail(createInspectionProcessFailure());
	});
	child.on("message", (frame) => {
		if (isClosing) return;
		try {
			const message = decodeInspectionMessage(frame);
			if (message.attemptId !== attemptId) throw createInspectionProcessFailure();
			if (message.kind === "ready") {
				if (hasAcknowledgedHeap) throw createInspectionProcessFailure();
				heapMaximum = message.maxAnalysisHeapBytes;
				hasAcknowledgedHeap = true;
				send({
					attemptId,
					kind: "run"
				}).catch(fail);
			} else if (message.kind === "prepared") {
				if (!hasAcknowledgedHeap || hasPrepared || message.inspection.maxAnalysisHeapBytes !== heapMaximum || message.inspection.source.id !== snapshot.id || message.inspection.source.sourceKind !== snapshot.sourceKind) throw createInspectionProcessFailure();
				hasPrepared = true;
				prepared.resolve(deepFreeze(message.inspection));
			} else if (message.kind === "reader-request") {
				if (!hasAcknowledgedHeap || hasPrepared || message.requestId !== lastReaderRequestId + 1 || readerWork.size >= 4) throw createInspectionProcessFailure();
				lastReaderRequestId = message.requestId;
				if (sources === void 0) throw createInspectionProcessFailure();
				const work = executeRepositoryRpc(sources, message.request, controller.signal);
				readerWork.add(work);
				const relay = (async () => {
					try {
						const result = await work;
						readerWork.delete(work);
						if (!isClosing) await send({
							attemptId,
							kind: "reader-response",
							requestId: message.requestId,
							result
						});
					} catch (cause) {
						if (cause instanceof RepositorySourceException && [
							"ENTRY_NOT_FOUND",
							"ENTRY_NOT_FILE",
							"RESOURCE_LIMIT_EXCEEDED"
						].includes(cause.code)) try {
							if (!isClosing) await send({
								attemptId,
								kind: "reader-failure",
								requestId: message.requestId,
								failure: serializeInspectionFailure(cause)
							});
						} catch (transportFailure) {
							fail(transportFailure);
						}
						else fail(cause);
					} finally {
						readerWork.delete(work);
					}
				})();
				relayWork.add(relay);
				relay.finally(() => relayWork.delete(relay));
			} else if (message.kind === "page") {
				if (!hasPrepared || pendingPage === void 0 || message.requestId !== pageRequestId) throw createInspectionProcessFailure();
				const completion = pendingPage;
				pendingPage = void 0;
				completion.resolve(deepFreeze(message.result));
			} else if (message.kind === "failure") {
				if (message.failure.options["nextAction"] === "review-inspection-capacity" && (heapMaximum === void 0 || message.failure.options["limitMaximum"] !== heapMaximum)) throw createInspectionProcessFailure();
				fail(deserializeInspectionFailure(message.failure));
			} else throw createInspectionProcessFailure();
		} catch (cause) {
			fail(cause);
		}
	});
	try {
		await send({
			attemptId,
			kind: "start",
			snapshot,
			instructions,
			limits,
			deadline
		});
		const metadata = await prepared.promise;
		if (Date.now() >= deadline) throw new CoreOperationException({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		});
		return Object.freeze({
			...metadata,
			readPage: async (pageInput) => {
				if (failure !== void 0 || isClosing) throw failure?.cause ?? aborted();
				if (pendingPage !== void 0 || pageInput === null || typeof pageInput !== "object" || Reflect.ownKeys(pageInput).some((key) => key !== "cursor" && key !== "maxItems" && key !== "view") || !Number.isSafeInteger(pageInput.maxItems) || pageInput.maxItems < 1 || pageInput.maxItems > limits.maxEntries || ![
					"all",
					"diagnostics",
					"coverage",
					"metadata"
				].includes(pageInput.view) || pageInput.cursor !== void 0 && typeof pageInput.cursor !== "string") throw new CoreOperationException({
					code: "INVALID_ARGUMENT",
					operation: "create-project-inspection"
				});
				const completion = createCompletion();
				pendingPage = completion;
				pageRequestId++;
				try {
					if (Date.now() >= deadline) throw new CoreOperationException({
						code: "INSPECTION_TIMEOUT",
						operation: "create-project-inspection"
					});
					await send({
						attemptId,
						kind: "read-page",
						requestId: pageRequestId,
						input: {
							maxItems: pageInput.maxItems,
							view: pageInput.view,
							...pageInput.cursor === void 0 ? {} : { cursor: pageInput.cursor }
						}
					});
					const result = await completion.promise;
					if (Date.now() >= deadline) throw new CoreOperationException({
						code: "INSPECTION_TIMEOUT",
						operation: "create-project-inspection"
					});
					return result;
				} catch (cause) {
					fail(cause);
					await cleanup();
					throw getFailureCause() ?? createInspectionProcessFailure(cause);
				} finally {
					if (pendingPage === completion) pendingPage = void 0;
				}
			},
			dispose: async () => {
				pendingPage?.reject(failure?.cause ?? aborted());
				await cleanup();
				const cause = getFailureCause();
				if (cause !== void 0) throw cause;
			}
		});
	} catch (cause) {
		fail(cause);
		await cleanup();
		throw getFailureCause() ?? createInspectionProcessFailure(cause);
	}
};
//#endregion
//#region src/core-composition/executor.ts
var calculateRetainedByteLimit = (maxTotalBytes) => maxTotalBytes > Math.floor(Number.MAX_SAFE_INTEGER / 4) ? Number.MAX_SAFE_INTEGER : maxTotalBytes * 4;
var createMoldeaCliCoreInspectionExecutor = (nodeInspectionFactory = createNodeProjectInspection) => async (input) => {
	const inspection = await nodeInspectionFactory({
		repository: input.repository,
		...input.instructions === void 0 ? {} : { instructions: input.instructions },
		limits: {
			maxDiagnostics: input.resourceLimits.maxDiagnostics,
			maxEntries: input.resourceLimits.maxEntries,
			maxCoverage: input.resourceLimits.maxCoverage,
			maxFileBytes: input.resourceLimits.maxFileBytes,
			maxManifestBytes: input.resourceLimits.maxManifestBytes,
			maxRetainedBytes: calculateRetainedByteLimit(input.resourceLimits.maxTotalBytes),
			maxTotalBytesRead: input.resourceLimits.maxTotalBytes
		},
		...input.signal === void 0 ? {} : { signal: input.signal }
	});
	try {
		if (resolveInstalledMoldeaCliComposition({ packageMetadata: input.packageMetadata }).kind === "invalid") throw new MoldeaCliCompositionException();
		if (input.command === "inspect") return await inspection.readPage({
			...input.cursor === void 0 ? {} : { cursor: input.cursor },
			maxItems: Math.min(256, input.resourceLimits.maxEntries),
			view: "all"
		});
		const diagnostics = [];
		const coverage = [];
		for (const view of ["diagnostics", "coverage"]) {
			let cursor;
			do {
				const result = await inspection.readPage({
					view,
					maxItems: Math.min(256, input.resourceLimits.maxEntries),
					...cursor === void 0 ? {} : { cursor }
				});
				for (const { item } of result.page.records) if (item.kind === "diagnostic") diagnostics.push(item.diagnostic);
				else if (item.kind === "coverage") coverage.push(item.coverage);
				cursor = result.page.nextCursor ?? void 0;
			} while (cursor !== void 0);
		}
		return Object.freeze({
			diagnostics: Object.freeze(diagnostics),
			coverage: Object.freeze(coverage),
			coverageCounts: inspection.coverageCounts,
			diagnosticCount: inspection.counts.diagnostics,
			acceptedWarningCount: inspection.counts.acceptedWarnings,
			errorCount: inspection.counts.errors,
			warningCount: inspection.counts.warnings,
			valid: inspection.valid,
			formatVersion: inspection.formatVersion,
			source: inspection.source,
			summary: inspection.summary
		});
	} finally {
		await inspection.dispose();
	}
};
var executeMoldeaCliCoreInspection = createMoldeaCliCoreInspectionExecutor();
//#endregion
export { executeMoldeaCliCoreInspection };
