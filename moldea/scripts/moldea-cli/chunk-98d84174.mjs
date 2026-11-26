import { f as e, u as t } from "./chunk-2cc3bf5c.mjs";
//#region ../repository/dist/chunks/links-DPog2q0N.js
var n = {
	ABORTED: "The repository operation was aborted.",
	ACCESS_DENIED: "Access to the repository source was denied.",
	ENTRY_NOT_DIRECTORY: "The requested repository entry is not a directory.",
	ENTRY_NOT_FILE: "The requested repository entry is not a file.",
	ENTRY_NOT_FOUND: "The requested repository entry was not found.",
	ENTRY_NOT_LINK: "The requested repository entry is not a symlink.",
	INVALID_PAGE_REQUEST: "The repository page request is invalid.",
	INVALID_SOURCE_DATA: "The repository source returned invalid data.",
	PROVIDER_INCOMPLETE: "The repository provider cannot expose a complete result.",
	RESOURCE_LIMIT_EXCEEDED: "A named repository resource limit was exceeded.",
	SNAPSHOT_CHANGED: "The repository snapshot changed during the operation.",
	SOURCE_UNAVAILABLE: "The repository source is unavailable."
}, r = class extends e {
	code;
	constructor(e) {
		super("The repository path is invalid.", {
			code: "INVALID_REPOSITORY_PATH",
			cause: e?.cause
		}), this.code = "INVALID_REPOSITORY_PATH", this.name = "RepositoryPathException";
	}
}, i = class extends e {
	code;
	operation;
	path;
	resource;
	retryable;
	constructor(e) {
		super(n[e.code], {
			code: e.code,
			cause: e.cause
		}), this.code = e.code, this.name = "RepositorySourceException", this.operation = e.operation, this.path = e.path, this.resource = e.resource ?? null, this.retryable = e.retryable;
	}
}, a = [
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
], o = [
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
], s = (e, t) => e >>> t | e << 32 - t, c = (e, t, n, r) => {
	for (let e = 0; e < 16; e += 1) {
		let i = n + e * 4;
		r[e] = (t[i] ?? 0) << 24 | (t[i + 1] ?? 0) << 16 | (t[i + 2] ?? 0) << 8 | (t[i + 3] ?? 0);
	}
	for (let e = 16; e < 64; e += 1) {
		let t = r[e - 15] ?? 0, n = r[e - 2] ?? 0, i = s(t, 7) ^ s(t, 18) ^ t >>> 3, a = s(n, 17) ^ s(n, 19) ^ n >>> 10;
		r[e] = (r[e - 16] ?? 0) + i + (r[e - 7] ?? 0) + a >>> 0;
	}
	let i = e[0] ?? 0, a = e[1] ?? 0, c = e[2] ?? 0, l = e[3] ?? 0, u = e[4] ?? 0, d = e[5] ?? 0, f = e[6] ?? 0, p = e[7] ?? 0;
	for (let e = 0; e < 64; e += 1) {
		let t = s(u, 6) ^ s(u, 11) ^ s(u, 25), n = u & d ^ ~u & f, m = p + t + n + (o[e] ?? 0) + (r[e] ?? 0) >>> 0, h = (s(i, 2) ^ s(i, 13) ^ s(i, 22)) + (i & a ^ i & c ^ a & c) >>> 0;
		p = f, f = d, d = u, u = l + m >>> 0, l = c, c = a, a = i, i = m + h >>> 0;
	}
	e[0] = (e[0] ?? 0) + i >>> 0, e[1] = (e[1] ?? 0) + a >>> 0, e[2] = (e[2] ?? 0) + c >>> 0, e[3] = (e[3] ?? 0) + l >>> 0, e[4] = (e[4] ?? 0) + u >>> 0, e[5] = (e[5] ?? 0) + d >>> 0, e[6] = (e[6] ?? 0) + f >>> 0, e[7] = (e[7] ?? 0) + p >>> 0;
}, l = (e) => {
	let t = [...a], n = new Uint32Array(64), r = new Uint8Array(64), i = 0, o = 0n, s = (e) => {
		o += BigInt(e.byteLength);
		let a = 0;
		if (i > 0) {
			let o = Math.min(64 - i, e.byteLength);
			r.set(e.subarray(0, o), i), i += o, a = o, i === 64 && (c(t, r, 0, n), i = 0);
		}
		for (; a + 64 <= e.byteLength;) c(t, e, a, n), a += 64;
		a < e.byteLength && (r.set(e.subarray(a), 0), i = e.byteLength - a);
	};
	for (let t of e) {
		let e = BigInt(t.byteLength), n = new Uint8Array(8), r = new DataView(n.buffer);
		r.setUint32(0, Number(e >> 32n), !1), r.setUint32(4, Number(e & 4294967295n), !1), s(n), s(t);
	}
	let l = i < 56 ? 64 : 128, u = new Uint8Array(l);
	u.set(r.subarray(0, i)), u[i] = 128;
	let d = o * 8n, f = new DataView(u.buffer);
	f.setUint32(l - 8, Number(d >> 32n), !1), f.setUint32(l - 4, Number(d & 4294967295n), !1);
	for (let e = 0; e < l; e += 64) c(t, u, e, n);
	let p = new Uint8Array(32), m = new DataView(p.buffer);
	return t.forEach((e, t) => m.setUint32(t * 4, e, !1)), p;
}, u = (e) => {
	let t = l(e);
	return `sha256:${Array.from(t, (e) => e.toString(16).padStart(2, "0")).join("")}`;
}, d = new TextEncoder(), f = new Set([
	"checksum",
	"payload",
	"version"
]), p = (e) => {
	let t = JSON.stringify(e);
	return JSON.stringify({
		checksum: u([d.encode(t)]),
		payload: t,
		version: 1
	});
}, m = (e) => {
	let n = JSON.parse(e);
	if (!t(n, !0) || Reflect.ownKeys(n).some((e) => typeof e != "string" || !f.has(e)) || n.version !== 1 || typeof n.payload != "string" || typeof n.checksum != "string" || n.checksum !== u([d.encode(n.payload)])) throw TypeError("The repository cursor is invalid.");
	return JSON.parse(n.payload);
}, h = (e, t, n) => {
	if (!Number.isSafeInteger(e) || e <= 0) throw new i({
		code: "INVALID_PAGE_REQUEST",
		operation: t,
		path: n,
		retryable: !1
	});
	return e;
}, g = /^\/[A-Za-z]:/u, _ = (e) => {
	for (let t = 0; t < e.length; t += 1) {
		let n = e.charCodeAt(t);
		if (n <= 31 || n === 127) return !0;
	}
	return !1;
}, v = (e) => typeof e != "string" || !e.isWellFormed() ? !1 : e === "/" ? !0 : !e.startsWith("/") || e.startsWith("//") || e.endsWith("/") || e.includes("\\") || _(e) || g.test(e) ? !1 : e.slice(1).split("/").every((e) => e !== "" && e !== "." && e !== ".."), y = (e) => {
	if (!v(e)) throw new r();
	return e;
}, b = (e, t) => {
	let n = e.split("/"), r = t.split("/"), i = Math.min(n.length, r.length);
	for (let e = 0; e < i; e += 1) {
		let t = n[e] ?? "", i = r[e] ?? "";
		if (t < i) return -1;
		if (t > i) return 1;
	}
	return n.length - r.length;
}, x = y("/"), S = new Set([
	"baseCursor",
	"baseSnapshotId",
	"candidateCursor",
	"candidateSnapshotId",
	"pendingFile"
]), C = new Set(["offset", "path"]), w = (e) => {
	if (e?.aborted) throw new i({
		cause: e.reason,
		code: "ABORTED",
		operation: "list-changes-page",
		path: null,
		retryable: !1
	});
}, T = (e) => new i({
	cause: e,
	code: "INVALID_PAGE_REQUEST",
	operation: "list-changes-page",
	path: null,
	retryable: !1
}), E = (e, t, n) => {
	if (e === void 0) return {
		baseCursor: null,
		baseSnapshotId: t,
		candidateCursor: null,
		candidateSnapshotId: n,
		pendingFile: null
	};
	try {
		let r = m(e);
		if (typeof r != "object" || !r || Reflect.ownKeys(r).some((e) => typeof e != "string" || !S.has(e)) || r.baseSnapshotId !== t || r.candidateSnapshotId !== n || typeof r.baseCursor != "string" && r.baseCursor !== null || typeof r.candidateCursor != "string" && r.candidateCursor !== null || r.pendingFile !== null && (typeof r.pendingFile != "object" || Reflect.ownKeys(r.pendingFile).some((e) => typeof e != "string" || !C.has(e)) || typeof r.pendingFile.path != "string" || !Number.isSafeInteger(r.pendingFile.offset) || r.pendingFile.offset < 0)) throw Error("invalid comparison cursor");
		return r;
	} catch (e) {
		throw T(e);
	}
}, D = (e, t) => {
	throw new i({
		cause: t,
		code: "INVALID_SOURCE_DATA",
		operation: "list-changes-page",
		path: e,
		retryable: !1
	});
}, O = async (e, t, n) => {
	if (t === "") return null;
	let r = await e.listEntriesPage({
		...t === null ? {} : { cursor: t },
		maxEntries: 1,
		prefix: x,
		...n === void 0 ? {} : { signal: n }
	});
	if (r.snapshot.id !== e.snapshot.id || r.entries.length > 1) throw T();
	let i = r.entries[0];
	if (i === void 0) {
		if (!r.isComplete || r.nextCursor !== null) throw T();
		return null;
	}
	if (!r.isComplete && r.nextCursor === null) throw T();
	return {
		cursorAfter: r.nextCursor ?? "",
		entry: i
	};
}, k = (e, t, n) => {
	if (e.type !== t.type) return {
		baseEntry: e,
		candidateEntry: t,
		kind: "type-changed",
		path: e.path
	};
	if (e.type !== "file") return null;
	if (e.byteLength !== null && t.byteLength !== null && e.byteLength !== t.byteLength) return {
		baseEntry: e,
		candidateEntry: t,
		kind: "modified",
		path: e.path
	};
	if (n && e.contentIdentity !== null && t.contentIdentity !== null && e.contentIdentity === t.contentIdentity || e.byteLength === 0 && t.byteLength === 0) return null;
}, A = (e, t, n, r, i) => {
	let a = r + e.bytes.byteLength;
	(!(e.bytes instanceof Uint8Array) || e.bytes.byteLength > i || e.offset !== r || e.snapshot.id !== n || !Number.isSafeInteger(e.totalBytes) || e.totalBytes < r || a > e.totalBytes || t.byteLength !== null && e.totalBytes !== t.byteLength || e.isComplete !== (a === e.totalBytes) || e.nextOffset !== (e.isComplete ? null : a) || !e.isComplete && e.bytes.byteLength === 0) && D(t.path);
}, j = async (e, t, n, r, i, a, o) => {
	let s = Math.floor(a / 2);
	if (s < 1) return {
		bytesRead: 0,
		isComplete: !1,
		isEqual: !0,
		nextOffset: i
	};
	let c = await e.readFilePage(n.path, {
		maxBytes: s,
		offset: i,
		...o === void 0 ? {} : { signal: o }
	});
	A(c, n, e.snapshot.id, i, s);
	let l = c.bytes.byteLength, u = i, d = 0, f = null, p = Math.max(c.bytes.byteLength, 1);
	for (; d < p;) {
		let e = p - d, n = await t.readFilePage(r.path, {
			maxBytes: e,
			offset: u,
			...o === void 0 ? {} : { signal: o }
		});
		if (A(n, r, t.snapshot.id, u, e), f = n.totalBytes, l += n.bytes.byteLength, c.totalBytes !== n.totalBytes) return {
			bytesRead: l,
			isComplete: !0,
			isEqual: !1,
			nextOffset: i
		};
		for (let e = 0; e < n.bytes.byteLength; e += 1) if (c.bytes[d + e] !== n.bytes[e]) return {
			bytesRead: l,
			isComplete: !0,
			isEqual: !1,
			nextOffset: i
		};
		if (d += n.bytes.byteLength, u += n.bytes.byteLength, n.isComplete) break;
	}
	f === null && D(r.path);
	let m = i + c.bytes.byteLength, h = m === c.totalBytes && m === f;
	return {
		bytesRead: l,
		isComplete: h,
		isEqual: !0,
		nextOffset: m
	};
}, M = class {
	baseSnapshot;
	candidateSnapshot;
	#e;
	#t;
	constructor(e, t) {
		this.#e = e, this.#t = t, this.baseSnapshot = e.snapshot, this.candidateSnapshot = t.snapshot;
	}
	async listChangesPage(e) {
		let t = h(e.maxChanges, "list-changes-page", null), n = h(e.maxEntriesVisited, "list-changes-page", null), r = h(e.maxBytesRead, "list-changes-page", null);
		if (r < 2) throw T();
		w(e.signal);
		let i = E(e.cursor, this.baseSnapshot.id, this.candidateSnapshot.id), a = i.baseCursor, o = i.candidateCursor, s = i.pendingFile, c = [], l = 0, u = 0, d, f;
		for (; u < n && c.length < t && (w(e.signal), [d, f] = await Promise.all([d === void 0 ? O(this.#e, a, e.signal) : Promise.resolve(d), f === void 0 ? O(this.#t, o, e.signal) : Promise.resolve(f)]), d === null && (a = ""), f === null && (o = ""), d !== null || f !== null);) {
			let t = d?.entry, n = f?.entry;
			if (s !== null && (t?.path !== s.path || n?.path !== s.path)) throw T();
			if (n === void 0 || t !== void 0 && b(t.path, n.path) < 0) c.push({
				baseEntry: t ?? null,
				candidateEntry: null,
				kind: "deleted",
				path: t?.path ?? x
			}), a = d?.cursorAfter ?? "", d = void 0;
			else if (t === void 0 || b(n.path, t.path) < 0) c.push({
				baseEntry: null,
				candidateEntry: n,
				kind: "added",
				path: n.path
			}), o = f?.cursorAfter ?? "", f = void 0;
			else {
				let i = k(t, n, this.baseSnapshot.sourceKind === this.candidateSnapshot.sourceKind);
				if (i !== void 0) i !== null && c.push(i), a = d?.cursorAfter ?? "", o = f?.cursorAfter ?? "", d = void 0, f = void 0, s = null;
				else if (r - l < 2) break;
				else {
					let i = await j(this.#e, this.#t, t, n, s?.offset ?? 0, r - l, e.signal);
					l += i.bytesRead, i.isEqual || c.push({
						baseEntry: t,
						candidateEntry: n,
						kind: "modified",
						path: t.path
					}), i.isComplete ? (a = d?.cursorAfter ?? "", o = f?.cursorAfter ?? "", d = void 0, f = void 0, s = null) : s = {
						offset: i.nextOffset,
						path: t.path
					};
				}
			}
			if (u += 1, s !== null) break;
		}
		let m = a === "" && o === "" && s === null, g = m ? null : p({
			baseCursor: a,
			baseSnapshotId: this.baseSnapshot.id,
			candidateCursor: o,
			candidateSnapshotId: this.candidateSnapshot.id,
			pendingFile: s
		});
		return {
			baseSnapshot: this.baseSnapshot,
			bytesRead: l,
			candidateSnapshot: this.candidateSnapshot,
			changes: c,
			entriesVisited: u,
			isComplete: m,
			nextCursor: g
		};
	}
}, N = async (e, t, n) => {
	if (n?.signal?.aborted) throw new i({
		cause: n.signal.reason,
		code: "ABORTED",
		operation: "create-comparison",
		path: null,
		retryable: !1
	});
	return await Promise.resolve(), new M(e, t);
}, P = 4096, F = /^[A-Za-z]:/u, I = (e, t) => {
	if (t === null || t === "") return { kind: "unsupported" };
	if (t.startsWith("/") || F.test(t)) return { kind: "outside" };
	let n = t.split("/");
	if (n.at(-1) === "") return { kind: "unsupported" };
	let r = n.filter((e) => e !== "" && e !== "."), i = e.split("/").slice(1, -1), a = 0;
	for (; r[a] === "..";) {
		if (i.length === 0) return { kind: "outside" };
		i.pop(), a += 1;
	}
	let o = r.slice(a);
	if (o.includes("..")) return { kind: "unsupported" };
	let s = `/${[...i, ...o].join("/")}`;
	return v(s) ? {
		kind: "path",
		path: s
	} : { kind: "unsupported" };
}, L = async (e, t, n) => {
	let r = new Set(), i = y(t);
	for (let t = 0;; t += 1) {
		if (r.has(i)) return { state: "loop" };
		r.add(i);
		let a = await e.getEntry(i, n);
		if (a === null) return { state: "missing" };
		if (a.type === "file") return {
			state: "file",
			targetPath: i
		};
		if (a.type !== "symlink") return { state: "not-file" };
		if (t === 32) return { state: "loop" };
		let o = I(i, await e.readLinkText(i, n));
		if (o.kind !== "path") return { state: o.kind };
		i = o.path;
	}
};
//#endregion
export { b as a, v as c, i, y as l, x as n, N as o, r, u as s, P as t, L as u };
