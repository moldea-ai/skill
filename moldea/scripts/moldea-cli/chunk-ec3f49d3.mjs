import { a as isCoreOperationErrorCode, i as isCoreOperation, n as CoreOperationException, o as measureJsonBytes, r as isCoreConfigurationErrorCode, t as CoreConfigurationException, u as isObjectValid } from "./chunk-728df961.mjs";
import { c as isRepositoryPath, i as RepositorySourceException, r as RepositoryPathException } from "./chunk-8d6114d2.mjs";
import { Buffer } from "node:buffer";
//#region ../core/dist/chunks/errors-C5qcq3E0.js
var NODE_INSPECTION_LIFETIME_MS = 12e4;
var NODE_INSPECTION_TERMINATION_GRACE_MS = 1e3;
var NODE_INSPECTION_FILE_PAGE_BYTES = 65536;
var NODE_INSPECTION_MESSAGE_BYTES = 1048576;
var NODE_INSPECTION_STDIO_BYTES = 32768;
var NODE_INSPECTION_TRANSPORT_BYTES = 4 * NODE_INSPECTION_MESSAGE_BYTES * 2 * 2 * 3;
Object.freeze({
	lifetimeMs: NODE_INSPECTION_LIFETIME_MS,
	terminationGraceMs: NODE_INSPECTION_TERMINATION_GRACE_MS,
	maxReaderRequests: 4,
	maxFilePageBytes: NODE_INSPECTION_FILE_PAGE_BYTES,
	maxMessageBytes: NODE_INSPECTION_MESSAGE_BYTES,
	maxStdioBytes: NODE_INSPECTION_STDIO_BYTES,
	transportBytes: NODE_INSPECTION_TRANSPORT_BYTES,
	oldGenerationMiB: 512,
	youngGenerationMiB: 24
});
var createInspectionProcessFailure = (cause) => new CoreOperationException({
	code: "INSPECTION_PROCESS_FAILED",
	operation: "create-project-inspection",
	...cause === void 0 ? {} : { cause }
});
var isInteger = (input) => typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
var hasKeys = (input, required, optional = []) => required.every((key) => Object.hasOwn(input, key)) && Object.keys(input).every((key) => required.includes(key) || optional.includes(key));
var isSnapshot = (input) => isObjectValid(input, true) && hasKeys(input, ["id", "sourceKind"]) && typeof input["id"] === "string" && input["id"].length > 0 && typeof input["sourceKind"] === "string" && input["sourceKind"].length > 0;
var isOptionalString = (input, key) => !Object.hasOwn(input, key) || typeof input[key] === "string";
var isPageInput = (input) => isObjectValid(input, true) && hasKeys(input, ["maxItems", "view"], ["cursor"]) && isInteger(input["maxItems"]) && input["maxItems"] > 0 && [
	"all",
	"diagnostics",
	"coverage",
	"metadata"
].includes(String(input["view"])) && isOptionalString(input, "cursor");
var isLimits = (input) => isObjectValid(input, true) && hasKeys(input, [
	"maxEntries",
	"maxTotalBytesRead",
	"maxFileBytes",
	"maxManifestBytes",
	"maxRetainedBytes",
	"maxDiagnostics",
	"maxCoverage",
	"maxAcceptedWarnings"
]) && Object.values(input).every((limit) => isInteger(limit) && limit > 0);
var isCounts = (input) => isObjectValid(input, true) && hasKeys(input, [
	"agents",
	"context",
	"decisions",
	"mirrors",
	"diagnostics",
	"errors",
	"warnings",
	"acceptedWarnings",
	"coverage",
	"metadata"
]) && Object.values(input).every(isInteger);
var isSummary = (input) => input === null || isObjectValid(input, true) && hasKeys(input, [
	"counts",
	"manifestDigest",
	"manifestPath",
	"projectDigest",
	"projectPath"
]) && isObjectValid(input["counts"], true) && hasKeys(input["counts"], [
	"agents",
	"context",
	"decisions",
	"mirrors"
]) && Object.values(input["counts"]).every(isInteger) && typeof input["manifestDigest"] === "string" && typeof input["projectDigest"] === "string" && isRepositoryPath(input["manifestPath"]) && isRepositoryPath(input["projectPath"]);
var isInspectionBase = (input) => isCounts(input["counts"]) && isObjectValid(input["coverageCounts"], true) && hasKeys(input["coverageCounts"], [
	"bindings",
	"exportsPassed",
	"exportsFailed",
	"exportsNotChecked"
]) && Object.values(input["coverageCounts"]).every(isInteger) && typeof input["valid"] === "boolean" && (input["formatVersion"] === null || input["formatVersion"] === 1) && typeof input["inspectionDigest"] === "string" && isSnapshot(input["source"]) && isSummary(input["summary"]);
var INSPECTION_KEYS = [
	"counts",
	"coverageCounts",
	"valid",
	"formatVersion",
	"inspectionDigest",
	"source",
	"summary"
];
var isMetadata = (input) => isObjectValid(input, true) && hasKeys(input, [
	...INSPECTION_KEYS,
	"resourceUsage",
	"maxAnalysisHeapBytes"
]) && isInspectionBase(input) && isInteger(input["maxAnalysisHeapBytes"]) && input["maxAnalysisHeapBytes"] > 0 && isObjectValid(input["resourceUsage"], true) && hasKeys(input["resourceUsage"], [
	"canonicalBytes",
	"peakRetainedBytes",
	"preparedBytes",
	"retainedBytes",
	"totalBytesRead"
]) && Object.values(input["resourceUsage"]).every(isInteger);
var isPage = (input) => isObjectValid(input, true) && hasKeys(input, [
	...INSPECTION_KEYS,
	"page",
	"view"
]) && isInspectionBase(input) && [
	"all",
	"diagnostics",
	"coverage",
	"metadata"
].includes(String(input["view"])) && isObjectValid(input["page"], true) && hasKeys(input["page"], [
	"isComplete",
	"records",
	"nextCursor",
	"totalItems"
]) && typeof input["page"]["isComplete"] === "boolean" && isInteger(input["page"]["totalItems"]) && (input["page"]["nextCursor"] === null || typeof input["page"]["nextCursor"] === "string") && Array.isArray(input["page"]["records"]) && input["page"]["records"].every((record) => isObjectValid(record, true) && hasKeys(record, ["item", "nextCursor"]) && (record["nextCursor"] === null || typeof record["nextCursor"] === "string") && isObjectValid(record["item"], true) && typeof record["item"]["kind"] === "string" && [
	"agent",
	"diagnostic",
	"coverage",
	"metadata"
].includes(record["item"]["kind"]) && hasKeys(record["item"], ["kind", record["item"]["kind"]]) && isObjectValid(record["item"][record["item"]["kind"]], true));
var isSource = (input) => input === "instructions" || input === "repository";
var isFilePageRequest = (input) => isRepositoryPath(input["path"]) && isInteger(input["offset"]) && isInteger(input["maxBytes"]) && input["maxBytes"] > 0 && input["maxBytes"] <= 65536;
var isInstructionSource = (input) => input === null || isObjectValid(input, true) && hasKeys(input, ["snapshot"]) && isSnapshot(input["snapshot"]);
var isRequest = (input) => {
	if (!isObjectValid(input, true)) return false;
	switch (input["method"]) {
		case "getEntry":
		case "readLinkText": return hasKeys(input, [
			"method",
			"path",
			"source"
		]) && isRepositoryPath(input["path"]) && isSource(input["source"]);
		case "listEntriesPage": return hasKeys(input, ["method", "maxEntries"], ["cursor", "prefix"]) && isInteger(input["maxEntries"]) && input["maxEntries"] > 0 && input["maxEntries"] <= 128 && isOptionalString(input, "cursor") && (!Object.hasOwn(input, "prefix") || isRepositoryPath(input["prefix"]));
		case "readFilePage": return hasKeys(input, [
			"method",
			"path",
			"maxBytes",
			"offset",
			"source"
		]) && isSource(input["source"]) && isFilePageRequest(input);
		default: return false;
	}
};
var isMessage = (input) => {
	if (!isObjectValid(input, true) || typeof input["attemptId"] !== "string" || !/^[a-f0-9]{32}$/.test(input["attemptId"])) return false;
	const keys = ["attemptId", "kind"];
	switch (input["kind"]) {
		case "start": return hasKeys(input, [
			...keys,
			"snapshot",
			"instructions",
			"limits",
			"deadline"
		]) && isSnapshot(input["snapshot"]) && isInstructionSource(input["instructions"]) && isLimits(input["limits"]) && isInteger(input["deadline"]);
		case "ready": return hasKeys(input, [...keys, "maxAnalysisHeapBytes"]) && isInteger(input["maxAnalysisHeapBytes"]) && input["maxAnalysisHeapBytes"] > 0;
		case "run":
		case "dispose": return hasKeys(input, keys);
		case "prepared": return hasKeys(input, [...keys, "inspection"]) && isMetadata(input["inspection"]);
		case "read-page": return hasKeys(input, [
			...keys,
			"requestId",
			"input"
		]) && isInteger(input["requestId"]) && isPageInput(input["input"]);
		case "page": return hasKeys(input, [
			...keys,
			"requestId",
			"result"
		]) && isInteger(input["requestId"]) && isPage(input["result"]);
		case "reader-request": return hasKeys(input, [
			...keys,
			"requestId",
			"request"
		]) && isInteger(input["requestId"]) && isRequest(input["request"]);
		case "reader-response": return hasKeys(input, [
			...keys,
			"requestId",
			"result"
		]) && isInteger(input["requestId"]);
		case "reader-failure":
		case "failure": return hasKeys(input, [
			...keys,
			"failure",
			...input["kind"] === "reader-failure" ? ["requestId"] : []
		]) && (input["kind"] !== "reader-failure" || isInteger(input["requestId"])) && isObjectValid(input["failure"], true) && hasKeys(input["failure"], ["family", "options"]) && [
			"configuration",
			"operation",
			"repository",
			"path"
		].includes(String(input["failure"]["family"])) && isObjectValid(input["failure"]["options"], true);
		default: return false;
	}
};
var encodeInspectionMessage = (message) => {
	let bytes;
	try {
		bytes = measureJsonBytes(message, NODE_INSPECTION_MESSAGE_BYTES);
	} catch (error) {
		throw createInspectionProcessFailure(error);
	}
	if (bytes > 1048576) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxInspectionMessageBytes",
		limitMaximum: NODE_INSPECTION_MESSAGE_BYTES,
		observedUsage: bytes,
		nextAction: null,
		operation: "create-project-inspection"
	});
	if (!isMessage(message)) throw createInspectionProcessFailure();
	return JSON.stringify(message);
};
var decodeInspectionMessage = (frame) => {
	if (typeof frame !== "string" || Buffer.byteLength(frame) > 1048576) throw createInspectionProcessFailure();
	let message;
	try {
		message = JSON.parse(frame);
	} catch (cause) {
		throw createInspectionProcessFailure(cause);
	}
	if (!isMessage(message)) throw createInspectionProcessFailure();
	return message;
};
var serializeInspectionFailure = (error) => {
	if (error instanceof CoreConfigurationException) return {
		family: "configuration",
		options: {
			code: error.code,
			operation: error.operation
		}
	};
	if (error instanceof CoreOperationException) return {
		family: "operation",
		options: {
			code: error.code,
			operation: error.operation,
			...error.code !== "RESOURCE_LIMIT_EXCEEDED" ? {} : {
				limit: error.limit,
				limitMaximum: error.limitMaximum,
				nextAction: error.nextAction,
				observedUsage: error.observedUsage
			}
		}
	};
	if (error instanceof RepositoryPathException) return {
		family: "path",
		options: {}
	};
	if (error instanceof RepositorySourceException) return {
		family: "repository",
		options: {
			code: error.code,
			operation: error.operation,
			path: error.path,
			retryable: error.retryable,
			...error.resource === null ? {} : { resource: error.resource }
		}
	};
	return {
		family: "operation",
		options: {
			code: "INSPECTION_PROCESS_FAILED",
			operation: "create-project-inspection"
		}
	};
};
var REPOSITORY_CODES = [
	"ENTRY_NOT_FOUND",
	"ENTRY_NOT_FILE",
	"ENTRY_NOT_DIRECTORY",
	"INVALID_PAGE_REQUEST",
	"ACCESS_DENIED",
	"SOURCE_UNAVAILABLE",
	"SNAPSHOT_CHANGED",
	"PROVIDER_INCOMPLETE",
	"INVALID_SOURCE_DATA",
	"RESOURCE_LIMIT_EXCEEDED",
	"ABORTED"
];
var REPOSITORY_OPERATIONS = [
	"create-reader",
	"create-comparison",
	"get-entry",
	"read-file-page",
	"list-entries-page",
	"list-changes-page"
];
var isNumber = (input) => typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
var deserializeInspectionFailure = (failure) => {
	const options = failure.options;
	const allowed = failure.family === "configuration" ? ["code", "operation"] : failure.family === "operation" ? [
		"code",
		"operation",
		"limit",
		"limitMaximum",
		"nextAction",
		"observedUsage"
	] : failure.family === "repository" ? [
		"code",
		"operation",
		"path",
		"retryable",
		"resource"
	] : [];
	if (Object.keys(options).some((key) => !allowed.includes(key))) throw createInspectionProcessFailure();
	if ((failure.family === "operation" || failure.family === "configuration") && !isCoreOperation(options["operation"])) throw createInspectionProcessFailure();
	const scope = { operation: isCoreOperation(options["operation"]) ? options["operation"] : "create-project-inspection" };
	if (failure.family === "path" && Object.keys(options).length === 0) return new RepositoryPathException();
	if (failure.family === "configuration") {
		const code = options["code"];
		if (isCoreConfigurationErrorCode(code)) return new CoreConfigurationException({
			...scope,
			code
		});
	}
	if (failure.family === "operation") {
		const code = options["code"];
		if (isCoreOperationErrorCode(code) && code !== "RESOURCE_LIMIT_EXCEEDED" && ![
			"limit",
			"limitMaximum",
			"nextAction",
			"observedUsage"
		].some((key) => Object.hasOwn(options, key))) return new CoreOperationException({
			...scope,
			code
		});
		if (options["code"] === "RESOURCE_LIMIT_EXCEEDED" && isNumber(options["limitMaximum"]) && options["limitMaximum"] > 0) {
			if (options["limit"] === "maxAnalysisHeapBytes" && options["nextAction"] === "review-inspection-capacity" && options["observedUsage"] === null) return new CoreOperationException({
				...scope,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: "maxAnalysisHeapBytes",
				limitMaximum: options["limitMaximum"],
				observedUsage: null,
				nextAction: "review-inspection-capacity"
			});
			if ((options["limit"] === "maxInspectionMessageBytes" || options["limit"] === "maxReaderRequests") && options["nextAction"] === null && isNumber(options["observedUsage"])) return new CoreOperationException({
				...scope,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: options["limit"],
				limitMaximum: options["limitMaximum"],
				nextAction: null,
				observedUsage: options["observedUsage"]
			});
			if (typeof options["limit"] === "string" && ![
				"maxAnalysisHeapBytes",
				"maxInspectionMessageBytes",
				"maxReaderRequests"
			].includes(options["limit"]) && options["nextAction"] === "reduce-input-or-increase-limit" && isNumber(options["observedUsage"])) return new CoreOperationException({
				...scope,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: options["limit"],
				limitMaximum: options["limitMaximum"],
				nextAction: "reduce-input-or-increase-limit",
				observedUsage: options["observedUsage"]
			});
		}
	}
	if (failure.family === "repository") {
		const code = REPOSITORY_CODES.find((candidate) => candidate === options["code"]);
		const operation = REPOSITORY_OPERATIONS.find((candidate) => candidate === options["operation"]);
		const resource = options["resource"];
		if (code !== void 0 && operation !== void 0 && typeof options["retryable"] === "boolean" && (options["path"] === null || isRepositoryPath(options["path"])) && (resource === void 0 || resource !== null && typeof resource === "object" && Object.keys(resource).length === 3 && "dimension" in resource && typeof resource.dimension === "string" && "limit" in resource && isNumber(resource.limit) && "observed" in resource && isNumber(resource.observed))) return new RepositorySourceException({
			code,
			operation,
			path: options["path"],
			retryable: options["retryable"],
			...resource === void 0 ? {} : { resource }
		});
	}
	throw createInspectionProcessFailure();
};
//#endregion
export { createInspectionProcessFailure as a, encodeInspectionMessage as c, NODE_INSPECTION_TRANSPORT_BYTES as i, serializeInspectionFailure as l, NODE_INSPECTION_LIFETIME_MS as n, decodeInspectionMessage as o, NODE_INSPECTION_TERMINATION_GRACE_MS as r, deserializeInspectionFailure as s, NODE_INSPECTION_FILE_PAGE_BYTES as t };
