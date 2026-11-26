import { u as e } from "./chunk-2cc3bf5c.mjs";
import { c as t, i as n, l as r } from "./chunk-98d84174.mjs";
import { Buffer as i } from "node:buffer";
//#region ../core/dist/chunks/repository-rpc-DVgCPLGx.js
var a = () => {
	throw new n({
		code: "INVALID_SOURCE_DATA",
		operation: "create-reader",
		path: null,
		retryable: !1
	});
}, o = (e) => typeof e == "number" && Number.isSafeInteger(e) && e >= 0, s = (e, t) => Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t)), c = (t) => !e(t, !0) || !s(t, ["id", "sourceKind"]) || typeof t.id != "string" || t.id.length === 0 || typeof t.sourceKind != "string" || t.sourceKind.length === 0 ? a() : {
	id: t.id,
	sourceKind: t.sourceKind
}, l = (n) => {
	if (n === null) return null;
	if (!e(n, !0)) return a();
	let r = n;
	return !s(r, [
		"path",
		"type",
		"byteLength",
		"contentIdentity"
	]) || !t(r.path) || r.type !== "file" && r.type !== "directory" && r.type !== "symlink" || r.byteLength !== null && !o(r.byteLength) || r.contentIdentity !== null && typeof r.contentIdentity != "string" ? a() : {
		path: r.path,
		type: r.type,
		byteLength: r.byteLength,
		contentIdentity: r.contentIdentity
	};
}, u = (t) => {
	if (!e(t, !0)) return a();
	let n = t;
	if (!s(n, [
		"entries",
		"isComplete",
		"nextCursor",
		"snapshot"
	]) || !Array.isArray(n.entries) || n.entries.length > 128 || typeof n.isComplete != "boolean" || n.nextCursor !== null && typeof n.nextCursor != "string") return a();
	let r = [];
	for (let e of n.entries) {
		let t = l(e);
		if (t === null) return a();
		r.push(t);
	}
	return {
		entries: r,
		isComplete: n.isComplete,
		nextCursor: n.nextCursor,
		snapshot: c(n.snapshot)
	};
}, d = (e) => e === null ? null : typeof e != "string" || i.byteLength(e, "utf8") > 4096 ? a() : e, f = (t) => {
	if (!e(t, !0)) return a();
	let n = t;
	if (!s(n, [
		"bytes",
		"isComplete",
		"nextOffset",
		"offset",
		"snapshot",
		"totalBytes"
	]) || typeof n.bytes != "string" || n.bytes.length > 87384 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(n.bytes) || typeof n.isComplete != "boolean" || !o(n.offset) || !o(n.totalBytes) || n.nextOffset !== null && !o(n.nextOffset)) return a();
	let r = i.from(n.bytes, "base64");
	return r.byteLength > 65536 || r.toString("base64") !== n.bytes ? a() : {
		bytes: r,
		isComplete: n.isComplete,
		nextOffset: n.nextOffset,
		offset: n.offset,
		snapshot: c(n.snapshot),
		totalBytes: n.totalBytes
	};
}, p = (e, t) => {
	if (!(e.bytes instanceof Uint8Array) || e.bytes.byteLength > t) return a();
	let n = {
		...e,
		bytes: i.from(e.bytes.buffer, e.bytes.byteOffset, e.bytes.byteLength).toString("base64")
	};
	return f(n), n;
}, m = async (e, t, n) => {
	let i = (t) => t === "repository" ? e.repository : e.instructions ?? a();
	if (t.method === "readLinkText") return d(await i(t.source).readLinkText(r(t.path), { signal: n }));
	if (t.method === "getEntry") return l(await i(t.source).getEntry(r(t.path), { signal: n }));
	let o = e.repository;
	return t.method === "listEntriesPage" ? u(await o.listEntriesPage({
		maxEntries: t.maxEntries,
		signal: n,
		...t.prefix === void 0 ? {} : { prefix: r(t.prefix) },
		...t.cursor === void 0 ? {} : { cursor: t.cursor }
	})) : p(await i(t.source).readFilePage(r(t.path), {
		maxBytes: t.maxBytes,
		offset: t.offset,
		signal: n
	}), t.maxBytes);
};
//#endregion
export { d as a, f as i, l as n, u as r, m as t };
