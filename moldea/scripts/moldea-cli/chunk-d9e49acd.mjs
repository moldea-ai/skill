import { n as e, u as t } from "./chunk-2cc3bf5c.mjs";
import { o as n, t as r } from "./chunk-43b8574a.mjs";
import { p as i, u as a } from "./chunk-8f198616.mjs";
import { i as o } from "./chunk-98d84174.mjs";
import { a as s, i as c, l, n as u, o as d, s as f } from "./chunk-24ea7c23.mjs";
import { n as p, r as m, t as h } from "./chunk-cea1378f.mjs";
import { t as g } from "./chunk-2e9d4c63.mjs";
import { fileURLToPath as _ } from "node:url";
import { fork as v } from "node:child_process";
import { randomBytes as y } from "node:crypto";
//#region ../core/dist/node.js
var b = 0, x = () => {
	let e = Promise.withResolvers();
	return e.promise.catch(() => {}), e;
}, S = (e) => t(e, !0) && typeof e.id == "string" && e.id.length > 0 && typeof e.sourceKind == "string" && e.sourceKind.length > 0, C = (e) => {
	if (e === void 0) return null;
	if (!(!t(e, !0) || typeof e.getEntry != "function" || typeof e.readFilePage != "function" || typeof e.readLinkText != "function" || !S(e.snapshot))) return { snapshot: {
		id: e.snapshot.id,
		sourceKind: e.snapshot.sourceKind
	} };
}, w = (t) => new e({
	code: "ABORTED",
	operation: "create-project-inspection",
	...t === void 0 ? {} : { cause: t }
}), T = async (t) => {
	if (typeof t != "object" || !t || t.repository === null || typeof t.repository != "object" || typeof t.repository.getEntry != "function" || typeof t.repository.listEntriesPage != "function" || typeof t.repository.readFilePage != "function" || typeof t.repository.readLinkText != "function" || t.repository.snapshot === null || typeof t.repository.snapshot != "object" || typeof t.repository.snapshot.id != "string" || t.repository.snapshot.id.length === 0 || typeof t.repository.snapshot.sourceKind != "string" || t.repository.snapshot.sourceKind.length === 0) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let n = C(t.instructions);
	if (n === void 0) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let r = {
		repository: t.repository,
		...t.instructions === void 0 ? {} : { instructions: t.instructions }
	}, S = {
		id: t.repository.snapshot.id,
		sourceKind: t.repository.snapshot.sourceKind
	}, T = t.signal;
	if (T !== void 0 && (typeof T != "object" || !T || typeof T.aborted != "boolean" || typeof T.addEventListener != "function" || typeof T.removeEventListener != "function")) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let { limits: E } = a({ ...t.limits === void 0 ? {} : { limits: t.limits } });
	if (t.deadline !== void 0 && (!Number.isSafeInteger(t.deadline) || t.deadline < 0)) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	let D = t.maxConcurrentInspections, O = D === void 0 ? 1 : D;
	if (!Number.isSafeInteger(O) || O < 1) throw new e({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
	if (T?.aborted === !0) throw w(T.reason);
	if (b >= O) throw new e({
		code: "INSPECTION_BUSY",
		operation: "create-project-inspection"
	});
	if (E.maxRetainedBytes <= 50331648) throw new e({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "create-project-inspection",
		limit: "maxRetainedBytes",
		limitMaximum: E.maxRetainedBytes,
		observedUsage: c,
		nextAction: "reduce-input-or-increase-limit"
	});
	let k = Math.min(Date.now() + u, t.deadline ?? Infinity);
	if (k <= Date.now()) throw new e({
		code: "INSPECTION_TIMEOUT",
		operation: "create-project-inspection"
	});
	b++;
	let A = new AbortController(), j = y(16).toString("hex"), M = x(), N, P = 0, F = -1, I = !1, L, R = !1, z = !1, B, V, H = new Set(), U = new Set(), W = (() => {
		try {
			return v(_(new URL("./node-runner.mjs", import.meta.url).href), [], {
				execPath: process.execPath,
				execArgv: [],
				env: h(),
				serialization: "advanced",
				stdio: [
					"ignore",
					"ignore",
					"pipe",
					"ipc"
				]
			});
		} catch (e) {
			throw b--, s(e);
		}
	})(), G = p((e, t) => {
		if (!W.connected) throw s();
		W.send(e, t);
	}), K = m(W, () => {
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
		})), T?.removeEventListener("abort", X), W.removeAllListeners("message"), W.removeAllListeners("error"), W.stderr?.removeAllListeners("data"), b--;
	})(), V), J = (e) => {
		B === void 0 && (B = { cause: e instanceof Error ? e : s(e) }), M.reject(B.cause), N?.reject(B.cause), q();
	}, Y = () => B?.cause, X = () => {
		J(w(T?.reason));
	}, Z = setTimeout(() => {
		J(new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
	}, Math.max(1, k - Date.now()));
	T?.addEventListener("abort", X, { once: !0 }), T?.aborted === !0 && X(), W.once("error", (e) => {
		J(s(e));
	}), K.closed.then(() => {
		z || J(s());
	});
	let Q = 0;
	W.stderr?.on("data", (e) => {
		Q += e.byteLength, Q > 32768 && J(s());
	}), W.on("message", (e) => {
		if (!z) try {
			let t = d(e);
			if (t.attemptId !== j) throw s();
			if (t.kind === "ready") {
				if (I) throw s();
				L = t.maxAnalysisHeapBytes, I = !0, G({
					attemptId: j,
					kind: "run"
				}).catch(J);
			} else if (t.kind === "prepared") {
				if (!I || R || t.inspection.maxAnalysisHeapBytes !== L || t.inspection.source.id !== S.id || t.inspection.source.sourceKind !== S.sourceKind) throw s();
				R = !0, M.resolve(i(t.inspection));
			} else if (t.kind === "reader-request") {
				if (!I || R || t.requestId !== F + 1 || H.size >= 4 || (F = t.requestId, r === void 0)) throw s();
				let e = g(r, t.request, A.signal);
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
						if (e instanceof o && [
							"ENTRY_NOT_FOUND",
							"ENTRY_NOT_FILE",
							"RESOURCE_LIMIT_EXCEEDED"
						].includes(e.code)) try {
							z || await G({
								attemptId: j,
								kind: "reader-failure",
								requestId: t.requestId,
								failure: l(e)
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
				if (!R || N === void 0 || t.requestId !== P) throw s();
				let e = N;
				N = void 0, e.resolve(i(t.result));
			} else if (t.kind === "failure") {
				if (t.failure.options.nextAction === "review-inspection-capacity" && (L === void 0 || t.failure.options.limitMaximum !== L)) throw s();
				J(f(t.failure));
			} else throw s();
		} catch (e) {
			J(e);
		}
	});
	try {
		await G({
			attemptId: j,
			kind: "start",
			snapshot: S,
			instructions: n,
			limits: E,
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
				if (B !== void 0 || z) throw B?.cause ?? w();
				if (N !== void 0 || typeof t != "object" || !t || Reflect.ownKeys(t).some((e) => e !== "cursor" && e !== "maxItems" && e !== "view") || !Number.isSafeInteger(t.maxItems) || t.maxItems < 1 || t.maxItems > E.maxEntries || ![
					"all",
					"diagnostics",
					"coverage",
					"metadata"
				].includes(t.view) || t.cursor !== void 0 && typeof t.cursor != "string") throw new e({
					code: "INVALID_ARGUMENT",
					operation: "create-project-inspection"
				});
				let n = x();
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
					throw J(e), await q(), Y() ?? s(e);
				} finally {
					N === n && (N = void 0);
				}
			},
			dispose: async () => {
				N?.reject(B?.cause ?? w()), await q();
				let e = Y();
				if (e !== void 0) throw e;
			}
		});
	} catch (e) {
		throw J(e), await q(), Y() ?? s(e);
	}
}, E = (e) => e > Math.floor((2 ** 53 - 1) / 4) ? 2 ** 53 - 1 : e * 4, D = ((e = T) => async (t) => {
	let i = await e({
		repository: t.repository,
		...t.instructions === void 0 ? {} : { instructions: t.instructions },
		limits: {
			maxDiagnostics: t.resourceLimits.maxDiagnostics,
			maxEntries: t.resourceLimits.maxEntries,
			maxCoverage: t.resourceLimits.maxCoverage,
			maxFileBytes: t.resourceLimits.maxFileBytes,
			maxManifestBytes: t.resourceLimits.maxManifestBytes,
			maxRetainedBytes: E(t.resourceLimits.maxTotalBytes),
			maxTotalBytesRead: t.resourceLimits.maxTotalBytes
		},
		...t.signal === void 0 ? {} : { signal: t.signal }
	});
	try {
		if (r({ packageMetadata: t.packageMetadata }).kind === "invalid") throw new n();
		if (t.command === "inspect") return await i.readPage({
			...t.cursor === void 0 ? {} : { cursor: t.cursor },
			maxItems: Math.min(256, t.resourceLimits.maxEntries),
			view: "all"
		});
		let e = [], a = [];
		for (let n of ["diagnostics", "coverage"]) {
			let r;
			do {
				let o = await i.readPage({
					view: n,
					maxItems: Math.min(256, t.resourceLimits.maxEntries),
					...r === void 0 ? {} : { cursor: r }
				});
				for (let { item: t } of o.page.records) t.kind === "diagnostic" ? e.push(t.diagnostic) : t.kind === "coverage" && a.push(t.coverage);
				r = o.page.nextCursor ?? void 0;
			} while (r !== void 0);
		}
		return Object.freeze({
			diagnostics: Object.freeze(e),
			coverage: Object.freeze(a),
			coverageCounts: i.coverageCounts,
			diagnosticCount: i.counts.diagnostics,
			acceptedWarningCount: i.counts.acceptedWarnings,
			errorCount: i.counts.errors,
			warningCount: i.counts.warnings,
			valid: i.valid,
			formatVersion: i.formatVersion,
			source: i.source,
			summary: i.summary
		});
	} finally {
		await i.dispose();
	}
})();
//#endregion
export { D as executeMoldeaCliCoreInspection };
