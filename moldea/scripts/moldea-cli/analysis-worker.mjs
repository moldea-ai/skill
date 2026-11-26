import { n as e } from "./chunk-2cc3bf5c.mjs";
import { u as t } from "./chunk-8f198616.mjs";
import { i as n } from "./chunk-98d84174.mjs";
import { a as r, c as i, i as a, l as o, o as s, s as c, t as l } from "./chunk-24ea7c23.mjs";
import { a as u, i as d, n as f, r as p } from "./chunk-2e9d4c63.mjs";
import { parentPort as m, workerData as h } from "node:worker_threads";
import { getHeapStatistics as g } from "node:v8";
//#region ../core/dist/analysis-worker.js
var _ = m;
if (_ === null) throw r();
var v = s(h);
if (v.kind !== "start") throw r();
var y = v.attemptId, b = g().heap_size_limit, x, S = !1, C = !1, w = 0, T = new Map(), E = (e) => {
	_.postMessage(i(e));
}, D = (t) => {
	if (T.size >= 4) return Promise.reject(new e({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "create-project-inspection",
		limit: "maxReaderRequests",
		limitMaximum: 4,
		observedUsage: T.size + 1,
		nextAction: null
	}));
	let n = w++;
	return new Promise((e, i) => {
		T.set(n, {
			resolve: e,
			reject: i
		});
		try {
			E({
				attemptId: y,
				kind: "reader-request",
				requestId: n,
				request: t
			});
		} catch (e) {
			T.delete(n), i(e instanceof Error ? e : r(e));
		}
	});
}, O = (e, t) => ({
	snapshot: t,
	getEntry: async (t) => f(await D({
		method: "getEntry",
		path: t,
		source: e
	})),
	listEntriesPage: async (t) => e === "repository" ? p(await D({
		method: "listEntriesPage",
		maxEntries: Math.min(128, t.maxEntries),
		...t.cursor === void 0 ? {} : { cursor: t.cursor },
		...t.prefix === void 0 ? {} : { prefix: t.prefix }
	})) : Promise.reject(new n({
		code: "SOURCE_UNAVAILABLE",
		operation: "list-entries-page",
		path: null,
		retryable: !1
	})),
	readFilePage: async (t, n) => d(await D({
		method: "readFilePage",
		path: t,
		offset: n.offset,
		maxBytes: Math.min(l, n.maxBytes),
		source: e
	})),
	readLinkText: async (t) => u(await D({
		method: "readLinkText",
		path: t,
		source: e
	})),
	compare: () => Promise.reject(new n({
		code: "SOURCE_UNAVAILABLE",
		operation: "create-comparison",
		path: null,
		retryable: !1
	}))
}), k = O("repository", v.snapshot), A = v.instructions === null ? null : O("instructions", v.instructions.snapshot), j = async () => {
	let { createCore: e } = await import("./chunk-1306b995.mjs").then((e) => e.t);
	x = await e(t({ limits: {
		...v.limits,
		maxRetainedBytes: v.limits.maxRetainedBytes - a
	} })).createProjectInspection({
		repository: k,
		...A === null ? {} : { instructions: A }
	});
	let n = {
		source: x.source,
		formatVersion: x.formatVersion,
		valid: x.valid,
		counts: x.counts,
		coverageCounts: x.coverageCounts,
		summary: x.summary,
		resourceUsage: x.resourceUsage,
		inspectionDigest: x.inspectionDigest
	};
	E({
		attemptId: y,
		kind: "prepared",
		inspection: {
			...n,
			maxAnalysisHeapBytes: b,
			resourceUsage: {
				...n.resourceUsage,
				retainedBytes: n.resourceUsage.retainedBytes + a,
				peakRetainedBytes: n.resourceUsage.peakRetainedBytes + a
			}
		}
	});
}, M = (t) => {
	try {
		let n = o(t);
		t instanceof e && t.code === "RESOURCE_LIMIT_EXCEEDED" && t.limit === "maxRetainedBytes" && t.observedUsage !== null && (n.options.limitMaximum = v.limits.maxRetainedBytes, n.options.observedUsage = t.observedUsage + a), E({
			attemptId: y,
			kind: "failure",
			failure: n
		});
	} catch {
		_.close();
	}
};
_.on("message", (t) => {
	try {
		let n = s(t);
		if (n.attemptId !== y) throw r();
		if (n.kind === "run") {
			if (S) throw r();
			S = !0, j().catch(M);
		} else if (n.kind === "reader-response" || n.kind === "reader-failure") {
			let e = T.get(n.requestId);
			if (e === void 0) throw r();
			T.delete(n.requestId), n.kind === "reader-failure" ? e.reject(c(n.failure)) : e.resolve(n.result);
		} else if (n.kind === "read-page") {
			if (x === void 0 || C) throw r();
			C = !0;
			try {
				if (n.input.maxItems > v.limits.maxEntries) throw new e({
					code: "INVALID_ARGUMENT",
					operation: "create-project-inspection"
				});
				let t = Math.min(256, n.input.maxItems);
				for (;;) try {
					let e = i({
						attemptId: y,
						kind: "page",
						requestId: n.requestId,
						result: x.readPage({
							...n.input,
							maxItems: t
						})
					});
					_.postMessage(e);
					break;
				} catch (n) {
					if (!(n instanceof e) || n.code !== "RESOURCE_LIMIT_EXCEEDED" || n.limit !== "maxInspectionMessageBytes" || t === 1) throw n;
					t = Math.max(1, Math.floor(t / 2));
				}
			} finally {
				C = !1;
			}
		} else throw r();
	} catch (e) {
		M(e);
	}
}), _.on("messageerror", M), E({
	attemptId: y,
	kind: "ready",
	maxAnalysisHeapBytes: b
});
//#endregion
export {};
