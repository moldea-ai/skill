import { a as e, i as t, n, o as r, r as i, t as a, u as o } from "./chunk-2cc3bf5c.mjs";
import { c as s, i as c, r as l } from "./chunk-98d84174.mjs";
import { Buffer as u } from "node:buffer";
//#region ../core/dist/chunks/errors-C5qcq3E0.js
var d = 12e4, f = 1e3, p = 65536, m = 1048576, h = 32768, g = 4 * m * 2 * 2 * 3;
Object.freeze({
	lifetimeMs: d,
	terminationGraceMs: f,
	maxReaderRequests: 4,
	maxFilePageBytes: p,
	maxMessageBytes: m,
	maxStdioBytes: h,
	transportBytes: g,
	oldGenerationMiB: 512,
	youngGenerationMiB: 24
});
var _ = (e) => new n({
	code: "INSPECTION_PROCESS_FAILED",
	operation: "create-project-inspection",
	...e === void 0 ? {} : { cause: e }
}), v = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0, y = (e, t, n = []) => t.every((t) => Object.hasOwn(e, t)) && Object.keys(e).every((e) => t.includes(e) || n.includes(e)), b = (e) => o(e, !0) && y(e, ["id", "sourceKind"]) && typeof e.id == "string" && e.id.length > 0 && typeof e.sourceKind == "string" && e.sourceKind.length > 0, x = (e, t) => !Object.hasOwn(e, t) || typeof e[t] == "string", S = (e) => o(e, !0) && y(e, ["maxItems", "view"], ["cursor"]) && v(e.maxItems) && e.maxItems > 0 && [
	"all",
	"diagnostics",
	"coverage",
	"metadata"
].includes(String(e.view)) && x(e, "cursor"), C = (e) => o(e, !0) && y(e, [
	"maxEntries",
	"maxTotalBytesRead",
	"maxFileBytes",
	"maxManifestBytes",
	"maxRetainedBytes",
	"maxDiagnostics",
	"maxCoverage",
	"maxAcceptedWarnings"
]) && Object.values(e).every((e) => v(e) && e > 0), w = (e) => o(e, !0) && y(e, [
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
]) && Object.values(e).every(v), T = (e) => e === null || o(e, !0) && y(e, [
	"counts",
	"manifestDigest",
	"manifestPath",
	"projectDigest",
	"projectPath"
]) && o(e.counts, !0) && y(e.counts, [
	"agents",
	"context",
	"decisions",
	"mirrors"
]) && Object.values(e.counts).every(v) && typeof e.manifestDigest == "string" && typeof e.projectDigest == "string" && s(e.manifestPath) && s(e.projectPath), E = (e) => w(e.counts) && o(e.coverageCounts, !0) && y(e.coverageCounts, [
	"bindings",
	"exportsPassed",
	"exportsFailed",
	"exportsNotChecked"
]) && Object.values(e.coverageCounts).every(v) && typeof e.valid == "boolean" && (e.formatVersion === null || e.formatVersion === 1) && typeof e.inspectionDigest == "string" && b(e.source) && T(e.summary), D = [
	"counts",
	"coverageCounts",
	"valid",
	"formatVersion",
	"inspectionDigest",
	"source",
	"summary"
], O = (e) => o(e, !0) && y(e, [
	...D,
	"resourceUsage",
	"maxAnalysisHeapBytes"
]) && E(e) && v(e.maxAnalysisHeapBytes) && e.maxAnalysisHeapBytes > 0 && o(e.resourceUsage, !0) && y(e.resourceUsage, [
	"canonicalBytes",
	"peakRetainedBytes",
	"preparedBytes",
	"retainedBytes",
	"totalBytesRead"
]) && Object.values(e.resourceUsage).every(v), k = (e) => o(e, !0) && y(e, [
	...D,
	"page",
	"view"
]) && E(e) && [
	"all",
	"diagnostics",
	"coverage",
	"metadata"
].includes(String(e.view)) && o(e.page, !0) && y(e.page, [
	"isComplete",
	"records",
	"nextCursor",
	"totalItems"
]) && typeof e.page.isComplete == "boolean" && v(e.page.totalItems) && (e.page.nextCursor === null || typeof e.page.nextCursor == "string") && Array.isArray(e.page.records) && e.page.records.every((e) => o(e, !0) && y(e, ["item", "nextCursor"]) && (e.nextCursor === null || typeof e.nextCursor == "string") && o(e.item, !0) && typeof e.item.kind == "string" && [
	"agent",
	"diagnostic",
	"coverage",
	"metadata"
].includes(e.item.kind) && y(e.item, ["kind", e.item.kind]) && o(e.item[e.item.kind], !0)), A = (e) => e === "instructions" || e === "repository", j = (e) => s(e.path) && v(e.offset) && v(e.maxBytes) && e.maxBytes > 0 && e.maxBytes <= 65536, M = (e) => e === null || o(e, !0) && y(e, ["snapshot"]) && b(e.snapshot), N = (e) => {
	if (!o(e, !0)) return !1;
	switch (e.method) {
		case "getEntry":
		case "readLinkText": return y(e, [
			"method",
			"path",
			"source"
		]) && s(e.path) && A(e.source);
		case "listEntriesPage": return y(e, ["method", "maxEntries"], ["cursor", "prefix"]) && v(e.maxEntries) && e.maxEntries > 0 && e.maxEntries <= 128 && x(e, "cursor") && (!Object.hasOwn(e, "prefix") || s(e.prefix));
		case "readFilePage": return y(e, [
			"method",
			"path",
			"maxBytes",
			"offset",
			"source"
		]) && A(e.source) && j(e);
		default: return !1;
	}
}, P = (e) => {
	if (!o(e, !0) || typeof e.attemptId != "string" || !/^[a-f0-9]{32}$/.test(e.attemptId)) return !1;
	let t = ["attemptId", "kind"];
	switch (e.kind) {
		case "start": return y(e, [
			...t,
			"snapshot",
			"instructions",
			"limits",
			"deadline"
		]) && b(e.snapshot) && M(e.instructions) && C(e.limits) && v(e.deadline);
		case "ready": return y(e, [...t, "maxAnalysisHeapBytes"]) && v(e.maxAnalysisHeapBytes) && e.maxAnalysisHeapBytes > 0;
		case "run":
		case "dispose": return y(e, t);
		case "prepared": return y(e, [...t, "inspection"]) && O(e.inspection);
		case "read-page": return y(e, [
			...t,
			"requestId",
			"input"
		]) && v(e.requestId) && S(e.input);
		case "page": return y(e, [
			...t,
			"requestId",
			"result"
		]) && v(e.requestId) && k(e.result);
		case "reader-request": return y(e, [
			...t,
			"requestId",
			"request"
		]) && v(e.requestId) && N(e.request);
		case "reader-response": return y(e, [
			...t,
			"requestId",
			"result"
		]) && v(e.requestId);
		case "reader-failure":
		case "failure": return y(e, [
			...t,
			"failure",
			...e.kind === "reader-failure" ? ["requestId"] : []
		]) && (e.kind !== "reader-failure" || v(e.requestId)) && o(e.failure, !0) && y(e.failure, ["family", "options"]) && [
			"configuration",
			"operation",
			"repository",
			"path"
		].includes(String(e.failure.family)) && o(e.failure.options, !0);
		default: return !1;
	}
}, F = (e) => {
	let t;
	try {
		t = r(e, m);
	} catch (e) {
		throw _(e);
	}
	if (t > 1048576) throw new n({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxInspectionMessageBytes",
		limitMaximum: m,
		observedUsage: t,
		nextAction: null,
		operation: "create-project-inspection"
	});
	if (!P(e)) throw _();
	return JSON.stringify(e);
}, I = (e) => {
	if (typeof e != "string" || u.byteLength(e) > 1048576) throw _();
	let t;
	try {
		t = JSON.parse(e);
	} catch (e) {
		throw _(e);
	}
	if (!P(t)) throw _();
	return t;
}, L = (e) => e instanceof a ? {
	family: "configuration",
	options: {
		code: e.code,
		operation: e.operation
	}
} : e instanceof n ? {
	family: "operation",
	options: {
		code: e.code,
		operation: e.operation,
		...e.code === "RESOURCE_LIMIT_EXCEEDED" ? {
			limit: e.limit,
			limitMaximum: e.limitMaximum,
			nextAction: e.nextAction,
			observedUsage: e.observedUsage
		} : {}
	}
} : e instanceof l ? {
	family: "path",
	options: {}
} : e instanceof c ? {
	family: "repository",
	options: {
		code: e.code,
		operation: e.operation,
		path: e.path,
		retryable: e.retryable,
		...e.resource === null ? {} : { resource: e.resource }
	}
} : {
	family: "operation",
	options: {
		code: "INSPECTION_PROCESS_FAILED",
		operation: "create-project-inspection"
	}
}, R = [
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
], z = [
	"create-reader",
	"create-comparison",
	"get-entry",
	"read-file-page",
	"list-entries-page",
	"list-changes-page"
], B = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0, V = (r) => {
	let o = r.options, u = r.family === "configuration" ? ["code", "operation"] : r.family === "operation" ? [
		"code",
		"operation",
		"limit",
		"limitMaximum",
		"nextAction",
		"observedUsage"
	] : r.family === "repository" ? [
		"code",
		"operation",
		"path",
		"retryable",
		"resource"
	] : [];
	if (Object.keys(o).some((e) => !u.includes(e)) || (r.family === "operation" || r.family === "configuration") && !t(o.operation)) throw _();
	let d = { operation: t(o.operation) ? o.operation : "create-project-inspection" };
	if (r.family === "path" && Object.keys(o).length === 0) return new l();
	if (r.family === "configuration") {
		let e = o.code;
		if (i(e)) return new a({
			...d,
			code: e
		});
	}
	if (r.family === "operation") {
		let t = o.code;
		if (e(t) && t !== "RESOURCE_LIMIT_EXCEEDED" && ![
			"limit",
			"limitMaximum",
			"nextAction",
			"observedUsage"
		].some((e) => Object.hasOwn(o, e))) return new n({
			...d,
			code: t
		});
		if (o.code === "RESOURCE_LIMIT_EXCEEDED" && B(o.limitMaximum) && o.limitMaximum > 0) {
			if (o.limit === "maxAnalysisHeapBytes" && o.nextAction === "review-inspection-capacity" && o.observedUsage === null) return new n({
				...d,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: "maxAnalysisHeapBytes",
				limitMaximum: o.limitMaximum,
				observedUsage: null,
				nextAction: "review-inspection-capacity"
			});
			if ((o.limit === "maxInspectionMessageBytes" || o.limit === "maxReaderRequests") && o.nextAction === null && B(o.observedUsage)) return new n({
				...d,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: o.limit,
				limitMaximum: o.limitMaximum,
				nextAction: null,
				observedUsage: o.observedUsage
			});
			if (typeof o.limit == "string" && ![
				"maxAnalysisHeapBytes",
				"maxInspectionMessageBytes",
				"maxReaderRequests"
			].includes(o.limit) && o.nextAction === "reduce-input-or-increase-limit" && B(o.observedUsage)) return new n({
				...d,
				code: "RESOURCE_LIMIT_EXCEEDED",
				limit: o.limit,
				limitMaximum: o.limitMaximum,
				nextAction: "reduce-input-or-increase-limit",
				observedUsage: o.observedUsage
			});
		}
	}
	if (r.family === "repository") {
		let e = R.find((e) => e === o.code), t = z.find((e) => e === o.operation), n = o.resource;
		if (e !== void 0 && t !== void 0 && typeof o.retryable == "boolean" && (o.path === null || s(o.path)) && (n === void 0 || typeof n == "object" && n && Object.keys(n).length === 3 && "dimension" in n && typeof n.dimension == "string" && "limit" in n && B(n.limit) && "observed" in n && B(n.observed))) return new c({
			code: e,
			operation: t,
			path: o.path,
			retryable: o.retryable,
			...n === void 0 ? {} : { resource: n }
		});
	}
	throw _();
};
//#endregion
export { _ as a, F as c, g as i, L as l, d as n, I as o, f as r, V as s, p as t };
