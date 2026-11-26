//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/shared/constants.js
var e = (e) => {
	let t = new WeakMap();
	return JSON.stringify(e, function(e, n) {
		if (typeof n == "object" && n) {
			let e = (t.get(this) ?? 0) + 1;
			if (e > 256) throw RangeError("The value is nested too deeply to serialize.");
			t.set(n, e);
		}
		return n;
	});
}, t = (e, t) => {
	let n = [];
	return t.forEach((t) => {
		let r = e.indexOf(t);
		for (; r !== -1;) n.push({
			start: r,
			end: r + t.length
		}), r = e.indexOf(t, r + 1);
	}), n;
}, n = (e) => {
	let t = [...e].sort((e, t) => e.start - t.start || t.end - e.end), n = [];
	return t.forEach((e) => {
		let t = n.at(-1);
		if (!t || e.start >= t.end) {
			n.push({ ...e });
			return;
		}
		e.end > t.end && (t.end = e.end);
	}), n;
}, r = (e, r) => {
	let i = [...new Set(r.filter((e) => e.length > 0))];
	if (!i.length) return e;
	let a = n(t(e, i));
	if (!a.length) return e;
	let o = [], s = 0;
	return a.forEach((t) => {
		o.push(e.slice(s, t.start), "[redacted]"), s = t.end;
	}), o.push(e.slice(s)), o.join("");
}, i = (e) => {
	if (typeof e != "object" || !e) return null;
	let { code: t } = e;
	return typeof t == "string" && t.length > 0 ? t : null;
}, a = (e, t) => t.length > 0 && (typeof e == "string" ? e : i(e)) === t, o = Symbol.for("jg-exception.Exception"), s = ["expected", "critical"], c = new Set([
	"name",
	"message",
	"stack",
	"cause"
]), l = new Set(["severity", "shouldLog"]), u = 32, d = /^(?:0|[1-9]\d*)$/, f = (e, t) => {
	let n = e;
	for (let e = 0; n !== null && e < u; e += 1) {
		let e = Reflect.getOwnPropertyDescriptor(n, t);
		if (e !== void 0) return e;
		n = Reflect.getPrototypeOf(n);
	}
	return {};
}, p = Reflect.get(f(Error(), "stack"), "get"), m = (e, t) => {
	if ("value" in t) return t.value;
	let n = Reflect.get(t, "get");
	return typeof n == "function" && n === p ? Reflect.apply(n, e, []) : void 0;
}, h = (e, t, n) => {
	try {
		return m(e, n ? f(e, t) : Reflect.getOwnPropertyDescriptor(e, t) ?? {});
	} catch {
		return;
	}
}, g = (e) => {
	let t;
	try {
		t = Reflect.ownKeys(e);
	} catch {
		return [];
	}
	return t.flatMap((t) => {
		if (typeof t != "string") return [];
		try {
			let n = Reflect.getOwnPropertyDescriptor(e, t);
			return n?.enumerable === !0 && "value" in n ? [[t, n.value]] : [];
		} catch {
			return [];
		}
	});
}, _ = (e, t, n, r) => {
	Object.defineProperty(e, t, {
		value: n,
		enumerable: r,
		writable: !0,
		configurable: !0
	});
}, v = (e) => e === null || typeof e != "object" && typeof e != "function", y = (e, t) => {
	if (typeof e == "string") return r(e, t);
	if (e == null) return e;
	let n = String(e), i = r(n, t);
	return i === n ? e : i;
}, b = (e, t, n, r) => {
	if (typeof e != "object" || !e) return typeof e == "function" || typeof e == "symbol" || typeof e == "bigint" ? void 0 : y(e, t);
	if (!n.has(e)) {
		if (r >= 256) throw RangeError("The data is nested too deeply to copy.");
		n.add(e);
		try {
			let i = g(e);
			if (Array.isArray(e)) {
				let e = [];
				for (let [a, o] of i) d.test(a) && (e[Number(a)] = b(o, t, n, r + 1) ?? null);
				return e;
			}
			let a = {};
			for (let [e, o] of i) {
				let i = b(o, t, n, r + 1);
				i !== void 0 && _(a, e, i, !0);
			}
			return a;
		} finally {
			n.delete(e);
		}
	}
}, x = (e, t) => {
	try {
		return b(e, t, new Set(), 0);
	} catch {
		return null;
	}
}, S = (e, t, n) => {
	let { values: i, exceptionClass: a, snapshots: s } = t, u = h(e, o, !1) === !0, d = h(e, "message", !1), f = Reflect.construct(Error, [typeof d == "string" ? r(d, i) : ""], u ? a : Error);
	s.set(e, f);
	let p = h(e, "name", !0);
	_(f, "name", typeof p == "string" ? r(p, i) : "Error", !1);
	let m = h(e, "stack", !0);
	typeof m == "string" ? _(f, "stack", r(m, i), !1) : Reflect.deleteProperty(f, "stack");
	for (let [t, n] of g(e)) !(c.has(t) || u && t === "data") && v(n) && _(f, t, u && l.has(t) ? n : y(n, i), !0);
	if (u) {
		Object.defineProperty(f, o, { value: !0 });
		let t = h(e, "data", !1);
		_(f, "data", t === void 0 ? void 0 : x(t, i), !0);
	}
	let b;
	try {
		b = Reflect.getOwnPropertyDescriptor(e, "cause") !== void 0;
	} catch {
		b = !1;
	}
	return b && n < 256 && _(f, "cause", C(h(e, "cause", !1), t, n + 1), !1), f;
}, C = (e, t, n) => v(e) ? y(e, t.values) : t.snapshots.has(e) ? t.snapshots.get(e) : S(e, t, n), w = (e) => {
	let t = new Set();
	try {
		for (let n of Array.isArray(e) ? e : []) if (typeof n == "string" && n.length > 0) {
			t.add(n);
			try {
				t.add(encodeURIComponent(n));
			} catch {}
		}
	} catch {}
	return [...t];
}, T = (e, t, n) => {
	let i = w(t);
	if (i.length === 0) return e;
	let a;
	try {
		a = r(Error(e.message).message, i);
	} catch {
		a = "";
	}
	return {
		message: a,
		data: e.data === void 0 ? void 0 : x(e.data, i),
		cause: C(e.cause, {
			values: i,
			exceptionClass: n,
			snapshots: new Map()
		}, 1)
	};
}, E = (t) => {
	try {
		let n = e(t);
		return n === void 0 ? null : JSON.parse(n);
	} catch {
		return null;
	}
}, D = (e) => s.includes(e), O = class e extends Error {
	code;
	data;
	constructor(t, n) {
		let { code: r, data: i, cause: a, redact: s, severity: c, shouldLog: l } = n ?? { code: "" }, u = T({
			message: t,
			data: i,
			cause: a
		}, s, e);
		super(u.message, u.cause === void 0 ? void 0 : { cause: u.cause }), this.name = "Exception", this.code = typeof r == "string" && r.length > 0 ? r : "UNKNOWN_ERROR", this.data = u.data, D(c) && (this.severity = c), l === !0 && (this.shouldLog = !0), Object.defineProperty(this, o, { value: !0 });
	}
	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			data: E(this.data)
		};
	}
	toString() {
		return `${this.name} [${this.code}]: ${this.message}`;
	}
}, k = {
	MIXED_OR_UNSUPPORTED_DATA_TYPES: "MIXED_OR_UNSUPPORTED_DATA_TYPES",
	UNSUPPORTED_DATA_TYPE: "UNSUPPORTED_DATA_TYPE",
	INVALID_OR_EMPTY_ARRAY: "INVALID_OR_EMPTY_ARRAY",
	INVALID_OR_EMPTY_OBJECT: "INVALID_OR_EMPTY_OBJECT",
	UNABLE_TO_SERIALIZE_JSON: "UNABLE_TO_SERIALIZE_JSON",
	UNABLE_TO_DESERIALIZE_JSON: "UNABLE_TO_DESERIALIZE_JSON",
	INVALID_BATCH_SIZE: "INVALID_BATCH_SIZE",
	UNABLE_TO_SLUGIFY_STRING: "UNABLE_TO_SLUGIFY_STRING",
	INVALID_TIME_STRING: "INVALID_TIME_STRING",
	INVALID_AUTHORIZATION_HEADER: "INVALID_AUTHORIZATION_HEADER",
	INVALID_EMAIL_ADDRESS: "INVALID_EMAIL_ADDRESS",
	INVALID_BASE64URL: "INVALID_BASE64URL",
	WAIT_UNTIL_TIMED_OUT: "WAIT_UNTIL_TIMED_OUT",
	INVALID_CURSOR: "INVALID_CURSOR",
	INVALID_DATE: "INVALID_DATE",
	INVALID_DAY_COUNT: "INVALID_DAY_COUNT",
	INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
	INVALID_BYTE_LIMIT: "INVALID_BYTE_LIMIT",
	INVALID_YOUTUBE_VIDEO_ID: "INVALID_YOUTUBE_VIDEO_ID",
	INVALID_CONCURRENCY_LIMIT: "INVALID_CONCURRENCY_LIMIT",
	INVALID_QUEUE_LIMIT: "INVALID_QUEUE_LIMIT",
	REQUEST_QUEUE_FULL: "REQUEST_QUEUE_FULL",
	REQUEST_COOLDOWN_ACTIVE: "REQUEST_COOLDOWN_ACTIVE",
	REQUEST_COORDINATOR_CLOSED: "REQUEST_COORDINATOR_CLOSED",
	CURSOR_TOO_LONG: "CURSOR_TOO_LONG",
	TASK_RUNNER_CLOSED: "TASK_RUNNER_CLOSED",
	TASK_RUNNER_BUSY: "TASK_RUNNER_BUSY",
	DEADLINE_EXCEEDED: "DEADLINE_EXCEEDED",
	INVALID_DEADLINE: "INVALID_DEADLINE",
	INVALID_MARKED_REGION: "INVALID_MARKED_REGION"
}, A = (e, t = -(2 ** 53 - 1), n = 2 ** 53 - 1) => typeof e == "number" && e >= t && e <= n, j = (e, t, n) => A(e, t, n) && Number.isInteger(e), M = (e, t) => typeof e == "object" && !!e && !Array.isArray(e) && (t || Object.keys(e).length > 0), N = (e, t) => Array.isArray(e) && (t || e.length > 0), P = (e) => {
	if (!M(e, !0) && !N(e, !0)) throw new O(`The JSON value must be an object or an array in order to be stringified. Received: ${String(e)}`, { code: k.UNSUPPORTED_DATA_TYPE });
}, F = (e, t) => {
	if (typeof t != "string" || !t.length) throw new O(`Stringifying the JSON value '${String(e)}' produced an invalid result: ${String(t)}.`, { code: k.UNABLE_TO_SERIALIZE_JSON });
}, I = (e) => {
	if (!Number.isSafeInteger(e) || e < 0) throw new O("The byte limit must be a non-negative safe integer.", {
		code: k.INVALID_BYTE_LIMIT,
		data: { maxBytes: String(e) }
	});
}, L = (e) => e.reduce((e, t) => typeof t == "number" ? `${e}[${t}]` : /^[A-Za-z_$][\w$]*$/.test(t) ? `${e}.${t}` : `${e}[${JSON.stringify(t)}]`, "$"), R = (e, t) => {
	throw new O(`Failed to stringify the JSON value deterministically: the value at ${L(e)} ${t}.`, { code: k.UNABLE_TO_SERIALIZE_JSON });
}, z = (e, t) => {
	let n = typeof e == "object" && e && typeof e.toJSON == "function" ? e.toJSON(t) : e;
	return n instanceof Number ? Number(n) : n instanceof String || n instanceof Boolean ? n.valueOf() : n;
}, B = (e, t, n, r) => {
	switch (typeof e) {
		case "string":
		case "boolean": return JSON.stringify(e);
		case "number": return t && !Number.isFinite(e) && R(r, `is ${String(e)}, which JSON can't hold`), JSON.stringify(e);
		case "bigint": return R(r, "is a BigInt, which JSON can't hold");
		case "undefined":
		case "function":
		case "symbol": return t ? R(r, `is ${typeof e}`) : void 0;
	}
	if (e === null) return "null";
	let i = e;
	n.has(i) && R(r, "refers back to an object that contains it");
	let a = Array.isArray(i);
	if (t && !a) {
		let e = Object.getPrototypeOf(i);
		e !== Object.prototype && e !== null && R(r, "is not a plain object"), Object.getOwnPropertySymbols(i).length > 0 && R(r, "has a symbol key");
	}
	n.add(i);
	let o = [];
	if (a) for (let e = 0; e < i.length; e += 1) {
		t && !Object.hasOwn(i, e) && R([...r, e], "is a hole in the array"), r.push(e);
		let a = t ? i[e] : z(i[e], String(e));
		o.push(B(a, t, n, r) ?? "null"), r.pop();
	}
	else {
		let e = i;
		for (let i of Object.keys(e).sort()) {
			r.push(i);
			let a = B(t ? e[i] : z(e[i], i), t, n, r);
			a !== void 0 && o.push(`${JSON.stringify(i)}:${a}`), r.pop();
		}
	}
	return n.delete(i), a ? `[${o.join(",")}]` : `{${o.join(",")}}`;
}, V = (e, { strict: t = !1 } = {}) => {
	P(e);
	try {
		let n = B(t ? e : z(e, ""), t, new Set(), []);
		return F(e, n), n;
	} catch (t) {
		throw i(t) === k.UNABLE_TO_SERIALIZE_JSON ? t : new O(`Failed to stringify the JSON value deterministically '${String(e)}'.`, {
			code: k.UNABLE_TO_SERIALIZE_JSON,
			cause: t
		});
	}
}, H = 64, U = new Set([
	8,
	9,
	10,
	12,
	13,
	34,
	92
]), W = (e, t) => {
	let n = 2;
	for (let r = 0; r < e.length && n <= t; r += 1) {
		let t = e.charCodeAt(r);
		U.has(t) ? n += 2 : t < 32 ? n += 6 : t < 128 ? n += 1 : t < 2048 ? n += 2 : t >= 55296 && t <= 56319 && (e.charCodeAt(r + 1) & 64512) == 56320 ? (n += 4, r += 1) : n += t >= 55296 && t <= 57343 ? 6 : 3;
	}
	return n;
}, G = (e, t, n, r) => {
	if (r > H) throw new O(`The value is nested more than ${H} levels deep.`, { code: k.UNABLE_TO_SERIALIZE_JSON });
	switch (typeof e) {
		case "string": return W(e, t);
		case "number": return Number.isFinite(e) ? String(e).length : 4;
		case "boolean": return e ? 4 : 5;
		case "bigint": throw new O("The value holds a BigInt, which JSON can't hold.", { code: k.UNABLE_TO_SERIALIZE_JSON });
		case "undefined":
		case "function":
		case "symbol": return;
	}
	if (e === null) return 4;
	let i = e;
	if (n.has(i)) throw new O("The value refers back to an object that contains it.", { code: k.UNABLE_TO_SERIALIZE_JSON });
	n.add(i);
	let a = 2, o = 0;
	if (Array.isArray(i)) for (let e = 0; e < i.length && a <= t; e += 1) {
		let s = z(i[e], String(e));
		a += (o === 0 ? 0 : 1) + (G(s, t, n, r + 1) ?? 4), o += 1;
	}
	else {
		let e = i;
		for (let i of Object.keys(e)) {
			if (a > t) break;
			let s = G(z(e[i], i), t, n, r + 1);
			s !== void 0 && (a += (o === 0 ? 0 : 1) + W(i, t) + 1 + s, o += 1);
		}
	}
	return n.delete(i), a;
}, K = (e, t) => {
	I(t);
	let n;
	try {
		n = G(z(e, ""), t, new Set(), 0);
	} catch (e) {
		throw i(e) === k.UNABLE_TO_SERIALIZE_JSON ? e : new O("Failed to measure the JSON value.", {
			code: k.UNABLE_TO_SERIALIZE_JSON,
			cause: e
		});
	}
	if (n === void 0) throw new O(`JSON.stringify writes nothing for ${typeof e} values.`, { code: k.UNABLE_TO_SERIALIZE_JSON });
	return n;
}, q = [
	"create-core",
	"normalize-text",
	"calculate-content-digest",
	"parse-manifest",
	"match-manifest-scope",
	"parse-decision",
	"create-project-inspection",
	"read-canonical-content-page",
	"validate-project"
], J = { INVALID_RESOURCE_LIMIT: "A Core resource limit is invalid." }, Y = {
	ABORTED: "The Core operation was aborted.",
	CONTENT_INVALID: "The canonical content is not valid UTF-8 text.",
	INVALID_ARGUMENT: "The Core operation received an invalid argument.",
	INSPECTION_BUSY: "Project inspection capacity is busy. Try again shortly.",
	INSPECTION_TIMEOUT: "The isolated project inspection timed out.",
	INSPECTION_PROCESS_FAILED: "The isolated project inspection failed.",
	RESOURCE_LIMIT_EXCEEDED: "A Core resource limit was exceeded."
}, X = {
	ABORTED: !0,
	CONTENT_INVALID: !1,
	INVALID_ARGUMENT: !1,
	INSPECTION_BUSY: !0,
	INSPECTION_TIMEOUT: !0,
	INSPECTION_PROCESS_FAILED: !1,
	RESOURCE_LIMIT_EXCEEDED: !1
}, Z = (e) => q.some((t) => t === e), Q = (e) => typeof e == "string" && Object.hasOwn(J, e), $ = (e) => typeof e == "string" && Object.hasOwn(Y, e), ee = class extends O {
	code;
	operation;
	constructor(e) {
		super(J[e.code], {
			code: e.code,
			cause: e.cause
		}), this.code = e.code, this.name = "CoreConfigurationException", this.operation = e.operation;
	}
}, te = class extends O {
	code;
	operation;
	retryable;
	limit;
	limitMaximum;
	nextAction;
	observedUsage;
	constructor(e) {
		super(Y[e.code], {
			code: e.code,
			cause: e.cause
		}), this.code = e.code, this.name = "CoreOperationException", this.operation = e.operation, this.retryable = X[e.code], this.limit = e.limit ?? null, this.limitMaximum = e.limitMaximum ?? null, this.nextAction = e.nextAction ?? null, this.observedUsage = e.observedUsage ?? null;
	}
};
//#endregion
export { $ as a, I as c, k as d, O as f, Z as i, j as l, a as m, te as n, K as o, i as p, Q as r, V as s, ee as t, M as u };
