import { n as CoreOperationException } from "./chunk-728df961.mjs";
import { u as normalizeCoreOptions } from "./chunk-a5514957.mjs";
import { i as RepositorySourceException } from "./chunk-8d6114d2.mjs";
import { a as createInspectionProcessFailure, c as encodeInspectionMessage, i as NODE_INSPECTION_TRANSPORT_BYTES, l as serializeInspectionFailure, o as decodeInspectionMessage, s as deserializeInspectionFailure, t as NODE_INSPECTION_FILE_PAGE_BYTES } from "./chunk-ec3f49d3.mjs";
import { a as parseRpcLinkText, i as parseRpcFilePage, n as parseRpcEntry, r as parseRpcEntryPage } from "./chunk-131f8005.mjs";
import { parentPort, workerData } from "node:worker_threads";
import { getHeapStatistics } from "node:v8";
//#region ../core/dist/analysis-worker.js
var port = parentPort;
if (port === null) throw createInspectionProcessFailure();
var start = decodeInspectionMessage(workerData);
if (start.kind !== "start") throw createInspectionProcessFailure();
var attemptId = start.attemptId;
var maxAnalysisHeapBytes = getHeapStatistics().heap_size_limit;
var inspection;
var hasRun = false;
var isReadingPage = false;
var nextRequestId = 0;
var pending = new Map();
var send = (message) => {
	port.postMessage(encodeInspectionMessage(message));
};
var requestReader = (request) => {
	if (pending.size >= 4) return Promise.reject(new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "create-project-inspection",
		limit: "maxReaderRequests",
		limitMaximum: 4,
		observedUsage: pending.size + 1,
		nextAction: null
	}));
	const requestId = nextRequestId++;
	return new Promise((resolve, reject) => {
		pending.set(requestId, {
			resolve,
			reject
		});
		try {
			send({
				attemptId,
				kind: "reader-request",
				requestId,
				request
			});
		} catch (cause) {
			pending.delete(requestId);
			reject(cause instanceof Error ? cause : createInspectionProcessFailure(cause));
		}
	});
};
var createProxyReader = (source, snapshot) => ({
	snapshot,
	getEntry: async (path) => parseRpcEntry(await requestReader({
		method: "getEntry",
		path,
		source
	})),
	listEntriesPage: async (options) => source === "repository" ? parseRpcEntryPage(await requestReader({
		method: "listEntriesPage",
		maxEntries: Math.min(128, options.maxEntries),
		...options.cursor === void 0 ? {} : { cursor: options.cursor },
		...options.prefix === void 0 ? {} : { prefix: options.prefix }
	})) : Promise.reject(new RepositorySourceException({
		code: "SOURCE_UNAVAILABLE",
		operation: "list-entries-page",
		path: null,
		retryable: false
	})),
	readFilePage: async (path, options) => parseRpcFilePage(await requestReader({
		method: "readFilePage",
		path,
		offset: options.offset,
		maxBytes: Math.min(NODE_INSPECTION_FILE_PAGE_BYTES, options.maxBytes),
		source
	})),
	readLinkText: async (path) => parseRpcLinkText(await requestReader({
		method: "readLinkText",
		path,
		source
	})),
	compare: () => Promise.reject(new RepositorySourceException({
		code: "SOURCE_UNAVAILABLE",
		operation: "create-comparison",
		path: null,
		retryable: false
	}))
});
var repository = createProxyReader("repository", start.snapshot);
var instructions = start.instructions === null ? null : createProxyReader("instructions", start.instructions.snapshot);
var prepare = async () => {
	const { createCore } = await import("./chunk-b98ca669.mjs").then((n) => n.t);
	inspection = await createCore(normalizeCoreOptions({ limits: {
		...start.limits,
		maxRetainedBytes: start.limits.maxRetainedBytes - NODE_INSPECTION_TRANSPORT_BYTES
	} })).createProjectInspection({
		repository,
		...instructions === null ? {} : { instructions }
	});
	const metadata = {
		source: inspection.source,
		formatVersion: inspection.formatVersion,
		valid: inspection.valid,
		counts: inspection.counts,
		coverageCounts: inspection.coverageCounts,
		summary: inspection.summary,
		resourceUsage: inspection.resourceUsage,
		inspectionDigest: inspection.inspectionDigest
	};
	send({
		attemptId,
		kind: "prepared",
		inspection: {
			...metadata,
			maxAnalysisHeapBytes,
			resourceUsage: {
				...metadata.resourceUsage,
				retainedBytes: metadata.resourceUsage.retainedBytes + NODE_INSPECTION_TRANSPORT_BYTES,
				peakRetainedBytes: metadata.resourceUsage.peakRetainedBytes + NODE_INSPECTION_TRANSPORT_BYTES
			}
		}
	});
};
var fail = (cause) => {
	try {
		const failure = serializeInspectionFailure(cause);
		if (cause instanceof CoreOperationException && cause.code === "RESOURCE_LIMIT_EXCEEDED" && cause.limit === "maxRetainedBytes" && cause.observedUsage !== null) {
			failure.options["limitMaximum"] = start.limits.maxRetainedBytes;
			failure.options["observedUsage"] = cause.observedUsage + NODE_INSPECTION_TRANSPORT_BYTES;
		}
		send({
			attemptId,
			kind: "failure",
			failure
		});
	} catch {
		port.close();
	}
};
port.on("message", (frame) => {
	try {
		const message = decodeInspectionMessage(frame);
		if (message.attemptId !== attemptId) throw createInspectionProcessFailure();
		if (message.kind === "run") {
			if (hasRun) throw createInspectionProcessFailure();
			hasRun = true;
			prepare().catch(fail);
		} else if (message.kind === "reader-response" || message.kind === "reader-failure") {
			const request = pending.get(message.requestId);
			if (request === void 0) throw createInspectionProcessFailure();
			pending.delete(message.requestId);
			if (message.kind === "reader-failure") request.reject(deserializeInspectionFailure(message.failure));
			else request.resolve(message.result);
		} else if (message.kind === "read-page") {
			if (inspection === void 0 || isReadingPage) throw createInspectionProcessFailure();
			isReadingPage = true;
			try {
				if (message.input.maxItems > start.limits.maxEntries) throw new CoreOperationException({
					code: "INVALID_ARGUMENT",
					operation: "create-project-inspection"
				});
				let maxItems = Math.min(256, message.input.maxItems);
				while (true) try {
					const frame = encodeInspectionMessage({
						attemptId,
						kind: "page",
						requestId: message.requestId,
						result: inspection.readPage({
							...message.input,
							maxItems
						})
					});
					port.postMessage(frame);
					break;
				} catch (cause) {
					if (!(cause instanceof CoreOperationException) || cause.code !== "RESOURCE_LIMIT_EXCEEDED" || cause.limit !== "maxInspectionMessageBytes" || maxItems === 1) throw cause;
					maxItems = Math.max(1, Math.floor(maxItems / 2));
				}
			} finally {
				isReadingPage = false;
			}
		} else throw createInspectionProcessFailure();
	} catch (cause) {
		fail(cause);
	}
});
port.on("messageerror", fail);
send({
	attemptId,
	kind: "ready",
	maxAnalysisHeapBytes
});
//#endregion
export {};
