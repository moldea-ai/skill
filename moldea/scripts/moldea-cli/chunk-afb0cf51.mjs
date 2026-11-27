import { n as e, u as t } from "./chunk-2cc3bf5c.mjs";
import { I as n, V as r, o as i, t as a } from "./chunk-ad32cb41.mjs";
import { p as o, u as s } from "./chunk-8f198616.mjs";
import { i as c } from "./chunk-98d84174.mjs";
import { a as l, i as u, l as d, n as f, o as p, s as m } from "./chunk-24ea7c23.mjs";
import { n as h, r as g, t as _ } from "./chunk-cea1378f.mjs";
import { t as v } from "./chunk-2e9d4c63.mjs";
import { fileURLToPath as y } from "node:url";
import { fork as b } from "node:child_process";
import { randomBytes as x } from "node:crypto";
//#region ../core/dist/node.js
var S = 0, C = () => {
	let e = Promise.withResolvers();
	return e.promise.catch(() => {}), e;
}, w = (e) => t(e, !0) && typeof e.id == "string" && e.id.length > 0 && typeof e.sourceKind == "string" && e.sourceKind.length > 0, T = (e) => {
	if (e === void 0) return null;
	if (!(!t(e, !0) || typeof e.getEntry != "function" || typeof e.readFilePage != "function" || typeof e.readLinkText != "function" || !w(e.snapshot))) return { snapshot: {
		id: e.snapshot.id,
		sourceKind: e.snapshot.sourceKind
	} };
}, E = (t) => new e({
	code: "ABORTED",
	operation: "create-project-inspection",
	...t === void 0 ? {} : { cause: t }
}), D = async (t) => {
	if (typeof t != "object" || !t || t.repository === null || typeof t.repository != "object" || typeof t.repository.getEntry != "function" || typeof t.repository.listEntriesPage != "function" || typeof t.repository.readFilePage != "function" || typeof t.repository.readLinkText != "function" || t.repository.snapshot === null || typeof t.repository.snapshot != "object" || typeof t.repository.snapshot.id != "string" || t.repository.snapshot.id.length === 0 || typeof t.repository.snapshot.sourceKind != "string" || t.repository.snapshot.sourceKind.length === 0) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let n = T(t.instructions);
	if (n === void 0) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let r = {
		repository: t.repository,
		...t.instructions === void 0 ? {} : { instructions: t.instructions }
	}, i = {
		id: t.repository.snapshot.id,
		sourceKind: t.repository.snapshot.sourceKind
	}, a = t.signal;
	if (a !== void 0 && (typeof a != "object" || !a || typeof a.aborted != "boolean" || typeof a.addEventListener != "function" || typeof a.removeEventListener != "function")) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let { limits: w } = s({ ...t.limits === void 0 ? {} : { limits: t.limits } });
	if (t.deadline !== void 0 && (!Number.isSafeInteger(t.deadline) || t.deadline < 0)) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let D = t.maxConcurrentInspections, O = D === void 0 ? 1 : D;
	if (!Number.isSafeInteger(O) || O < 1) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	if (a?.aborted === !0) throw E(a.reason);
	if (S >= O) throw new e({
		code: "INSPECTION_BUSY",
		operation: "create-project-inspection"
	});
	if (w.maxRetainedBytes <= 50331648) throw new e({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "create-project-inspection",
		limit: "maxRetainedBytes",
		limitMaximum: w.maxRetainedBytes,
		observedUsage: u,
		nextAction: "reduce-input-or-increase-limit"
	});
	let k = Math.min(Date.now() + f, t.deadline ?? Infinity);
	if (k <= Date.now()) throw new e({
		code: "INSPECTION_TIMEOUT",
		operation: "create-project-inspection"
	});
	S++;
	let A = new AbortController(), j = x(16).toString("hex"), M = C(), N, P = 0, F = -1, I = !1, L, R = !1, z = !1, B, V, H = new Set(), U = new Set(), W = (() => {
		try {
			return b(y(new URL("./node-runner.mjs", import.meta.url).href), [], {
				execPath: process.execPath,
				execArgv: [],
				env: _(),
				serialization: "advanced",
				stdio: [
					"ignore",
					"ignore",
					"pipe",
					"ipc"
				]
			});
		} catch (e) {
			throw S--, l(e);
		}
	})(), G = h((e, t) => {
		if (!W.connected) throw l();
		W.send(e, t);
	}), K = g(W, () => {
		G({
			attemptId: j,
			kind: "dispose"
		}).catch(() => {
			W.kill("SIGKILL");
		});
	}), q = () => (V ??= (async () => {
		z = !0, A.abort(B?.cause), K.terminate(), await K.closed, await Promise.allSettled([...H, ...U]), r = void 0, clearTimeout(Z), B === void 0 && Date.now() >= k && J(new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		})), a?.removeEventListener("abort", X), W.removeAllListeners("message"), W.removeAllListeners("error"), W.stderr?.removeAllListeners("data"), S--;
	})(), V), J = (e) => {
		B === void 0 && (B = { cause: e instanceof Error ? e : l(e) }), M.reject(B.cause), N?.reject(B.cause), q();
	}, Y = () => B?.cause, X = () => {
		J(E(a?.reason));
	}, Z = setTimeout(() => {
		J(new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
	}, Math.max(1, k - Date.now()));
	a?.addEventListener("abort", X, { once: !0 }), a?.aborted === !0 && X(), W.once("error", (e) => {
		J(l(e));
	}), K.closed.then(() => {
		z || J(l());
	});
	let Q = 0;
	W.stderr?.on("data", (e) => {
		Q += e.byteLength, Q > 32768 && J(l());
	}), W.on("message", (e) => {
		if (!z) try {
			let t = p(e);
			if (t.attemptId !== j) throw l();
			if (t.kind === "ready") {
				if (I) throw l();
				L = t.maxAnalysisHeapBytes, I = !0, G({
					attemptId: j,
					kind: "run"
				}).catch(J);
			} else if (t.kind === "prepared") {
				if (!I || R || t.inspection.maxAnalysisHeapBytes !== L || t.inspection.source.id !== i.id || t.inspection.source.sourceKind !== i.sourceKind) throw l();
				R = !0, M.resolve(o(t.inspection));
			} else if (t.kind === "reader-request") {
				if (!I || R || t.requestId !== F + 1 || H.size >= 4 || (F = t.requestId, r === void 0)) throw l();
				let e = v(r, t.request, A.signal);
				H.add(e);
				let n = (async () => {
					try {
						let n = await e;
						H.delete(e), z || await G({
							attemptId: j,
							kind: "reader-response",
							requestId: t.requestId,
							result: n
						});
					} catch (e) {
						if (e instanceof c && [
							"ENTRY_NOT_FOUND",
							"ENTRY_NOT_FILE",
							"RESOURCE_LIMIT_EXCEEDED"
						].includes(e.code)) try {
							z || await G({
								attemptId: j,
								kind: "reader-failure",
								requestId: t.requestId,
								failure: d(e)
							});
						} catch (e) {
							J(e);
						}
						else J(e);
					} finally {
						H.delete(e);
					}
				})();
				U.add(n), n.finally(() => U.delete(n));
			} else if (t.kind === "page") {
				if (!R || N === void 0 || t.requestId !== P) throw l();
				let e = N;
				N = void 0, e.resolve(o(t.result));
			} else if (t.kind === "failure") {
				if (t.failure.options.nextAction === "review-inspection-capacity" && (L === void 0 || t.failure.options.limitMaximum !== L)) throw l();
				J(m(t.failure));
			} else throw l();
		} catch (e) {
			J(e);
		}
	});
	try {
		await G({
			attemptId: j,
			kind: "start",
			snapshot: i,
			instructions: n,
			limits: w,
			deadline: k
		});
		let t = await M.promise;
		if (Date.now() >= k) throw new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		});
		return Object.freeze({
			...t,
			readPage: async (t) => {
				if (B !== void 0 || z) throw B?.cause ?? E();
				if (N !== void 0 || typeof t != "object" || !t || Reflect.ownKeys(t).some((e) => e !== "cursor" && e !== "maxItems" && e !== "view") || !Number.isSafeInteger(t.maxItems) || t.maxItems < 1 || t.maxItems > w.maxEntries || ![
					"all",
					"diagnostics",
					"coverage",
					"metadata"
				].includes(t.view) || t.cursor !== void 0 && typeof t.cursor != "string") throw new e({
					code: "INVALID_ARGUMENT",
					operation: "create-project-inspection"
				});
				let n = C();
				N = n, P++;
				try {
					if (Date.now() >= k) throw new e({
						code: "INSPECTION_TIMEOUT",
						operation: "create-project-inspection"
					});
					await G({
						attemptId: j,
						kind: "read-page",
						requestId: P,
						input: {
							maxItems: t.maxItems,
							view: t.view,
							...t.cursor === void 0 ? {} : { cursor: t.cursor }
						}
					});
					let r = await n.promise;
					if (Date.now() >= k) throw new e({
						code: "INSPECTION_TIMEOUT",
						operation: "create-project-inspection"
					});
					return r;
				} catch (e) {
					throw J(e), await q(), Y() ?? l(e);
				} finally {
					N === n && (N = void 0);
				}
			},
			dispose: async () => {
				N?.reject(B?.cause ?? E()), await q();
				let e = Y();
				if (e !== void 0) throw e;
			}
		});
	} catch (e) {
		throw J(e), await q(), Y() ?? l(e);
	}
}, O = "diagnostics-start", k = async (t, i, a) => {
	let { counts: o, coverageCounts: s, formatVersion: c, inspectionDigest: l, valid: u } = t, d = o.metadata + o.diagnostics, f = a === void 0 ? -1 : Number.parseInt(a.lastKey, 36), p = f + 1, m = a?.sourceCursor ?? null;
	if (a !== void 0) {
		if (a.snapshotDigest !== l) throw new r("CURSOR_SNAPSHOT_CHANGED");
		if (!Number.isSafeInteger(f) || f < 0 || n(f) !== a.lastKey || p >= d || m === null || m === O != (p === o.metadata)) throw new r("CURSOR_INVALID");
	}
	m === O && (m = null);
	let h = [];
	for (let [n, a] of [["metadata", o.metadata], ["diagnostics", d]]) {
		let s = p + h.length, c = Math.min(i - h.length, a - s);
		if (c <= 0) continue;
		let l = await t.readPage({
			view: n,
			maxItems: c,
			...m === null ? {} : { cursor: m }
		}).catch((t) => {
			throw m !== null && t instanceof e && t.code === "INVALID_ARGUMENT" ? new r("CURSOR_INVALID", { cause: t }) : t;
		});
		if (l.page.records.length !== c) throw m === null ? TypeError("The Core inspection view ended before its reported count.") : new r("CURSOR_INVALID");
		for (let { item: e, nextCursor: t } of l.page.records) {
			if (e.kind !== "metadata" && e.kind !== "diagnostic" || (n === "metadata" ? e.kind !== "metadata" : e.kind !== "diagnostic")) throw m === null ? TypeError("The Core inspection view returned an unexpected record.") : new r("CURSOR_INVALID");
			let i = p + h.length + 1, a = i === d ? null : i === o.metadata ? O : t;
			if (i < d && a === null) throw m === null ? TypeError("The Core inspection view is missing a continuation.") : new r("CURSOR_INVALID");
			h.push({
				item: e,
				nextCursor: a
			});
		}
		m = null;
	}
	return {
		counts: o,
		coverageCounts: s,
		formatVersion: c,
		inspectionDigest: l,
		records: h,
		startIndex: p,
		valid: u
	};
}, A = (e) => e > Math.floor((2 ** 53 - 1) / 4) ? 2 ** 53 - 1 : e * 4, j = ((e = D) => async (t) => {
	let n = await e({
		repository: t.repository,
		...t.instructions === void 0 ? {} : { instructions: t.instructions },
		limits: {
			maxDiagnostics: t.resourceLimits.maxDiagnostics,
			maxEntries: t.resourceLimits.maxEntries,
			maxCoverage: t.resourceLimits.maxCoverage,
			maxFileBytes: t.resourceLimits.maxFileBytes,
			maxManifestBytes: t.resourceLimits.maxManifestBytes,
			maxRetainedBytes: A(t.resourceLimits.maxTotalBytes),
			maxTotalBytesRead: t.resourceLimits.maxTotalBytes
		},
		...t.signal === void 0 ? {} : { signal: t.signal }
	}), o;
	try {
		if (a({ packageMetadata: t.packageMetadata }).kind === "invalid") throw new i();
		if (t.command === "inspect") return await k(n, Math.min(256, t.resourceLimits.maxEntries), t.cursor);
		let e = [], r = [];
		for (let i of ["diagnostics", "coverage"]) {
			let a;
			do {
				let o = await n.readPage({
					view: i,
					maxItems: Math.min(256, t.resourceLimits.maxEntries),
					...a === void 0 ? {} : { cursor: a }
				});
				for (let { item: t } of o.page.records) t.kind === "diagnostic" ? e.push(t.diagnostic) : t.kind === "coverage" && r.push(t.coverage);
				a = o.page.nextCursor ?? void 0;
			} while (a !== void 0);
		}
		return Object.freeze({
			diagnostics: Object.freeze(e),
			coverage: Object.freeze(r),
			coverageCounts: n.coverageCounts,
			diagnosticCount: n.counts.diagnostics,
			acceptedWarningCount: n.counts.acceptedWarnings,
			errorCount: n.counts.errors,
			warningCount: n.counts.warnings,
			valid: n.valid,
			formatVersion: n.formatVersion,
			source: n.source,
			summary: n.summary
		});
	} catch (e) {
		throw e instanceof r && (o = e.cause), e;
	} finally {
		await n.dispose().catch((e) => {
			if (o === void 0 || e !== o) throw e;
		});
	}
})();
//#endregion
export { j as executeMoldeaCliCoreInspection };
