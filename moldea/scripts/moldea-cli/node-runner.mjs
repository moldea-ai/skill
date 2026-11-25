import { n as CoreOperationException } from "./chunk-728df961.mjs";
import { a as createInspectionProcessFailure, c as encodeInspectionMessage, l as serializeInspectionFailure, n as NODE_INSPECTION_LIFETIME_MS, o as decodeInspectionMessage } from "./chunk-ec3f49d3.mjs";
import { n as createInspectionSender } from "./chunk-94b5ac22.mjs";
import process from "node:process";
import { Worker } from "node:worker_threads";
//#region ../core/dist/node-runner.js
var worker;
var attemptId;
var heapMaximum;
var deadlineTimer;
var isClosing = false;
var hasRun = false;
var readerRequests = new Set();
var send = createInspectionSender((frame, callback) => {
	if (process.send === void 0 || !process.connected) throw createInspectionProcessFailure();
	process.send(frame, callback);
});
var close = async (failure) => {
	if (isClosing) return;
	isClosing = true;
	clearTimeout(deadlineTimer);
	const termination = worker?.terminate();
	if (failure !== void 0 && attemptId !== void 0 && process.connected) try {
		await send({
			attemptId,
			kind: "failure",
			failure: serializeInspectionFailure(failure)
		});
	} catch {}
	await termination;
	readerRequests.clear();
	process.removeListener("message", handleParentMessage);
	process.removeListener("disconnect", handleDisconnect);
	if (process.connected) process.disconnect();
};
var handleDisconnect = () => {
	close();
};
var handleWorkerMessage = (frame) => {
	try {
		const message = decodeInspectionMessage(frame);
		if (isClosing) return;
		if (message.attemptId !== attemptId) throw createInspectionProcessFailure();
		if (message.kind === "ready") {
			if (heapMaximum !== void 0 || hasRun) throw createInspectionProcessFailure();
			heapMaximum = message.maxAnalysisHeapBytes;
		} else if (message.kind === "reader-request") {
			if (!hasRun || readerRequests.has(message.requestId) || readerRequests.size >= 4) throw createInspectionProcessFailure();
			readerRequests.add(message.requestId);
		} else if (message.kind === "failure" && message.failure.options["limit"] === "maxAnalysisHeapBytes") throw createInspectionProcessFailure();
		else if (![
			"prepared",
			"page",
			"failure"
		].includes(message.kind)) throw createInspectionProcessFailure();
		send(message).catch((cause) => close(cause));
	} catch (cause) {
		close(cause);
	}
};
var start = (message) => {
	if (attemptId !== void 0 || isClosing) throw createInspectionProcessFailure();
	attemptId = message.attemptId;
	clearTimeout(deadlineTimer);
	const remaining = Math.min(NODE_INSPECTION_LIFETIME_MS, message.deadline - Date.now());
	if (remaining <= 0) {
		close(new CoreOperationException({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
		return;
	}
	deadlineTimer = setTimeout(() => {
		close(new CoreOperationException({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
	}, remaining);
	worker = new Worker(new URL(new URL("./analysis-worker.mjs", import.meta.url).href), {
		execArgv: [],
		env: process.env,
		stdout: true,
		stderr: true,
		resourceLimits: {
			maxOldGenerationSizeMb: 512,
			maxYoungGenerationSizeMb: 24
		},
		workerData: encodeInspectionMessage(message)
	});
	let stdioBytes = 0;
	const consumeStdio = (chunk) => {
		stdioBytes += chunk.byteLength;
		if (stdioBytes > 32768) close(createInspectionProcessFailure());
	};
	worker.stdout.on("data", consumeStdio);
	worker.stderr.on("data", consumeStdio);
	worker.on("message", handleWorkerMessage);
	worker.on("messageerror", (cause) => {
		close(createInspectionProcessFailure(cause));
	});
	worker.once("error", (error) => {
		close(error.code === "ERR_WORKER_OUT_OF_MEMORY" && heapMaximum !== void 0 ? new CoreOperationException({
			code: "RESOURCE_LIMIT_EXCEEDED",
			operation: "create-project-inspection",
			limit: "maxAnalysisHeapBytes",
			limitMaximum: heapMaximum,
			observedUsage: null,
			nextAction: "review-inspection-capacity"
		}) : createInspectionProcessFailure(error));
	});
	worker.once("exit", () => {
		if (!isClosing) close(createInspectionProcessFailure());
	});
};
var handleParentMessage = (frame) => {
	try {
		const message = decodeInspectionMessage(frame);
		if (isClosing) return;
		if (message.kind === "start") {
			start(message);
			return;
		}
		if (message.attemptId !== attemptId || worker === void 0) throw createInspectionProcessFailure();
		if (message.kind === "dispose") {
			close();
			return;
		}
		if (message.kind === "run") {
			if (heapMaximum === void 0 || hasRun) throw createInspectionProcessFailure();
			hasRun = true;
		} else if (message.kind === "reader-response" || message.kind === "reader-failure") {
			if (!readerRequests.delete(message.requestId)) throw createInspectionProcessFailure();
		} else if (message.kind !== "read-page" || !hasRun) throw createInspectionProcessFailure();
		worker.postMessage(encodeInspectionMessage(message));
	} catch (cause) {
		close(cause);
	}
};
process.on("disconnect", handleDisconnect);
process.on("message", handleParentMessage);
deadlineTimer = setTimeout(() => {
	close();
}, NODE_INSPECTION_LIFETIME_MS);
if (process.send === void 0 || !process.connected) close();
//#endregion
export {};
