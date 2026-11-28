import { c as e, d as t, f as n, l as r, m as i, n as a, t as o, u as s } from "./chunk-2cc3bf5c.mjs";
import { A as c, B as l, C as u, D as d, E as f, F as p, H as m, I as h, L as g, M as _, N as v, O as ee, P as y, R as b, S as te, T as ne, U as x, V as S, _ as re, a as ie, b as ae, c as oe, d as se, f as ce, g as le, h as ue, j as de, k as fe, l as pe, m as me, o as he, p as ge, s as _e, u as C, v as ve, w as ye, x as be, y as xe, z as Se } from "./chunk-ad32cb41.mjs";
import { g as Ce } from "./chunk-8f198616.mjs";
import { n as we } from "./chunk-d372f5e0.mjs";
import { a as Te, c as Ee, i as w, l as T, n as E, o as De, r as Oe } from "./chunk-98d84174.mjs";
import D from "node:path";
import O from "node:process";
import { fileURLToPath as ke } from "node:url";
import { constants as Ae } from "node:fs";
import { constants as je } from "node:os";
import { TextDecoder as Me } from "node:util";
import { createHash as Ne, createHmac as Pe, randomBytes as Fe, timingSafeEqual as Ie } from "node:crypto";
import { lstat as k, open as Le, opendir as Re, readdir as ze, readlink as Be, realpath as Ve, stat as He } from "node:fs/promises";
import { Buffer as Ue } from "node:buffer";
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/byte-cache.js
var We = (e) => new Uint8Array(e), Ge = ({ maxBytes: r, maxEntries: i }) => {
	if (e(r), i !== void 0 && (!Number.isSafeInteger(i) || i < 1)) throw new n("The entry limit must be a positive safe integer.", {
		code: t.INVALID_BYTE_LIMIT,
		data: { maxEntries: String(i) }
	});
	let a = i ?? Infinity, o = new Map(), s = 0, c = 0, l = 0, u = (e, t) => {
		o.delete(e), s -= t.bytes.byteLength;
	};
	return {
		get: (e) => {
			let t = o.get(e);
			if (t !== void 0) return o.delete(e), o.set(e, t), We(t.bytes);
		},
		set: (e, t) => {
			let n = o.get(e);
			if (n !== void 0 && n.retentions > 0 || c + t.byteLength > r || l + 1 > a) return !1;
			n !== void 0 && u(e, n);
			for (let [e, n] of o) {
				if (s + t.byteLength <= r && o.size < a) break;
				n.retentions === 0 && u(e, n);
			}
			return o.set(e, {
				bytes: We(t),
				retentions: 0
			}), s += t.byteLength, !0;
		},
		retain: (e) => {
			let t = o.get(e);
			if (t !== void 0) return t.retentions === 0 && (c += t.bytes.byteLength, l += 1), t.retentions += 1, {
				copyBytes: () => t === void 0 ? void 0 : We(t.bytes),
				release: () => {
					t !== void 0 && (--t.retentions, t.retentions === 0 && (c -= t.bytes.byteLength, --l), t = void 0);
				}
			};
		},
		get byteLength() {
			return s;
		}
	};
}, Ke = 2147483647, qe = (e, i) => {
	if (!r(e, 0)) throw new n("The queue limit must be an integer of at least 0.", {
		code: t.INVALID_QUEUE_LIMIT,
		data: { [i]: String(e) }
	});
}, Je = (e) => {
	let r = e instanceof Date ? e.getTime() : e;
	if (typeof r != "number" || Number.isNaN(new Date(r).getTime())) throw new n("The deadline must be a valid Date or epoch milliseconds a Date accepts.", {
		code: t.INVALID_DATE,
		data: { deadline: String(e) }
	});
	return r;
}, Ye = ({ maxConcurrent: e, maxQueued: i }) => {
	if (!r(e, 1)) throw new n("The concurrency limit must be an integer of at least 1.", {
		code: t.INVALID_CONCURRENCY_LIMIT,
		data: { maxConcurrent: String(e) }
	});
	qe(i, "maxQueued");
	let a = 0, o = 0, s, c = !1, l = [], u = () => new n("Requests are paused until the cooldown ends.", {
		code: t.REQUEST_COOLDOWN_ACTIVE,
		data: { retryAt: new Date(o).toISOString() }
	}), d = () => new n("The request coordinator is closed.", { code: t.REQUEST_COORDINATOR_CLOSED }), f = () => {
		s !== void 0 && (clearTimeout(s), s = void 0);
	}, p = () => {
		if (f(), l.length === 0) return;
		let t = o - Date.now();
		if (t > 0) {
			for (let e = l.length - 1; e >= 0; --e) {
				let t = l[e];
				t?.rejectDuringCooldown === !0 && (l.splice(e, 1), t.detach(), t.reject(u()));
			}
			l.length > 0 && (s = setTimeout(p, Math.min(t, Ke)));
			return;
		}
		for (; a < e;) {
			let e = l.shift();
			if (e === void 0) return;
			e.detach(), e.signal?.aborted === !0 ? e.reject(e.signal.reason) : (a += 1, e.resolve());
		}
	}, m = ({ signal: r, caller: s, maxQueuedForCaller: f, rejectDuringCooldown: m = !1 }) => {
		if (c) return Promise.reject(d());
		if (r?.aborted === !0) return Promise.reject(r.reason);
		f !== void 0 && qe(f, "maxQueuedForCaller");
		let h = o > Date.now();
		if (h && m) return Promise.reject(u());
		if (!h && a < e && l.length === 0) return a += 1, Promise.resolve();
		if (f !== void 0) {
			let e = l.filter((e) => e.caller === s).length;
			if (e >= f) return Promise.reject(new n("The request queue is full.", {
				code: t.REQUEST_QUEUE_FULL,
				data: {
					scope: "caller",
					queued: e,
					limit: f
				}
			}));
		}
		return l.length >= i ? Promise.reject(new n("The request queue is full.", {
			code: t.REQUEST_QUEUE_FULL,
			data: {
				scope: "global",
				queued: l.length,
				limit: i
			}
		})) : new Promise((e, t) => {
			let n = () => {
				l.splice(l.indexOf(i), 1), i.detach(), p(), t(r?.reason);
			}, i = {
				caller: s,
				signal: r,
				rejectDuringCooldown: m,
				resolve: e,
				reject: t,
				detach: () => r?.removeEventListener("abort", n)
			};
			l.push(i), r?.addEventListener("abort", n, { once: !0 }), p();
		});
	};
	return {
		run: async (e, t = {}) => {
			await m(t);
			try {
				return await e();
			} finally {
				--a, p();
			}
		},
		deferUntil: (e) => {
			o = Math.max(o, Je(e)), p();
		},
		isIdle: () => a === 0 && l.length === 0 && o <= Date.now(),
		close: () => {
			c = !0, f();
			for (let e of l.splice(0)) e.detach(), e.reject(d());
		}
	};
}, Xe = ["SIGINT", "SIGTERM"], Ze = new Set(["SIGKILL", "SIGSTOP"]), Qe = () => new n("The shutdown needs a non-empty list of signals Node.js can listen for, such as SIGINT, other than SIGKILL and SIGSTOP, and an onSignal that's a function when it's given.", { code: x.INVALID_SIGNAL }), $e = (e) => {
	let t = Array.isArray(e) ? [...new Set(e)] : [];
	if (!(t.length > 0 && t.every((e) => typeof e == "string" && Object.hasOwn(je.signals, e) && !Ze.has(e)))) throw Qe();
	return t;
}, et = ({ signals: e = Xe, onSignal: t, setExitCode: r = !0, forceOnRepeat: i = !1, disconnect: a = !1 } = {}) => {
	if (t !== void 0 && typeof t != "function") throw Qe();
	let o = $e(e), s = new AbortController(), c = null, l = !1, u = (e) => 128 + je.signals[e], d = () => {
		f("SIGTERM");
	}, f = (e) => {
		if (c !== null) return;
		c = e;
		let a = u(e);
		r && (process.exitCode = a), i && p(), s.abort(new n(`The process was interrupted by ${e}.`, {
			code: x.PROCESS_INTERRUPTED,
			data: {
				signal: e,
				exitCode: a
			}
		}));
		try {
			Promise.resolve(t?.(e)).catch(() => void 0);
		} catch {}
	}, p = () => {
		if (!l) {
			l = !0;
			for (let e of o) process.off(e, f);
			process.off("disconnect", d);
		}
	};
	for (let e of o) process.on(e, f);
	return a && process.send !== void 0 && (process.connected ? process.on("disconnect", d) : d()), {
		signal: s.signal,
		receivedSignal: () => c,
		exitCode: () => c === null ? null : u(c),
		dispose: p
	};
}, tt = ({ maxBytes: e, signal: t }) => new Promise((r, i) => {
	if (!Number.isSafeInteger(e) || e <= 0) {
		i(new n("The stdin limit must be a positive safe integer.", {
			code: x.INVALID_PROCESS_OPTIONS,
			data: { maxBytes: String(e) }
		}));
		return;
	}
	let { stdin: a } = process, o = [], s = 0, c = () => {
		a.off("data", u), a.off("end", d), a.off("error", f), t?.removeEventListener("abort", p);
	}, l = (e) => {
		c(), a.destroy(), i(e);
	}, u = (t) => {
		if (s += t.length, s > e) {
			l(new n(`The input on stdin is larger than ${e} bytes.`, {
				code: x.STDIN_TOO_LARGE,
				data: { maxBytes: e }
			}));
			return;
		}
		o.push(t);
	}, d = () => {
		c(), r(Buffer.concat(o));
	}, f = (e) => {
		l(e);
	}, p = () => {
		l(t?.reason);
	};
	if (t?.aborted) {
		l(t.reason);
		return;
	}
	t?.addEventListener("abort", p, { once: !0 }), a.on("data", u), a.once("end", d), a.once("error", f);
}), A = {
	Interrupted: 130,
	OperationalError: 3,
	StructuralInvalid: 1,
	Success: 0,
	Terminated: 143,
	UsageError: 2
}, nt = /^[0-9a-f]{64}$/, rt = (e, t, { domain: r }) => {
	if (!((typeof t == "string" || t instanceof Uint8Array) && t.length > 0)) throw new n("The HMAC secret must be a non-empty string or byte array.", { code: l.INVALID_HMAC_SECRET });
	if (r !== void 0 && (typeof r != "string" || r.length === 0)) throw new n("The HMAC domain must be a non-empty string when it's given.", { code: l.INVALID_HMAC_DOMAIN });
	let i = r === void 0 ? t : Pe("sha256", t).update(r).digest();
	return Pe("sha256", i).update(e).digest();
}, it = (e, t, n = {}) => rt(e, t, n).toString("hex"), at = (e, t, n, r = {}) => {
	let i = rt(e, n, r);
	return typeof t != "string" || !nt.test(t) ? !1 : Ie(Buffer.from(t, "hex"), i);
}, ot = (e, t = []) => {
	let n = [e], r = new Set(), i = new Set(t.filter((e) => e.length > 0));
	for (; n.length > 0;) {
		let e = n.pop();
		if (typeof e == "string") {
			if (i.has(e)) throw TypeError("A non-content CLI result contains canonical document text.");
			continue;
		}
		if (typeof e != "object" || !e || r.has(e)) continue;
		if (r.add(e), Array.isArray(e)) {
			for (let t of e) n.push(t);
			continue;
		}
		let t = e;
		if (Object.hasOwn(t, "content")) throw TypeError("A non-content CLI result contains a content property.");
		n.push(...Object.values(t));
	}
}, st = 262144, ct = [
	239,
	187,
	191
], lt = (e) => {
	if (e.byteLength === 0 || e.byteLength > 262144 || ct.every((t, n) => e[n] === t)) return null;
	let t;
	try {
		t = new TextDecoder("utf-8", {
			fatal: !0,
			ignoreBOM: !0
		}).decode(e);
	} catch {
		return null;
	}
	return t.includes("\0") || !t.isWellFormed() ? null : t;
}, ut = (e) => {
	let t = lt(e);
	if (t === null || !t.endsWith("\n")) return null;
	let n = O.platform === "win32" && t.endsWith("\r\n") ? t.slice(0, -2) : t.slice(0, -1);
	return n.length === 0 ? null : n;
}, dt = (e) => {
	let t = ut(e);
	return t === null || !D.isAbsolute(t) ? null : t;
}, ft = (e) => {
	let t = e?.code?.toUpperCase();
	return Object.freeze(t === "ENOENT" || t === "ENOTDIR" ? {
		errorCode: "GIT_REPOSITORY_NOT_FOUND",
		kind: "failed"
	} : t === "EACCES" || t === "EPERM" ? {
		errorCode: "GIT_ACCESS_DENIED",
		kind: "failed"
	} : {
		errorCode: "GIT_COMMAND_FAILED",
		kind: "failed"
	});
}, pt = ((e = He) => async (t) => {
	if (!D.isAbsolute(t.invocationDirectory) || t.invocationDirectory.includes("\0") || !t.invocationDirectory.isWellFormed() || t.repositoryDirectory !== null && !y(t.repositoryDirectory)) return Object.freeze({
		errorCode: "GIT_REPOSITORY_NOT_FOUND",
		kind: "failed"
	});
	let n = t.repositoryDirectory === null ? t.invocationDirectory : D.isAbsolute(t.repositoryDirectory) ? t.repositoryDirectory : D.resolve(t.invocationDirectory, t.repositoryDirectory);
	try {
		if (!(await e(n)).isDirectory()) return Object.freeze({
			errorCode: "GIT_REPOSITORY_NOT_FOUND",
			kind: "failed"
		});
	} catch (e) {
		return ft(e);
	}
	return Object.freeze({
		directory: n,
		kind: "found"
	});
})(), mt = async (e, { cwd: t, input: n, maxOutputBytes: r, signal: i }) => {
	let a = e[0], o = await C(() => ue(e, {
		cwd: t,
		encoding: "buffer",
		maxOutputBytes: r,
		timeoutSeconds: 300,
		...n === void 0 ? {} : { input: n },
		...i === void 0 ? {} : { signal: i }
	}), i, a);
	if (o.kind === "failed") return o;
	let s = oe(o.value, a ?? "");
	return s === null ? Object.freeze({
		kind: "completed",
		value: o.value.stdout
	}) : pe(s, a);
}, ht = Object.freeze({
	readConfigBoolean: ce,
	readTopLevel: me
}), gt = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, j = (e) => Object.freeze({
	errorCode: e,
	kind: "failed"
}), _t = ((e = ht, t = pt, n = _e()) => async (r) => {
	let i = await t(r);
	if (i.kind === "failed") return j(i.errorCode);
	let a = {
		maxOutputBytes: st,
		timeoutSeconds: 300,
		...r.signal === void 0 ? {} : { signal: r.signal }
	}, o = await C(() => e.readTopLevel(i.directory, a), r.signal);
	if (o.kind === "failed") return j(gt(o.reason));
	if (o.value === null) return j("GIT_WORK_TREE_REQUIRED");
	let s = o.value;
	if (!D.isAbsolute(s)) return j("GIT_OUTPUT_INVALID");
	let c = await t({
		invocationDirectory: i.directory,
		repositoryDirectory: s
	});
	if (c.kind === "failed") return j(c.errorCode);
	let l = await n(c.directory, r.signal);
	if (l.kind === "failed") return j(l.errorCode);
	let u = await C(() => e.readConfigBoolean(c.directory, "core.sparseCheckout", !1, a), r.signal);
	return u.kind === "failed" ? j(gt(u.reason)) : u.value ? j("GIT_SPARSE_CHECKOUT_UNSUPPORTED") : Object.freeze({
		kind: "discovered",
		repositoryRoot: s
	});
})(), vt = (e, t, n = D) => n.relative(n.resolve(e), n.resolve(t)) === "", yt = (e, t) => e.ino !== 0n && e.dev === t.dev && e.ino === t.ino, bt = (e, t) => yt(e, t), xt = (e, t) => bt(e.repositoryRoot, t.repositoryRoot) && bt(e.gitDirectory, t.gitDirectory) && bt(e.commonDirectory, t.commonDirectory), St = Object.freeze({
	CommonDirectory: Object.freeze(["rev-parse", "--git-common-dir"]),
	GitDirectory: Object.freeze(["rev-parse", "--absolute-git-dir"]),
	RepositoryRoot: Object.freeze(["rev-parse", "--show-toplevel"])
}), Ct = async (e) => He(e, { bigint: !0 }), M = (e) => Object.freeze({
	errorCode: e,
	kind: "failed"
}), wt = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, Tt = (e) => {
	let t;
	try {
		if (typeof e == "object" && e && "code" in e) {
			let n = e.code;
			t = typeof n == "string" ? n.toUpperCase() : void 0;
		}
	} catch {
		return "GIT_COMMAND_FAILED";
	}
	return t === "ENOENT" || t === "ENOTDIR" ? "GIT_REPOSITORY_NOT_FOUND" : t === "EACCES" || t === "EPERM" ? "GIT_ACCESS_DENIED" : "GIT_COMMAND_FAILED";
}, Et = async (e, t, n, r, i) => {
	let a = await e(n, {
		cwd: t,
		maxOutputBytes: st,
		...i === void 0 ? {} : { signal: i }
	});
	return a.kind === "failed" ? M(wt(a.reason)) : (r ? dt(a.value) : ut(a.value)) ?? M("GIT_OUTPUT_INVALID");
}, Dt = async (e, t, n) => {
	try {
		let r = await e(t);
		return !r.isDirectory() || r.ino === 0n ? M(n) : Object.freeze({
			dev: r.dev,
			ino: r.ino,
			path: t
		});
	} catch (e) {
		return M(Tt(e));
	}
}, N = (e) => typeof e == "object" && "kind" in e && e.kind === "failed", Ot = ((e = mt, t = Ct) => async (n) => {
	if (!D.isAbsolute(n.repositoryRoot) || n.repositoryRoot.includes("\0") || !n.repositoryRoot.isWellFormed()) return M("GIT_OUTPUT_INVALID");
	let r = await Et(e, n.repositoryRoot, St.RepositoryRoot, !0, n.signal);
	if (N(r)) return r;
	let i = await Dt(t, r, "GIT_WORK_TREE_REQUIRED");
	if (n.signal?.aborted) return M("GIT_OPERATION_ABORTED");
	if (N(i)) return i;
	if (!vt(r, n.repositoryRoot)) {
		let e = await Dt(t, n.repositoryRoot, "GIT_WORK_TREE_REQUIRED");
		if (n.signal?.aborted) return M("GIT_OPERATION_ABORTED");
		if (N(e)) return e;
		if (!yt(i, e)) return Object.freeze({ kind: "mismatched" });
	}
	let a = await Et(e, n.repositoryRoot, St.GitDirectory, !0, n.signal);
	if (N(a)) return a;
	let o = await Et(e, n.repositoryRoot, St.CommonDirectory, !1, n.signal);
	if (N(o)) return o;
	let s = D.isAbsolute(o) ? o : D.resolve(n.repositoryRoot, o), c = await Dt(t, a, "GIT_OUTPUT_INVALID");
	if (n.signal?.aborted) return M("GIT_OPERATION_ABORTED");
	if (N(c)) return c;
	let l = await Dt(t, s, "GIT_OUTPUT_INVALID");
	return n.signal?.aborted ? M("GIT_OPERATION_ABORTED") : N(l) ? l : Object.freeze({
		identity: Object.freeze({
			commonDirectory: l,
			gitDirectory: c,
			repositoryRoot: i
		}),
		kind: "inspected"
	});
})(), kt = class extends Error {
	code;
	constructor(e) {
		super(e), this.code = e, this.name = "MoldeaCliProjectContentException";
	}
}, At = /^\/moldea\/context\/(?:[^/]+\/)*[^/]+\.md$/u, jt = /^\/moldea\/decisions\/[^/]+\.md$/u, Mt = /^\/moldea\/agents\/[^/]+\/(?:description|instruction)\.md$/u, Nt = (e) => /[?*[\]{}]/u.test(e) ? !1 : e === "/moldea/moldea.yaml" || e === "/moldea/project.md" || At.test(e) || jt.test(e) || Mt.test(e), Pt = (e) => {
	let t;
	try {
		t = T(e);
	} catch {
		throw new kt("CONTENT_PATH_INVALID");
	}
	if (!Nt(t)) throw new kt("CONTENT_PATH_INVALID");
	return t;
}, Ft = ((e = we) => async (t) => e({ limits: Object.freeze({
	maxDiagnostics: t.resourceLimits.maxDiagnostics,
	maxEntries: t.resourceLimits.maxEntries,
	maxCoverage: t.resourceLimits.maxCoverage,
	maxFileBytes: t.resourceLimits.maxFileBytes,
	maxManifestBytes: t.resourceLimits.maxManifestBytes,
	maxTotalBytesRead: t.resourceLimits.maxTotalBytes
}) }).readCanonicalContentPage({
	maxBytes: t.maxBytes,
	offset: t.offset,
	path: t.path,
	repository: t.repository,
	...t.signal === void 0 ? {} : { signal: t.signal }
}))(), It = (e, t, n, r) => {
	let i = t.slice(0, n).join(""), a = e.page.byteStart + Buffer.byteLength(i, "utf8"), o = a === e.page.totalBytes;
	return {
		asset: {
			contentIdentity: e.page.contentIdentity,
			path: e.page.path,
			totalBytes: e.page.totalBytes
		},
		chunk: {
			byteEnd: a,
			byteStart: e.page.byteStart,
			content: i
		},
		cursor: o ? null : Se("content", { path: e.page.path }, r, `byte:${a}`, `byte:${a}`),
		snapshotDigest: r
	};
}, Lt = (e) => g({
	contentIdentity: e.page.contentIdentity,
	path: e.page.path,
	totalBytes: e.page.totalBytes
}), Rt = (e) => {
	let t = Lt(e), n = e.cursor === null ? null : b({
		command: "content",
		cursor: e.cursor,
		filters: { path: e.page.path },
		snapshotDigest: t
	}), r = `byte:${e.page.byteStart}`;
	if (n === null && e.page.byteStart !== 0 || n !== null && n.sourceCursor !== r) throw new S("CURSOR_INVALID");
	let i = Array.from(e.page.content), a = It(e, i, 0, t);
	if (i.length === 0) {
		if (!e.page.isComplete || e.measure(a) > e.maxOutputBytes) throw new S("OUTPUT_BUDGET_TOO_SMALL");
		return Object.freeze({
			...a,
			asset: Object.freeze(a.asset),
			chunk: Object.freeze(a.chunk)
		});
	}
	let o = 1, s = i.length, c = null;
	for (; o <= s;) {
		let n = o + Math.floor((s - o) / 2), r = It(e, i, n, t);
		e.measure(r) <= e.maxOutputBytes ? (c = r, o = n + 1) : s = n - 1;
	}
	if (c === null) throw new S("OUTPUT_BUDGET_TOO_SMALL");
	return Object.freeze({
		...c,
		asset: Object.freeze(c.asset),
		chunk: Object.freeze(c.chunk)
	});
}, P = T("/moldea/moldea.yaml"), zt = class extends Error {
	code;
	constructor(e) {
		super(e), this.code = e, this.name = "MoldeaCliProjectScopeException";
	}
}, Bt = (e, t) => {
	if (e.byteLength === 0) return Object.freeze([]);
	let n;
	try {
		n = new TextDecoder("utf-8", { fatal: !0 }).decode(e);
	} catch {
		throw new zt("PATH_INPUT_INVALID");
	}
	if (!n.endsWith("\0")) throw new zt("PATH_INPUT_INVALID");
	let r = n.slice(0, -1).split("\0");
	if (r.length > t || r.some((e) => e.length === 0)) throw new zt("PATH_INPUT_INVALID");
	return Object.freeze(r);
}, Vt = async (e) => {
	let t = e.signal === void 0 ? void 0 : { signal: e.signal }, n = await e.repository.getEntry(P, t);
	if (n === null) throw new w({
		code: "ENTRY_NOT_FOUND",
		operation: "read-file-page",
		path: P,
		retryable: !1
	});
	if (n.type !== "file" || n.byteLength === null) throw new w({
		code: "ENTRY_NOT_FILE",
		operation: "read-file-page",
		path: P,
		retryable: !1
	});
	let r = Math.min(e.resourceLimits.maxManifestBytes, e.resourceLimits.maxTotalBytes);
	if (n.byteLength > r) throw new w({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: "read-file-page",
		path: P,
		retryable: !1
	});
	let i = [], a = 0, o = 0, s = !1;
	for (; !s;) {
		let t = await e.repository.readFilePage(P, {
			maxBytes: Math.max(1, n.byteLength - a),
			offset: o,
			...e.signal === void 0 ? {} : { signal: e.signal }
		});
		if (t.snapshot.id !== e.repository.snapshot.id || t.offset !== o || t.totalBytes !== n.byteLength || t.bytes.byteLength > n.byteLength - a || t.bytes.byteLength === 0 && !t.isComplete || !t.isComplete && t.nextOffset !== t.offset + t.bytes.byteLength) throw new w({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path: P,
			retryable: !1
		});
		i.push(t.bytes), a += t.bytes.byteLength, o = t.nextOffset ?? a, s = t.isComplete;
	}
	if (a !== n.byteLength) throw new w({
		code: "PROVIDER_INCOMPLETE",
		operation: "read-file-page",
		path: P,
		retryable: !1
	});
	let c = new Uint8Array(a), l = 0;
	for (let e of i) c.set(e, l), l += e.byteLength;
	return c;
}, Ht = ((e = we) => async (t) => {
	let n = await Vt(t), r = await e({ limits: Object.freeze({
		maxDiagnostics: t.resourceLimits.maxDiagnostics,
		maxEntries: t.resourceLimits.maxEntries,
		maxCoverage: t.resourceLimits.maxCoverage,
		maxFileBytes: t.resourceLimits.maxFileBytes,
		maxManifestBytes: t.resourceLimits.maxManifestBytes,
		maxTotalBytesRead: t.resourceLimits.maxTotalBytes
	}) }).matchManifestScope({
		manifest: {
			content: n,
			path: P
		},
		paths: t.paths
	});
	return Object.freeze({
		manifestContent: new TextDecoder("utf-8").decode(n),
		scope: r
	});
})(), F = (e, t) => e < t ? -1 : +(e > t), Ut = ({ kind: e, id: t, agentId: n }) => e === "context" || e === "decision" ? t : `/moldea/agents/${n ?? t}/instruction.md`, Wt = (e) => {
	let { scope: t } = e, n = new Map();
	for (let { owner: e, field: r, declaration: i } of t.matches) {
		let t = JSON.stringify([
			e.kind,
			e.agentId,
			e.id
		]), a = n.get(t);
		a === void 0 && (a = {
			owner: e,
			path: Ut(e),
			relationships: new Map()
		}, n.set(t, a));
		let o = i.kind === "exact" ? i.path : i.pattern, s = JSON.stringify([r, o]);
		a.relationships.has(s) || a.relationships.set(s, {
			field: r,
			path: o
		});
	}
	let r = t.diagnostics.map(le), i = [...n.values()].sort((e, t) => F(e.path, t.path) || F(e.owner.kind, t.owner.kind) || F(e.owner.id, t.owner.id)).map(({ owner: e, path: t, relationships: n }, i) => ({
		key: h(r.length + i),
		kind: "match",
		path: t,
		ownerKind: e.kind,
		...e.kind === "tool" || e.kind === "skill" ? { capabilityId: e.id } : {},
		relationships: [...n.values()].sort((e, t) => F(e.field, t.field) || F(e.path, t.path))
	})), a = Object.freeze([...r, ...i]), o = g({
		inputDigest: t.inputDigest,
		manifestDigest: t.manifestDigest,
		records: a,
		valid: t.valid
	});
	return Object.freeze({
		canonicalBodies: Object.freeze([e.manifestContent]),
		counts: Object.freeze({
			...t.counts,
			diagnostics: t.diagnostics.length
		}),
		inputDigest: t.inputDigest,
		records: a,
		relevant: t.relevant,
		snapshotDigest: o,
		valid: t.valid
	});
}, Gt = class extends w {
	constructor(e) {
		super({
			code: "SOURCE_UNAVAILABLE",
			operation: "read-file-page",
			path: e,
			retryable: !1
		}), this.name = "GitContentTransformUnsupportedException";
	}
}, Kt = (e, t) => {
	if (e?.aborted) throw new w({
		cause: e.reason,
		code: "ABORTED",
		operation: "read-file-page",
		path: t,
		retryable: !1
	});
}, qt = (e) => new w({
	code: "INVALID_SOURCE_DATA",
	operation: "read-file-page",
	path: e,
	retryable: !1
}), Jt = class {
	snapshot;
	#e;
	#t;
	constructor(e, t) {
		this.#t = e, this.#e = t, this.snapshot = e.snapshot;
	}
	compare(e, t) {
		return De(this, e, t);
	}
	getEntry(e, t) {
		return this.#t.getEntry(e, t);
	}
	async readFilePage(e, t) {
		let n = T(e);
		if (!this.#e.has(n)) return this.#t.readFilePage(n, t);
		Kt(t?.signal, n);
		let r = await this.#t.getEntry(n, t);
		if (Kt(t?.signal, n), r !== null && (r.path !== n || r.type !== "file" && r.type !== "directory" && r.type !== "symlink")) throw qt(n);
		if (r?.type !== "file") return this.#t.readFilePage(n, t);
		throw new Gt(n);
	}
	readLinkText(e, t) {
		return this.#t.readLinkText(e, t);
	}
	listEntriesPage(e) {
		return this.#t.listEntriesPage(e);
	}
}, Yt = (e, t) => {
	let n = new Set();
	for (let e of t) {
		let t = T(e);
		if (t === E) throw new w({
			code: "INVALID_SOURCE_DATA",
			operation: "create-reader",
			path: t,
			retryable: !1
		});
		n.add(t);
	}
	return Object.freeze(new Jt(e, n));
}, Xt = Object.freeze({
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
}), Zt = Object.freeze({ INVALID_RESOURCE_LIMIT: "A Core resource limit is invalid." }), Qt = Object.freeze({
	ABORTED: "The Core operation was aborted.",
	CONTENT_INVALID: "The requested canonical content is invalid.",
	INVALID_ARGUMENT: "The Core operation received an invalid argument.",
	INSPECTION_BUSY: "Project inspection capacity is busy. Try again shortly.",
	INSPECTION_TIMEOUT: "The isolated project inspection timed out.",
	INSPECTION_PROCESS_FAILED: "The isolated project inspection failed.",
	RESOURCE_LIMIT_EXCEEDED: "A Core resource limit was exceeded."
}), $t = Object.freeze({}), en = (e) => {
	let t = { operation: e.operation };
	return e instanceof a && (e.limit !== null && (t.limit = e.limit), e.limitMaximum !== null && (t.limitMaximum = e.limitMaximum), e.nextAction !== null && (t.nextAction = e.nextAction), (e.observedUsage !== null || e.nextAction === "review-inspection-capacity") && (t.observedUsage = e.observedUsage)), Object.freeze(t);
}, tn = (e) => e instanceof he || e instanceof S || e instanceof kt || e instanceof zt ? _(e.code) : e instanceof Gt ? Object.freeze({
	..._("GIT_CONTENT_TRANSFORM_UNSUPPORTED"),
	path: Ee(e.path) ? e.path : null
}) : e instanceof w ? Object.freeze({
	code: e.code,
	details: $t,
	message: Xt[e.code],
	path: e.path !== null && Ee(e.path) ? e.path : null,
	retryable: e.retryable,
	source: "repository"
}) : e instanceof o ? Object.freeze({
	code: e.code,
	details: en(e),
	message: Zt[e.code],
	path: null,
	retryable: !1,
	source: "core"
}) : e instanceof a ? Object.freeze({
	code: e.code,
	details: en(e),
	message: Qt[e.code],
	path: null,
	retryable: e.retryable,
	source: "core"
}) : _("INTERNAL_ERROR"), nn = [
	"ls-files",
	"--others",
	"--ignored",
	"--exclude-standard",
	"--full-name",
	"--no-recurse-submodules",
	"-z",
	"--"
], rn = "ls-files", an = Object.freeze([
	"/AGENTS.md",
	"/CLAUDE.md",
	"/.claude/CLAUDE.md",
	"/CLAUDE.local.md"
].map((e) => T(e))), on = [
	"100644",
	"100755",
	"120000",
	"160000"
], sn = [
	"filter",
	"working-tree-encoding",
	"ident"
], cn = [
	"check-attr",
	"--stdin",
	"-z",
	...sn
], ln = (e, t) => {
	let n = new Uint8Array(t), r = 0;
	for (let t of e) n.set(t, r), r += t.byteLength;
	return n;
}, un = (e) => {
	try {
		return new TextDecoder("utf-8", {
			fatal: !0,
			ignoreBOM: !0
		}).decode(e);
	} catch {
		return null;
	}
}, dn = (e) => sn.find((t) => t === e) ?? null, fn = (e, t, n) => {
	let r = t === "working-tree-encoding" ? "workingTreeEncoding" : t;
	return !Object.hasOwn(e, r) && (e[r] = n, !0);
}, pn = (e) => Object.hasOwn(e, "filter") && Object.hasOwn(e, "ident") && Object.hasOwn(e, "workingTreeEncoding"), mn = (e) => {
	let t = [...e.paths], n = new Map(), r = [], i = !1, a = 0, o = [];
	for (let e of t) {
		if (e.length === 0 || e.includes("\0") || n.has(e)) {
			i = !0;
			continue;
		}
		n.set(e, {});
	}
	let s = () => {
		if (i || r.length !== 3) return;
		let e = un(r[0] ?? new Uint8Array()), t = un(r[1] ?? new Uint8Array()), a = un(r[2] ?? new Uint8Array());
		if (r = [], e === null || t === null || a === null) {
			i = !0;
			return;
		}
		let o = dn(t), s = n.get(e);
		(o === null || s === void 0 || !fn(s, o, a)) && (i = !0);
	}, c = () => {
		i || (r.push(ln(o, a)), a = 0, o = [], r.length === 3 && s());
	};
	return {
		consume: (e) => {
			if (i) return;
			let t = 0;
			for (let n = 0; n < e.byteLength; n += 1) {
				if (e[n] !== 0) continue;
				let r = e.subarray(t, n);
				if (o.push(Uint8Array.from(r)), a += r.byteLength, c(), i) return;
				t = n + 1;
			}
			let n = e.subarray(t);
			n.byteLength > 0 && (o.push(Uint8Array.from(n)), a += n.byteLength);
		},
		finish: () => {
			if (i || a > 0 || r.length > 0) return Object.freeze({ kind: "failed" });
			let e = [];
			for (let r of t) {
				let t = n.get(r);
				if (t === void 0 || !pn(t)) return Object.freeze({ kind: "failed" });
				e.push(Object.freeze({
					filter: t.filter,
					ident: t.ident,
					path: r,
					workingTreeEncoding: t.workingTreeEncoding
				}));
			}
			return Object.freeze({
				attributes: Object.freeze(e),
				kind: "completed"
			});
		}
	};
}, I = (e, t) => Object.freeze({
	errorCode: e,
	kind: "failed",
	...t === void 0 ? {} : { subcommand: t }
}), hn = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, gn = (e) => e !== "unset" && e !== "unspecified", _n = (e) => {
	let t = new TextEncoder(), n = [], r = 0;
	for (let i of e) {
		if (i.length === 0 || i.includes("\0")) return null;
		let e = t.encode(i);
		if (!Number.isSafeInteger(r + e.byteLength + 1)) return null;
		n.push(e), r += e.byteLength + 1;
	}
	let i = new Uint8Array(r), a = 0;
	for (let e of n) i.set(e, a), a += e.byteLength + 1;
	return i;
}, vn = (e, t, n) => Object.freeze({
	filter: e,
	ident: t,
	isGuarded: gn(e) || gn(t) || gn(n),
	workingTreeEncoding: n
}), yn = (e = mt) => async (t) => {
	if (t.signal?.aborted) return I("GIT_OPERATION_ABORTED");
	if (!Number.isSafeInteger(t.maxMetadataBytes) || t.maxMetadataBytes < 0) return I("RESOURCE_LIMIT_EXCEEDED");
	if (t.entries.length === 0) return Object.freeze({
		entries: Object.freeze([]),
		gitMetadataBytes: 0,
		kind: "classified"
	});
	let n = t.entries.map((e) => e.path), r = _n(n);
	if (r === null) return I("GIT_OUTPUT_INVALID");
	let i = await e(cn, {
		cwd: t.repositoryRoot,
		input: r,
		maxOutputBytes: Math.max(t.maxMetadataBytes, 1),
		...t.signal === void 0 ? {} : { signal: t.signal }
	});
	if (i.kind === "failed") return I(hn(i.reason), i.subcommand);
	if (i.value.byteLength > t.maxMetadataBytes) return I("RESOURCE_LIMIT_EXCEEDED");
	let a = mn({ paths: n });
	a.consume(i.value);
	let o = a.finish();
	if (o.kind === "failed" || o.attributes.length !== t.entries.length) return I("GIT_OUTPUT_INVALID");
	let s = t.entries.map((e, t) => {
		let n = o.attributes[t];
		return n === void 0 || n.path !== e.path ? null : Object.freeze({
			...e,
			contentTransformation: vn(n.filter, n.ident, n.workingTreeEncoding)
		});
	});
	return s.some((e) => e === null) ? I("GIT_OUTPUT_INVALID") : Object.freeze({
		entries: Object.freeze(s.filter((e) => e !== null)),
		gitMetadataBytes: i.value.byteLength,
		kind: "classified"
	});
}, L = () => Object.freeze({ kind: "failed" }), bn = (e) => {
	let t = new Map();
	for (let n of e) {
		let e = t.get(n.path);
		if (n.kind === "untracked") {
			if (e !== void 0) return L();
			t.set(n.path, {
				kind: "untracked",
				path: n.path
			});
			continue;
		}
		if (n.mode === "160000" || e?.kind === "untracked") return L();
		let r = e ?? {
			indexEntriesByStage: new Map(),
			kind: "tracked",
			path: n.path
		};
		if (r.indexEntriesByStage.has(n.stage)) return L();
		r.indexEntriesByStage.set(n.stage, Object.freeze({
			mode: n.mode,
			stage: n.stage
		})), t.set(n.path, r);
	}
	let n = [];
	for (let e of t.values()) {
		if (e.kind === "untracked") {
			n.push(Object.freeze(e));
			continue;
		}
		if (e.indexEntriesByStage.has(0) && e.indexEntriesByStage.size !== 1) return L();
		let t = [...e.indexEntriesByStage.values()].sort((e, t) => e.stage - t.stage);
		if (t.length === 0) return L();
		n.push(Object.freeze({
			indexEntries: Object.freeze(t),
			kind: "tracked",
			path: e.path
		}));
	}
	return Object.freeze({
		candidates: Object.freeze(n),
		kind: "collapsed"
	});
}, xn = (e) => Object.freeze({
	errorCode: e,
	kind: "failed"
}), Sn = (e) => {
	let t = e?.code?.toUpperCase();
	return t === "ENOENT" || t === "ENOTDIR" ? null : xn(t === "EACCES" || t === "EPERM" ? "GIT_ACCESS_DENIED" : t === "ELOOP" ? "GIT_OUTPUT_INVALID" : "GIT_COMMAND_FAILED");
}, Cn = async (e) => k(e), wn = ((e = Cn) => async (t, n) => {
	let r;
	try {
		r = await e(D.join(t, n));
	} catch (e) {
		return Sn(e) ?? Object.freeze({ kind: "missing" });
	}
	return r.isSymbolicLink() ? Object.freeze({
		entryType: "symlink",
		kind: "inspected"
	}) : r.isFile() ? Object.freeze({
		entryType: "file",
		kind: "inspected"
	}) : Object.freeze({
		entryType: "unsupported",
		kind: "inspected"
	});
})(), Tn = "config", En = (e, t) => Object.freeze({
	errorCode: e,
	kind: "failed",
	...t === void 0 ? {} : { subcommand: t }
}), Dn = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "repository-not-found":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, On = (e = ce) => async (t) => {
	if (t.signal?.aborted) return En("GIT_OPERATION_ABORTED");
	if (!Number.isSafeInteger(t.maxMetadataBytes) || t.maxMetadataBytes < 0) return En("RESOURCE_LIMIT_EXCEEDED");
	let n = await C(() => e(t.repositoryRoot, "core.symlinks", !0, {
		maxOutputBytes: Math.max(t.maxMetadataBytes, 1),
		timeoutSeconds: 300,
		...t.signal === void 0 ? {} : { signal: t.signal }
	}), t.signal, Tn);
	if (n.kind === "failed") return En(Dn(n.reason), n.subcommand);
	let r = n.value ? 5 : 6;
	return r > t.maxMetadataBytes ? En("RESOURCE_LIMIT_EXCEEDED") : Object.freeze({
		gitMetadataBytes: r,
		isEnabled: n.value,
		kind: "resolved"
	});
}, kn = On(), R = (e) => Object.freeze({
	errorCode: e,
	kind: "failed"
}), An = (e) => e.indexEntries.some(({ mode: e }) => e === "120000"), jn = (e) => e.indexEntries.some(({ mode: e }) => e === "100644" || e === "100755"), Mn = (e = wn, t = kn) => async (n) => {
	if (n.signal?.aborted) return R("GIT_OPERATION_ABORTED");
	if (!Number.isSafeInteger(n.maxMetadataBytes) || n.maxMetadataBytes < 0) return R("RESOURCE_LIMIT_EXCEEDED");
	let r = bn(n.candidates);
	if (r.kind === "failed") return R("GIT_OUTPUT_INVALID");
	let i = [], a = null;
	for (let o of r.candidates) {
		if (n.signal?.aborted) return R("GIT_OPERATION_ABORTED");
		let r = await e(n.repositoryRoot, o.path);
		if (n.signal?.aborted) return R("GIT_OPERATION_ABORTED");
		if (r.kind === "failed") return r;
		if (r.kind === "missing") continue;
		if (r.entryType === "unsupported") return R("GIT_OUTPUT_INVALID");
		if (o.kind === "untracked") {
			i.push(Object.freeze({
				entryType: r.entryType,
				kind: "untracked",
				path: o.path,
				requiresSymlinkOverlay: !1
			}));
			continue;
		}
		if (r.entryType === "symlink" || !An(o)) {
			i.push(Object.freeze({
				entryType: r.entryType,
				indexEntries: o.indexEntries,
				kind: "tracked",
				path: o.path,
				requiresSymlinkOverlay: !1
			}));
			continue;
		}
		if (a ??= await t({
			maxMetadataBytes: n.maxMetadataBytes,
			repositoryRoot: n.repositoryRoot,
			...n.signal === void 0 ? {} : { signal: n.signal }
		}), a.kind === "failed") return a;
		if (!Number.isSafeInteger(a.gitMetadataBytes) || a.gitMetadataBytes < 0 || a.gitMetadataBytes > n.maxMetadataBytes || !a.isEnabled && jn(o)) return R("GIT_OUTPUT_INVALID");
		let s = !a.isEnabled;
		i.push(Object.freeze({
			entryType: s ? "symlink" : "file",
			indexEntries: o.indexEntries,
			kind: "tracked",
			path: o.path,
			requiresSymlinkOverlay: s
		}));
	}
	return Object.freeze({
		entries: Object.freeze(i),
		gitMetadataBytes: a?.kind === "resolved" ? a.gitMetadataBytes : 0,
		kind: "normalized"
	});
}, Nn = () => Object.freeze({
	errorCode: "GIT_OPERATION_ABORTED",
	kind: "failed"
}), Pn = (e) => {
	let t = e.replace(/\/$/u, "").split("/");
	return t.slice(0, -1).map((e, n) => t.slice(0, n + 1).join("/"));
}, Fn = (e, t) => Pn(e).some((e) => t.has(e)), In = ((e = wn) => async (t) => {
	if (t.signal?.aborted) return Nn();
	let n = [...new Set(t.candidates.flatMap(({ path: e }) => Pn(e)))].sort((e, t) => e.split("/").length - t.split("/").length), r = new Set();
	for (let i of n) {
		if (Fn(i, r)) continue;
		let n = await e(t.repositoryRoot, i);
		if (t.signal?.aborted) return Nn();
		if (n.kind === "failed") return n;
		n.kind === "inspected" && n.entryType === "symlink" && r.add(i);
	}
	if (r.size === 0) return Object.freeze({
		candidates: t.candidates,
		kind: "shadowed"
	});
	let i = t.candidates.filter(({ path: e }) => !Fn(e, r)), a = new Set(i.map(({ path: e }) => e)), o = [...r].filter((e) => !a.has(e)).map((e) => Object.freeze({
		kind: "untracked",
		path: e
	}));
	return Object.freeze({
		candidates: Object.freeze([...i, ...o]),
		kind: "shadowed"
	});
})(), Ln = () => Object.freeze({
	errorCode: "GIT_OUTPUT_INVALID",
	kind: "failed"
}), Rn = (e) => {
	let t = `/${e}`;
	return t !== "/" && Ee(t) ? t : null;
}, zn = (e) => Rn(e.kind === "untracked" && e.path.endsWith("/") ? e.path.slice(0, -1) : e.path), Bn = (e, t) => {
	let n = e[Symbol.iterator](), r = t[Symbol.iterator]();
	for (;;) {
		let e = n.next(), t = r.next();
		if (e.done === !0) return t.done === !0 ? 0 : -1;
		if (t.done === !0) return 1;
		let i = e.value.codePointAt(0) ?? 0, a = t.value.codePointAt(0) ?? 0;
		if (i !== a) return i < a ? -1 : 1;
	}
}, Vn = (e) => {
	let t = [];
	for (let n of e.candidates) {
		if (zn(n) === null) {
			if (n.path === "moldea" || n.path.startsWith("moldea/")) return Ln();
			continue;
		}
		t.push(n);
	}
	return Object.freeze({
		candidates: Object.freeze(t),
		kind: "filtered"
	});
}, Hn = (e) => {
	let t = [], n = new Set();
	for (let r of e.entries) {
		let e = Rn(r.path);
		if (e === null || n.has(e)) return Ln();
		n.add(e), t.push(Object.freeze({
			...r,
			path: e
		}));
	}
	return t.sort((e, t) => Bn(e.path, t.path)), Object.freeze({
		entries: Object.freeze(t),
		kind: "normalized"
	});
}, Un = (e) => {
	if (e.byteLength === 0) return null;
	try {
		return new TextDecoder("utf-8", {
			fatal: !0,
			ignoreBOM: !0
		}).decode(e);
	} catch {
		return null;
	}
}, Wn = (e, t) => {
	let n = new Uint8Array(t), r = 0;
	for (let t of e) n.set(t, r), r += t.byteLength;
	return n;
}, Gn = (e) => {
	let t = Un(e);
	return t === null || !t.isWellFormed() ? null : Object.freeze({
		kind: "untracked",
		path: t
	});
}, Kn = (e, t) => {
	let n = [], r = null, i = 0, a = [], o = () => {
		if (r !== null) return;
		if (n.length >= e) {
			r = "entry-limit-exceeded", i = 0, a = [];
			return;
		}
		let o = t(Wn(a, i));
		if (i = 0, a = [], o === null) {
			r = "invalid";
			return;
		}
		n.push(o);
	};
	return {
		consume: (e) => {
			if (r !== null) return;
			let t = 0;
			for (let n = 0; n < e.byteLength; n += 1) {
				if (e[n] !== 0) continue;
				let s = e.subarray(t, n);
				if (a.push(s), i += s.byteLength, o(), r !== null) return;
				t = n + 1;
			}
			let n = e.subarray(t);
			n.byteLength > 0 && (a.push(n), i += n.byteLength);
		},
		finish: () => (r === null && i > 0 && (r = "invalid"), Object.freeze(r === null ? {
			candidates: Object.freeze([...n]),
			kind: "completed"
		} : {
			kind: "failed",
			reason: r
		}))
	};
}, qn = (e) => Kn(e, Gn), Jn = ".git", Yn = 6, Xn = (e) => "kind" in e, z = (e) => Object.freeze({
	errorCode: e,
	kind: "failed"
}), Zn = (e) => {
	let t = e?.code?.toUpperCase();
	return t === "EACCES" || t === "EPERM" ? "GIT_ACCESS_DENIED" : t === "ENOENT" || t === "ENOTDIR" || t === "ELOOP" ? "GIT_OUTPUT_INVALID" : "GIT_COMMAND_FAILED";
}, Qn = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "repository-not-found":
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, $n = async (e, t) => {
	try {
		let n = await t(e);
		return Object.freeze({
			encodedNameKeys: new Set(n.map((e) => e.toString("hex"))),
			kind: "read"
		});
	} catch (e) {
		return z(Zn(e));
	}
}, er = async (e, t) => {
	try {
		return Object.freeze({
			kind: "inspected",
			statistics: await t(e)
		});
	} catch (e) {
		return z(Zn(e));
	}
}, tr = (e, t) => e.has(Ue.from(t, "utf8").toString("hex")), nr = (e, t) => e.isDirectory() && !e.isSymbolicLink() && t.isDirectory() && !t.isSymbolicLink() && e.dev === t.dev && e.ino === t.ino, rr = async (e, t, n, r, i, a, o) => {
	if (o?.aborted) return z("GIT_OPERATION_ABORTED");
	if (!Number.isSafeInteger(r) || r < 0) return z("RESOURCE_LIMIT_EXCEEDED");
	let s = await C(() => i(e, {
		maxOutputBytes: Math.max(r, 1),
		timeoutSeconds: 300,
		...o === void 0 ? {} : { signal: o }
	}), o);
	if (s.kind === "failed") return z(Qn(s.reason));
	if (s.value === null) return z("GIT_COMMAND_FAILED");
	let c = s.value, l = Yn + Ce(c);
	if (l > r) return z("RESOURCE_LIMIT_EXCEEDED");
	if (!D.isAbsolute(c)) return z("GIT_OUTPUT_INVALID");
	if (vt(c, e)) return Object.freeze({
		gitMetadataBytes: l,
		kind: "validated",
		ownership: "nested-repository"
	});
	if (vt(c, t)) return Object.freeze({
		gitMetadataBytes: l,
		kind: "validated",
		ownership: "selected-repository"
	});
	let u = await er(c, a);
	if (o?.aborted) return z("GIT_OPERATION_ABORTED");
	if (u.kind === "failed") return u;
	if (!u.statistics.isDirectory() || u.statistics.isSymbolicLink()) return z("GIT_OUTPUT_INVALID");
	if (yt(u.statistics, n)) return Object.freeze({
		gitMetadataBytes: l,
		kind: "validated",
		ownership: "nested-repository"
	});
	let d = await er(t, a);
	return o?.aborted ? z("GIT_OPERATION_ABORTED") : d.kind === "failed" ? d : d.statistics.isDirectory() && !d.statistics.isSymbolicLink() && yt(u.statistics, d.statistics) ? Object.freeze({
		gitMetadataBytes: l,
		kind: "validated",
		ownership: "selected-repository"
	}) : z("GIT_OUTPUT_INVALID");
}, ir = async (e) => k(e, { bigint: !0 }), ar = async (e) => ze(e, { encoding: "buffer" }), or = (e = me, t = ir, n = ar) => async (r) => {
	if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
	let i = new Map(), a = [], o = 0, s = null, c = async () => {
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		if (s !== null) return Object.freeze({
			encodedNameKeys: s,
			kind: "read"
		});
		let e = await $n(r.repositoryRoot, n);
		return r.signal?.aborted ? z("GIT_OPERATION_ABORTED") : (e.kind === "read" && (s = e.encodedNameKeys), e);
	}, l = async (a, s, l) => {
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		let u = s.length === 0 ? l : `${s}/${l}`, d = i.get(u);
		if (d !== void 0) return d;
		let f = a === null ? await c() : Object.freeze({
			encodedNameKeys: a.encodedNameKeys,
			kind: "read"
		});
		if (f.kind === "failed") return f;
		if (!tr(f.encodedNameKeys, l)) return z("GIT_OUTPUT_INVALID");
		let p = a?.hostPath ?? r.repositoryRoot, m = D.join(p, l), h = await er(m, t);
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		if (h.kind === "failed") return h;
		if (!h.statistics.isDirectory() || h.statistics.isSymbolicLink()) return z("GIT_OUTPUT_INVALID");
		let g = await $n(m, n);
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		if (g.kind === "failed") return g;
		let _ = await er(m, t);
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		if (_.kind === "failed") return _;
		if (!nr(h.statistics, _.statistics)) return z("GIT_OUTPUT_INVALID");
		let v = D.join(m, Jn), ee = tr(g.encodedNameKeys, Jn), y = "selected-repository";
		if (ee) {
			let n = await er(v, t);
			if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
			if (n.kind === "failed") return n;
			if (n.statistics.isSymbolicLink() || !n.statistics.isDirectory() && !n.statistics.isFile()) return z("GIT_OUTPUT_INVALID");
			let i = await rr(m, r.repositoryRoot, _.statistics, r.maxMetadataBytes - o, e, t, r.signal);
			if (i.kind === "failed") return i;
			o += i.gitMetadataBytes, y = i.ownership;
		} else try {
			return await t(v), r.signal?.aborted ? z("GIT_OPERATION_ABORTED") : z("GIT_OUTPUT_INVALID");
		} catch (e) {
			let t = e?.code?.toUpperCase();
			if (t !== "ENOENT" && t !== "ENOTDIR") return z(Zn(e));
		}
		let b = Object.freeze({
			encodedNameKeys: g.encodedNameKeys,
			hostPath: m,
			ownership: y
		});
		return i.set(u, b), b;
	};
	for (let e of r.plans) {
		if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
		let t = "selected-repository", n = null, i = "";
		for (let a of e.directorySegments) {
			if (r.signal?.aborted) return z("GIT_OPERATION_ABORTED");
			let e = await l(n, i, a);
			if (Xn(e)) return e;
			if (n = e, i = i.length === 0 ? a : `${i}/${a}`, e.ownership === "nested-repository") {
				t = "nested-repository";
				break;
			}
		}
		if (e.isDirectoryRecord && t !== "nested-repository") return z("GIT_OUTPUT_INVALID");
		a.push(t);
	}
	return Object.freeze({
		gitMetadataBytes: o,
		kind: "inspected",
		ownership: Object.freeze([...a])
	});
}, sr = or(), cr = (e) => {
	let t = e.path.endsWith("/");
	if (e.path.length === 0 || e.path.startsWith("/") || e.path.includes("\\") || e.kind === "tracked" && t) return Object.freeze({ kind: "failed" });
	let n = (t ? e.path.slice(0, -1) : e.path).split("/");
	if (n.length === 0 || n.some((e) => e.length === 0 || e === "." || e === "..")) return Object.freeze({ kind: "failed" });
	let r = Object.freeze([...n]), i = Object.freeze(t ? [...n] : n.slice(0, -1));
	return Object.freeze({
		kind: "planned",
		plan: Object.freeze({
			candidate: e,
			directorySegments: i,
			hasGitControlSegment: n.includes(".git"),
			isDirectoryRecord: t,
			segments: r
		})
	});
}, lr = (e = "GIT_OUTPUT_INVALID") => Object.freeze({
	errorCode: e,
	kind: "failed"
}), ur = (e) => {
	let t = {
		children: new Map(),
		isRoot: !1
	};
	for (let n of e) {
		let e = t;
		for (let t of n) {
			let n = e.children.get(t);
			n === void 0 && (n = {
				children: new Map(),
				isRoot: !1
			}, e.children.set(t, n)), e = n;
		}
		e.isRoot = !0;
	}
	return t;
}, dr = (e, t) => {
	let n = t;
	for (let t of e) {
		let e = n.children.get(t);
		if (e === void 0) return !1;
		if (e.isRoot) return !0;
		n = e;
	}
	return !1;
}, fr = (e = sr) => async (t) => {
	let n = [];
	for (let [e, r] of t.candidates.entries()) {
		if (t.signal?.aborted) return lr("GIT_OPERATION_ABORTED");
		let i = cr(r);
		if (i.kind === "failed") return lr();
		n.push({
			candidateIndex: e,
			plan: i.plan
		});
	}
	let r = ur(n.filter(({ plan: e }) => !e.hasGitControlSegment && e.candidate.kind === "tracked" && e.candidate.mode === "160000").map(({ plan: e }) => e.segments)), i = Array.from({ length: t.candidates.length }, () => !1), a = [];
	for (let { candidateIndex: e, plan: t } of n) if (!(t.hasGitControlSegment || dr(t.segments, r))) {
		if (t.candidate.kind === "tracked") {
			i[e] = !0;
			continue;
		}
		a.push({
			candidate: t.candidate,
			candidateIndex: e,
			plan: t
		});
	}
	let o = await e({
		maxMetadataBytes: t.maxMetadataBytes,
		plans: a.map(({ plan: e }) => e),
		repositoryRoot: t.repositoryRoot,
		...t.signal === void 0 ? {} : { signal: t.signal }
	});
	if (o.kind === "failed") return o;
	if (o.ownership.length !== a.length) return lr();
	for (let [e, n] of o.ownership.entries()) {
		if (t.signal?.aborted) return lr("GIT_OPERATION_ABORTED");
		let r = a[e];
		if (r === void 0) return lr();
		n === "selected-repository" && (i[r.candidateIndex] = !0);
	}
	let s = t.candidates.filter((e, t) => i[t] === !0);
	return Object.freeze({
		candidates: Object.freeze(s),
		gitMetadataBytes: o.gitMetadataBytes,
		kind: "filtered"
	});
}, pr = Object.freeze({
	listUntrackedFiles: se,
	readIndexEntries: ge,
	runGit: mt
}), mr = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "repository-not-found": return "GIT_REPOSITORY_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-invalid": return "GIT_OUTPUT_INVALID";
		case "output-limit-exceeded": return "RESOURCE_LIMIT_EXCEEDED";
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, hr = (e) => on.includes(e), gr = (e) => {
	let t = [];
	for (let { mode: n, path: r, stage: i } of e) {
		if (!hr(n)) return null;
		t.push(Object.freeze({
			kind: "tracked",
			mode: n,
			path: r,
			stage: i
		}));
	}
	return Object.freeze(t);
}, _r = (e) => e.reduce((e, { path: t }) => e + 75 + Ce(t), 0), vr = (e) => e.reduce((e, t) => e + Ce(t) + 1, 0), B = (e, t) => Object.freeze({
	errorCode: e,
	kind: "failed",
	...t === void 0 ? {} : { subcommand: t }
}), yr = (e) => e.kind === "completed" ? e.candidates : B(e.reason === "entry-limit-exceeded" ? "RESOURCE_LIMIT_EXCEEDED" : "GIT_OUTPUT_INVALID"), br = (e) => !Array.isArray(e), xr = ((e = pr, t = fr(or()), n = Mn(wn, On()), r = yn(), i = Hn, a = In) => async (o) => {
	if (o.signal?.aborted) return B("GIT_OPERATION_ABORTED");
	let s = (o.selectionPaths ?? []).map((e) => e.slice(1)), c = o.maxMetadataBytes, l = () => ({
		maxOutputBytes: Math.max(c, 1),
		timeoutSeconds: 300,
		...s.length === 0 ? {} : { paths: s },
		...o.signal === void 0 ? {} : { signal: o.signal }
	}), u = await C(() => e.readIndexEntries(o.repositoryRoot, l()), o.signal, rn);
	if (u.kind === "failed") return B(mr(u.reason), u.subcommand);
	if (c -= _r(u.value), u.value.length > o.maxEntries || c < 0) return B("RESOURCE_LIMIT_EXCEEDED");
	let d = gr(u.value);
	if (d === null) return B("GIT_OUTPUT_INVALID");
	let f = await C(() => e.listUntrackedFiles(o.repositoryRoot, l()), o.signal, rn);
	if (f.kind === "failed") return B(mr(f.reason), f.subcommand);
	if (c -= vr(f.value), d.length + f.value.length > o.maxEntries || c < 0) return B("RESOURCE_LIMIT_EXCEEDED");
	if (f.value.some((e) => e.length === 0)) return B("GIT_OUTPUT_INVALID");
	let p = Object.freeze(f.value.map((e) => Object.freeze({
		kind: "untracked",
		path: e
	}))), m = [];
	if (o.includeIgnored === !0 && s.length > 0) {
		let t = await e.runGit([...nn, ...s], {
			cwd: o.repositoryRoot,
			maxOutputBytes: Math.max(c, 1),
			...o.signal === void 0 ? {} : { signal: o.signal }
		});
		if (t.kind === "failed") return B(mr(t.reason), t.subcommand);
		if (c -= t.value.byteLength, c < 0) return B("RESOURCE_LIMIT_EXCEEDED");
		let n = qn(o.maxEntries - d.length - p.length);
		n.consume(t.value);
		let r = yr(n.finish());
		if (br(r)) return r;
		let i = new Set(p.map((e) => e.path));
		m = r.filter((e) => !i.has(e.path));
	}
	let h = Vn({ candidates: Object.freeze([
		...d,
		...p,
		...m
	]) });
	if (h.kind === "failed") return h;
	let g = await a({
		candidates: h.candidates,
		repositoryRoot: o.repositoryRoot,
		...o.signal === void 0 ? {} : { signal: o.signal }
	});
	if (g.kind === "failed") return g;
	let _ = await t({
		candidates: g.candidates,
		maxMetadataBytes: c,
		repositoryRoot: o.repositoryRoot,
		...o.signal === void 0 ? {} : { signal: o.signal }
	});
	if (_.kind === "failed") return _;
	let v = await n({
		candidates: _.candidates,
		maxMetadataBytes: c - _.gitMetadataBytes,
		repositoryRoot: o.repositoryRoot,
		...o.signal === void 0 ? {} : { signal: o.signal }
	});
	if (v.kind === "failed") return v;
	let ee = await r({
		entries: v.entries,
		maxMetadataBytes: c - _.gitMetadataBytes - v.gitMetadataBytes,
		repositoryRoot: o.repositoryRoot,
		...o.signal === void 0 ? {} : { signal: o.signal }
	});
	if (ee.kind === "failed") return ee;
	let y = i({ entries: ee.entries });
	return y.kind === "failed" ? y : Object.freeze({
		entries: y.entries,
		kind: "probed"
	});
})(), Sr = (e, t) => e.filter === t.filter && e.ident === t.ident && e.isGuarded === t.isGuarded && e.workingTreeEncoding === t.workingTreeEncoding, Cr = (e, t) => e.length === t.length && e.every((e, n) => e.mode === t[n]?.mode && e.stage === t[n]?.stage), wr = (e, t) => e.kind !== t.kind || e.path !== t.path || e.entryType !== t.entryType || e.requiresSymlinkOverlay !== t.requiresSymlinkOverlay || !Sr(e.contentTransformation, t.contentTransformation) ? !1 : e.kind === "untracked" || t.kind === "untracked" ? e.kind === t.kind : Cr(e.indexEntries, t.indexEntries), Tr = (e, t) => e.length === t.length && e.every((e, n) => {
	let r = t[n];
	return r !== void 0 && wr(e, r);
}), V = Object.freeze({
	maxCachedBytes: 67108864,
	maxConcurrentOperations: 16,
	maxDirectoryEntries: 131072,
	maxEntries: 131072,
	maxPageEntries: 4096,
	maxQueuedOperations: 256,
	maxReadBytes: 1048576
}), Er = (e) => typeof e == "string" && e.length > 0 && !e.includes("\0") && e.isWellFormed() && D.isAbsolute(e), Dr = new Set([
	"limits",
	"rootDirectory",
	"selection",
	"signal"
]), Or = new Set(["kind"]), kr = new Set(["kind", "paths"]), Ar = [
	"maxCachedBytes",
	"maxConcurrentOperations",
	"maxDirectoryEntries",
	"maxEntries",
	"maxPageEntries",
	"maxQueuedOperations",
	"maxReadBytes"
], jr = new Set(Ar), H = (e = null) => {
	throw new w({
		code: "INVALID_SOURCE_DATA",
		operation: "create-reader",
		path: e,
		retryable: !1
	});
}, Mr = (e) => {
	try {
		return Array.isArray(e);
	} catch {
		return H();
	}
}, Nr = (e) => typeof e == "object" && !!e && !Mr(e), Pr = (e, t) => {
	try {
		return Reflect.ownKeys(e).every((e) => typeof e == "string" && t.has(e));
	} catch {
		return H();
	}
}, U = (e, t) => {
	try {
		return Object.hasOwn(e, t);
	} catch {
		return H();
	}
}, W = (e, t) => {
	try {
		return Reflect.get(e, t);
	} catch {
		return H();
	}
}, Fr = (e) => {
	if (typeof e != "string") throw new Oe();
	return T(e);
}, Ir = (e) => {
	if (!Pr(e, kr) || !U(e, "paths")) return H();
	let t = W(e, "paths");
	if (!Mr(t)) return H();
	let n = W(t, "length");
	if (typeof n != "number" || !Number.isSafeInteger(n) || n < 0) return H();
	let r = [];
	for (let e = 0; e < n; e += 1) {
		let n = String(e);
		if (!U(t, n)) return H();
		r.push(Fr(W(t, n)));
	}
	let i = new Set();
	for (let e of r) {
		if (e === E || i.has(e)) return H();
		i.add(e);
	}
	return r.sort(), Object.freeze({
		kind: "paths",
		paths: Object.freeze(r)
	});
}, Lr = (e) => {
	if (!Nr(e) || !U(e, "kind")) return H();
	let t = W(e, "kind");
	return t === "directory" ? Pr(e, Or) ? Object.freeze({ kind: "directory" }) : H() : t === "paths" ? Ir(e) : H();
}, Rr = (e) => typeof e == "number" && Number.isSafeInteger(e) && e > 0, zr = (e) => {
	if (e === void 0) return V;
	if (!Nr(e) || !Pr(e, jr)) return H();
	let t = {
		maxCachedBytes: V.maxCachedBytes,
		maxConcurrentOperations: V.maxConcurrentOperations,
		maxDirectoryEntries: V.maxDirectoryEntries,
		maxEntries: V.maxEntries,
		maxPageEntries: V.maxPageEntries,
		maxQueuedOperations: V.maxQueuedOperations,
		maxReadBytes: V.maxReadBytes
	};
	for (let n of Ar) {
		if (!U(e, n)) continue;
		let r = W(e, n);
		if (!Rr(r)) return H();
		t[n] = r;
	}
	return Object.freeze(t);
}, Br = (e) => {
	try {
		if (e === void 0 || e instanceof AbortSignal) return e;
	} catch {
		return H();
	}
	return H();
}, Vr = (e) => {
	let t;
	try {
		if (!Nr(e) || !Pr(e, Dr) || !U(e, "rootDirectory") || !U(e, "selection")) return H();
		let n = W(e, "rootDirectory"), r = W(e, "selection"), i = U(e, "limits") ? W(e, "limits") : void 0, a = U(e, "signal") ? W(e, "signal") : void 0;
		if (!Er(n)) return H();
		t = {
			limits: zr(i),
			rootDirectory: n,
			selection: Lr(r),
			signal: Br(a)
		};
	} catch (e) {
		if (e instanceof Oe) throw e;
		return H();
	}
	if (t.selection.kind === "paths") {
		for (let e of t.selection.paths) if (e.slice(1).split("/").includes(".git")) return H(e);
	}
	return Object.freeze(t);
}, Hr = new Me("utf-8", {
	fatal: !0,
	ignoreBOM: !0
}), Ur = 65536, Wr = new Set([
	"frames",
	"kind",
	"prefix",
	"snapshotId",
	"version"
]), Gr = new Set([
	"lastName",
	"namesIdentity",
	"path",
	"pathIdentity"
]), Kr = new Set([
	"kind",
	"lastPath",
	"prefix",
	"snapshotId",
	"version"
]), qr = (e, t) => Reflect.ownKeys(e).every((e) => typeof e == "string" && t.has(e)), Jr = (e) => {
	let t = Ne("sha256");
	for (let n of e) t.update(n), t.update("\0");
	return `sha256:${t.digest("hex")}`;
}, Yr = (e) => {
	if (typeof e != "object" || !e || !("code" in e)) return;
	let t = e.code;
	return typeof t == "string" ? t : void 0;
}, G = (e, t, n, r, i, a) => {
	throw new w({
		cause: i,
		code: e,
		operation: t,
		path: n,
		...a === void 0 ? {} : { resource: a },
		retryable: r
	});
}, K = (e, t, n) => {
	let r = Yr(e);
	return G(r === "EACCES" || r === "EPERM" ? "ACCESS_DENIED" : t !== "create-reader" && (r === "ENOENT" || r === "ENOTDIR" || r === "ELOOP") ? "SNAPSHOT_CHANGED" : t === "create-reader" && (r === "ENOENT" || r === "ENOTDIR") ? "ENTRY_NOT_FOUND" : "SOURCE_UNAVAILABLE", t, n, !0, e);
}, q = (e, t, n) => {
	e?.aborted && G("ABORTED", t, n, !1, e.reason);
}, J = (e, t) => Jr([
	t,
	e.dev.toString(),
	e.ino.toString(),
	e.mode.toString(),
	e.size.toString(),
	e.mtimeNs.toString(),
	e.ctimeNs.toString()
]), Xr = (e, t, n) => e.isFile() ? "file" : e.isDirectory() ? "directory" : e.isSymbolicLink() ? "symlink" : G("INVALID_SOURCE_DATA", t, n, !1), Zr = (e, t, n) => {
	try {
		let t = Hr.decode(e);
		return T(n === E ? `/${t}` : `${n}/${t}`), t;
	} catch (e) {
		return G("INVALID_SOURCE_DATA", t, n, !1, e);
	}
}, Qr = async (e) => await Re(e, { encoding: "buffer" }), $r = (e) => {
	let t = e.slice(1).split("/"), n = [E];
	for (let e = 1; e < t.length; e += 1) n.push(T(`/${t.slice(0, e).join("/")}`));
	return n;
}, ei = (e, t) => {
	let n = 0, r = e.length;
	for (; n < r;) {
		let i = n + Math.floor((r - n) / 2), a = e[i];
		a !== void 0 && Te(a, t) <= 0 ? n = i + 1 : r = i;
	}
	return n;
}, ti = (e, t) => {
	let n = 0, r = e.length;
	for (; n < r;) {
		let i = n + Math.floor((r - n) / 2), a = e[i];
		a !== void 0 && a < t ? n = i + 1 : r = i;
	}
	return e[n] === t ? n : -1;
}, ni = class {
	snapshot;
	#e;
	#t = Fe(32);
	#n;
	#r;
	#i = new Map();
	#a;
	#o;
	#s;
	#c;
	#l;
	#u = new Map();
	#d = new Map();
	constructor(e, t, n) {
		this.#r = e.limits, this.#a = t, this.#o = e.selection, this.#e = Ge({
			maxBytes: e.limits.maxCachedBytes,
			maxEntries: 4096
		}), this.#n = Ye({
			maxConcurrent: e.limits.maxConcurrentOperations,
			maxQueued: e.limits.maxQueuedOperations
		}), this.snapshot = Object.freeze({
			id: Jr([n, Fe(32)]),
			sourceKind: "filesystem"
		}), this.#i.set(E, n), this.#s = e.selection.kind === "paths" ? this.#p(e.selection.paths) : [], this.#c = new Set(this.#s), this.#l = new Set(e.selection.kind === "paths" ? e.selection.paths : []);
		for (let e of this.#s) {
			if (e === E) continue;
			let t = e.lastIndexOf("/"), n = T(e.slice(0, t) || "/"), r = this.#u.get(n) ?? new Set();
			r.add(e.slice(t + 1)), this.#u.set(n, r);
		}
	}
	async initialize(e) {
		if (this.#o.kind === "paths") for (let t of this.#s) {
			q(e, "create-reader", t);
			let n = await this.#O(t, "create-reader", void 0, e);
			if (n === null) return G("ENTRY_NOT_FOUND", "create-reader", t, !0);
			t !== E && !this.#l.has(t) && n.type !== "directory" && G("ENTRY_NOT_DIRECTORY", "create-reader", t, !1);
		}
	}
	async compare(e, t) {
		return De(this, e, t);
	}
	async getEntry(e, t) {
		let n = T(e);
		return this.#_(n) ? this.#A("get-entry", n, t?.signal, () => this.#O(n, "get-entry", void 0, t?.signal)) : null;
	}
	async listEntriesPage(e) {
		let t = e.prefix === void 0 ? E : T(e.prefix);
		return this.#A("list-entries-page", t, e.signal, async () => {
			let n = this.#b(e.maxEntries, this.#r.maxPageEntries, "pageEntries", "list-entries-page", t), r = await this.#O(t, "list-entries-page", void 0, e.signal);
			return r === null || !this.#_(t) ? G("ENTRY_NOT_FOUND", "list-entries-page", t, !1) : (r.type !== "directory" && G("ENTRY_NOT_DIRECTORY", "list-entries-page", t, !1), this.#o.kind === "paths" ? this.#y(t, n, e.cursor, e.signal) : this.#v(t, n, e.cursor, e.signal));
		});
	}
	async readFilePage(e, t) {
		let n = T(e);
		return this.#A("read-file-page", n, t.signal, async () => {
			let e = this.#x(t.offset, n), r = this.#b(t.maxBytes, this.#r.maxReadBytes, "readBytes", "read-file-page", n);
			this.#_(n) || G("ENTRY_NOT_FOUND", "read-file-page", n, !1);
			let i = await this.#O(n, "read-file-page", void 0, t.signal);
			if (i === null) return G("ENTRY_NOT_FOUND", "read-file-page", n, !1);
			if (i.type !== "file" || i.byteLength === null) return G("ENTRY_NOT_FILE", "read-file-page", n, !1);
			let a = this.#i.get(n);
			if (a === void 0) return G("INVALID_SOURCE_DATA", "read-file-page", n, !1);
			e > i.byteLength && G("INVALID_PAGE_REQUEST", "read-file-page", n, !1);
			let o = Math.min(r, i.byteLength - e), s = `${n}\0${a}\0${e}\0${o}`, c = this.#e.get(s);
			if (c !== void 0) return this.#f(c, i.byteLength, e);
			let l = await this.#k(n, a, e, o, t.signal);
			return l.byteLength > 0 && this.#e.set(s, l), this.#f(l, i.byteLength, e);
		});
	}
	async readLinkText(e, t) {
		let n = T(e);
		return this.#A("read-link-text", n, t?.signal, async () => {
			if (!this.#_(n)) return G("ENTRY_NOT_FOUND", "read-link-text", n, !1);
			let e = await this.#O(n, "read-link-text", void 0, t?.signal);
			if (e === null) return G("ENTRY_NOT_FOUND", "read-link-text", n, !1);
			if (e.type !== "symlink") return G("ENTRY_NOT_LINK", "read-link-text", n, !1);
			let r;
			try {
				r = await Be(this.#g(n), { encoding: "buffer" });
			} catch (e) {
				return K(e, "read-link-text", n);
			}
			if (await this.#O(n, "read-link-text", void 0, t?.signal), r.byteLength > 4096) return null;
			let i;
			try {
				i = Hr.decode(r);
			} catch {
				return null;
			}
			return process.platform === "win32" ? i.replaceAll("\\", "/") : i;
		});
	}
	#f(e, t, n) {
		let r = n + e.byteLength, i = r === t;
		return {
			bytes: e,
			isComplete: i,
			nextOffset: i ? null : r,
			offset: n,
			snapshot: this.snapshot,
			totalBytes: t
		};
	}
	#p(e) {
		let t = new Set([E]);
		for (let n of e) {
			t.add(n);
			for (let e of $r(n)) t.add(e);
		}
		return t.size - 1 > this.#r.maxEntries && G("RESOURCE_LIMIT_EXCEEDED", "create-reader", null, !1, void 0, {
			dimension: "selectedEntries",
			limit: this.#r.maxEntries,
			observed: t.size - 1
		}), Object.freeze([...t].sort(Te));
	}
	#m(e, t) {
		try {
			if (Buffer.byteLength(e, "utf8") > Ur) throw Error("cursor exceeds the encoded limit");
			let n = e.lastIndexOf(".");
			if (n <= 0) throw Error("cursor signature is missing");
			let r = e.slice(0, n);
			if (!at(r, e.slice(n + 1), this.#t)) throw Error("cursor signature does not match");
			let i = JSON.parse(Buffer.from(r, "base64url").toString("utf8"));
			if (!s(i, !0) || i.version !== 1 || i.snapshotId !== this.snapshot.id || i.prefix !== t) throw Error("cursor belongs to another snapshot or prefix");
			if (i.kind === "paths" && qr(i, Kr)) {
				let e = T(i.lastPath), n = t === E ? E : `${t}/`;
				if (e === t || !e.startsWith(n)) throw Error("cursor path is outside the requested prefix");
				return {
					kind: "paths",
					lastPath: e,
					prefix: t,
					snapshotId: this.snapshot.id,
					version: 1
				};
			}
			if (i.kind === "directory" && qr(i, Wr) && Array.isArray(i.frames)) return {
				frames: i.frames.map((e) => {
					if (!s(e, !0)) throw Error("cursor frame is invalid");
					let t = e;
					if (!qr(t, Gr) || typeof t.lastName != "string" && t.lastName !== null || typeof t.namesIdentity != "string" || typeof t.path != "string" || typeof t.pathIdentity != "string") throw Error("cursor frame is invalid");
					return {
						lastName: t.lastName,
						namesIdentity: t.namesIdentity,
						path: T(t.path),
						pathIdentity: t.pathIdentity
					};
				}),
				kind: "directory",
				prefix: t,
				snapshotId: this.snapshot.id,
				version: 1
			};
			throw Error("cursor payload is invalid");
		} catch (e) {
			return G("INVALID_PAGE_REQUEST", "list-entries-page", t, !1, e);
		}
	}
	#h(e) {
		let t = Buffer.from(JSON.stringify(e), "utf8").toString("base64url"), n = `${t}.${it(t, this.#t)}`;
		return Buffer.byteLength(n, "utf8") > Ur && G("RESOURCE_LIMIT_EXCEEDED", "list-entries-page", e.prefix, !1, void 0, {
			dimension: "cursorBytes",
			limit: Ur,
			observed: Buffer.byteLength(n, "utf8")
		}), n;
	}
	#g(e) {
		if (e === E) return this.#a;
		let t = D.resolve(this.#a, ...e.slice(1).split("/")), n = D.relative(this.#a, t);
		return (n === "" || n === ".." || n.startsWith(`..${D.sep}`) || D.isAbsolute(n)) && G("INVALID_SOURCE_DATA", "get-entry", e, !1), t;
	}
	#_(e) {
		return this.#o.kind === "directory" || this.#c.has(e);
	}
	async #v(e, t, n, r) {
		let i, a = new Map();
		if (n === void 0) {
			let t = await this.#S(e, null, "list-entries-page", a, r);
			i = [t], a.set(e, t);
		} else {
			let t = this.#m(n, e);
			if (t.kind !== "directory" || t.frames.length === 0) return G("INVALID_PAGE_REQUEST", "list-entries-page", e, !1);
			i = [];
			for (let e of t.frames) {
				let t = await this.#C(e, a, r);
				i.push(t), a.set(t.path, t);
			}
		}
		let o = [];
		for (; i.length > 0 && o.length < t;) {
			q(r, "list-entries-page", e);
			let t = i.at(-1);
			if (t === void 0) break;
			if (t.nextIndex >= t.names.length) {
				i.pop(), a.delete(t.path);
				continue;
			}
			let n = t.names[t.nextIndex];
			if (n === void 0) return G("INVALID_SOURCE_DATA", "list-entries-page", t.path, !1);
			i[i.length - 1] = {
				...t,
				lastName: n,
				nextIndex: t.nextIndex + 1
			};
			let s = T(t.path === E ? `/${n}` : `${t.path}/${n}`), c = await this.#O(s, "list-entries-page", a, r);
			if (c === null) return G("SNAPSHOT_CHANGED", "list-entries-page", s, !0);
			if (o.push(c), c.type === "directory") {
				let e = await this.#S(s, null, "list-entries-page", a, r);
				i.push(e), a.set(s, e);
			}
		}
		let s = i.length === 0;
		return {
			entries: o,
			isComplete: s,
			nextCursor: s ? null : this.#h({
				frames: i.map(({ lastName: e, namesIdentity: t, path: n, pathIdentity: r }) => ({
					lastName: e,
					namesIdentity: t,
					path: n,
					pathIdentity: r
				})),
				kind: "directory",
				prefix: e,
				snapshotId: this.snapshot.id,
				version: 1
			}),
			snapshot: this.snapshot
		};
	}
	async #y(e, t, n, r) {
		let i = null;
		if (n !== void 0) {
			let t = this.#m(n, e);
			if (t.kind !== "paths" || !this.#c.has(t.lastPath)) return G("INVALID_PAGE_REQUEST", "list-entries-page", e, !1);
			i = t.lastPath;
		}
		let a = e === E ? E : `${e}/`, o = ei(this.#s, i ?? e), s = [];
		for (; s.length < t;) {
			q(r, "list-entries-page", e);
			let t = this.#s[o];
			if (t === void 0 || !t.startsWith(a)) break;
			let n = await this.#O(t, "list-entries-page", void 0, r);
			if (n === null) return G("SNAPSHOT_CHANGED", "list-entries-page", t, !0);
			s.push(n), o += 1;
		}
		let c = this.#s[o], l = c === void 0 || !c.startsWith(a), u = s.at(-1);
		return !l && u === void 0 ? G("INVALID_SOURCE_DATA", "list-entries-page", e, !1) : {
			entries: s,
			isComplete: l,
			nextCursor: l ? null : this.#h({
				kind: "paths",
				lastPath: u?.path ?? e,
				prefix: e,
				snapshotId: this.snapshot.id,
				version: 1
			}),
			snapshot: this.snapshot
		};
	}
	#b(e, t, n, r, i) {
		return (!Number.isSafeInteger(e) || e <= 0) && G("INVALID_PAGE_REQUEST", r, i, !1), e > t && G("RESOURCE_LIMIT_EXCEEDED", r, i, !1, void 0, {
			dimension: n,
			limit: t,
			observed: e
		}), e;
	}
	#x(e, t) {
		return (!Number.isSafeInteger(e) || e < 0) && G("INVALID_PAGE_REQUEST", "read-file-page", t, !1), e;
	}
	async #S(e, t, n, r, i) {
		let a = await this.#O(e, n, r, i);
		(a === null || a.type !== "directory") && G("SNAPSHOT_CHANGED", n, e, !0);
		let o = await this.#w(e, n, r, i), s = t === null ? 0 : ti(o, t) + 1;
		return s === 0 && t !== null && G("SNAPSHOT_CHANGED", n, e, !0), {
			lastName: t,
			names: o,
			namesIdentity: Jr(o),
			nextIndex: s,
			path: e,
			pathIdentity: this.#i.get(e) ?? ""
		};
	}
	async #C(e, t, n) {
		let r = await this.#S(T(e.path), e.lastName, "list-entries-page", t, n);
		return (r.pathIdentity !== e.pathIdentity || r.namesIdentity !== e.namesIdentity) && G("SNAPSHOT_CHANGED", "list-entries-page", e.path, !0), r;
	}
	async #w(e, t, n, r) {
		try {
			let i = await Qr(this.#g(e)), a = [], o = 0;
			for await (let n of i) {
				q(r, t, e), o += 1, o > this.#r.maxDirectoryEntries && G("RESOURCE_LIMIT_EXCEEDED", t, e, !1, void 0, {
					dimension: "directoryEntries",
					limit: this.#r.maxDirectoryEntries,
					observed: o
				});
				let i = Zr(n.name, t, e);
				i !== ".git" && a.push(i);
			}
			return await this.#O(e, t, n, r), a.sort();
		} catch (n) {
			if (n instanceof w) throw n;
			return K(n, t, e);
		}
	}
	async #T(e, t, n, r, i, a) {
		let o = i?.get(e);
		if (o !== void 0) return o.pathIdentity !== r && G("SNAPSHOT_CHANGED", n, e, !0), ti(o.names, t) >= 0;
		let s = this.#u.get(e), c = s?.has(t) === !0, l = c ? this.#d.get(e) : void 0;
		if (l !== void 0) return l.identity !== r && G("SNAPSHOT_CHANGED", n, e, !0), q(a, n, e), l.names.has(t);
		try {
			let i = await Qr(this.#g(e)), o = c && s !== void 0 ? s : new Set([t]), l = new Set(), u = 0;
			for await (let t of i) {
				q(a, n, e), u += 1, u > this.#r.maxDirectoryEntries && G("RESOURCE_LIMIT_EXCEEDED", n, e, !1, void 0, {
					dimension: "directoryEntries",
					limit: this.#r.maxDirectoryEntries,
					observed: u
				});
				let r;
				try {
					r = Zr(t.name, n, e);
				} catch (e) {
					if (e instanceof w && e.code === "INVALID_SOURCE_DATA") continue;
					throw e;
				}
				if (r !== ".git" && o.has(r) && (l.add(r), l.size === o.size)) break;
			}
			if (c) {
				let t = await k(this.#g(e), { bigint: !0 });
				(!t.isDirectory() || J(t, "directory") !== r) && G("SNAPSHOT_CHANGED", n, e, !0), this.#d.set(e, {
					identity: r,
					names: l
				});
			}
			return q(a, n, e), l.has(t);
		} catch (t) {
			if (t instanceof w) throw t;
			return K(t, n, e);
		}
	}
	async #E(e, t, n, r) {
		let i = await this.#D(t, e);
		if (e === E) return i;
		let a = e.slice(1).split("/"), o = E, s = null, c = [];
		for (let [l, u] of a.entries()) {
			q(r, t, e);
			let d = J(s ?? i, "directory");
			if (!await this.#T(o, u, t, d, n, r)) return null;
			o = T(o === E ? `/${u}` : `${o}/${u}`);
			try {
				s = await k(this.#g(o), { bigint: !0 });
			} catch (e) {
				return K(e, t, o);
			}
			if (l < a.length - 1 && !s.isDirectory()) return null;
			l < a.length - 1 && c.push({
				identity: J(s, "directory"),
				path: o
			});
		}
		for (let n of c) {
			q(r, t, e);
			let i;
			try {
				i = await k(this.#g(n.path), { bigint: !0 });
			} catch (e) {
				return K(e, t, n.path);
			}
			if (!i.isDirectory() || J(i, "directory") !== n.identity) return G("SNAPSHOT_CHANGED", t, n.path, !0);
		}
		return await this.#D(t, e), s;
	}
	async #D(e, t) {
		try {
			let n = await k(this.#a, { bigint: !0 }), r = this.#i.get(E);
			return !n.isDirectory() || r === void 0 || J(n, "directory") !== r ? G("SNAPSHOT_CHANGED", e, t, !0) : n;
		} catch (n) {
			if (n instanceof w) throw n;
			return K(n, e, t);
		}
	}
	async #O(e, t, n, r) {
		let i = await this.#E(e, t, n, r);
		if (q(r, t, e), i === null) return this.#i.has(e) ? G("SNAPSHOT_CHANGED", t, e, !0) : null;
		let a = Xr(i, t, e), o = J(i, a), s = this.#i.get(e);
		return s !== void 0 && s !== o && G("SNAPSHOT_CHANGED", t, e, !0), s === void 0 && (this.#i.size - 1 >= this.#r.maxEntries && G("RESOURCE_LIMIT_EXCEEDED", t, e, !1, void 0, {
			dimension: "observedEntries",
			limit: this.#r.maxEntries,
			observed: this.#i.size
		}), this.#i.set(e, o)), {
			byteLength: a === "file" ? Number(i.size) : null,
			contentIdentity: null,
			path: e,
			type: a
		};
	}
	async #k(e, t, n, r, i) {
		let a;
		try {
			let o = "O_NOFOLLOW" in Ae ? Ae.O_NOFOLLOW : 0;
			a = await Le(this.#g(e), Ae.O_RDONLY | o);
			let s = await a.stat({ bigint: !0 });
			J(s, Xr(s, "read-file-page", e)) !== t && G("SNAPSHOT_CHANGED", "read-file-page", e, !0);
			let c = new Uint8Array(r), l = 0;
			for (; l < r;) {
				q(i, "read-file-page", e);
				let t = await a.read(c, l, r - l, n + l);
				t.bytesRead === 0 && G("SNAPSHOT_CHANGED", "read-file-page", e, !0), l += t.bytesRead;
			}
			let u = await a.stat({ bigint: !0 });
			return J(u, Xr(u, "read-file-page", e)) !== t && G("SNAPSHOT_CHANGED", "read-file-page", e, !0), await this.#O(e, "read-file-page"), c;
		} catch (t) {
			if (t instanceof w) throw t;
			return K(t, "read-file-page", e);
		} finally {
			await a?.close().catch(() => void 0);
		}
	}
	async #A(e, n, r, i) {
		let a = !1;
		try {
			return await this.#n.run(async () => (a = !0, q(r, e, n), i()), r === void 0 ? {} : { signal: r });
		} catch (r) {
			if (a) throw r;
			return Yr(r) === t.REQUEST_QUEUE_FULL ? G("RESOURCE_LIMIT_EXCEEDED", e, n, !0, void 0, {
				dimension: "queuedOperations",
				limit: this.#r.maxQueuedOperations,
				observed: this.#r.maxQueuedOperations + 1
			}) : G("ABORTED", e, n, !1, r);
		}
	}
}, ri = async (e) => {
	q(e.signal, "create-reader", null);
	try {
		let t = await Ve(e.rootDirectory), n = await k(t, { bigint: !0 });
		return n.isDirectory() || G("ENTRY_NOT_DIRECTORY", "create-reader", null, !1), {
			identity: J(n, "directory"),
			rootDirectory: t
		};
	} catch (e) {
		if (e instanceof w) throw e;
		return K(e, "create-reader", null);
	}
}, ii = async (e) => {
	let t = Vr(e), n = await ri(t), r = new ni(t, n.rootDirectory, n.identity);
	return await r.initialize(t.signal), q(t.signal, "create-reader", null), Object.freeze(r);
}, ai = new TextDecoder("utf-8", {
	fatal: !0,
	ignoreBOM: !0
}), Y = (e, t, n) => {
	if (e?.aborted) throw new w({
		cause: e.reason,
		code: "ABORTED",
		operation: t,
		path: n,
		retryable: !1
	});
}, oi = (e, t) => new w({
	code: "INVALID_SOURCE_DATA",
	operation: e,
	path: t,
	retryable: !1
}), si = (e, t, n) => {
	if (e?.type !== "file" || e.path !== n) throw oi(t, n);
}, ci = (e, t, n) => (si(e, t, n), Object.freeze({
	byteLength: null,
	contentIdentity: null,
	path: n,
	type: "symlink"
})), li = class {
	snapshot;
	#e;
	#t;
	constructor(e, t) {
		this.#t = e, this.#e = t, this.snapshot = e.snapshot;
	}
	compare(e, t) {
		return De(this, e, t);
	}
	async getEntry(e, t) {
		let n = await this.#t.getEntry(e, t);
		return this.#e.has(e) ? ci(n, "get-entry", e) : n;
	}
	async readFilePage(e, t) {
		let n = T(e);
		if (!this.#e.has(n)) return this.#t.readFilePage(n, t);
		throw Y(t.signal, "read-file-page", n), si(await this.#t.getEntry(n, t), "read-file-page", n), Y(t.signal, "read-file-page", n), new w({
			code: "ENTRY_NOT_FILE",
			operation: "read-file-page",
			path: n,
			retryable: !1
		});
	}
	async readLinkText(e, t) {
		let n = T(e);
		if (!this.#e.has(n)) return this.#t.readLinkText(n, t);
		Y(t?.signal, "read-link-text", n);
		let r = await this.#t.getEntry(n, t);
		si(r, "read-link-text", n), Y(t?.signal, "read-link-text", n);
		let i = r?.byteLength ?? null;
		if (i === null) throw oi("read-link-text", n);
		if (i > 4096) return null;
		if (i === 0) return "";
		let a = await this.#t.readFilePage(n, {
			maxBytes: i,
			offset: 0,
			...t?.signal === void 0 ? {} : { signal: t.signal }
		});
		if (Y(t?.signal, "read-link-text", n), !a.isComplete || a.totalBytes !== i || a.bytes.byteLength !== i) throw oi("read-link-text", n);
		try {
			return ai.decode(a.bytes);
		} catch {
			return null;
		}
	}
	async listEntriesPage(e) {
		let t = e.prefix === void 0 ? E : T(e.prefix);
		if (this.#e.has(t)) {
			Y(e.signal, "list-entries-page", t);
			let n = e.signal === void 0 ? void 0 : { signal: e.signal };
			throw si(await this.#t.getEntry(t, n), "list-entries-page", t), Y(e.signal, "list-entries-page", t), new w({
				code: "ENTRY_NOT_DIRECTORY",
				operation: "list-entries-page",
				path: t,
				retryable: !1
			});
		}
		let n = await this.#t.listEntriesPage(e), r = n.entries.map((e) => this.#e.has(e.path) ? ci(e, "list-entries-page", e.path) : e);
		return Object.freeze({
			entries: Object.freeze(r),
			isComplete: n.isComplete,
			nextCursor: n.nextCursor,
			snapshot: this.snapshot
		});
	}
}, ui = (e, t) => {
	let n = new Set();
	for (let e of t) {
		let t = T(e);
		if (t === E) throw new w({
			code: "INVALID_SOURCE_DATA",
			operation: "create-reader",
			path: t,
			retryable: !1
		});
		n.add(t);
	}
	return Object.freeze(new li(e, n));
}, di = async (e, t, n, r) => {
	let i = Object.freeze(e.entries.map((e) => e.path)), a = Object.freeze(e.entries.reduce((e, t) => (t.requiresSymlinkOverlay && e.push(t.path), e), [])), o = Object.freeze(e.entries.reduce((e, t) => (t.contentTransformation.isGuarded && e.push(t.path), e), []));
	return r(n(await t({
		limits: Object.freeze({
			maxCachedBytes: e.resourceLimits.maxTotalBytes,
			maxDirectoryEntries: e.resourceLimits.maxEntries,
			maxEntries: e.resourceLimits.maxEntries,
			maxPageEntries: Math.min(4096, e.resourceLimits.maxEntries),
			maxReadBytes: e.resourceLimits.maxFileBytes
		}),
		rootDirectory: e.repositoryRoot,
		selection: Object.freeze({
			kind: "paths",
			paths: i
		}),
		...e.signal === void 0 ? {} : { signal: e.signal }
	}), a), o);
}, fi = ((e = ii, t = ui, n = Yt) => (r) => di(r, e, t, n))(), pi = ((e = ii, t = ui, n = Yt) => (r) => di(r, e, t, n))(), X = (e, t) => Object.freeze({
	errorCode: e,
	kind: "failed",
	...t === void 0 ? {} : { subcommand: t }
}), mi = (e) => e instanceof w && e.code === "SNAPSHOT_CHANGED", hi = (e) => e instanceof w && e.operation === "create-reader" && (e.code === "ENTRY_NOT_FOUND" || e.code === "ENTRY_NOT_DIRECTORY"), gi = (e) => e === "GIT_REPOSITORY_NOT_FOUND" || e === "GIT_WORK_TREE_REQUIRED", _i = ((e = Ot, t = xr, n = fi, r = Tr, i = pi) => async (a) => {
	if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
	let o = a.repositoryRoot, s = Object.freeze({ ...a.resourceLimits }), c = await e({
		repositoryRoot: o,
		...a.signal === void 0 ? {} : { signal: a.signal }
	});
	if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
	if (c.kind === "failed") return X(c.errorCode);
	if (c.kind === "mismatched") return X("GIT_OUTPUT_INVALID");
	let l = c.identity, u = async () => {
		let e = await t({
			maxEntries: s.maxEntries,
			maxMetadataBytes: s.maxTotalBytes,
			repositoryRoot: o,
			...a.selectionPaths === void 0 ? {} : { selectionPaths: a.selectionPaths },
			...a.signal === void 0 ? {} : { signal: a.signal }
		});
		return e.kind === "failed" ? X(e.errorCode, e.subcommand) : e;
	}, d = async () => {
		if (a.includeInstructions !== !0) return null;
		let e = await t({
			includeIgnored: !0,
			maxEntries: s.maxEntries,
			maxMetadataBytes: s.maxTotalBytes,
			repositoryRoot: o,
			selectionPaths: an,
			...a.signal === void 0 ? {} : { signal: a.signal }
		});
		return e.kind === "failed" ? X(e.errorCode, e.subcommand) : e;
	};
	for (let t = 0; t < 3; t += 1) {
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		let t = await e({
			repositoryRoot: o,
			...a.signal === void 0 ? {} : { signal: a.signal }
		});
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		if (t.kind === "failed") return X(gi(t.errorCode) ? "WORKING_TREE_UNSTABLE" : t.errorCode);
		if (t.kind === "mismatched" || !xt(l, t.identity)) return X("WORKING_TREE_UNSTABLE");
		let c = await u();
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		if (c.kind === "failed") return c;
		let f = await d();
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		if (f?.kind === "failed") return f;
		let p, m;
		try {
			p = await n({
				entries: c.entries,
				repositoryRoot: o,
				resourceLimits: s,
				...a.signal === void 0 ? {} : { signal: a.signal }
			}), m = f === null ? void 0 : await i({
				entries: f.entries,
				repositoryRoot: o,
				resourceLimits: s,
				...a.signal === void 0 ? {} : { signal: a.signal }
			});
		} catch (e) {
			if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
			if (mi(e)) continue;
			if (!hi(e)) throw e;
			let t = await u();
			if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
			if (t.kind === "failed") return t;
			let n = await d();
			if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
			if (n?.kind === "failed") return n;
			if (!r(c.entries, t.entries) || f !== null && n !== null && !r(f.entries, n.entries)) continue;
			throw e;
		}
		let h = await u();
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		if (h.kind === "failed") return h;
		if (!r(c.entries, h.entries)) continue;
		let g = await d();
		if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
		if (g?.kind === "failed") return g;
		if (!(f !== null && g !== null && !r(f.entries, g.entries))) try {
			if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
			let e = m === void 0 ? a.signal === void 0 ? await a.operation(p) : await a.operation(p, a.signal) : await a.operation(p, a.signal, m);
			return a.signal?.aborted ? X("GIT_OPERATION_ABORTED") : Object.freeze({
				kind: "completed",
				result: e
			});
		} catch (e) {
			if (a.signal?.aborted) return X("GIT_OPERATION_ABORTED");
			if (!mi(e)) throw e;
		}
	}
	return X("WORKING_TREE_UNSTABLE");
})(), vi = (e) => Buffer.byteLength(e, "utf8"), yi = (e, t, n, r, i) => n ? vi(r(Object.freeze({
	cursor: e.cursor,
	records: Object.freeze([])
}))) - 2 + t : vi(i(e)), bi = (e, t, n) => Object.freeze({
	exitCode: A.Success,
	stderr: "",
	stdout: n ? f(e, t) : ae(e, t)
}), Z = (e, t, n, r, i) => Object.freeze(r ? {
	exitCode: i,
	stderr: "",
	stdout: ee(e, t, n)
} : {
	exitCode: i,
	stderr: te(e),
	stdout: ""
}), xi = (e, t, n, r, i) => {
	let a = ve(e), o = (e) => ({
		diagnosticCount: a.diagnosticCount,
		acceptedWarningCount: a.acceptedWarningCount,
		errorCount: a.errorCount,
		formatVersion: a.formatVersion,
		page: e,
		coverageCounts: a.coverageCounts,
		valid: a.valid,
		warningCount: a.warningCount
	}), s = p({
		command: "validate",
		cursor: r,
		filters: {},
		maxOutputBytes: i,
		measure: (e, r) => yi(e, r, n, (e) => de(o(e), t), (e) => ne(o(e))),
		records: a.records,
		snapshotDigest: a.snapshotDigest
	}), c = Object.freeze(o(s));
	return ot(c), Object.freeze({
		exitCode: c.valid ? A.Success : A.StructuralInvalid,
		stderr: "",
		stdout: n ? de(c, t) : ne(c)
	});
}, Si = (e, t, n, r, i) => {
	let a = re(e), o = (e) => ({
		counts: a.counts,
		formatVersion: a.formatVersion,
		page: e,
		coverageCounts: a.coverageCounts,
		valid: a.valid
	}), s = p({
		command: "inspect",
		cursor: r,
		filters: {},
		maxOutputBytes: i,
		measure: (e, r) => yi(e, r, n, (e) => fe(o(e), t), (e) => u(o(e))),
		records: a.records,
		sourceCursorForRecord: a.getSourceCursor,
		snapshotDigest: a.snapshotDigest
	}), c = Object.freeze(o(s));
	return ot(c), Object.freeze({
		exitCode: e.valid ? A.Success : A.StructuralInvalid,
		stderr: "",
		stdout: n ? fe(c, t) : u(c)
	});
}, Ci = (e, t, n, r, i) => {
	let a = Wt(e), o = (e) => ({
		counts: a.counts,
		page: e,
		relevant: a.relevant,
		valid: a.valid
	}), s = p({
		command: "scope",
		cursor: r,
		filters: { inputDigest: a.inputDigest },
		maxOutputBytes: i,
		measure: (e, r) => yi(e, r, n, (e) => c(o(e), t), (e) => ye(o(e))),
		records: a.records,
		snapshotDigest: a.snapshotDigest
	}), l = Object.freeze(o(s));
	return ot(l, a.canonicalBodies), Object.freeze({
		exitCode: a.valid ? A.Success : A.StructuralInvalid,
		stderr: "",
		stdout: n ? c(l, t) : ye(l)
	});
}, wi = (e, t, n, r, i) => {
	let a = Rt({
		cursor: r,
		maxOutputBytes: i,
		measure: (e) => vi(n ? d(e, t) : be(e)),
		page: e
	});
	return Object.freeze({
		exitCode: A.Success,
		stderr: "",
		stdout: n ? d(a, t) : be(a)
	});
}, Ti = async (e) => {
	let { executeMoldeaCliCoreInspection: t } = await import("./chunk-afb0cf51.mjs");
	return t(e);
}, Ei = async (e) => {
	let { resolveInstalledMoldeaCliComposition: t } = await import("./chunk-cb0442cc.mjs");
	return t(e);
}, Q = (e, t, n) => Z(_(e, n), t.invocation.command, t.packageMetadata.version, t.invocation.options.isJson, A.OperationalError), Di = ((e = _t, t = _i, n = Ti, r = Ei, i = Ht, a = Ft) => async (o) => {
	let s = o.invocation.command, c = o.invocation.options;
	try {
		if (s === m.Composition || s === m.Inspect || s === m.Validate) {
			let e = await r({
				packageMetadata: o.packageMetadata,
				...o.signal === void 0 ? {} : { signal: o.signal }
			});
			if (e.kind === "invalid") return Q("COMPOSITION_STATE_INVALID", o);
			if (s === m.Composition) return bi(e.result, o.packageMetadata.version, c.isJson);
		}
		let l = null, u = null, d = 0, f = s === m.Inspect && c.cursor !== null ? b({
			command: "inspect",
			cursor: c.cursor,
			filters: {}
		}) : null;
		if (s === m.Scope) {
			if (c.pathsInput === "path" && c.path !== null) l = Object.freeze([c.path]);
			else if (c.pathsInput === "stdin" && o.stdin !== void 0) {
				if (o.stdin.byteLength > c.resourceLimits.maxTotalBytes) return Q("RESOURCE_LIMIT_EXCEEDED", o);
				l = Bt(o.stdin, c.resourceLimits.maxEntries);
			} else return Q("PATH_INPUT_INVALID", o);
			if (l.some((e) => !Ee(e))) return Q("PATH_INPUT_INVALID", o);
		}
		if (s === m.Content) {
			if (c.path === null) return Q("CONTENT_PATH_INVALID", o);
			if (u = Pt(c.path), c.cursor !== null) {
				let e = b({
					command: "content",
					cursor: c.cursor,
					filters: { path: u }
				}).sourceCursor, t = e === null ? null : /^byte:(0|[1-9][0-9]*)$/u.exec(e);
				if (t === null || (d = Number(t[1]), !Number.isSafeInteger(d))) throw new S("CURSOR_INVALID");
			}
		}
		let p = await e({
			invocationDirectory: o.invocationDirectory,
			repositoryDirectory: c.repositoryDirectory,
			...o.signal === void 0 ? {} : { signal: o.signal }
		});
		if (p.kind === "failed") return Q(p.errorCode, o);
		let h = c.resourceLimits, g = await t({
			operation: async (e, t, r) => s === m.Scope && l !== null ? i({
				paths: l,
				repository: e,
				resourceLimits: h,
				...t === void 0 ? {} : { signal: t }
			}) : s === m.Content && u !== null ? a({
				maxBytes: Math.min(h.maxFileBytes, h.maxTotalBytes, Math.max(1, Math.floor(c.maxOutputBytes / 2))),
				offset: d,
				path: u,
				repository: e,
				resourceLimits: h,
				...t === void 0 ? {} : { signal: t }
			}) : n({
				packageMetadata: o.packageMetadata,
				command: s === m.Inspect ? "inspect" : "validate",
				...f === null ? {} : { cursor: f },
				...r === void 0 ? {} : { instructions: r },
				repository: e,
				resourceLimits: h,
				...t === void 0 ? {} : { signal: t }
			}),
			repositoryRoot: p.repositoryRoot,
			resourceLimits: h,
			...s === m.Validate || s === m.Inspect ? { includeInstructions: !0 } : {},
			...s === m.Scope ? { selectionPaths: [P] } : u === null ? {} : { selectionPaths: [u] },
			...o.signal === void 0 ? {} : { signal: o.signal }
		});
		return g.kind === "failed" ? Q(g.errorCode, o, g.subcommand === void 0 ? void 0 : { subcommand: g.subcommand }) : s === m.Validate ? xi(g.result, o.packageMetadata.version, c.isJson, c.cursor, c.maxOutputBytes) : s === m.Inspect ? Si(g.result, o.packageMetadata.version, c.isJson, c.cursor, c.maxOutputBytes) : s === m.Scope ? Ci(g.result, o.packageMetadata.version, c.isJson, c.cursor, c.maxOutputBytes) : wi(g.result, o.packageMetadata.version, c.isJson, c.cursor, c.maxOutputBytes);
	} catch (e) {
		return Z(tn(e), s, o.packageMetadata.version, c.isJson, A.OperationalError);
	}
})(), Oi = async (e) => {
	let t = v(e.commandLineArguments);
	if (t.kind === "help") return {
		exitCode: A.Success,
		stderr: "",
		stdout: xe(t.command)
	};
	if (t.kind === "version") return {
		exitCode: A.Success,
		stderr: "",
		stdout: `${e.packageMetadata.version}\n`
	};
	if (t.kind === "error") return Z(_(t.code), t.command, e.packageMetadata.version, t.isJson, A.UsageError);
	let n = e.executeCommand ?? Di;
	try {
		let r;
		if (t.invocation.options.pathsInput === "stdin") {
			if (e.readStdin === void 0) return Z(_("PATH_INPUT_INVALID"), t.invocation.command, e.packageMetadata.version, t.invocation.options.isJson, A.UsageError);
			let n = await e.readStdin(t.invocation.options.resourceLimits.maxTotalBytes, e.signal);
			if (n.kind === "limit-exceeded") return Z(_("RESOURCE_LIMIT_EXCEEDED"), t.invocation.command, e.packageMetadata.version, t.invocation.options.isJson, A.OperationalError);
			r = n.bytes;
		}
		return await n({
			invocationDirectory: e.invocationDirectory,
			invocation: t.invocation,
			packageMetadata: e.packageMetadata,
			...e.signal === void 0 ? {} : { signal: e.signal },
			...r === void 0 ? {} : { stdin: r }
		});
	} catch {
		return Z(_("INTERNAL_ERROR"), t.invocation.command, e.packageMetadata.version, t.invocation.options.isJson, A.OperationalError);
	}
};
ie();
//#endregion
//#region src/bin/index.ts
var ki = D.dirname(ke(import.meta.url));
D.resolve(ki, "..", "package.json");
var $ = et({ setExitCode: !1 }), Ai = async (e, t) => {
	try {
		return {
			bytes: await tt({
				maxBytes: e,
				signal: t
			}),
			kind: "completed"
		};
	} catch (e) {
		if (i(e, x.STDIN_TOO_LARGE)) return { kind: "limit-exceeded" };
		if (t?.aborted === !0) return {
			bytes: new Uint8Array(),
			kind: "completed"
		};
		throw e;
	}
}, ji = async (e, t) => {
	t.length !== 0 && await new Promise((n, r) => {
		e.write(t, (e) => {
			if (e) {
				r(e);
				return;
			}
			n();
		});
	});
};
try {
	let e = O.cwd(), t = await Oi({
		commandLineArguments: O.argv.slice(2),
		invocationDirectory: e,
		packageMetadata: {
			dependencies: {
				"@moldea.ai/core": "workspace:^10.0.1",
				"@moldea.ai/repository": "workspace:^4.0.0",
				"@moldea.ai/repository-fs": "workspace:^4.0.0",
				"jg-crypto": "0.3.0",
				"jg-exception": "1.7.1",
				"jg-git-commands": "0.4.0",
				"jg-process": "1.6.2",
				"jg-utilities": "1.7.2",
				semver: "7.8.5"
			},
			installedPackageVersions: {
				"@moldea.ai/core": "10.0.1",
				"@moldea.ai/repository": "4.0.1",
				"@moldea.ai/repository-fs": "4.0.1"
			},
			supportedNodeRange: ">=22.17.0",
			version: "15.0.1"
		},
		readStdin: Ai,
		signal: $.signal
	});
	$.receivedSignal() === null && (await ji(O.stdout, t.stdout), $.receivedSignal() === null && await ji(O.stderr, t.stderr)), O.exitCode = $.exitCode() ?? t.exitCode;
} catch {
	let e = $.exitCode();
	e === null && await ji(O.stderr, te(_("INTERNAL_ERROR"))).catch(() => void 0), O.exitCode = e ?? 3;
} finally {
	$.dispose();
}
//#endregion
export {};
