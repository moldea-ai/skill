import { d as e, f as t, m as n, n as r, u as i } from "./chunk-2cc3bf5c.mjs";
import { a, c as o, d as s, f as c, g as l, h as u, i as d, l as f, o as p, p as m, r as h, s as g, t as _, u as v } from "./chunk-8f198616.mjs";
import { a as y, c as b, i as x, l as S, n as C, s as w, u as ee } from "./chunk-98d84174.mjs";
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/marked-region.js
var te = "﻿", T = (n) => {
	throw new t(n, { code: e.INVALID_MARKED_REGION });
}, ne = ({ start: e, end: t }) => {
	for (let n of [e, t]) (typeof n != "string" || n === "" || /[\r\n]/.test(n)) && T("Each region marker must be a non-empty single line.");
	(e.includes(t) || t.includes(e)) && T("Neither region marker may contain the other.");
}, re = (e, t) => {
	ne(t);
	let n, r, i = 0;
	for (; i < e.length;) {
		let a = e.indexOf("\n", i), o = a === -1 ? e.length : a + 1, s = a > i && e[a - 1] === "\r", c = a === -1 ? e.length : a - +!!s, l = i === 0 && e.startsWith(te) ? 1 : i, u = e.slice(l, c);
		for (let e of ["start", "end"]) u.includes(t[e]) && (u !== t[e] && T(`The ${e} marker must fill its whole line.`), e === "start" ? ((n !== void 0 || r !== void 0) && T("The document must hold one start marker, before one end marker."), n = {
			offset: l,
			lineEnding: s ? "\r\n" : "\n"
		}) : (r !== void 0 && T("The document must hold one end marker."), r = o));
		i = o;
	}
	return n === void 0 && r === void 0 ? null : n === void 0 || r === void 0 ? T("The document must hold both region markers, or neither.") : {
		start: n.offset,
		end: r,
		lineEnding: n.lineEnding
	};
}, ie = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, ae = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/u, oe = [
	"\n",
	"\r",
	"",
	"\u2028",
	"\u2029"
], se = /[!?[\]{}]/u, ce = (e) => oe.some((t) => e.includes(t)), E = (e) => e >= 9 && e <= 13 || e === 32 || e === 133 || e === 160 || e === 5760 || e >= 8192 && e <= 8202 || e === 8232 || e === 8233 || e === 8239 || e === 8287 || e === 12288, D = (e) => {
	let t = e[Symbol.iterator](), n = 0;
	for (; t.next().done !== !0;) n += 1;
	return n;
}, O = (e) => {
	for (let t of e) if (!E(t.codePointAt(0) ?? 0)) return !0;
	return !1;
}, le = (e) => {
	let t = e.codePointAt(0), n = e.codePointAt(e.length - 1);
	return t !== void 0 && E(t) || n !== void 0 && E(n);
}, ue = (e) => {
	let t = 0, n = e.length;
	for (; t < n;) {
		let n = e.codePointAt(t);
		if (n === void 0 || !E(n)) break;
		t += n > 65535 ? 2 : 1;
	}
	for (; n > t;) {
		let t = e.codePointAt(n - 1);
		if (t === void 0 || !E(t)) break;
		--n;
	}
	return e.slice(t, n);
}, de = (e) => e.length > 0 && !ce(e), fe = (e) => e.length <= 64 && ie.test(e), pe = (e) => ae.test(e), me = (e) => {
	let t = D(e);
	return t >= 1 && t <= 1e3 && !le(e) && !ce(e) && !e.includes("\0");
}, k = (e) => e !== "/" && b(e) ? S(e) : null, he = (e) => e === "/moldea/moldea.yaml", A = (e) => {
	let t = /^\/moldea\/decisions\/(\d{13})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u.exec(e), n = t?.[1], r = t?.[2];
	return n !== void 0 && r !== void 0 && fe(r) ? n : null;
}, ge = (e, t) => t && e === "/moldea/project.md" ? !0 : e.startsWith("/moldea/context/") && e.endsWith(".md"), _e = (e) => A(e) !== null, ve = (e) => e !== "/moldea" && !e.startsWith("/moldea/"), ye = (e) => se.test(e), be = (e) => ye(e) || e.includes("***") || e.slice(1).split("/").some((e) => e.includes("**") && e !== "**") ? !1 : e.includes("*") && b(e.replaceAll("*", "x")), xe = (e) => de(e) && !e.includes("\0"), Se = (e) => e === "/moldea" || e.startsWith("/moldea/"), Ce = new TextEncoder(), we = new TextDecoder("utf-8", {
	fatal: !0,
	ignoreBOM: !0
}), Te = (e, t, n) => {
	let r = 1, i = 1, a = 0;
	for (let o of e) o === "\0" && n.add({
		code: "MOLDEA_TEXT_NUL_FORBIDDEN",
		path: t,
		range: {
			end: {
				column: r + 1,
				line: i,
				offset: a + 1
			},
			start: {
				column: r,
				line: i,
				offset: a
			}
		}
	}), o === "\n" ? (r = 1, i += 1) : r += 1, a += 1;
}, Ee = (e) => {
	throw new r({
		code: "INVALID_ARGUMENT",
		operation: e
	});
}, De = (e, t, n, i) => {
	if (!(e <= t[i])) throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: i,
		limitMaximum: t[i],
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: e,
		operation: n
	});
}, Oe = (e) => m({
	diagnostics: [...e],
	text: null,
	valid: !1
}), ke = (e, t, n, r, a) => {
	if (!i(e, !0)) return Ee(n);
	let o = e.path, s = e.content;
	if (typeof o != "string" || typeof s != "string" && !(s instanceof Uint8Array)) return Ee(n);
	let c = S(o);
	if (typeof s == "string") return De(l(s, t[r]), t, n, r), s.isWellFormed() ? {
		path: c,
		value: s
	} : (a.add({
		code: "MOLDEA_TEXT_INVALID_UNICODE",
		path: c
	}), Oe(a.finalize()));
	De(s.byteLength, t, n, r);
	let u = new Uint8Array(s);
	try {
		return {
			path: c,
			value: we.decode(u)
		};
	} catch {
		return a.add({
			code: "MOLDEA_TEXT_INVALID_UTF8",
			path: c
		}), Oe(a.finalize());
	}
}, j = (e, t, n, r = "maxFileBytes") => {
	let i = d(t, n), a = ke(e, t, n, r, i);
	if ("valid" in a) return a;
	let o = (a.value.startsWith("﻿") ? a.value.slice(1) : a.value).replace(/\r\n?/gu, "\n");
	if (Te(o, a.path, i), i.size > 0) return Oe(i.finalize());
	let s = m({
		scalarLength: D(o),
		utf8ByteLength: l(o),
		value: o
	});
	return m({
		diagnostics: [],
		text: s,
		valid: !0
	});
}, Ae = (e) => {
	let t = "";
	for (let n of e) t += n.toString(16).padStart(2, "0");
	return t;
}, M = async (e) => {
	let t = Ce.encode(e.value);
	return `sha256:${Ae(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", t)))}`;
}, je = async (e, t) => {
	let n = j(e, t, "calculate-content-digest");
	if (!n.valid || n.text === null) return m({
		diagnostics: n.diagnostics,
		digest: null,
		text: null,
		valid: !1
	});
	let r = await M(n.text);
	return m({
		diagnostics: [],
		digest: r,
		text: n.text,
		valid: !0
	});
}, Me = (e, t) => {
	let n = 0, r = 0, i = -1, a = -1;
	for (; r < t.length;) {
		if (e[n] === t[r]) {
			n += 1, r += 1;
			continue;
		}
		if (e[n] === "*") {
			i = n, a = r, n += 1;
			continue;
		}
		if (i === -1) return !1;
		n = i + 1, a += 1, r = a;
	}
	for (; e[n] === "*";) n += 1;
	return n === e.length;
}, Ne = (e, t) => {
	let n = t.slice(1).split("/"), r = new Uint8Array(n.length + 1);
	r[0] = 1;
	for (let t of e) {
		let e = new Uint8Array(n.length + 1);
		if (t === "**") {
			let t = !1;
			for (let n = 0; n < r.length; n += 1) t ||= r[n] === 1, e[n] = +!!t;
		} else for (let i = 0; i < n.length; i += 1) r[i] === 1 && Me(t, n[i] ?? "") && (e[i + 1] = 1);
		r = e;
	}
	return r[n.length] === 1;
}, N = (e, t) => `${e}/${g(t)}`, Pe = (e, t, n = null) => ({
	agentId: n,
	id: t,
	kind: e
}), Fe = (e, t) => u(e.kind, t.kind) || u(e.agentId ?? "", t.agentId ?? "") || u(e.id, t.id), Ie = (e) => e.kind === "exact" ? e.path : e.pattern, Le = (e, t) => Fe(e.owner, t.owner) || u(e.field, t.field) || u(Ie(e.declaration), Ie(t.declaration)) || u(e.pointer, t.pointer), P = (e, t, n, r, i) => {
	e.push({
		declaration: typeof i == "string" ? {
			kind: "exact",
			path: i,
			symbol: null
		} : {
			kind: "exact",
			path: i.path,
			symbol: i.symbol ?? null
		},
		field: n,
		owner: t,
		pointer: r
	});
}, Re = (e, t, n, r, i) => {
	for (let [a, o] of (t ?? []).entries()) P(e, n, r, N(i, String(a)), o);
}, ze = (e, t, n, r) => {
	for (let [i, a] of (t ?? []).entries()) e.push({
		declaration: a.includes("*") ? {
			kind: "glob",
			pattern: a
		} : {
			kind: "exact",
			path: a,
			symbol: null
		},
		field: "affectedBy",
		owner: n,
		pointer: N(r, String(i))
	});
}, Be = (e, t, n, r, i) => {
	let a = Pe(n.kind, t, r);
	if (P(e, a, "implementation", N(i, "implementation"), n.value.implementation), n.value.registration !== void 0 && P(e, a, "registration", N(i, "registration"), n.value.registration), n.kind === "tool") for (let t of ["inputSchema", "outputSchema"]) {
		let r = n.value[t];
		r !== void 0 && P(e, a, t, N(i, t), r);
	}
	ze(e, n.value.affectedBy, a, N(i, "affectedBy"));
}, Ve = (e, t, n) => {
	let r = N("/agents", t), i = Pe("agent", t, t), a = N(r, "bindings");
	for (let t of [
		"runtimeAgent",
		"inputSchema",
		"outputSchema",
		"instructionLoader"
	]) {
		let r = n.bindings?.[t];
		r !== void 0 && P(e, i, t, N(a, t), r);
	}
	ze(e, n.affectedBy, i, N(r, "affectedBy"));
	for (let i of Object.keys(n.tools ?? {}).sort(u)) {
		let a = n.tools?.[i];
		a !== void 0 && Be(e, i, {
			kind: "tool",
			value: a
		}, t, N(N(r, "tools"), i));
	}
	for (let i of Object.keys(n.skills ?? {}).sort(u)) {
		let a = n.skills?.[i];
		a !== void 0 && Be(e, i, {
			kind: "skill",
			value: a
		}, t, N(N(r, "skills"), i));
	}
	for (let [t, a] of (n.mirrors ?? []).entries()) P(e, i, "mirrors", N(N(r, "mirrors"), String(t)), a);
}, He = (e) => {
	let t = [];
	for (let n of ["context", "decision"]) {
		let r = n === "context" ? e.context : e.decisions;
		for (let e of Object.keys(r ?? {}).sort(u)) {
			let i = r?.[e];
			if (i === void 0) continue;
			let a = Pe(n, e), o = N(n === "context" ? "/context" : "/decisions", e);
			Re(t, i.bindings, a, "bindings", N(o, "bindings")), ze(t, i.affectedBy, a, N(o, "affectedBy"));
		}
	}
	for (let n of Object.keys(e.agents ?? {}).sort(u)) {
		let r = e.agents?.[n];
		r !== void 0 && Ve(t, n, r);
	}
	return t.sort(Le);
}, Ue = (e, t) => {
	let n = He(e);
	if (n.length > t.maxEntries) throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxEntries",
		limitMaximum: t.maxEntries,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: n.length,
		operation: "match-manifest-scope"
	});
	let i = new Map(), a = [], o = new Map();
	for (let e of n) {
		if (e.declaration.kind === "exact") {
			let t = i.get(e.declaration.path) ?? [];
			t.push(e), i.set(e.declaration.path, t);
			continue;
		}
		let t = e.declaration.pattern.slice(1).split("/"), n = {
			declaration: e,
			segments: t
		}, r = t[0] ?? "";
		if (r === "**" || r.includes("*")) a.push(n);
		else {
			let e = o.get(r) ?? [];
			e.push(n), o.set(r, e);
		}
	}
	return {
		declarations: n,
		exact: i,
		globalGlobs: a,
		globsByFirstSegment: o
	};
}, We = (e, t) => Fe(e.owner, t.owner) || u(e.field, t.field) || u(Ie(e.declaration), Ie(t.declaration)) || u(e.inputPath, t.inputPath) || u(e.pointer, t.pointer), Ge = (e, t) => ({
	declaration: t.declaration,
	field: t.field,
	inputPath: e,
	owner: t.owner,
	pointer: t.pointer
}), Ke = (e, t, n, i) => {
	if (e.length >= i.maxEntries) throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxEntries",
		limitMaximum: i.maxEntries,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: e.length + 1,
		operation: "match-manifest-scope"
	});
	e.push(Ge(t, n));
}, qe = (e, t, n, r) => {
	for (let i of n) Ne(i.segments, t) && Ke(e, t, i.declaration, r);
}, Je = async (e) => {
	let t = e.join("\0");
	return M({
		scalarLength: D(t),
		utf8ByteLength: l(t),
		value: t
	});
}, Ye = (e, t, n) => {
	let r = Ue(e, n), i = [], a = new Set(), o = new Set();
	for (let e of t) {
		let t = e.slice(1).split("/", 1)[0] ?? "", a = r.exact.get(e) ?? [];
		for (let t of a) Ke(i, e, t, n);
		qe(i, e, r.globalGlobs, n), qe(i, e, r.globsByFirstSegment.get(t) ?? [], n);
	}
	i.sort(We);
	for (let e of i) a.add(`${e.owner.kind}\0${e.owner.agentId ?? ""}\0${e.owner.id}`), o.add(e.inputPath);
	return m({
		counts: {
			declarations: r.declarations.length,
			inputPaths: t.length,
			matchedOwners: a.size,
			matchedPaths: o.size,
			matches: i.length
		},
		matches: i
	});
}, F = (e, t) => `${e}/${g(t)}`, I = (e, t, n, r, i = null) => {
	e.diagnostics.add({
		code: "MOLDEA_MANIFEST_VALUE_INVALID",
		details: { reason: r },
		entity: i,
		path: e.path,
		pointer: t,
		range: n
	});
}, L = (e, t, n, r, i = null) => {
	if (e.kind !== "mapping") return I(r, t, e.range, "mapping-required", i), null;
	let a = new Map();
	for (let o of e.entries) {
		if (o.key.kind !== "scalar" || typeof o.key.value != "string") {
			I(r, t, o.key.range, "string-key-required", i);
			continue;
		}
		let e = o.key.value;
		if (n !== null && !n.has(e)) {
			r.diagnostics.add({
				code: "MOLDEA_MANIFEST_PROPERTY_UNKNOWN",
				entity: i,
				path: r.path,
				pointer: F(t, e),
				range: o.key.range
			});
			continue;
		}
		a.set(e, {
			key: o.key,
			value: o.value
		});
	}
	return a;
}, Xe = (e, t, n, r = {}) => {
	if (e === void 0) return r.required === !0 && I(n, t, null, "required", r.entity ?? null), null;
	if (e.value.kind !== "scalar" || typeof e.value.value != "string") return I(n, t, e.value.range, "string-required", r.entity ?? null), null;
	let i = e.value.value;
	return !O(i) || r.singleLine === !0 && !de(i) ? (I(n, t, e.value.range, "string-invalid", r.entity ?? null), null) : i;
}, Ze = (e, t, n, r, i = null) => fe(e) ? !pe(e) || (r.diagnostics.add({
	code: "MOLDEA_ID_RESERVED",
	entity: i,
	path: r.path,
	pointer: n,
	range: t
}), !1) : (r.diagnostics.add({
	code: "MOLDEA_ID_INVALID",
	entity: i,
	path: r.path,
	pointer: n,
	range: t
}), !1), Qe = (e, t, n, r = null) => {
	let i = L(e, t, new Set(["path", "symbol"]), n, r);
	if (i === null) return null;
	let a = i.get("path");
	if (a?.value.kind !== "scalar" || typeof a.value.value != "string") return n.diagnostics.add({
		code: "MOLDEA_PATH_INVALID",
		details: { reason: a === void 0 ? "missing" : "type" },
		entity: r,
		path: n.path,
		pointer: F(t, "path"),
		range: a?.value.range ?? null
	}), null;
	let o = k(a.value.value);
	if (o === null) return n.diagnostics.add({
		code: "MOLDEA_PATH_INVALID",
		entity: r,
		path: n.path,
		pointer: F(t, "path"),
		range: a.value.range
	}), null;
	let s = i.get("symbol");
	return s === void 0 ? { path: o } : s.value.kind !== "scalar" || typeof s.value.value != "string" || !xe(s.value.value) ? (n.diagnostics.add({
		code: "MOLDEA_SYMBOL_INVALID",
		entity: r,
		path: n.path,
		pointer: F(t, "symbol"),
		range: s.value.range
	}), null) : Se(o) ? (n.diagnostics.add({
		code: "MOLDEA_SYMBOL_FORBIDDEN",
		entity: r,
		path: n.path,
		pointer: F(t, "symbol"),
		range: s.value.range
	}), null) : {
		path: o,
		symbol: s.value.value
	};
}, $e = (e, t, n, r = null) => {
	if (e.kind !== "sequence" || e.items.length === 0) return I(n, t, e.range, "non-empty-sequence-required", r), [];
	let i = [], a = new Set();
	return e.items.forEach((e, o) => {
		let s = Qe(e, F(t, String(o)), n, r);
		if (s === null) return;
		let c = `${s.path}\0${s.symbol ?? ""}`;
		if (a.has(c)) {
			n.diagnostics.add({
				code: "MOLDEA_PATH_DUPLICATE",
				entity: r,
				path: n.path,
				pointer: F(t, String(o)),
				range: e.range
			});
			return;
		}
		a.add(c), i.push(s);
	}), i;
}, et = (e, t, n, r = null) => {
	if (e.kind !== "sequence" || e.items.length === 0) return I(n, t, e.range, "non-empty-sequence-required", r), [];
	let i = [], a = new Set();
	return e.items.forEach((e, o) => {
		let s = F(t, String(o));
		if (e.kind !== "scalar" || typeof e.value != "string") {
			I(n, s, e.range, "string-required", r);
			return;
		}
		let c = e.value.includes("*") || ye(e.value);
		if (!(c ? be(e.value) : k(e.value) !== null)) {
			n.diagnostics.add({
				code: c ? "MOLDEA_GLOB_INVALID" : "MOLDEA_PATH_INVALID",
				entity: r,
				path: n.path,
				pointer: s,
				range: e.range
			});
			return;
		}
		if (a.has(e.value)) {
			n.diagnostics.add({
				code: c ? "MOLDEA_PATTERN_DUPLICATE" : "MOLDEA_PATH_DUPLICATE",
				entity: r,
				path: n.path,
				pointer: s,
				range: e.range
			});
			return;
		}
		a.add(e.value), i.push(e.value);
	}), i;
}, tt = (e, t, n) => {
	let r = L(e, t, new Set(["affectedBy", "bindings"]), n);
	if (r === null) return null;
	let i = r.get("bindings"), a = r.get("affectedBy");
	return i === void 0 && a === void 0 && n.diagnostics.add({
		code: "MOLDEA_CONTEXT_RELATIONSHIP_EMPTY",
		path: n.path,
		pointer: t,
		range: e.range
	}), {
		...i === void 0 ? {} : { bindings: $e(i.value, F(t, "bindings"), n) },
		...a === void 0 ? {} : { affectedBy: et(a.value, F(t, "affectedBy"), n) }
	};
}, nt = (e, t, n, r) => {
	let i = L(e, t, null, r);
	if (i === null) return null;
	let a = [];
	for (let [e, o] of [...i].sort(([e], [t]) => u(e, t))) {
		let i = k(e);
		if (!(i !== null && (n === "context" ? ge(i, !0) : _e(i)))) {
			r.diagnostics.add({
				code: n === "context" ? "MOLDEA_CONTEXT_PATH_INVALID" : "MOLDEA_DECISION_FILENAME_INVALID",
				path: r.path,
				pointer: F(t, e),
				range: o.key.range
			});
			continue;
		}
		let s = tt(o.value, F(t, e), r);
		s !== null && a.push([e, s]);
	}
	return p(a);
}, rt = (e, t, n, r, i) => {
	if (e.kind !== "sequence") return I(r, t, e.range, "sequence-required", i), [];
	let a = [], o = new Set();
	return e.items.forEach((e, s) => {
		let c = F(t, String(s));
		if (e.kind !== "scalar" || typeof e.value != "string") {
			I(r, c, e.range, "string-required", i);
			return;
		}
		let l = k(e.value);
		if (!(l !== null && (n === "context" ? ge(l, !1) : n === "decision" ? _e(l) : ve(l))) || l === null) {
			let t = n === "context" ? "MOLDEA_CONTEXT_PATH_INVALID" : n === "decision" ? "MOLDEA_DECISION_FILENAME_INVALID" : l !== null && !ve(l) ? "MOLDEA_MIRROR_PATH_INSIDE_MOLDEA" : "MOLDEA_MIRROR_PATH_INVALID";
			r.diagnostics.add({
				code: t,
				entity: i,
				path: r.path,
				pointer: c,
				range: e.range
			});
			return;
		}
		if (o.has(l)) {
			r.diagnostics.add({
				code: n === "mirror" ? "MOLDEA_MIRROR_PATH_DUPLICATE" : "MOLDEA_PATH_DUPLICATE",
				entity: i,
				path: r.path,
				pointer: c,
				range: e.range
			});
			return;
		}
		if (n === "mirror" && r.mirrorPaths.has(l)) {
			r.diagnostics.add({
				code: "MOLDEA_MIRROR_PATH_DUPLICATE",
				entity: i,
				path: r.path,
				pointer: c,
				range: e.range
			});
			return;
		}
		o.add(l), n === "mirror" && r.mirrorPaths.add(l), a.push(l);
	}), a;
}, it = (e, t, n, r) => {
	let i = { agentId: r }, a = L(e, t, new Set([
		"inputSchema",
		"instructionLoader",
		"outputSchema",
		"runtimeAgent"
	]), n, i);
	if (a === null) return null;
	let o = (e) => {
		let r = a.get(e);
		return r === void 0 ? null : Qe(r.value, F(t, e), n, i);
	}, s = o("inputSchema"), c = o("instructionLoader"), l = o("outputSchema"), u = o("runtimeAgent");
	return {
		...u === null ? {} : { runtimeAgent: u },
		...s === null ? {} : { inputSchema: s },
		...l === null ? {} : { outputSchema: l },
		...c === null ? {} : { instructionLoader: c }
	};
}, at = (e, t, n, r, i, a) => {
	let o = {
		agentId: r,
		capabilityId: i,
		capabilityKind: a
	}, s = L(e, t, a === "tool" ? new Set([
		"affectedBy",
		"description",
		"implementation",
		"inputSchema",
		"name",
		"outputSchema",
		"registration"
	]) : new Set([
		"affectedBy",
		"description",
		"implementation",
		"name",
		"registration"
	]), n, o);
	if (s === null) return null;
	let c = Xe(s.get("name"), F(t, "name"), n, {
		entity: o,
		required: !0,
		singleLine: !0
	}), l = s.get("description"), u = null;
	l === void 0 ? n.diagnostics.add({
		code: "MOLDEA_CAPABILITY_DESCRIPTION_MISSING",
		entity: o,
		path: n.path,
		pointer: F(t, "description")
	}) : l.value.kind !== "scalar" || typeof l.value.value != "string" || !me(l.value.value) ? n.diagnostics.add({
		code: "MOLDEA_CAPABILITY_DESCRIPTION_INVALID",
		entity: o,
		path: n.path,
		pointer: F(t, "description"),
		range: l.value.range
	}) : u = l.value.value;
	let d = s.get("implementation"), f = null;
	d === void 0 ? n.diagnostics.add({
		code: a === "tool" ? "MOLDEA_TOOL_IMPLEMENTATION_MISSING" : "MOLDEA_SKILL_IMPLEMENTATION_MISSING",
		entity: o,
		path: n.path,
		pointer: F(t, "implementation")
	}) : f = Qe(d.value, F(t, "implementation"), n, o);
	let p = (e) => {
		let r = s.get(e);
		return r === void 0 ? null : Qe(r.value, F(t, e), n, o);
	}, m = p("registration"), h = a === "tool" ? p("inputSchema") : null, g = a === "tool" ? p("outputSchema") : null, _ = s.get("affectedBy"), v = _ === void 0 ? null : et(_.value, F(t, "affectedBy"), n, o);
	return c === null || u === null || f === null ? null : {
		name: c,
		description: u,
		implementation: f,
		...m === null ? {} : { registration: m },
		...h === null ? {} : { inputSchema: h },
		...g === null ? {} : { outputSchema: g },
		...v === null ? {} : { affectedBy: v }
	};
}, ot = (e, t, n, r, i) => {
	let a = L(e, t, null, n, { agentId: r });
	if (a === null) return null;
	let o = [];
	for (let [e, s] of [...a].sort(([e], [t]) => u(e, t))) {
		let a = {
			agentId: r,
			capabilityId: e,
			capabilityKind: i
		}, c = F(t, e);
		Ze(e, s.key.range, c, n, a);
		let l = at(s.value, c, n, r, e, i);
		l !== null && o.push([e, l]);
	}
	return p(o);
}, st = (e, t) => {
	if (e.kind !== "mapping") return null;
	for (let n of e.entries) if (n.key.kind === "scalar" && n.key.value === t) return n.value;
	return null;
}, ct = (e) => {
	if (e.kind !== "mapping") return null;
	let t = st(e, "version");
	return t?.kind === "scalar" && t.value === 1n ? 1 : null;
}, lt = (e, t, n, r) => {
	let i = new Set();
	for (let a of ["tools", "skills"]) {
		let o = st(e, a);
		if (o?.kind === "mapping") for (let e of o.entries) e.key.kind === "scalar" && typeof e.key.value == "string" && (i.has(e.key.value) && n.diagnostics.add({
			code: "MOLDEA_ID_DUPLICATE",
			entity: { agentId: r },
			path: n.path,
			pointer: F(F(t, a), e.key.value),
			range: e.key.range
		}), i.add(e.key.value));
	}
}, ut = (e, t, n, r) => {
	let i = { agentId: r }, a = L(e, t, new Set([
		"affectedBy",
		"bindings",
		"context",
		"decisions",
		"mirrors",
		"skills",
		"tools"
	]), n, i);
	if (a === null) return null;
	lt(e, t, n, r);
	let o = a.get("bindings"), s = o === void 0 ? null : it(o.value, F(t, "bindings"), n, r), c = a.get("context"), l = c === void 0 ? null : rt(c.value, F(t, "context"), "context", n, i), u = a.get("decisions"), d = u === void 0 ? null : rt(u.value, F(t, "decisions"), "decision", n, i), f = a.get("tools"), p = f === void 0 ? null : ot(f.value, F(t, "tools"), n, r, "tool"), m = a.get("skills"), h = m === void 0 ? null : ot(m.value, F(t, "skills"), n, r, "skill"), g = a.get("affectedBy"), _ = g === void 0 ? null : et(g.value, F(t, "affectedBy"), n, i), v = a.get("mirrors"), y = v === void 0 ? null : rt(v.value, F(t, "mirrors"), "mirror", n, i);
	return {
		...l === null ? {} : { context: l },
		...d === null ? {} : { decisions: d },
		...s === null ? {} : { bindings: s },
		...p === null ? {} : { tools: p },
		...h === null ? {} : { skills: h },
		..._ === null ? {} : { affectedBy: _ },
		...y === null ? {} : { mirrors: y }
	};
}, dt = (e, t, n) => {
	let r = L(e, t, null, n);
	if (r === null) return null;
	let i = [];
	for (let [e, a] of [...r].sort(([e], [t]) => u(e, t))) {
		let r = F(t, e);
		Ze(e, a.key.range, r, n, { agentId: e });
		let o = ut(a.value, r, n, e);
		o !== null && i.push([e, o]);
	}
	return p(i);
}, ft = (e, t) => {
	let n = (e, n, r, i) => {
		t.diagnostics.add({
			code: "MOLDEA_MANIFEST_VALUE_INVALID",
			path: t.path,
			pointer: e === null ? "/acceptedWarnings" : `/acceptedWarnings/${e}/${g(n)}`,
			range: r,
			details: {
				entry: e,
				field: n,
				reason: i
			}
		});
	};
	if (e.kind !== "sequence") return n(null, "acceptedWarnings", e.range, "sequence-required"), null;
	if (e.items.length > t.limits.maxAcceptedWarnings) throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: t.operation,
		limit: "maxAcceptedWarnings",
		limitMaximum: t.limits.maxAcceptedWarnings,
		observedUsage: e.items.length,
		nextAction: "reduce-input-or-increase-limit"
	});
	let i = [], a = new Set();
	for (let [t, r] of e.items.entries()) {
		if (r.kind !== "mapping") {
			n(t, "entry", r.range, "mapping-required");
			continue;
		}
		let e = new Map(), o = !0;
		for (let i of r.entries) i.key.kind !== "scalar" || typeof i.key.value != "string" || ![
			"code",
			"subject",
			"qualifier",
			"reason"
		].includes(i.key.value) ? (n(t, i.key.kind === "scalar" && typeof i.key.value == "string" ? i.key.value : "key", i.key.range, "unknown-field"), o = !1) : e.set(i.key.value, i.value);
		let s = (i) => {
			let a = e.get(i);
			return a?.kind !== "scalar" || typeof a.value != "string" || !O(a.value) ? (n(t, i, a?.range ?? r.range, a === void 0 ? "required" : "non-empty-string-required"), o = !1, null) : a.value;
		}, c = s("code"), l = s("subject"), u = s("reason"), d = l === null ? null : k(l), f = e.get("qualifier"), p = null;
		f !== void 0 && (f.kind !== "scalar" || f.value !== null) && (p = s("qualifier"), p !== null && !de(p) && (n(t, "qualifier", f.range, "single-line-required"), o = !1));
		let m = _.find((e) => e === c);
		if (c !== null && m === void 0 && (n(t, "code", e.get("code").range, "code-not-acceptable"), o = !1), l !== null && d === null && (n(t, "subject", e.get("subject").range, "repository-path-required"), o = !1), u !== null && D(u) > 256 && (n(t, "reason", e.get("reason").range, "maximum-256-characters"), o = !1), !o || m === void 0 || d === null || u === null) continue;
		let h = JSON.stringify([
			m,
			d,
			p
		]);
		if (a.has(h)) {
			n(t, "code", e.get("code").range, "duplicate-identity");
			continue;
		}
		a.add(h), i.push({
			code: m,
			subject: d,
			...f === void 0 ? {} : { qualifier: p },
			reason: u
		});
	}
	return i;
}, pt = (e, t, n, r, i) => {
	let a = {
		diagnostics: n,
		operation: i,
		limits: r,
		mirrorPaths: new Set(),
		path: t
	};
	if (e.kind !== "mapping") return n.add({
		code: "MOLDEA_MANIFEST_ROOT_INVALID",
		path: t,
		range: e.range
	}), null;
	let o = st(e, "version");
	if (o === null) return n.add({
		code: "MOLDEA_MANIFEST_VERSION_MISSING",
		path: t,
		pointer: "/version"
	}), null;
	if (o.kind !== "scalar" || typeof o.value != "bigint" || o.kind !== "scalar" || o.value <= 0n) return n.add({
		code: "MOLDEA_MANIFEST_VERSION_INVALID",
		path: t,
		pointer: "/version",
		range: o.range
	}), null;
	if (o.value !== 1n) return n.add({
		code: "MOLDEA_MANIFEST_VERSION_UNSUPPORTED",
		path: t,
		pointer: "/version",
		range: o.range
	}), null;
	let s = L(e, "", new Set([
		"acceptedWarnings",
		"agents",
		"context",
		"decisions",
		"version"
	]), a);
	if (s === null) return null;
	let c = s.get("acceptedWarnings"), l = c === void 0 ? null : ft(c.value, a), u = s.get("context"), d = u === void 0 ? null : nt(u.value, "/context", "context", a), f = s.get("decisions"), p = f === void 0 ? null : nt(f.value, "/decisions", "decision", a), m = s.get("agents"), h = m === void 0 ? null : dt(m.value, "/agents", a);
	return {
		version: 1,
		...l === null ? {} : { acceptedWarnings: l },
		...d === null ? {} : { context: d },
		...p === null ? {} : { decisions: p },
		...h === null ? {} : { agents: h }
	};
}, mt = (e, t) => {
	let n = 0, r = e.length - 1;
	for (; n < r;) {
		let i = Math.ceil((n + r) / 2);
		(e[i] ?? 0) <= t ? n = i : r = i - 1;
	}
	return n;
}, ht = (e) => {
	let t = new Uint32Array(e.length + 1), n = [0], r = 0;
	for (let i = 0; i < e.length;) {
		let a = e.codePointAt(i), o = a !== void 0 && a > 65535 ? 2 : 1;
		t[i] = r;
		for (let e = 1; e < o; e += 1) t[i + e] = r;
		i += o, r += 1, t[i] = r, a === 10 && n.push(i);
	}
	let i = (r) => {
		let i = Math.max(0, Math.min(e.length, r)), a = mt(n, i), o = n[a] ?? 0, s = t[i] ?? 0;
		return {
			column: s - (t[o] ?? 0) + 1,
			line: a + 1,
			offset: s
		};
	};
	return Object.freeze({ locateRange: (e, t) => ({
		end: i(t),
		start: i(e)
	}) });
}, gt = async (e, t, n = "parse-manifest") => {
	t = a(t);
	let r = j(e, t.limits, n, "maxManifestBytes"), i = S(e.path), s = d(t.limits, n);
	he(i) || s.add({
		code: "MOLDEA_MANIFEST_PATH_INVALID",
		path: i
	});
	for (let e of r.diagnostics) s.merge(e);
	if (!r.valid || r.text === null) return m({
		asset: null,
		diagnostics: s.finalize(),
		formatVersion: null,
		manifest: null,
		valid: !1,
		yamlRoot: null
	});
	let l = ht(r.text.value), u = c(r.text.value, i, l, s), f = u.value === null ? null : ct(u.value), p = u.valid && u.value !== null ? pt(u.value, i, s, t.limits, n) : null, h = o(s.finalize(), new Map(u.value === null ? [] : [[i, u.value]]));
	if (p === null || s.size > 0) return m({
		asset: null,
		diagnostics: h,
		formatVersion: f,
		manifest: null,
		valid: !1,
		yamlRoot: u.value
	});
	let g = await M(r.text), _ = {
		content: r.text.value,
		digest: g,
		path: i,
		scalarLength: r.text.scalarLength,
		utf8ByteLength: r.text.utf8ByteLength
	};
	return m({
		asset: _,
		diagnostics: h,
		formatVersion: f,
		manifest: p,
		valid: !0,
		yamlRoot: u.value
	});
}, _t = async (e, t, n = "parse-manifest") => {
	let r = await gt(e, t, n);
	return m({
		asset: r.asset,
		diagnostics: r.diagnostics,
		manifest: r.manifest,
		valid: r.valid
	});
}, vt = () => {
	throw new r({
		code: "INVALID_ARGUMENT",
		operation: "match-manifest-scope"
	});
}, yt = (e, t, n) => {
	throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: e,
		limitMaximum: t,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: n,
		operation: "match-manifest-scope"
	});
}, bt = (e, t) => {
	if (!i(e, !0)) return vt();
	let n = e.manifest, r = e.paths;
	if (!i(n, !0) || !Array.isArray(r)) return vt();
	if (r.length > t.maxEntries) return yt("maxEntries", t.maxEntries, r.length);
	let a = new Set(), o = 0;
	for (let [e, n] of r.entries()) {
		if (typeof n != "string") return vt();
		let r = S(n);
		if (o += l(r) + (e === 0 ? 0 : 1), o > t.maxTotalBytesRead) return yt("maxTotalBytesRead", t.maxTotalBytesRead, o);
		a.add(r);
	}
	return {
		manifest: n,
		paths: [...a].sort(u)
	};
}, xt = async (e, t) => {
	let n = bt(e, t.limits), r = await Je(n.paths), i = await _t(n.manifest, t, "match-manifest-scope");
	if (!i.valid || i.asset === null || i.manifest === null) return m({
		counts: {
			declarations: 0,
			inputPaths: n.paths.length,
			matchedOwners: 0,
			matchedPaths: 0,
			matches: 0
		},
		diagnostics: i.diagnostics,
		inputDigest: r,
		manifestDigest: null,
		matches: [],
		relevant: !1,
		valid: !1
	});
	let a = Ye(i.manifest, n.paths, t.limits);
	return m({
		counts: a.counts,
		diagnostics: [],
		inputDigest: r,
		manifestDigest: i.asset.digest,
		matches: a.matches,
		relevant: a.matches.length > 0,
		valid: !0
	});
}, St = Object.defineProperty, Ct = (e, t) => {
	let n = {};
	for (var r in e) St(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || St(n, Symbol.toStringTag, { value: "Module" }), n;
}, wt = new TextDecoder("utf-8", {
	fatal: !0,
	ignoreBOM: !0
}), R = () => {
	throw new r({
		code: "INVALID_ARGUMENT",
		operation: "read-canonical-content-page"
	});
}, Tt = () => {
	throw new r({
		code: "CONTENT_INVALID",
		operation: "read-canonical-content-page"
	});
}, Et = (e) => typeof e == "object" && !!e && typeof e.getEntry == "function" && typeof e.readFilePage == "function", Dt = async (e, t, n, r, i) => {
	let a = [], o = 0, s = n, c = null, l = null;
	for (; o < r;) {
		let n = await e.readFilePage(t, {
			maxBytes: r - o,
			offset: s,
			...i === void 0 ? {} : { signal: i }
		});
		if (n.snapshot.id !== e.snapshot.id || n.offset !== s || n.bytes.byteLength > r - o || n.totalBytes < n.offset + n.bytes.byteLength || l !== null && n.totalBytes !== l || n.bytes.byteLength === 0 && !n.isComplete) throw new x({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path: t,
			retryable: !1
		});
		if (a.push(n.bytes), o += n.bytes.byteLength, l = n.totalBytes, c = n, n.isComplete || o === r) break;
		if (n.nextOffset !== n.offset + n.bytes.byteLength) throw new x({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path: t,
			retryable: !1
		});
		s = n.nextOffset;
	}
	if (c === null) return R();
	let u = new Uint8Array(o), d = 0;
	for (let e of a) u.set(e, d), d += e.byteLength;
	return {
		bytes: u,
		lastPage: c
	};
}, Ot = (e, t) => {
	let n = Math.max(0, t - 3);
	for (let r = t; r >= n; --r) try {
		let t = wt.decode(e.subarray(0, r));
		if (r === 0 && e.byteLength > 0) continue;
		return [t, r];
	} catch {}
	return Tt();
}, kt = async (e, t) => {
	if (typeof e != "object" || !e || Reflect.ownKeys(e).some((e) => e !== "maxBytes" && e !== "offset" && e !== "path" && e !== "repository" && e !== "signal") || !Et(e.repository) || !Number.isSafeInteger(e.maxBytes) || e.maxBytes < 1 || e.maxBytes > t.limits.maxFileBytes || !Number.isSafeInteger(e.offset) || e.offset < 0) return R();
	let n = S(e.path);
	if (!n.startsWith("/moldea/")) return R();
	let i = e.signal === void 0 ? void 0 : { signal: e.signal }, a = await e.repository.getEntry(n, i);
	if (a === null) throw new x({
		code: "ENTRY_NOT_FOUND",
		operation: "read-file-page",
		path: n,
		retryable: !1
	});
	if (a.type !== "file" || a.byteLength === null) throw new x({
		code: "ENTRY_NOT_FILE",
		operation: "read-file-page",
		path: n,
		retryable: !1
	});
	if (a.byteLength > t.limits.maxFileBytes) throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxFileBytes",
		limitMaximum: t.limits.maxFileBytes,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: a.byteLength,
		operation: "read-canonical-content-page"
	});
	if (e.offset > a.byteLength) return R();
	if (e.offset === a.byteLength) return m({
		byteEnd: e.offset,
		byteStart: e.offset,
		content: "",
		contentIdentity: a.contentIdentity,
		isComplete: !0,
		nextOffset: null,
		path: n,
		source: e.repository.snapshot,
		totalBytes: a.byteLength
	});
	let o = Math.min(a.byteLength - e.offset, e.maxBytes + 3), { bytes: s, lastPage: c } = await Dt(e.repository, n, e.offset, o, e.signal);
	if (c.totalBytes !== a.byteLength || (s[0] & 192) == 128) return R();
	let [l, u] = Ot(s, Math.min(e.maxBytes, s.byteLength)), d = e.offset + u, f = d === a.byteLength;
	return m({
		byteEnd: d,
		byteStart: e.offset,
		content: l,
		contentIdentity: a.contentIdentity,
		isComplete: f,
		nextOffset: f ? null : d,
		path: n,
		source: e.repository.snapshot,
		totalBytes: a.byteLength
	});
}, At = new Set([
	"accepted",
	"proposed",
	"rejected",
	"superseded"
]), jt = /^\d{13}$/u, Mt = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u, z = (e) => e === null ? null : { decisionId: e }, Nt = (e, t, n, r = null) => {
	e.diagnostics.add({
		code: "MOLDEA_DECISION_FRONTMATTER_INVALID",
		details: { reason: n },
		entity: z(e.decisionId),
		path: e.path,
		pointer: r,
		range: t
	});
}, Pt = (e) => {
	if (!Mt.test(e)) return !1;
	let t = Date.parse(e);
	return Number.isFinite(t) && new Date(t).toISOString() === e;
}, Ft = (e, t) => {
	if (e.kind !== "mapping") return Nt(t, e.range, "mapping-required"), null;
	let n = new Map();
	for (let r of e.entries) {
		if (r.key.kind !== "scalar" || typeof r.key.value != "string") {
			Nt(t, r.key.range, "string-key-required");
			continue;
		}
		let e = r.key.value;
		if (e !== "status" && e !== "createdAt" && e !== "supersedes") {
			t.diagnostics.add({
				code: "MOLDEA_DECISION_PROPERTY_UNKNOWN",
				entity: z(t.decisionId),
				path: t.path,
				pointer: `/${g(e)}`,
				range: r.key.range
			});
			continue;
		}
		n.set(e, r.value);
	}
	return n;
}, It = (e, t) => e?.kind !== "scalar" || typeof e.value != "string" || !At.has(e.value) ? (t.diagnostics.add({
	code: "MOLDEA_DECISION_STATUS_INVALID",
	entity: z(t.decisionId),
	path: t.path,
	pointer: "/status",
	range: e?.range ?? null
}), null) : e.value, Lt = (e, t) => e?.kind !== "scalar" || typeof e.value != "string" || !Pt(e.value) ? (t.diagnostics.add({
	code: "MOLDEA_DECISION_CREATED_AT_INVALID",
	entity: z(t.decisionId),
	path: t.path,
	pointer: "/createdAt",
	range: e?.range ?? null
}), null) : (t.decisionId !== null && Date.parse(e.value) !== Number(t.decisionId) && t.diagnostics.add({
	code: "MOLDEA_DECISION_TIMESTAMP_MISMATCH",
	entity: z(t.decisionId),
	path: t.path,
	pointer: "/createdAt",
	range: e.range
}), e.value), Rt = (e, t) => {
	if (e === void 0) return [];
	if (e.kind !== "sequence" || e.items.length === 0) return Nt(t, e.range, "non-empty-supersedes-sequence-required", "/supersedes"), null;
	let n = [], r = new Set();
	return e.items.forEach((e, i) => {
		let a = `/supersedes/${i}`;
		if (e.kind !== "scalar" || typeof e.value != "string" || !jt.test(e.value)) {
			Nt(t, e.range, "decision-id-string-required", a);
			return;
		}
		if (r.has(e.value)) {
			t.diagnostics.add({
				code: "MOLDEA_ID_DUPLICATE",
				entity: z(t.decisionId),
				path: t.path,
				pointer: a,
				range: e.range
			});
			return;
		}
		r.add(e.value), n.push(e.value), e.value === t.decisionId && t.diagnostics.add({
			code: "MOLDEA_DECISION_SELF_SUPERSESSION",
			entity: z(t.decisionId),
			path: t.path,
			pointer: a,
			range: e.range
		});
	}), n.sort(u);
}, zt = (e, t, n) => {
	let r = e.indexOf("\n"), i = r === -1 ? e.length : r;
	if (e.slice(0, i) !== "---") return n.diagnostics.add({
		code: "MOLDEA_DECISION_FRONTMATTER_MISSING",
		entity: z(n.decisionId),
		path: n.path,
		range: t.locateRange(0, i)
	}), null;
	let a = r === -1 ? e.length : r + 1;
	for (; a <= e.length;) {
		let n = e.indexOf("\n", a), r = n === -1 ? e.length : n;
		if (e.slice(a, r) === "---") {
			let i = n === -1 ? r : n + 1;
			return {
				body: e.slice(i),
				bodyRange: t.locateRange(i, e.length),
				yaml: e.slice(0, a)
			};
		}
		if (n === -1) break;
		a = n + 1;
	}
	return n.diagnostics.add({
		code: "MOLDEA_DECISION_FRONTMATTER_MISSING",
		entity: z(n.decisionId),
		path: n.path,
		range: t.locateRange(e.length, e.length)
	}), null;
}, Bt = (e, t) => {
	let n = t.diagnostics.size, r = Ft(e, t);
	if (r === null) return null;
	let i = It(r.get("status"), t), a = Lt(r.get("createdAt"), t), o = Rt(r.get("supersedes"), t);
	return i === null || a === null || o === null || t.diagnostics.size > n ? null : {
		createdAt: a,
		status: i,
		supersedes: o
	};
}, Vt = (e, t, n) => O(e) ? !0 : (n.diagnostics.add({
	code: "MOLDEA_DECISION_BODY_EMPTY",
	entity: z(n.decisionId),
	path: n.path,
	range: t
}), !1), Ht = async (e, t, n = "parse-decision") => {
	t = a(t);
	let r = j(e, t.limits, n), i = S(e.path), s = d(t.limits, n), l = A(i);
	l === null && s.add({
		code: "MOLDEA_DECISION_FILENAME_INVALID",
		path: i
	});
	for (let e of r.diagnostics) s.merge(e);
	if (!r.valid || r.text === null) return m({
		decision: null,
		diagnostics: s.finalize(),
		valid: !1,
		yamlRoot: null
	});
	let u = {
		decisionId: l,
		diagnostics: s,
		path: i
	}, f = ht(r.text.value), p = zt(r.text.value, f, u), h = null, g = null;
	if (p !== null) {
		Vt(p.body, p.bodyRange, u);
		let e = c(p.yaml, i, f, s);
		g = e.value, e.valid && e.value !== null && (h = Bt(e.value, u));
	}
	let _ = o(s.finalize(), new Map(g === null ? [] : [[i, g]]));
	if (l === null || p === null || h === null || s.size > 0) return m({
		decision: null,
		diagnostics: _,
		valid: !1,
		yamlRoot: g
	});
	let v = await M(r.text), y = {
		content: r.text.value,
		digest: v,
		path: i,
		scalarLength: r.text.scalarLength,
		utf8ByteLength: r.text.utf8ByteLength
	};
	return m({
		decision: {
			asset: y,
			body: p.body,
			createdAt: h.createdAt,
			id: l,
			path: i,
			status: h.status,
			supersedes: h.supersedes
		},
		diagnostics: _,
		valid: !0,
		yamlRoot: g
	});
}, Ut = async (e, t, n = "parse-decision") => {
	let r = await Ht(e, t, n);
	return m({
		decision: r.decision,
		diagnostics: r.diagnostics,
		valid: r.valid
	});
}, Wt = function* (e) {
	for (let t of e.agents) yield { agentId: t.id };
}, B = (e, t, n = null, r = null) => ({
	agentId: n,
	byteLength: e.utf8ByteLength,
	canonicalDigest: null,
	decisionId: r,
	digest: e.digest,
	kind: t,
	path: e.path,
	scalarLength: e.scalarLength
}), Gt = function* (e) {
	yield B(e.manifest.asset, "manifest"), yield B(e.project, "project");
	for (let t of e.context) yield B(t.asset, "context");
	for (let { decision: t } of e.decisions) yield B(t.asset, "decision", null, t.id);
	for (let t of e.agents) {
		yield B(t.description.asset, "agent-description", t.id), yield B(t.instruction, "agent-instruction", t.id);
		for (let e of t.mirrors) yield {
			agentId: t.id,
			byteLength: e.byteLength,
			canonicalDigest: e.canonicalDigest,
			decisionId: null,
			digest: e.digest,
			kind: "mirror",
			path: e.path,
			scalarLength: e.scalarLength
		};
	}
}, Kt = (e) => ({
	counts: {
		agents: e.agents.length,
		context: e.context.length,
		decisions: e.decisions.length,
		mirrors: e.agents.reduce((e, t) => e + t.mirrors.length, 0)
	},
	manifestDigest: e.manifest.asset.digest,
	manifestPath: e.manifest.asset.path,
	projectDigest: e.project.digest,
	projectPath: e.project.path
}), qt = (e) => ({
	bindings: e.length,
	exportsPassed: e.filter((e) => e.exportCheck === "passed").length,
	exportsFailed: e.filter((e) => e.exportCheck === "failed").length,
	exportsNotChecked: e.filter((e) => e.exportCheck === "not-checked").length
}), Jt = new WeakMap(), Yt = (e, t) => {
	if (Jt.has(e)) throw TypeError("The inspection reader is already registered.");
	Jt.set(e, t);
}, Xt = (e) => {
	let t = Jt.get(e);
	if (t === void 0) throw TypeError("The inspection reader has no retained-memory ledger.");
	return t;
}, Zt = (e, t) => {
	Jt.get(e)?.reserve(t);
}, Qt = S("/moldea/moldea.yaml"), $t = new Set([
	"/AGENTS.md",
	"/CLAUDE.md",
	"/.claude/CLAUDE.md",
	"/CLAUDE.local.md"
].map((e) => S(e))), en = 256, tn = 65536, nn = 4, rn = 64, an = 2, on = new TextEncoder(), V = (e, t) => {
	throw new x({
		code: "INVALID_SOURCE_DATA",
		operation: e,
		path: t,
		retryable: !1
	});
}, sn = (e, t, n, r) => {
	if (typeof e != "object" || !e) return V(t, n);
	let i = e, a = i.path, o = i.type, s = i.byteLength, c = i.contentIdentity;
	if (typeof a != "string" || !b(a)) return V(t, n);
	let l = S(a);
	return r !== void 0 && l !== r || o !== "file" && o !== "directory" && o !== "symlink" || (o === "file" ? !Number.isSafeInteger(s) || s < 0 || c !== null && typeof c != "string" : s !== null || c !== null) ? V(t, l) : {
		byteLength: s,
		contentIdentity: c,
		path: l,
		type: o
	};
}, cn = (e, t) => {
	if (e === t) return !1;
	let n = t === C ? C : `${t}/`;
	return e.startsWith(n);
}, H = (e, t, n) => {
	throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: e,
		limitMaximum: t,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: n,
		operation: "validate-project"
	});
}, U = (e, t) => {
	let n = e === void 0 ? t : t === void 0 || t === e ? e : AbortSignal.any([e, t]);
	return n === void 0 ? void 0 : { signal: n };
}, ln = (e, t, n, i) => {
	let a = new Set(), o = 0, s = 0, c = 0, l = 0, u = (e) => new r({
		cause: e.reason,
		code: "ABORTED",
		operation: "validate-project"
	}), d = (e) => {
		if (!Number.isSafeInteger(e) || e < 0 || e > t.maxRetainedBytes - c) return H("maxRetainedBytes", t.maxRetainedBytes, c + e);
		c += e, s = Math.max(s, c);
	}, f = (e) => {
		if (!Number.isSafeInteger(e) || e < 0 || e > t.maxRetainedBytes - c) return H("maxRetainedBytes", t.maxRetainedBytes, c + e);
		s = Math.max(s, c + e);
	}, p = (e) => {
		if (!(e === C || a.has(e))) {
			if (a.size >= t.maxEntries) return H("maxEntries", t.maxEntries, a.size + 1);
			d(rn + on.encode(e).byteLength * an), a.add(e);
		}
	}, m = (e) => {
		let t = n?.aborted ? n : e?.aborted ? e : null;
		if (t !== null) throw u(t);
	};
	m();
	let h = (e) => {
		if (e > t.maxTotalBytesRead - l) return H("maxTotalBytesRead", t.maxTotalBytesRead, l + e);
		l += e;
	}, g = {
		readPage: (t, n) => e.readFilePage(t, n),
		snapshotId: e.snapshot.id
	}, _ = async (e, t, r) => {
		let i = S(t);
		m(r?.signal), p(i);
		let a = await e.getEntry(i, U(n, r?.signal));
		return m(r?.signal), a === null ? null : sn(a, "get-entry", i, i);
	}, v = (t, n) => _(e, t, n), b = (r) => {
		let i = r?.prefix === void 0 ? C : S(r.prefix);
		return { async *[Symbol.asyncIterator]() {
			p(i);
			let a = new Set(), o, s = null;
			do {
				m(r?.signal);
				let c = await e.listEntriesPage({
					...o === void 0 ? {} : { cursor: o },
					maxEntries: Math.min(en, t.maxEntries),
					prefix: i,
					...U(n, r?.signal) ?? {}
				});
				if (c.snapshot.id !== e.snapshot.id || c.entries.length === 0 && !c.isComplete) return V("list-entries-page", i);
				for (let e of c.entries) {
					m(r?.signal);
					let t = sn(e, "list-entries-page", i);
					if (!cn(t.path, i) || a.has(t.path) || s !== null && y(s, t.path) >= 0) return V("list-entries-page", t.path);
					a.add(t.path), s = t.path, p(t.path), yield t;
				}
				if (c.isComplete) return c.nextCursor === null ? void 0 : V("list-entries-page", i);
				if (c.nextCursor === null || c.nextCursor === o) return V("list-entries-page", i);
				o = c.nextCursor;
			} while (!0);
		} };
	}, w = async (e, r, i = !1, a = g) => {
		let s = i ? 1 : nn, l = e === Qt ? "maxManifestBytes" : "maxFileBytes", u = t.maxRetainedBytes - c;
		if (u < 1) return H("maxRetainedBytes", t.maxRetainedBytes, c + 1);
		let p = Math.min(tn, Math.max(1, t[l]), u);
		f(p);
		let _ = await a.readPage(e, {
			maxBytes: p,
			offset: 0,
			...U(n, r) ?? {}
		});
		if (m(r), _.snapshot.id !== a.snapshotId || _.offset !== 0 || !(_.bytes instanceof Uint8Array) || !Number.isSafeInteger(_.totalBytes) || _.totalBytes < 0 || _.bytes.byteLength > tn || _.bytes.byteLength > _.totalBytes || _.bytes.byteLength === 0 && !_.isComplete) return V("read-file-page", e);
		if (_.totalBytes > t[l]) return H(l, t[l], _.totalBytes);
		let v = _.bytes.byteLength, y = t.maxRetainedBytes - c - v;
		if (y < 0 || _.totalBytes > Math.floor(y / s)) {
			let e = c + v + _.totalBytes * s;
			return H("maxRetainedBytes", t.maxRetainedBytes, Number.isSafeInteger(e) ? e : 2 ** 53 - 1);
		}
		h(_.totalBytes);
		let b = _.totalBytes * s;
		f(b + v), d(b), i || (o += _.totalBytes);
		let x = new Uint8Array(_.totalBytes), S = 0, C = _, w = !0;
		for (; w || S < x.byteLength;) {
			if (w = !1, C.snapshot.id !== a.snapshotId || C.offset !== S || C.totalBytes !== x.byteLength || !(C.bytes instanceof Uint8Array) || C.bytes.byteLength > tn || C.bytes.byteLength > x.byteLength - S || C.bytes.byteLength === 0 && !C.isComplete) return V("read-file-page", e);
			if (x.set(C.bytes, S), S += C.bytes.byteLength, C.isComplete) {
				if (C.nextOffset !== null || S !== x.byteLength) return V("read-file-page", e);
				break;
			}
			if (C.nextOffset !== S) return V("read-file-page", e);
			C = await a.readPage(e, {
				maxBytes: Math.min(tn, Math.max(1, x.byteLength - S)),
				offset: S,
				...U(n, r) ?? {}
			}), m(r);
		}
		return x;
	}, te = async (e, t) => {
		let r = U(n, t)?.signal;
		return r === void 0 ? e : new Promise((t, n) => {
			let i = () => r.removeEventListener("abort", a), a = () => {
				i(), n(u(r));
			};
			r.aborted ? a() : r.addEventListener("abort", a, { once: !0 }), e.then((e) => {
				i(), t(e);
			}, (e) => {
				i(), n(e instanceof Error ? e : new x({
					cause: e,
					code: "INVALID_SOURCE_DATA",
					operation: "read-file-page",
					path: null,
					retryable: !1
				}));
			});
		});
	}, T = async (e, t) => {
		let n = S(e);
		m(t?.signal), p(n);
		let r = await te(w(n, t?.signal), t?.signal);
		return m(t?.signal), r.slice();
	}, ne = async (e, t) => {
		m(), p(e);
		let n = await te(w(e, void 0, !0, t));
		m();
		let r = !1;
		return {
			bytes: n,
			release: () => {
				r || (c -= n.byteLength), r = !0;
			}
		};
	}, re = (t) => i !== void 0 && $t.has(t) ? i : e, ie = (t) => {
		let n = re(t);
		return n === e ? g : {
			readPage: (e, t) => n.readFilePage(e, t),
			snapshotId: n.snapshot.id
		};
	}, ae = async (e, t, r) => {
		let i = S(t);
		m(r?.signal), p(i);
		let a = await te(e.readLinkText(i, U(n, r?.signal)), r?.signal);
		return m(r?.signal), a !== null && (typeof a != "string" || on.encode(a).byteLength > 4096) ? V("read-link-text", i) : a;
	}, oe = Object.freeze({
		getEntry: (e) => {
			let t = S(e);
			return _(re(t), t);
		},
		resolveLink: (t) => {
			let n = S(t), r = re(n), i = (t) => t === n ? r : e;
			return ee({
				getEntry: (e, t) => _(i(e), e, t),
				readLinkText: (e, t) => ae(i(e), e, t)
			}, n);
		},
		readSourceFile: (e) => {
			let t = S(e);
			return ne(t, ie(t));
		}
	}), se = Object.freeze({
		getEntry: v,
		iterateEntries: b,
		readCompleteFile: T
	});
	return Yt(se, {
		reserve: d,
		tryReserve: (e) => !Number.isSafeInteger(e) || e < 0 || e > t.maxRetainedBytes - c ? !1 : (d(e), !0),
		release: (e) => {
			if (!Number.isSafeInteger(e) || e < 0 || e > c) throw TypeError("The retained-memory release is invalid.");
			c -= e;
		},
		readSourceFile: (e) => ne(e, g)
	}), Object.freeze({
		getResourceUsage: () => Object.freeze({
			canonicalBytes: o,
			peakRetainedBytes: s,
			retainedBytes: c,
			totalBytesRead: l
		}),
		instructions: oe,
		reader: se,
		throwIfAborted: m
	});
}, un = /^#{1,6} /u, dn = (e, t) => {
	for (let n = t; n < e.length; n += 1) {
		let t = e[n];
		if (t !== void 0 && O(t)) return n;
	}
	return null;
}, fn = (e, t, n) => {
	let r = d(n, "validate-project"), i = ue(e.content), a = D(i);
	a === 0 && r.add({
		code: "MOLDEA_AGENT_DESCRIPTION_INVALID",
		details: { reason: "empty" },
		entity: { agentId: t },
		path: e.path
	}), a > 1e3 && r.add({
		code: "MOLDEA_AGENT_DESCRIPTION_INVALID",
		details: { reason: "too-long" },
		entity: { agentId: t },
		path: e.path
	});
	let o = r.finalize();
	return m({
		description: o.length === 0 ? {
			asset: e,
			scalarLength: a,
			value: i
		} : null,
		diagnostics: o,
		valid: o.length === 0
	});
}, pn = (e, t, n) => {
	let r = d(n, "validate-project");
	if (!O(e.content)) return r.add({
		code: "MOLDEA_AGENT_INSTRUCTION_EMPTY",
		entity: { agentId: t },
		path: e.path
	}), m({
		diagnostics: r.finalize(),
		instruction: null,
		valid: !1
	});
	let i = `\`${t}\``, a = e.content.split("\n"), o = dn(a, 0), s = o;
	o !== null && un.test(a[o] ?? "") && (s = dn(a, o + 1)), (s === null || !(a[s] ?? "").includes(i)) && r.add({
		code: "MOLDEA_AGENT_IDENTITY_INVALID",
		details: { reason: e.content.includes(i) ? "misplaced" : "missing" },
		entity: { agentId: t },
		path: e.path
	});
	let c = r.finalize();
	return m({
		diagnostics: c,
		instruction: e,
		valid: c.length === 0
	});
}, mn = (e) => {
	throw new x({
		code: "INVALID_SOURCE_DATA",
		operation: "read-file-page",
		path: e,
		retryable: !1
	});
}, W = async (e, t, n, r) => {
	let i = await e.readCompleteFile(t, r === void 0 ? void 0 : { signal: r });
	if (!(i instanceof Uint8Array)) return mn(t);
	let a = j({
		content: i,
		path: t
	}, n, "validate-project");
	if (!a.valid || a.text === null) return m({
		asset: null,
		diagnostics: a.diagnostics,
		valid: !1
	});
	let o = {
		content: a.text.value,
		digest: await M(a.text),
		path: t,
		scalarLength: a.text.scalarLength,
		utf8ByteLength: a.text.utf8ByteLength
	};
	return m({
		asset: o,
		diagnostics: [],
		valid: !0
	});
}, hn = (e, t) => {
	for (let n of t) e.merge(n);
}, gn = (e, t) => {
	let n = e;
	for (; n.length > 0;) {
		if (t.has(n)) return !0;
		let e = n.lastIndexOf("/");
		if (e <= 0) return !1;
		n = n.slice(0, e);
	}
	return !1;
}, _n = async (e, t, n, r, i, a) => {
	let o = await W(e, t, r.limits, a);
	if (hn(i, o.diagnostics), o.asset === null) return null;
	let s = fn(o.asset, n, r.limits);
	return hn(i, s.diagnostics), s.description;
}, vn = async (e, t, n, r, i, a) => {
	let o = await W(e, t, r.limits, a);
	if (hn(i, o.diagnostics), o.asset === null) return null;
	let s = pn(o.asset, n, r.limits);
	return hn(i, s.diagnostics), s.instruction;
}, yn = async (e, t, n, r, i) => {
	r = a(r);
	let o = d(r.limits, "validate-project"), s = [], c = t.agents ?? {}, l = new Set(Object.keys(c)), f = new Map(n.inventory.agents.map((e) => [e.id, e])), p = new Set(n.diagnostics.flatMap((e) => e.path === null ? [] : [e.path]));
	for (let e of n.inventory.agents) l.has(e.id) || o.add({
		code: "MOLDEA_AGENT_DIRECTORY_UNREGISTERED",
		entity: { agentId: e.id },
		path: e.path
	});
	for (let t of [...l].sort(u)) {
		let n = c[t];
		if (n === void 0) continue;
		let a = f.get(t);
		if (a === void 0) {
			let e = S(`/moldea/agents/${t}`);
			gn(e, p) || o.add({
				code: "MOLDEA_AGENT_DIRECTORY_MISSING",
				entity: { agentId: t },
				path: e
			}), s.push({
				declaration: n,
				description: null,
				id: t,
				instruction: null
			});
			continue;
		}
		let l = null, u = null;
		if (a.description === null) {
			let e = S(`${a.path}/description.md`);
			gn(e, p) || o.add({
				code: "MOLDEA_AGENT_DESCRIPTION_MISSING",
				entity: { agentId: t },
				path: e
			});
		} else l = await _n(e, a.description, t, r, o, i);
		if (a.instruction === null) {
			let e = S(`${a.path}/instruction.md`);
			gn(e, p) || o.add({
				code: "MOLDEA_AGENT_INSTRUCTION_MISSING",
				entity: { agentId: t },
				path: e
			});
		} else u = await vn(e, a.instruction, t, r, o, i);
		s.push({
			declaration: n,
			description: l,
			id: t,
			instruction: u
		});
	}
	let h = o.finalize();
	return m({
		agents: s,
		diagnostics: h,
		valid: h.length === 0
	});
}, bn = /^\/moldea\/agents\/([^/]+)\/(description|instruction)\.md$/u, xn = /^\/moldea\/agents\/([^/]+)$/u, Sn = /^\/moldea\/decisions\/[^/]+\.md$/u, Cn = (e) => {
	if (e === "/moldea/moldea.yaml") return {
		agentId: null,
		fileKind: "manifest",
		kind: "canonical-file"
	};
	if (e === "/moldea/project.md") return {
		agentId: null,
		fileKind: "project",
		kind: "canonical-file"
	};
	if (ge(e, !1)) return {
		agentId: null,
		fileKind: "context",
		kind: "canonical-file"
	};
	if (Sn.test(e)) return {
		agentId: null,
		fileKind: "decision",
		kind: "canonical-file"
	};
	let t = bn.exec(e);
	if (t === null) return null;
	let n = t[1], r = t[2];
	return n === void 0 || r === void 0 ? null : {
		agentId: n,
		fileKind: r === "description" ? "agent-description" : "agent-instruction",
		kind: "canonical-file"
	};
}, wn = (e) => xn.exec(e)?.[1] ?? null, Tn = (e) => e === "/moldea" || e === "/moldea/context" || e === "/moldea/decisions" || e === "/moldea/agents", En = (e) => Tn(e) || e.startsWith("/moldea/context/"), Dn = (e) => {
	let t = Cn(e.path);
	if (t !== null) return e.type === "file" ? t : e.type === "symlink" ? { kind: "canonical-asset-symlink" } : {
		expectedType: "file",
		kind: "entry-type-invalid"
	};
	let n = wn(e.path);
	return n === null ? Tn(e.path) ? e.type === "directory" ? { kind: "structural-directory" } : {
		expectedType: "directory",
		kind: "entry-type-invalid"
	} : e.type === "directory" ? En(e.path) ? { kind: "structural-directory" } : { kind: "ignored-directory" } : { kind: "unrecognized" } : e.type === "directory" ? {
		agentId: n,
		kind: "agent-directory"
	} : {
		expectedType: "directory",
		kind: "entry-type-invalid"
	};
}, On = S("/moldea"), G = S("/moldea/moldea.yaml"), K = S("/moldea/project.md"), kn = () => ({
	agents: new Map(),
	context: new Set(),
	decisions: new Set(),
	manifest: null,
	project: null
}), q = (e, t) => {
	throw new x({
		code: "INVALID_SOURCE_DATA",
		operation: e,
		path: t,
		retryable: !1
	});
}, An = (e, t, n) => {
	if (typeof e != "object" || !e) return q(t, n ?? null);
	let r = e, i = r.path, a = r.type, o = r.byteLength, s = r.contentIdentity;
	if (typeof i != "string" || !b(i)) return q(t, n ?? null);
	let c = S(i);
	return n !== void 0 && c !== n || a !== "file" && a !== "directory" && a !== "symlink" || (a === "file" ? !Number.isSafeInteger(o) || o < 0 || s !== null && typeof s != "string" : o !== null || s !== null) ? q(t, c) : {
		byteLength: o,
		contentIdentity: s,
		path: c,
		type: a
	};
}, jn = async (e, t, n) => {
	let r = await e.getEntry(t, n === void 0 ? void 0 : { signal: n });
	return r === null ? null : An(r, "get-entry", t);
}, Mn = (e, t, n) => {
	e.add({
		code: "MOLDEA_ENTRY_TYPE_INVALID",
		details: {
			actualType: t.type,
			expectedType: n
		},
		path: t.path
	});
}, Nn = (e, t) => {
	let n = e.get(t);
	if (n !== void 0) return n;
	let r = {
		description: null,
		id: t,
		instruction: null,
		path: S(`/moldea/agents/${t}`)
	};
	return e.set(t, r), r;
}, Pn = (e, t, n, r) => {
	switch (n) {
		case "manifest":
			e.manifest = t;
			return;
		case "project":
			e.project = t;
			return;
		case "context":
			e.context.add(t);
			return;
		case "decision":
			e.decisions.add(t);
			return;
	}
	if (r === null) return q("list-entries-page", t);
	let i = Nn(e.agents, r);
	n === "agent-description" ? i.description = t : i.instruction = t;
}, Fn = (e) => {
	let t = (e) => [...e].sort(u), n = [...e.agents.values()].sort((e, t) => u(e.id, t.id)).map((e) => m({ ...e }));
	return m({
		agents: n,
		context: t(e.context),
		decisions: t(e.decisions),
		manifest: e.manifest,
		project: e.project
	});
}, In = (e, t) => {
	let n = t.finalize();
	return m({
		diagnostics: n,
		inventory: Fn(e),
		valid: n.length === 0
	});
}, Ln = (e, t, n, r, i) => {
	if (e === null) {
		i.add({
			code: n,
			path: t
		});
		return;
	}
	if (e.type === "file") {
		t === G ? r.manifest = t : r.project = t;
		return;
	}
	if (e.type === "symlink") {
		i.add({
			code: "MOLDEA_CANONICAL_ASSET_SYMLINK",
			path: t
		});
		return;
	}
	Mn(i, e, "file");
}, Rn = (e, t) => {
	if (t === null || t.type !== e.type) return q("list-entries-page", e.path);
}, zn = async (e, t, n, r) => {
	let i = d(t, "validate-project"), a = kn(), o = r === void 0 ? await jn(e, On, n) : r.moldeaRoot;
	if (o === null) return i.add({
		code: "MOLDEA_MANIFEST_MISSING",
		path: G
	}), i.add({
		code: "MOLDEA_PROJECT_FILE_MISSING",
		path: K
	}), In(a, i);
	if (o.type !== "directory") return Mn(i, o, "directory"), In(a, i);
	let s = r === void 0 ? await jn(e, G, n) : r.manifest, c = r === void 0 ? await jn(e, K, n) : r.project;
	Ln(s, G, "MOLDEA_MANIFEST_MISSING", a, i), Ln(c, K, "MOLDEA_PROJECT_FILE_MISSING", a, i);
	let l = new Set(), u = !1, f = !1, p = n === void 0 ? { prefix: On } : {
		prefix: On,
		signal: n
	};
	for await (let t of e.iterateEntries(p)) {
		let e = An(t, "list-entries-page");
		if (!e.path.startsWith("/moldea/") || l.has(e.path)) return q("list-entries-page", e.path);
		if (l.add(e.path), e.path === G) {
			Rn(e, s), u = !0;
			continue;
		}
		if (e.path === K) {
			Rn(e, c), f = !0;
			continue;
		}
		let n = Dn(e);
		switch (n.kind) {
			case "canonical-file":
				Pn(a, e.path, n.fileKind, n.agentId);
				break;
			case "agent-directory":
				Nn(a.agents, n.agentId);
				break;
			case "canonical-asset-symlink":
				i.add({
					code: "MOLDEA_CANONICAL_ASSET_SYMLINK",
					path: e.path
				});
				break;
			case "entry-type-invalid":
				Mn(i, e, n.expectedType);
				break;
			case "unrecognized": i.add({
				code: "MOLDEA_CANONICAL_PATH_UNRECOGNIZED",
				details: { entryType: e.type },
				path: e.path
			});
		}
	}
	return s !== null === u ? c !== null === f ? In(a, i) : q("list-entries-page", K) : q("list-entries-page", G);
}, Bn = (e) => [...e].sort((e, t) => u(e.path, t.path)), Vn = (e) => {
	let t = new Map();
	for (let n of Bn(e)) {
		if (n.id === null) continue;
		let e = t.get(n.id) ?? [];
		e.push(n), t.set(n.id, e);
	}
	let n = new Map(), r = new Map();
	for (let e of [...t.keys()].sort(u)) {
		let i = t.get(e) ?? [];
		if (n.set(e, i), i.length === 1 && i[0]?.decision !== null) {
			let t = i[0]?.decision;
			t !== void 0 && r.set(e, t);
		}
	}
	let i = new Map();
	for (let [e, t] of r) {
		let r = t.supersedes.filter((e) => {
			let t = n.get(e);
			return t?.length === 1 && t[0]?.decision !== null;
		});
		i.set(e, r);
	}
	return {
		candidateGroups: n,
		edges: i,
		nodes: r
	};
}, Hn = (e, t) => {
	for (let [n, r] of e.candidateGroups) if (!(r.length < 2)) for (let e of r) t.add({
		code: "MOLDEA_DECISION_ID_DUPLICATE",
		details: { occurrences: r.length },
		entity: { decisionId: n },
		path: e.path
	});
}, Un = (e, t) => {
	for (let n of e.nodes.values()) for (let r of n.supersedes) e.candidateGroups.has(r) || t.add({
		code: "MOLDEA_DECISION_REFERENCE_MISSING",
		details: { referencedDecisionId: r },
		entity: { decisionId: n.id },
		path: n.path,
		pointer: "/supersedes"
	});
}, Wn = (e, t) => {
	let n = new Set();
	for (let r of e.nodes.values()) if (r.status === "accepted" || r.status === "superseded") for (let i of e.edges.get(r.id) ?? []) {
		let a = e.nodes.get(i);
		if (a !== void 0) {
			if (a.status === "superseded") {
				n.add(i);
				continue;
			}
			t.add({
				code: "MOLDEA_DECISION_SUPERSESSION_STATUS_INVALID",
				details: {
					referencedDecisionId: i,
					sourceStatus: r.status,
					targetStatus: a.status
				},
				entity: { decisionId: r.id },
				path: r.path,
				pointer: "/supersedes"
			});
		}
	}
	return n;
}, Gn = (e, t, n) => {
	for (let r of e.nodes.values()) r.status === "superseded" && !t.has(r.id) && n.add({
		code: "MOLDEA_DECISION_SUPERSEDED_ORPHAN",
		entity: { decisionId: r.id },
		path: r.path
	});
}, Kn = (e) => {
	let t = new Set(), n = [];
	for (let r of e.nodes.keys()) {
		if (t.has(r)) continue;
		let i = [{
			id: r,
			nextNeighbor: 0
		}];
		for (t.add(r); i.length > 0;) {
			let r = i.at(-1);
			if (r === void 0) break;
			let a = (e.edges.get(r.id) ?? [])[r.nextNeighbor];
			if (a === void 0) {
				n.push(r.id), i.pop();
				continue;
			}
			r.nextNeighbor += 1, t.has(a) || (t.add(a), i.push({
				id: a,
				nextNeighbor: 0
			}));
		}
	}
	return n;
}, qn = (e) => {
	let t = new Map();
	for (let n of e.nodes.keys()) t.set(n, []);
	for (let [n, r] of e.edges) for (let e of r) t.get(e)?.push(n);
	for (let e of t.values()) e.sort(u);
	return t;
}, Jn = (e) => {
	let t = qn(e), n = new Set(), r = [];
	for (let i of [...Kn(e)].reverse()) {
		if (n.has(i)) continue;
		let e = [], a = [i];
		for (n.add(i); a.length > 0;) {
			let r = a.pop();
			if (r === void 0) break;
			e.push(r);
			for (let e of [...t.get(r) ?? []].reverse()) n.has(e) || (n.add(e), a.push(e));
		}
		r.push(e.sort(u));
	}
	return r.sort((e, t) => u(e[0] ?? "", t[0] ?? ""));
}, Yn = (e, t) => {
	for (let n of Jn(e)) {
		if (n.length < 2) continue;
		let r = n[0];
		if (r !== void 0) for (let i of n) {
			let a = e.nodes.get(i);
			a !== void 0 && t.add({
				code: "MOLDEA_DECISION_SUPERSESSION_CYCLE",
				details: {
					cycleRepresentativeDecisionId: r,
					cycleSize: n.length
				},
				entity: { decisionId: i },
				path: a.path,
				pointer: "/supersedes"
			});
		}
	}
}, Xn = (e, t) => {
	let n = d(t, "validate-project"), r = Vn(e);
	return Hn(r, n), Un(r, n), Yn(r, n), Gn(r, Wn(r, n), n), n.finalize();
}, Zn = (e) => {
	throw new x({
		code: "INVALID_SOURCE_DATA",
		operation: "read-file-page",
		path: e,
		retryable: !1
	});
}, Qn = (e) => [...e].sort((e, t) => u(e.id, t.id) || u(e.path, t.path)), $n = async (e, t, n, r, i) => {
	n = a(n);
	let o = d(n.limits, "validate-project"), s = [], c = [], l = r === void 0 ? void 0 : { signal: r };
	for (let r of [...t].sort(u)) {
		let t = await e.readCompleteFile(r, l);
		if (!(t instanceof Uint8Array)) return Zn(r);
		let a = await Ht({
			content: t.slice(),
			path: r
		}, n, "validate-project");
		a.decision !== null && a.yamlRoot !== null && i?.(r, a.yamlRoot);
		for (let e of a.diagnostics) o.merge(e);
		s.push({
			decision: a.decision,
			id: A(r),
			path: r
		}), a.decision !== null && c.push(a.decision);
	}
	for (let e of Xn(s, n.limits)) o.merge(e);
	let f = o.finalize();
	return m({
		decisions: Qn(c),
		diagnostics: f,
		valid: f.length === 0
	});
}, er = (e, t) => {
	let n = A(e);
	return {
		...t === void 0 ? {} : { agentId: t },
		...n === null ? {} : { decisionId: n }
	};
}, tr = (e, t, n, r, i) => {
	n.has(e) || r.blockedPaths.has(e) || r.collector.add({
		code: "MOLDEA_REFERENCE_MISSING",
		details: { referencedPath: e },
		entity: i === void 0 ? null : { agentId: i },
		path: r.manifestPath,
		pointer: t
	});
}, nr = (e, t, n, r) => {
	if (!n.discoveredDecisionPaths.has(e)) {
		if (n.blockedPaths.has(e)) return;
		n.collector.add({
			code: "MOLDEA_DECISION_REFERENCE_MISSING",
			details: { referencedPath: e },
			entity: er(e, r),
			path: n.manifestPath,
			pointer: t
		});
		return;
	}
	let i = n.parsedDecisionsByPath.get(e);
	i !== void 0 && i.status !== "accepted" && n.collector.add({
		code: "MOLDEA_DECISION_RELATIONSHIP_INACTIVE",
		details: {
			referencedPath: e,
			targetStatus: i.status
		},
		entity: er(e, r),
		path: n.manifestPath,
		pointer: t
	});
}, rr = (e, t, n, r, i) => {
	let a = d(i, "validate-project"), o = new Set(n.inventory.context), s = new Set(o);
	n.inventory.project !== null && s.add(n.inventory.project);
	let c = {
		blockedPaths: new Set(n.diagnostics.flatMap((e) => e.path === null ? [] : [e.path])),
		collector: a,
		discoveredDecisionPaths: new Set(n.inventory.decisions),
		manifestPath: e,
		parsedDecisionsByPath: new Map(r.map((e) => [e.path, e])),
		validAgentContextPaths: o,
		validTopLevelContextPaths: s
	};
	for (let e of Object.keys(t.context ?? {}).sort(u)) tr(S(e), `/context/${g(e)}`, c.validTopLevelContextPaths, c);
	for (let e of Object.keys(t.decisions ?? {}).sort(u)) nr(S(e), `/decisions/${g(e)}`, c);
	for (let e of Object.keys(t.agents ?? {}).sort(u)) {
		let n = t.agents?.[e];
		if (n === void 0) continue;
		let r = g(e);
		for (let [t, i] of (n.context ?? []).entries()) tr(i, `/agents/${r}/context/${t}`, c.validAgentContextPaths, c, e);
		for (let [t, i] of (n.decisions ?? []).entries()) nr(i, `/agents/${r}/decisions/${t}`, c, e);
	}
	return a.finalize();
}, J = {
	start: "<!-- moldea:start -->",
	end: "<!-- moldea:end -->"
}, ir = (t) => {
	try {
		let e = re(t.replace(/(<!-- moldea:(?:start|end) -->)[ \t]+(?=\r?$)/gmu, "$1"), J);
		if (e === null) return "block-missing";
		let n = t.indexOf(J.start), r = t.indexOf("\n", t.indexOf(J.end));
		return {
			start: n,
			end: r === -1 ? t.length : r + 1,
			lineEnding: e.lineEnding
		};
	} catch (t) {
		if (n(t, e.INVALID_MARKED_REGION)) return "block-invalid";
		throw t;
	}
}, ar = (e) => {
	let t = e.replaceAll("\r\n", "\n").replace(/(<!-- moldea:(?:start|end) -->)[ \t]+(?=\n|$)/gu, "$1");
	if (!t.startsWith(`${J.start}\n`) || !(t.endsWith(J.end) || t.endsWith(`${J.end}\n`))) return t;
	let n = J.start.length, r = t.lastIndexOf(J.end);
	for (; n < r && t[n] === "\n";) n++;
	for (; r > n && t[r - 1] === "\n";) r--;
	return `${J.start}\n${t.slice(n, r)}\n${J.end}`;
}, or = (e) => {
	let t = ir(e);
	if (typeof t == "string") return {
		kind: "missing",
		reason: t
	};
	let n = e.slice(t.start, t.end).matchAll(/^node "<repo-root>\/([^"\r\n]+)\/scripts\/relevance-gate\.mjs"(?=[ \t\r]|$)([^\r\n]*)/gm), r = new Map();
	for (let e of n) {
		let t = e[1], n = /(?:^|[ \t])--adoption-only(?:[ \t]|$)/u.test(e[2] ?? "") ? "adoption" : "paths";
		if (t === void 0 || r.has(n)) return {
			kind: "missing",
			reason: "skill-path-missing"
		};
		r.set(n, t);
	}
	let i = r.get("paths") ?? r.get("adoption");
	return r.size === 0 || r.size === 2 && r.get("adoption") !== i ? {
		kind: "missing",
		reason: "skill-path-missing"
	} : i === void 0 || !/^[A-Za-z0-9._/-]+$/.test(i) || i.startsWith("/") || i.endsWith("/") || i.includes("//") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(i) ? {
		kind: "missing",
		reason: "skill-path-invalid"
	} : {
		kind: "found",
		skillPath: i
	};
}, sr = new Set(["@AGENTS.md", "@./AGENTS.md"]), cr = new Set(["@../AGENTS.md"]), lr = (e, t) => {
	let n = t ? cr : sr, r = null;
	for (let t of e.replace(/^\uFEFF/u, "").split(/\r\n|\n|\r/u)) {
		let e = t.replace(/^[ \t]+|[ \t]+$/gu, ""), i = /^(`{3,}|~{3,})/u.exec(e)?.[1];
		if (r !== null) i !== void 0 && i[0] === r[0] && i.length >= r.length && (r = null);
		else if (i !== void 0) r = i;
		else if (n.has(e)) return !0;
	}
	return !1;
}, ur = async (e, t) => {
	let n = await t(), r = n.bytes.byteLength * 8, i = !1;
	try {
		e.reserve(r), i = !0;
		let t;
		try {
			t = new TextDecoder("utf-8", { fatal: !0 }).decode(n.bytes);
		} catch {
			t = null;
		}
		return {
			text: t,
			release: () => e.release(r)
		};
	} catch (t) {
		throw i && e.release(r), t;
	} finally {
		n.release();
	}
}, dr = (e) => e instanceof x ? e.code === "ENTRY_NOT_FOUND" ? "missing" : e.code === "ENTRY_NOT_FILE" ? "non-regular" : null : null, fr = S("/AGENTS.md"), pr = (e, t) => e("MOLDEA_INTEGRATION_LINK_UNRESOLVED", {
	entryKind: "symlink",
	reason: t
}, t), mr = async (e, t, n, r) => {
	let { ledger: i, reader: a, signal: o } = e, s;
	try {
		s = await ur(i, n);
	} catch (e) {
		let n = dr(e);
		if (n === null) throw e;
		return r.entryKind === "symlink" ? pr(t, n === "missing" ? "missing" : "not-file") : t("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: n });
	}
	try {
		if (s.text === null) return t("MOLDEA_INTEGRATION_BLOCK_MISSING", {
			...r,
			reason: "invalid-utf8"
		});
		let e = or(s.text);
		if (e.kind === "missing") return t(e.reason.startsWith("block-") ? "MOLDEA_INTEGRATION_BLOCK_MISSING" : "MOLDEA_INTEGRATION_SKILL_MISSING", {
			...r,
			reason: e.reason
		});
		let { skillPath: n } = e;
		for (let e of ["SKILL.md", "scripts/relevance-gate.mjs"]) {
			let r = S(`/${n}/${e}`), i = await a.getEntry(r, o === void 0 ? void 0 : { signal: o });
			if (i?.type !== "file") return t("MOLDEA_INTEGRATION_SKILL_MISSING", {
				referencedPath: `/${n}`,
				missingFile: r,
				entryKind: i?.type ?? "missing"
			});
		}
		let c = S(`/${n}/assets/managed-agents-block.md`), l;
		try {
			l = await ur(i, () => i.readSourceFile(c));
		} catch (e) {
			let r = dr(e);
			if (r !== null) return t("MOLDEA_INTEGRATION_SKILL_MISSING", {
				referencedPath: `/${n}`,
				missingFile: c,
				entryKind: r
			});
			throw e;
		}
		try {
			if (l.text === null) return t("MOLDEA_INTEGRATION_BLOCK_STALE", {
				referencedPath: `/${n}`,
				reason: "invalid-utf8-asset"
			});
			let e = ir(s.text), r = 0, a = 0;
			for (; (a = l.text.indexOf("{{skill-path}}", a)) !== -1;) r++, a += 14;
			let o = (l.text.length + r * n.length) * 8;
			i.reserve(o);
			try {
				let r = ar(l.text.replaceAll("{{skill-path}}", n).replace(/\r\n?/gu, "\n"));
				if (ar(s.text.slice(e.start, e.end)) !== r) return t("MOLDEA_INTEGRATION_BLOCK_STALE", { referencedPath: `/${n}` });
			} finally {
				i.release(o);
			}
		} finally {
			l.release();
		}
	} finally {
		s.release();
	}
}, hr = async (e) => {
	let { instructions: t, ledger: n } = e, r = (t, n, r) => e.report(t, fr, n, r), i = await t.getEntry(fr);
	if (i === null) return r("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: "missing" }), { kind: "missing" };
	if (i.type === "directory") return r("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: "directory" }), { kind: "directory" };
	if (i.type === "file") return await mr(e, r, () => t.readSourceFile(fr), { entryKind: "file" }), { kind: "file" };
	let a = await t.resolveLink(fr);
	if (a.state === "file") {
		let { targetPath: t } = a;
		await mr(e, r, () => n.readSourceFile(t), { entryKind: "symlink" });
	} else pr(r, a.state);
	return {
		kind: "link",
		resolution: a
	};
}, gr = S("/AGENTS.md"), _r = S("/CLAUDE.md"), vr = S("/.claude/CLAUDE.md"), yr = S("/CLAUDE.local.md"), br = (e) => e.kind === "file" ? gr : e.kind === "link" && e.resolution.state === "file" ? e.resolution.targetPath : null, xr = (e, t, n) => {
	let r = br(n);
	return n.kind === "link" && r === e || t?.state === "file" && t.targetPath === r;
}, Sr = async (e, t, n) => {
	let { instructions: r, ledger: i } = e, a = await r.getEntry(t);
	if (a === null) return { kind: "absent" };
	if (xr(t, null, n)) return { kind: "loads" };
	if (a.type === "directory") return {
		entryKind: "directory",
		kind: "not-loading"
	};
	let o = () => r.readSourceFile(t);
	if (a.type === "symlink") {
		let e = await r.resolveLink(t);
		if (xr(t, e, n)) return { kind: "loads" };
		if (e.state !== "file") return {
			kind: "unresolved",
			reason: e.state
		};
		let { targetPath: a } = e;
		o = () => i.readSourceFile(a);
	}
	let s;
	try {
		s = await ur(i, o);
	} catch (e) {
		let t = dr(e);
		if (t === null) throw e;
		return a.type === "symlink" ? {
			kind: "unresolved",
			reason: t === "missing" ? "missing" : "not-file"
		} : { kind: "absent" };
	}
	try {
		return s.text !== null && lr(s.text, t === vr) ? { kind: "loads" } : {
			entryKind: a.type,
			kind: "not-loading"
		};
	} finally {
		s.release();
	}
}, Cr = async (e, t) => {
	let n = [];
	for (let r of [_r, vr]) {
		let i = await Sr(e, r, t);
		if (i.kind === "loads") return;
		i.kind !== "absent" && n.push({
			assessment: i,
			path: r
		});
	}
	if (n.length === 0) {
		let r = await Sr(e, yr, t);
		if (r.kind === "absent" || r.kind === "loads") return;
		n.push({
			assessment: r,
			path: yr
		});
	}
	let r = n.find(({ assessment: e }) => e.kind === "unresolved");
	if (r?.assessment.kind === "unresolved") {
		let { reason: t } = r.assessment;
		e.report("MOLDEA_INTEGRATION_LINK_UNRESOLVED", r.path, {
			entryKind: "symlink",
			reason: t
		}, t);
		return;
	}
	let i = n[0];
	i?.assessment.kind === "not-loading" && e.report("MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING", i.path, { entryKind: i.assessment.entryKind });
}, wr = async (e, t, n, r) => {
	let i = d(n, "validate-project"), a = {
		instructions: t,
		ledger: Xt(e),
		reader: e,
		report: (e, t, n, r) => {
			i.add({
				code: e,
				path: t,
				subject: t,
				qualifier: r ?? null,
				entity: { integrationPath: t },
				details: n
			});
		},
		...r === void 0 ? {} : { signal: r }
	};
	return await Cr(a, await hr(a)), i.finalize();
}, Tr = (e) => {
	if (e.kind === "context") return {
		subject: S(e.id),
		entity: { contextPath: S(e.id) }
	};
	if (e.kind === "decision") return {
		subject: S(e.id),
		entity: { decisionId: A(S(e.id)) ?? e.id }
	};
	let t = e.agentId ?? e.id;
	return {
		subject: S(`/moldea/agents/${t}/instruction.md`),
		entity: {
			agentId: t,
			...e.kind === "tool" || e.kind === "skill" ? {
				capabilityId: e.id,
				capabilityKind: e.kind
			} : {}
		}
	};
}, Er = (e) => {
	let t = new Map();
	for (let n of He(e)) {
		if (n.field !== "affectedBy" || n.declaration.kind !== "glob") continue;
		let e = n.declaration.pattern, r = e.slice(1).split("/"), i = r.findIndex((e) => e.includes("*")), a = S("/" + r.slice(0, i).join("/")), o = t.get(a) ?? [];
		o.push({
			declaration: n,
			pattern: e,
			segments: r
		}), t.set(a, o);
	}
	return t;
}, Dr = async (e, t, n, i) => {
	let a = [];
	try {
		for (let [n, r] of Er(t)) {
			let t = new Set(r);
			if ((await e.getEntry(n, i === void 0 ? void 0 : { signal: i }))?.type === "directory") {
				for await (let r of e.iterateEntries({
					prefix: n,
					...i === void 0 ? {} : { signal: i }
				})) if (r.type === "file") {
					for (let e of t) Ne(e.segments, r.path) && t.delete(e);
					if (t.size === 0) break;
				}
			}
			a.push(...t);
		}
	} catch (e) {
		if (e instanceof r && e.code === "RESOURCE_LIMIT_EXCEEDED" || e instanceof x && e.code === "RESOURCE_LIMIT_EXCEEDED") return {
			completed: !1,
			diagnostics: []
		};
		throw e;
	}
	let o = d(n, "validate-project");
	for (let { declaration: e, pattern: t } of a) {
		let { subject: n, entity: r } = Tr(e.owner);
		o.add({
			code: "MOLDEA_IMPACT_PATTERN_UNMATCHED",
			path: S("/moldea/moldea.yaml"),
			pointer: e.pointer,
			subject: n,
			qualifier: t,
			entity: r,
			details: {
				pattern: t,
				owner: n
			}
		});
	}
	return {
		completed: !0,
		diagnostics: o.finalize()
	};
}, Or = (e) => JSON.stringify([
	e.code,
	e.subject,
	e.qualifier ?? null
]), kr = (e, t, n, r) => {
	let i = new Map(t.map((e, t) => [Or(e), {
		entry: e,
		index: t
	}])), a = new Set(), o = e.map((e) => {
		if (e.severity !== "warning" || !e.acceptable || !n.has(e.code)) return e;
		let t = Or(e), r = i.get(t);
		return r === void 0 ? e : (a.add(t), m({
			...e,
			accepted: !0,
			reason: r.entry.reason
		}));
	}), c = d(r, "validate-project");
	for (let [e, { entry: t, index: r }] of i) {
		if (a.has(e) || !n.has(t.code)) continue;
		let i = `/acceptedWarnings/${r}`;
		c.add({
			code: "MOLDEA_ACCEPTANCE_UNMATCHED",
			path: S("/moldea/moldea.yaml"),
			pointer: i,
			subject: S("/moldea/moldea.yaml"),
			qualifier: i,
			details: {
				code: t.code,
				subject: t.subject,
				qualifier: t.qualifier ?? null
			}
		});
	}
	return s([...o, ...c.finalize()]);
}, Ar = (e, t) => {
	for (let n of t) e.merge(n);
}, jr = (e, t, n, r, i, a, o) => {
	e.add({
		code: t,
		details: {
			...o === void 0 ? {} : { actualType: o.type },
			mirrorPath: r
		},
		entity: { agentId: a },
		path: n,
		pointer: i
	});
}, Mr = async (e, t, n, r, i, a, o, s, c, l) => {
	let u = await e.getEntry(r, c);
	if (u === null) return jr(s, "MOLDEA_MIRROR_MISSING", t, r, i, a), null;
	if (u.type === "symlink") return jr(s, "MOLDEA_MIRROR_SYMLINK", t, r, i, a, u), null;
	if (u.type !== "file") return jr(s, "MOLDEA_MIRROR_NOT_FILE", t, r, i, a, u), null;
	let d = await W(e, r, o.limits, l);
	return Ar(s, d.diagnostics), d.asset === null ? null : d.asset.content === n.content ? {
		byteLength: d.asset.utf8ByteLength,
		canonicalDigest: n.digest,
		digest: d.asset.digest,
		path: r,
		scalarLength: d.asset.scalarLength
	} : (jr(s, "MOLDEA_MIRROR_STALE", t, r, i, a), null);
}, Nr = async (e, t, n, r, i) => {
	r = a(r);
	let o = d(r.limits, "validate-project"), s = [], c = i === void 0 ? void 0 : { signal: i };
	for (let a of [...n].sort((e, t) => u(e.id, t.id))) {
		let n = [];
		if (a.instruction !== null) {
			let s = a.declaration.mirrors ?? [];
			for (let [l, u] of s.entries()) {
				let s = await Mr(e, t, a.instruction, u, `/agents/${g(a.id)}/mirrors/${l}`, a.id, r, o, c, i);
				s !== null && n.push(s);
			}
		}
		s.push({
			id: a.id,
			mirrors: n
		});
	}
	let l = o.finalize();
	return m({
		agentMirrors: s,
		diagnostics: l,
		valid: l.length === 0
	});
}, Pr = (e, t) => {
	for (let n of t) e.merge(n);
}, Fr = async (e, t, n, r) => {
	n = a(n);
	let i = d(n.limits, "validate-project"), o = null;
	if (t !== null) {
		let a = await W(e, t, n.limits, r);
		Pr(i, a.diagnostics), a.asset !== null && (O(a.asset.content) ? o = a.asset : i.add({
			code: "MOLDEA_PROJECT_FILE_EMPTY",
			path: a.asset.path
		}));
	}
	let s = i.finalize();
	return m({
		diagnostics: s,
		project: o,
		valid: s.length === 0
	});
}, Ir = async (e, t, n, r, i, o) => {
	r = a(r);
	let s = d(r.limits, "validate-project"), c = [], l = o ?? await Fr(e, n.inventory.project, r, i);
	Pr(s, l.diagnostics);
	for (let a of [...n.inventory.context].sort(u)) {
		let n = await W(e, a, r.limits, i);
		if (Pr(s, n.diagnostics), n.asset !== null) {
			if (!O(n.asset.content)) {
				s.add({
					code: "MOLDEA_CONTEXT_FILE_EMPTY",
					path: a
				});
				continue;
			}
			c.push({
				asset: n.asset,
				relationships: t?.context?.[a] ?? null
			});
		}
	}
	let f = s.finalize();
	return m({
		context: c,
		diagnostics: f,
		project: l.project,
		valid: f.length === 0
	});
}, Lr = (e, t) => [...e].sort((e, t) => u(e.id, t.id) || u(e.path, t.path)).map((e) => ({
	decision: e,
	relationships: t.value.decisions?.[e.path] ?? null
})), Rr = (e, t) => {
	let n = new Map(t.map((e) => [e.id, e.mirrors])), r = [];
	if (n.size !== e.length) return null;
	for (let t of [...e].sort((e, t) => u(e.id, t.id))) {
		let e = n.get(t.id);
		if (t.description === null || t.instruction === null || e === void 0) return null;
		r.push({
			context: [...t.declaration.context ?? []].sort(u),
			decisions: [...t.declaration.decisions ?? []].sort(u),
			declaration: t.declaration,
			description: t.description,
			id: t.id,
			instruction: t.instruction,
			mirrors: [...e].sort((e, t) => u(e.path, t.path))
		});
	}
	return r;
}, zr = (e) => {
	let t = Rr(e.agents, e.agentMirrors);
	return t === null ? null : m({
		agents: t,
		context: [...e.context].sort((e, t) => u(e.asset.path, t.asset.path)),
		decisions: Lr(e.decisions, e.manifest),
		formatVersion: 1,
		manifest: e.manifest,
		project: e.project
	});
}, Br = (e) => !/\.d\.(?:ts|tsx|mts|cts)$/.test(e) && /\.(?:ts|tsx|mts|cts|js|mjs|jsx)$/.test(e), Vr = async (e, t, n, r) => {
	if (!Br(t)) return {
		kind: "not-checked",
		reason: "unsupported-file-type"
	};
	let i = Xt(e), a = 65536 + n * 520, o = Math.max(1, n + Math.min(65536, n));
	if (n > r || !i.tryReserve(a + o)) return {
		kind: "not-checked",
		reason: "resource-limit"
	};
	i.release(o);
	try {
		let e = await i.readSourceFile(t);
		try {
			if (e.bytes.byteLength !== n) throw new x({
				code: "INVALID_SOURCE_DATA",
				operation: "read-file-page",
				path: t,
				retryable: !1
			});
			let { inventoryExports: r } = await import("./chunk-936e5d09.mjs"), a = r(t, e.bytes);
			if (a.kind === "parsed") {
				let e = 64;
				for (let t of a.names) e += 64 + t.length * 2;
				i.reserve(e);
			}
			return a;
		} finally {
			e.release();
		}
	} finally {
		i.release(a);
	}
}, Y = (e, t) => `${e}/${g(t)}`, Hr = (e, t, n, r, i) => {
	for (let [a, o] of (t ?? []).entries()) e.push({
		entity: r,
		kind: "reference",
		path: o.path,
		pointer: Y(n, String(a)),
		...i === void 0 ? {} : { relationship: i },
		...o.symbol === void 0 ? {} : { symbol: o.symbol }
	});
}, Ur = (e, t, n, r) => {
	for (let [i, a] of (t ?? []).entries()) a.includes("*") || e.push({
		entity: r,
		kind: "impact",
		path: S(a),
		pointer: Y(n, String(i))
	});
}, Wr = (e, t, n, r) => {
	Hr(e, t.bindings, Y(n, "bindings"), r, n.startsWith("/context/") ? "context-binding" : "decision-binding"), Ur(e, t.affectedBy, Y(n, "affectedBy"), r);
}, Gr = (e, t, n, r, i, a, o = []) => {
	let s = Y(a, r), c = {
		agentId: i,
		capabilityId: r,
		capabilityKind: n
	};
	e.push({
		entity: c,
		kind: `${n}-implementation`,
		relationship: `${n}-implementation`,
		...t.implementation.symbol === void 0 ? {} : { symbol: t.implementation.symbol },
		path: t.implementation.path,
		pointer: Y(s, "implementation")
	});
	for (let [r, i] of [["registration", t.registration], ...o]) i !== void 0 && e.push({
		entity: c,
		kind: "reference",
		path: i.path,
		pointer: Y(s, r),
		relationship: `${n}-${r === "inputSchema" ? "input-schema" : r === "outputSchema" ? "output-schema" : "registration"}`,
		...i.symbol === void 0 ? {} : { symbol: i.symbol }
	});
	Ur(e, t.affectedBy, Y(s, "affectedBy"), c);
}, Kr = (e, t, n) => {
	let r = `/agents/${g(t)}`, i = { agentId: t }, a = Y(r, "bindings"), o = n.bindings;
	for (let t of [
		"runtimeAgent",
		"inputSchema",
		"outputSchema",
		"instructionLoader"
	]) {
		let n = o?.[t];
		n !== void 0 && e.push({
			entity: i,
			kind: "reference",
			path: n.path,
			pointer: Y(a, t),
			relationship: {
				runtimeAgent: "runtime-agent",
				inputSchema: "agent-input-schema",
				outputSchema: "agent-output-schema",
				instructionLoader: "instruction-loader"
			}[t],
			...n.symbol === void 0 ? {} : { symbol: n.symbol }
		});
	}
	Ur(e, n.affectedBy, Y(r, "affectedBy"), i);
	let s = Y(r, "tools");
	for (let r of Object.keys(n.tools ?? {}).sort(u)) {
		let i = n.tools?.[r];
		i !== void 0 && Gr(e, i, "tool", r, t, s, [["inputSchema", i.inputSchema], ["outputSchema", i.outputSchema]]);
	}
	let c = Y(r, "skills");
	for (let r of Object.keys(n.skills ?? {}).sort(u)) {
		let i = n.skills?.[r];
		i !== void 0 && Gr(e, i, "skill", r, t, c);
	}
}, qr = (e) => {
	let t = [];
	for (let n of ["context", "decisions"]) {
		let r = e[n];
		for (let e of Object.keys(r ?? {}).sort(u)) {
			let i = r?.[e];
			if (i === void 0) continue;
			let a = Y(`/${n}`, e), o = n === "decisions" ? A(S(e)) : null;
			Wr(t, i, a, o === null ? { contextPath: S(e) } : { decisionId: o });
		}
	}
	for (let n of Object.keys(e.agents ?? {}).sort(u)) {
		let r = e.agents?.[n];
		r !== void 0 && Kr(t, n, r);
	}
	return t.sort((e, t) => u(e.pointer, t.pointer));
}, Jr = (e, t) => {
	let n = e;
	for (; n.length > 0;) {
		if (t.has(n)) return !0;
		let e = n.lastIndexOf("/");
		if (e <= 0) return !1;
		n = n.slice(0, e);
	}
	return !1;
}, Yr = (e, t) => {
	let n = { [e.kind === "impact" ? "impactPath" : "referencedPath"]: e.path };
	return t !== null && (n.actualType = t.type), (e.kind === "tool-implementation" || e.kind === "skill-implementation") && (n.reason = t === null ? "missing" : t.type === "symlink" ? "symlink" : "not-file"), n;
}, Xr = (e, t) => t?.type === "file" ? null : e.kind === "tool-implementation" ? "MOLDEA_TOOL_IMPLEMENTATION_MISSING" : e.kind === "skill-implementation" ? "MOLDEA_SKILL_IMPLEMENTATION_MISSING" : e.kind === "impact" ? t === null ? "MOLDEA_IMPACT_PATH_MISSING" : "MOLDEA_IMPACT_PATH_NOT_FILE" : t === null ? "MOLDEA_REFERENCE_MISSING" : t.type === "symlink" ? "MOLDEA_REFERENCE_SYMLINK" : "MOLDEA_REFERENCE_NOT_FILE", Zr = (e, t, n, r) => {
	let i = Xr(e, t);
	i !== null && r.add({
		code: i,
		details: Yr(e, t),
		entity: e.entity,
		path: n,
		pointer: e.pointer
	});
}, Qr = async (e, t, n, i, a, o, s = []) => {
	let c = d(a, "validate-project"), l = new Set(i.diagnostics.flatMap((e) => e.path === null ? [] : [e.path])), u = new Map(), f = new Map(), p = o === void 0 ? void 0 : { signal: o };
	for (let i of qr(n)) {
		if (Jr(i.path, l)) continue;
		let n = f.get(i.path);
		n === void 0 && (n = e.getEntry(i.path, p), f.set(i.path, n));
		let o = await n;
		if (Zr(i, o, t, c), o?.type !== "file" || i.relationship === void 0) continue;
		if (o.byteLength === null) throw TypeError("A repository file entry must declare its byte length.");
		if (s.length >= a.maxCoverage) throw new r({
			code: "RESOURCE_LIMIT_EXCEEDED",
			operation: "validate-project",
			limit: "maxCoverage",
			limitMaximum: a.maxCoverage,
			observedUsage: s.length + 1,
			nextAction: "reduce-input-or-increase-limit"
		});
		let d = {
			entity: i.entity ?? {},
			relationship: i.relationship,
			path: i.path,
			symbol: i.symbol ?? null,
			fileCheck: "passed"
		}, m;
		if (i.symbol === void 0) m = {
			...d,
			exportCheck: "not-checked",
			exportNotCheckedReason: "no-symbol"
		};
		else {
			let n = u.get(i.path);
			n === void 0 && (n = await Vr(e, i.path, o.byteLength, a.maxFileBytes), u.set(i.path, n)), n.kind === "not-checked" ? m = {
				...d,
				exportCheck: "not-checked",
				exportNotCheckedReason: n.reason
			} : n.complete ? n.names.has(i.symbol) ? m = {
				...d,
				exportCheck: "passed"
			} : (m = {
				...d,
				exportCheck: "failed"
			}, c.add({
				code: "MOLDEA_REFERENCE_EXPORT_MISSING",
				entity: i.entity,
				path: t,
				pointer: i.pointer,
				details: {
					referencedPath: i.path,
					symbol: i.symbol,
					relationship: i.relationship
				}
			})) : m = {
				...d,
				exportCheck: "not-checked",
				exportNotCheckedReason: "unresolved-exports"
			};
		}
		Zt(e, 512 + JSON.stringify(m).length * 2), s.push(m);
	}
	return c.finalize();
}, $r = S("/moldea"), ei = S("/moldea/moldea.yaml"), ti = S("/moldea/project.md"), X = (e, t) => {
	for (let n of t) e.merge(n);
}, ni = async (e, t) => {
	t = a(t);
	let { session: n, signal: r } = e, i = [], s = d(t.limits, "validate-project"), c = r === void 0 ? void 0 : { signal: r }, l = new Map(), u = Xt(n.reader), p = 0, h = (e, t) => {
		let n = f(t);
		u.reserve(n), p += n, l.set(e, t);
	};
	try {
		let e = await n.reader.getEntry($r, c), a = null, u = null, d = null, f = null;
		if (e?.type === "directory") {
			if (a = await n.reader.getEntry(ei, c), a?.type === "file") {
				let e = await gt({
					content: await n.reader.readCompleteFile(ei, c),
					path: ei
				}, t, "validate-project");
				e.manifest !== null && e.yamlRoot !== null && h(ei, e.yamlRoot), f = e.formatVersion, X(s, e.diagnostics), e.asset !== null && e.manifest !== null && (d = {
					asset: e.asset,
					value: e.manifest
				});
			}
			u = await n.reader.getEntry(ti, c);
		}
		let p = await Fr(n.reader, u?.type === "file" ? ti : null, t, r);
		X(s, p.diagnostics);
		let g = await zn(n.reader, t.limits, r, {
			manifest: a,
			moldeaRoot: e,
			project: u
		});
		X(s, g.diagnostics), n.throwIfAborted();
		let _ = await Ir(n.reader, d?.value ?? null, g, t, r, p);
		X(s, _.diagnostics);
		let v = await $n(n.reader, g.inventory.decisions, t, r, h);
		X(s, v.diagnostics);
		let y = [], b = [];
		if (d !== null) {
			let e = d.asset.path, a = await yn(n.reader, d.value, g, t, r);
			y = a.agents, X(s, a.diagnostics), X(s, rr(e, d.value, g, v.decisions, t.limits)), X(s, await Qr(n.reader, e, d.value, g, t.limits, r, i));
			let o = await Nr(n.reader, e, y, t, r);
			b = o.agentMirrors, X(s, o.diagnostics);
		}
		n.throwIfAborted(), X(s, await wr(n.reader, n.instructions, t.limits, r));
		let x = d === null ? {
			completed: !1,
			diagnostics: []
		} : await Dr(n.reader, d.value, t.limits, r);
		n.throwIfAborted(), X(s, x.diagnostics);
		let S = o(kr(s.finalize(), d?.value.acceptedWarnings ?? [], new Set([
			"MOLDEA_INTEGRATION_BLOCK_MISSING",
			"MOLDEA_INTEGRATION_SKILL_MISSING",
			"MOLDEA_INTEGRATION_BLOCK_STALE",
			"MOLDEA_INTEGRATION_LINK_UNRESOLVED",
			"MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING",
			...x.completed ? ["MOLDEA_IMPACT_PATTERN_UNMATCHED"] : []
		]), t.limits), l), C = !S.some((e) => e.severity === "error") && d !== null && _.project !== null ? zr({
			agentMirrors: b,
			agents: y,
			context: _.context,
			decisions: v.decisions,
			manifest: d,
			project: _.project
		}) : null;
		return m({
			diagnostics: S,
			coverage: i,
			formatVersion: f,
			project: C
		});
	} finally {
		l.clear(), u.release(p);
	}
}, ri = () => {
	throw new r({
		code: "INVALID_ARGUMENT",
		operation: "validate-project"
	});
}, ii = (e) => i(e, !0) && i(e.snapshot, !0) && typeof e.snapshot.id == "string" && typeof e.snapshot.sourceKind == "string" && typeof e.compare == "function" && typeof e.getEntry == "function" && typeof e.listEntriesPage == "function" && typeof e.readFilePage == "function" && typeof e.readLinkText == "function", ai = (e) => i(e, !0) && typeof e.aborted == "boolean" && typeof e.addEventListener == "function" && typeof e.removeEventListener == "function", oi = (e) => {
	try {
		if (!i(e, !0)) return ri();
		let t = e.repository, n = e.instructions, r = e.signal;
		return Reflect.ownKeys(e).some((e) => e !== "repository" && e !== "instructions" && e !== "signal") || !ii(t) || n !== void 0 && !ii(n) || r !== void 0 && !ai(r) ? ri() : {
			...n === void 0 ? {} : { instructions: n },
			repository: t,
			...r === void 0 ? {} : { signal: r }
		};
	} catch (e) {
		if (e instanceof r) throw e;
		return ri();
	}
}, si = async (e, t) => {
	let n = oi(e), r = a(t), i = ln(n.repository, r.limits, n.signal, n.instructions), o = await ni({
		session: i,
		...n.signal === void 0 ? {} : { signal: n.signal }
	}, r);
	i.throwIfAborted();
	let s = h(o.diagnostics);
	return m({
		project: o.project,
		resourceUsage: i.getResourceUsage(),
		result: {
			diagnostics: o.diagnostics,
			...s,
			coverage: o.coverage,
			coverageCounts: qt(o.coverage),
			formatVersion: o.formatVersion,
			source: n.repository.snapshot,
			summary: o.project === null ? null : Kt(o.project),
			valid: s.errorCount === 0
		}
	});
}, ci = async (e, t) => (await si(e, t)).result, li = "core7", ui = 512, di = 64, fi = 2, pi = 8, Z = new TextEncoder(), Q = () => {
	throw new r({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
}, mi = (e, t) => {
	throw new r({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxRetainedBytes",
		limitMaximum: e,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: t,
		operation: "create-project-inspection"
	});
}, $ = (e) => {
	if (typeof e != "object" || !e) {
		let t = JSON.stringify(e);
		return t === void 0 ? "null" : t;
	}
	return Array.isArray(e) ? `[${e.map((e) => $(e)).join(",")}]` : `{${Object.entries(e).filter(([, e]) => e !== void 0).sort(([e], [t]) => e < t ? -1 : +(e > t)).map(([e, t]) => `${JSON.stringify(e)}:${$(t)}`).join(",")}}`;
}, hi = (e) => w((function* () {
	for (let t of e) yield Z.encode(t);
})()), gi = (e) => e.kind === "agent" ? ["3", e.agent.agentId].join("\0") : e.kind === "metadata" ? [
	"0",
	e.metadata.path,
	e.metadata.kind,
	e.metadata.agentId ?? "",
	e.metadata.decisionId ?? "",
	e.metadata.digest
].join(":") : e.kind === "diagnostic" ? [
	"1",
	e.diagnostic.source,
	e.diagnostic.code,
	e.diagnostic.path ?? "",
	hi([$(e.diagnostic)])
].join(":") : [
	"2",
	e.coverage.path,
	e.coverage.relationship,
	e.coverage.entity.agentId ?? "",
	hi([$(e.coverage)])
].join(":"), _i = (e) => {
	let t = Array.from(e, (e) => ({
		item: e,
		key: gi(e)
	})).sort((e, t) => e.key < t.key ? -1 : +(e.key > t.key)), n = null, r = 0;
	for (let e of t) {
		let t = e.key;
		r = t === n ? r + 1 : 0, n = t, e.key = `${t}:${String(r).padStart(10, "0")}`;
	}
	return t;
}, vi = (e, t, n) => hi([
	li,
	e,
	t,
	n
]), yi = (e, t, n) => [
	li,
	t,
	encodeURIComponent(n),
	e,
	vi(e, n, t)
].join(":"), bi = (e, t, n) => {
	if (e === void 0) return null;
	let r = /^core7:(all|diagnostics|coverage|metadata):([^:]+):(sha256:[0-9a-f]{64}):(sha256:[0-9a-f]{64})$/u.exec(e);
	if (r === null || r[1] !== n || r[3] !== t) return Q();
	let i;
	try {
		i = decodeURIComponent(r[2]);
	} catch {
		return Q();
	}
	return i.length === 0 || r[4] !== vi(t, i, n) ? Q() : i;
}, xi = (e) => m({
	all: e,
	diagnostics: e.filter(({ item: e }) => e.kind === "diagnostic"),
	coverage: e.filter(({ item: e }) => e.kind === "coverage"),
	metadata: e.filter(({ item: e }) => e.kind === "metadata" || e.kind === "agent")
}), Si = (e, t, n, r) => {
	let i = n + e + t;
	return !Number.isSafeInteger(t) || t < 0 || !Number.isSafeInteger(i) || i > r ? mi(r, Number.isSafeInteger(i) ? i : 2 ** 53 - 1) : e + t;
}, Ci = function* (e) {
	if (e.project !== null) for (let t of Gt(e.project)) yield {
		kind: "metadata",
		metadata: t
	};
	for (let t of e.result.diagnostics) yield {
		diagnostic: t,
		kind: "diagnostic"
	};
	for (let t of e.result.coverage) yield {
		coverage: t,
		kind: "coverage"
	};
	if (e.project !== null) for (let t of Wt(e.project)) yield {
		agent: t,
		kind: "agent"
	};
}, wi = (e, t, n) => {
	let r = e.resourceUsage.retainedBytes, i = Si(0, ui, r, n), a = 0;
	for (let t of Ci(e)) {
		let e = `${gi(t)}:0000000000`, o = Z.encode(e).byteLength + Z.encode($(t)).byteLength;
		i = Si(i, di + o * fi + pi, r, n), t.kind === "metadata" && (a += 1);
	}
	let o = {
		agents: t.agents,
		context: t.context,
		decisions: t.decisions,
		diagnostics: t.diagnostics,
		errors: t.errors,
		coverage: t.coverage,
		metadata: a,
		mirrors: t.mirrors,
		warnings: t.warnings,
		acceptedWarnings: t.acceptedWarnings
	};
	return i = Si(i, Z.encode($({
		counts: o,
		formatVersion: e.result.formatVersion,
		inspectionDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
		source: e.result.source,
		summary: e.result.summary,
		valid: e.result.valid
	})).byteLength * fi, r, n), {
		counts: o,
		preparedBytes: i
	};
}, Ti = (e, t, n, r, i, a) => hi((function* () {
	yield "core7-prepared-inspection", yield $({
		counts: e,
		coverageCounts: t,
		formatVersion: n,
		summary: i,
		valid: a
	});
	for (let { key: e } of r) yield e;
})()), Ei = (e, t) => {
	if (t === null) return 0;
	let n = 0, r = e.length - 1;
	for (; n <= r;) {
		let i = n + Math.floor((r - n) / 2), a = e[i];
		if (a === void 0) return Q();
		if (a.key === t) return i + 1;
		a.key < t ? n = i + 1 : r = i - 1;
	}
	return Q();
}, Di = (e) => {
	let { counts: t, coverageCounts: n, formatVersion: r, items: i, maxEntries: a, preparedBytes: o, resourceUsage: s, source: c, summary: l, valid: u } = e, d = xi(i), f = Ti(t, n, r, i, l, u), p = m({
		canonicalBytes: s.canonicalBytes,
		peakRetainedBytes: Math.max(s.peakRetainedBytes, s.retainedBytes + o),
		preparedBytes: o,
		retainedBytes: o,
		totalBytesRead: s.totalBytesRead
	});
	return m({
		counts: t,
		coverageCounts: n,
		formatVersion: r,
		inspectionDigest: f,
		readPage: (e) => {
			if (typeof e != "object" || !e || Reflect.ownKeys(e).some((e) => e !== "cursor" && e !== "maxItems" && e !== "view") || !Number.isSafeInteger(e.maxItems) || e.maxItems < 1 || e.maxItems > a || e.cursor !== void 0 && typeof e.cursor != "string" || e.view !== "all" && e.view !== "diagnostics" && e.view !== "coverage" && e.view !== "metadata") return Q();
			let i = d[e.view], o = Ei(i, bi(e.cursor, f, e.view)), s = i.slice(o, o + e.maxItems).map(({ item: t, key: n }, r) => ({
				item: t,
				nextCursor: o + r + 1 >= i.length ? null : yi(f, e.view, n)
			})), p = s.at(-1)?.nextCursor ?? null;
			return m({
				counts: t,
				coverageCounts: n,
				formatVersion: r,
				inspectionDigest: f,
				page: {
					isComplete: p === null,
					nextCursor: p,
					records: s,
					totalItems: i.length
				},
				source: c,
				summary: l,
				valid: u,
				view: e.view
			});
		},
		resourceUsage: p,
		source: c,
		summary: l,
		valid: u
	});
}, Oi = async (e, t) => {
	let n = await si(e, t), r = wi(n, {
		agents: n.result.summary?.counts.agents ?? 0,
		context: n.result.summary?.counts.context ?? 0,
		decisions: n.result.summary?.counts.decisions ?? 0,
		diagnostics: n.result.diagnostics.length,
		errors: n.result.errorCount,
		coverage: n.result.coverage.length,
		mirrors: n.result.summary?.counts.mirrors ?? 0,
		warnings: n.result.warningCount,
		acceptedWarnings: n.result.acceptedWarningCount
	}, t.limits.maxRetainedBytes), i = m(r.counts), a = m(_i(Ci(n)));
	return Di({
		counts: i,
		coverageCounts: n.result.coverageCounts,
		formatVersion: n.result.formatVersion,
		items: a,
		maxEntries: t.limits.maxEntries,
		preparedBytes: r.preparedBytes,
		resourceUsage: n.resourceUsage,
		source: n.result.source,
		summary: n.result.summary,
		valid: n.result.valid
	});
}, ki = Ct({ createCore: () => Ai }), Ai = (e) => {
	let t = v(e);
	return m({
		calculateContentDigest: (e) => je(e, a(t).limits),
		createProjectInspection: (e) => Oi(e, a(t)),
		validateProject: (e) => ci(e, a(t)),
		matchManifestScope: (e) => xt(e, a(t)),
		normalizeText: (e) => j(e, a(t).limits, "normalize-text"),
		parseDecision: (e) => Ut(e, a(t)),
		parseManifest: (e) => _t(e, a(t)),
		readCanonicalContentPage: (e) => kt(e, a(t))
	});
};
//#endregion
export { or as i, Ai as n, Br as r, ki as t };
