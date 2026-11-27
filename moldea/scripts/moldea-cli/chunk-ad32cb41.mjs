import { t as e } from "./chunk-d6656fa6.mjs";
import { f as t, p as n, s as r } from "./chunk-2cc3bf5c.mjs";
import { m as i, n as a, p as o } from "./chunk-8f198616.mjs";
import { execFile as s, spawn as c } from "node:child_process";
import { setTimeout as l } from "node:timers/promises";
import { createHash as u, timingSafeEqual as d } from "node:crypto";
import { stat as f } from "node:fs/promises";
//#region ../../node_modules/.pnpm/jg-process@1.6.2/node_modules/jg-process/dist/shared/constants.js
var p = 1048576, m = {
	PROCESS_START_FAILED: "PROCESS_START_FAILED",
	PROCESS_TIMED_OUT: "PROCESS_TIMED_OUT",
	PROCESS_OUTPUT_TOO_LARGE: "PROCESS_OUTPUT_TOO_LARGE",
	PROCESS_TREE_SURVIVED: "PROCESS_TREE_SURVIVED",
	INVALID_PORT: "INVALID_PORT",
	PORT_RESERVATION_FAILED: "PORT_RESERVATION_FAILED",
	UNSUPPORTED_PACKAGE_MANAGER: "UNSUPPORTED_PACKAGE_MANAGER",
	PACKAGE_MANAGER_NOT_FOUND: "PACKAGE_MANAGER_NOT_FOUND",
	INVALID_READINESS_OPTIONS: "INVALID_READINESS_OPTIONS",
	PROCESS_NOT_READY: "PROCESS_NOT_READY",
	PROCESS_EXITED_BEFORE_READY: "PROCESS_EXITED_BEFORE_READY",
	PROCESS_INTERRUPTED: "PROCESS_INTERRUPTED",
	INVALID_SIGNAL: "INVALID_SIGNAL",
	INVALID_PROCESS_OPTIONS: "INVALID_PROCESS_OPTIONS",
	INVALID_PROCESS_ID: "INVALID_PROCESS_ID",
	INVALID_ARGUMENTS: "INVALID_ARGUMENTS",
	STDIN_TOO_LARGE: "STDIN_TOO_LARGE"
}, h = "Get-CimInstance -ClassName Win32_Process | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.ParentProcessId, $(if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc() } else { 0 }) }", g = /^(\d+) (\d+) (\d+)$/u, _ = (e) => e.exitCode !== null || e.signalCode !== null, v = async (e, t) => {
	let n = Date.now() + t;
	for (; !e();) {
		if (Date.now() >= n) return !1;
		await l(50);
	}
	return !0;
}, y = (e) => new t(`The process tree of pid ${e} is still running after it was force-stopped.`, { code: m.PROCESS_TREE_SURVIVED }), b = (e) => e.split(/\r?\n/u).flatMap((e) => {
	let t = g.exec(e.trim());
	if (t === null) return [];
	let [, n = "", r = "", i = ""] = t;
	return [{
		pid: Number(n),
		parentPid: Number(r),
		createdAt: BigInt(i)
	}];
}), x = (e, t) => {
	let n = new Map();
	for (let t of e) {
		let e = n.get(t.parentPid);
		e === void 0 ? n.set(t.parentPid, [t]) : e.push(t);
	}
	let r = e.find((e) => e.pid === t);
	if (r === void 0) return [];
	let i = [r], a = new Set([t]);
	for (let e of i) for (let t of n.get(e.pid) ?? []) !a.has(t.pid) && t.createdAt >= e.createdAt && (a.add(t.pid), i.push(t));
	return i.slice(1).map((e) => e.pid);
}, ee = (e) => new Promise((t) => {
	s("powershell.exe", [
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		h
	], {
		timeout: 1e4,
		windowsHide: !0
	}, (n, r) => {
		t(n === null ? x(b(r), e) : []);
	});
}), te = (e) => {
	try {
		return process.kill(e, 0), !0;
	} catch {
		return !1;
	}
}, ne = async (e, t) => {
	if (_(e)) return;
	let n = new Set(await ee(t));
	if (!_(e) && (await new Promise((e) => {
		s("taskkill", [
			"/PID",
			String(t),
			"/T",
			"/F"
		], {
			timeout: 1e4,
			windowsHide: !0
		}, () => e());
	}), !await v(() => {
		for (let e of n) te(e) || n.delete(e);
		return _(e) && n.size === 0;
	}, 1e4))) throw y(t);
}, re = process.platform === "win32", ie = (e) => {
	try {
		return process.kill(e, 0), !0;
	} catch (e) {
		return e.code === "EPERM";
	}
}, ae = (e, t) => {
	try {
		return process.kill(e, t), !0;
	} catch {
		return !1;
	}
}, oe = (e, t) => _(e) && !ie(-t), se = (e, t, n) => {
	!ae(-t, n) && !_(e) && ae(t, n);
}, ce = async (e, t, n) => {
	let r = () => oe(e, t);
	if (!r() && (se(e, t, "SIGTERM"), !await v(r, n * 1e3) && (se(e, t, "SIGKILL"), !await v(r, 2e3)))) throw y(t);
}, le = async (e, t = 5) => {
	let { pid: n } = e;
	if (n !== void 0) {
		if (re) {
			await ne(e, n);
			return;
		}
		await ce(e, n, t);
	}
}, ue = [
	"EPIPE",
	"EOF",
	"ERR_STREAM_DESTROYED"
], de = (e, n) => new t(`Unable to start '${e}'.`, {
	code: m.PROCESS_START_FAILED,
	cause: n
}), fe = (e, n) => new t(`The process '${e}' wrote more than ${n} bytes of output.`, { code: m.PROCESS_OUTPUT_TOO_LARGE }), pe = (e, n) => {
	if (!(e === void 0 || typeof e == "number" && Number.isFinite(e) && e > 0 && e <= 2147483) || !Number.isSafeInteger(n) || n <= 0) throw new t("The timeout must be a positive number of at most 2,147,483 seconds, and the output limit a positive safe integer.", {
		code: m.INVALID_PROCESS_OPTIONS,
		data: {
			timeoutSeconds: String(e),
			maxOutputBytes: String(n)
		}
	});
}, me = (e, t) => {
	let n = Buffer.concat(e);
	return t === "buffer" ? n : n.toString("utf-8");
}, S = (e) => {
	e.stdin?.destroy(), e.stdout?.destroy(), e.stderr?.destroy();
}, he = (e, t, n) => new Promise((r) => {
	if (t()) {
		r(!0);
		return;
	}
	let i = () => {
		clearTimeout(a), r(!0);
	}, a = setTimeout(() => {
		e.off("close", i), r(!1);
	}, n);
	e.once("close", i);
}), ge = async (e) => {
	try {
		await le(e);
	} catch (t) {
		throw S(e), t;
	}
}, _e = async (e) => {
	let { command: n, args: r, cwd: i, env: a, input: o, timeoutSeconds: s, maxOutputBytes: l = p, signal: u, encoding: d = "utf-8" } = e;
	pe(s, l), u?.throwIfAborted();
	let f = performance.now(), h = c(n, r, {
		cwd: i,
		env: a,
		stdio: "pipe",
		detached: process.platform !== "win32",
		windowsHide: !0
	}), g = [], _ = [], v = 0, y = !1;
	h.once("close", () => {
		y = !0;
	});
	let b = await new Promise((e) => {
		let r, i = () => {
			clearTimeout(r), e({
				kind: "failed",
				error: u?.reason
			});
		}, a = (t) => {
			clearTimeout(r), u?.removeEventListener("abort", i), e(t);
		}, c = (e) => (t) => {
			if (v += t.length, v > l) {
				a({
					kind: "failed",
					error: fe(n, l)
				});
				return;
			}
			e.push(t);
		};
		h.stdout.on("data", c(g)), h.stderr.on("data", c(_)), h.stdout.on("error", () => void 0), h.stderr.on("error", () => void 0), h.on("error", (e) => a({
			kind: "failed",
			error: de(n, e)
		})), h.once("exit", (e, t) => a({
			kind: "exited",
			exitCode: e,
			signalCode: t
		})), h.stdin.on("error", (e) => {
			ue.includes(e.code ?? "") || a({
				kind: "failed",
				error: de(n, e)
			});
		}), s !== void 0 && (r = setTimeout(() => a({
			kind: "failed",
			error: new t(`The process '${n}' didn't finish within ${s} seconds.`, { code: m.PROCESS_TIMED_OUT })
		}), s * 1e3)), u?.addEventListener("abort", i, { once: !0 }), h.stdin.end(o);
	});
	if (b.kind === "failed") throw await ge(h), S(h), b.error;
	if (await ge(h), !await he(h, () => y, 5e3)) throw S(h), new t(`A process started by '${n}' kept its output open after it exited.`, { code: m.PROCESS_TREE_SURVIVED });
	if (v > l) throw fe(n, l);
	return {
		exitCode: b.exitCode,
		signalCode: b.signalCode,
		stdout: me(g, d),
		stderr: me(_, d),
		durationMs: Math.round(performance.now() - f)
	};
}, C = {
	Composition: "composition",
	Content: "content",
	Inspect: "inspect",
	Scope: "scope",
	Validate: "validate"
}, w = {
	Help: "--help",
	Json: "--json",
	Cursor: "--cursor",
	MaxDiagnostics: "--max-diagnostics",
	MaxEntries: "--max-entries",
	MaxCoverage: "--max-coverage",
	MaxFileBytes: "--max-file-bytes",
	MaxManifestBytes: "--max-manifest-bytes",
	MaxOutputBytes: "--max-output-bytes",
	MaxTotalBytes: "--max-total-bytes",
	NoColor: "--no-color",
	Path: "--path",
	PathsStdin: "--paths-stdin",
	Repository: "--repository",
	Version: "--version"
}, ve = Object.freeze({
	maxDiagnostics: 1e4,
	maxEntries: 1e5,
	maxCoverage: 1e4,
	maxFileBytes: 8388608,
	maxManifestBytes: 2097152,
	maxTotalBytes: 134217728
}), ye = 65536, T = class extends Error {
	code;
	constructor(e, t) {
		super(e, t), this.code = e, this.name = "MoldeaCliOutputPageException";
	}
}, be = {
	UNSUPPORTED_HASH_ALGORITHM: "UNSUPPORTED_HASH_ALGORITHM",
	INVALID_BYTE_LENGTH: "INVALID_BYTE_LENGTH",
	UNSUPPORTED_ENCODING: "UNSUPPORTED_ENCODING",
	INVALID_DIGIT_COUNT: "INVALID_DIGIT_COUNT",
	INVALID_HMAC_SECRET: "INVALID_HMAC_SECRET",
	INVALID_HMAC_DOMAIN: "INVALID_HMAC_DOMAIN",
	INVALID_TOTP_SECRET: "INVALID_TOTP_SECRET",
	TOTP_INVALID: "TOTP_INVALID",
	TOTP_ALREADY_USED: "TOTP_ALREADY_USED"
}, xe = [
	"sha256",
	"sha384",
	"sha512"
], Se = (e, n = "sha256") => {
	if (!xe.includes(n)) throw new t("The hash algorithm must be sha256, sha384, or sha512.", {
		code: be.UNSUPPORTED_HASH_ALGORITHM,
		data: { algorithm: String(n) }
	});
	return u(n).update(e).digest("hex");
}, Ce = /^sha256:[0-9a-f]{64}$/u, we = /^[A-Za-z0-9_-]+$/u, Te = Object.freeze([
	"checksum",
	"command",
	"filtersDigest",
	"lastKey",
	"snapshotDigest",
	"sourceCursor",
	"version"
]), E = (e) => `sha256:${Se(r(e, { strict: !0 }))}`, Ee = (e) => E(e), De = (e, t) => {
	let n = Buffer.from(e, "utf8"), r = Buffer.from(t, "utf8");
	return n.length === r.length && d(n, r);
}, Oe = (e) => {
	if (typeof e != "object" || !e || Array.isArray(e)) return !1;
	let t = e, n = Object.keys(t).sort();
	return n.length === Te.length && n.every((e, t) => e === Te[t]) && t.version === 3 && (t.command === "content" || t.command === "inspect" || t.command === "scope" || t.command === "validate") && typeof t.filtersDigest == "string" && Ce.test(t.filtersDigest) && typeof t.lastKey == "string" && t.lastKey.length > 0 && (t.sourceCursor === null || typeof t.sourceCursor == "string") && typeof t.snapshotDigest == "string" && Ce.test(t.snapshotDigest) && typeof t.checksum == "string" && Ce.test(t.checksum);
}, ke = (e, t, n, i, a = null) => {
	let o = {
		command: e,
		filtersDigest: E(t),
		lastKey: i,
		sourceCursor: a,
		snapshotDigest: n,
		version: 3
	}, s = {
		...o,
		checksum: Ee(o)
	};
	return Buffer.from(r(s, { strict: !0 }), "utf8").toString("base64url");
}, Ae = (e) => {
	let t;
	try {
		if (!we.test(e.cursor)) throw TypeError("The cursor is not canonical base64url.");
		let n = Buffer.from(e.cursor, "base64url");
		if (n.toString("base64url") !== e.cursor) throw TypeError("The cursor is not canonical base64url.");
		let r = n.toString("utf8");
		t = JSON.parse(r);
	} catch {
		throw new T("CURSOR_INVALID");
	}
	if (!Oe(t)) throw new T("CURSOR_INVALID");
	let { checksum: n, ...r } = t;
	if (!De(n, Ee(r)) || t.command !== e.command || t.filtersDigest !== E(e.filters)) throw new T("CURSOR_INVALID");
	if (e.snapshotDigest !== void 0 && t.snapshotDigest !== e.snapshotDigest) throw new T("CURSOR_SNAPSHOT_CHANGED");
	return Object.freeze({
		lastKey: t.lastKey,
		snapshotDigest: t.snapshotDigest,
		sourceCursor: t.sourceCursor
	});
}, D = (e) => e.toString(36).padStart(11, "0"), je = (e) => {
	for (let t = 0; t < e.length; t += 1) {
		let n = e[t]?.key, r = e[t - 1]?.key;
		if (n === void 0 || n.length === 0 || r !== void 0 && n <= r) throw TypeError("Output records must have unique keys in ascending order.");
	}
}, Me = (e) => {
	je(e.records);
	let t = e.cursor === null ? null : Ae({
		command: e.command,
		cursor: e.cursor,
		filters: e.filters,
		snapshotDigest: e.snapshotDigest
	}), n = t === null ? 0 : t.sourceCursor === null ? e.records.findIndex(({ key: e }) => e === t.lastKey) + 1 : 0;
	if (t !== null && t.sourceCursor === null && n === 0) throw new T("CURSOR_INVALID");
	let r = Object.freeze([]), a = Object.freeze({
		cursor: null,
		records: r
	});
	if (n === e.records.length) {
		if (e.measure(a, 2) > e.maxOutputBytes) throw new T("OUTPUT_BUDGET_TOO_SMALL");
		return a;
	}
	let o = (t, n) => {
		let r = e.sourceCursorForRecord?.(t) ?? null;
		return (e.sourceCursorForRecord === void 0 ? n < e.records.length : r !== null) ? ke(e.command, e.filters, e.snapshotDigest, t.key, r) : null;
	}, s = i(e.records.slice(n), {
		maxBytes: e.maxOutputBytes,
		measurePage: (t, r) => e.measure(Object.freeze({
			cursor: o(t[t.length - 1], n + t.length),
			records: t
		}), r)
	}), c = s[s.length - 1];
	if (c === void 0) throw new T("OUTPUT_BUDGET_TOO_SMALL");
	return Object.freeze({
		cursor: o(c, n + s.length),
		records: Object.freeze(s)
	});
}, Ne = /^\d+$/u, Pe = (e) => {
	if (!Ne.test(e)) return null;
	let t = Number(e);
	return Number.isSafeInteger(t) && t > 0 ? t : null;
}, Fe = (e) => {
	let t = Pe(e);
	return t !== null && t >= 4096 && t <= 1048576 ? t : null;
}, Ie = (e) => e.maxManifestBytes <= e.maxFileBytes && e.maxFileBytes <= e.maxTotalBytes, O = (e) => e.length > 0 && !e.includes("\0") && e.isWellFormed(), Le = (e) => e.length > 0 && e.length <= 16384 && !e.includes("\0") && e.isWellFormed(), Re = new Set(Object.values(C)), ze = {
	[w.MaxDiagnostics]: "maxDiagnostics",
	[w.MaxEntries]: "maxEntries",
	[w.MaxCoverage]: "maxCoverage",
	[w.MaxFileBytes]: "maxFileBytes",
	[w.MaxManifestBytes]: "maxManifestBytes",
	[w.MaxTotalBytes]: "maxTotalBytes"
}, k = (e, t, n) => ({
	code: e,
	command: t,
	isJson: n,
	kind: "error"
}), Be = (e) => e !== void 0 && Re.has(e), Ve = (e) => {
	let t = e.includes(w.Json);
	if (e.length === 0) return {
		command: null,
		kind: "help"
	};
	let n = e[0];
	if (n === w.Help) return e.length === 1 ? {
		command: null,
		kind: "help"
	} : k("INVALID_ARGUMENT", null, t);
	if (n === w.Version) return e.length === 1 ? { kind: "version" } : k("INVALID_ARGUMENT", null, t);
	let r = Be(n) ? n : null;
	if (r === null) return k("INVALID_ARGUMENT", null, t);
	if (e.length === 2 && e[1] === w.Help) return {
		command: r,
		kind: "help"
	};
	let i = new Set(), a = { ...ve }, o = !1, s = null, c = ye, l = null, u = "none", d = null;
	for (let n = 1; n < e.length; n += 1) {
		let f = e[n];
		if (f === void 0 || i.has(f)) return k("INVALID_ARGUMENT", r, t);
		if (i.add(f), f === w.Json) continue;
		if (f === w.NoColor) {
			o = !0;
			continue;
		}
		if (f === w.PathsStdin) {
			u = "stdin";
			continue;
		}
		if (f === w.Help || f === w.Version) return k("INVALID_ARGUMENT", r, t);
		let p = ze[f], m = f === w.Repository, h = f === w.Cursor, g = f === w.MaxOutputBytes, _ = f === w.Path;
		if (p === void 0 && !m && !h && !g && !_ || r === C.Composition) return k("INVALID_ARGUMENT", r, t);
		let v = e[n + 1];
		if (v === void 0 || v.startsWith("--")) return k("INVALID_ARGUMENT", r, t);
		if (n += 1, h) {
			if (!Le(v)) return k("INVALID_ARGUMENT", r, t);
			s = v;
			continue;
		}
		if (g) {
			let e = Fe(v);
			if (e === null) return k("RESOURCE_LIMIT_CONFIGURATION_INVALID", r, t);
			c = e;
			continue;
		}
		if (_) {
			if (!O(v)) return k("INVALID_ARGUMENT", r, t);
			l = v, u = "path";
			continue;
		}
		if (m) {
			if (!O(v)) return k("INVALID_ARGUMENT", r, t);
			d = v;
			continue;
		}
		let y = Pe(v);
		if (y === null || p === void 0) return k("RESOURCE_LIMIT_CONFIGURATION_INVALID", r, t);
		a[p] = y;
	}
	if (!Ie(a)) return k("RESOURCE_LIMIT_CONFIGURATION_INVALID", r, t);
	let f = r === C.Scope, p = r === C.Content, m = l !== null, h = i.has(w.PathsStdin);
	if ((m || h) && !f && !p || f && m === h || p && (!m || h) || f && i.has(w.MaxCoverage) || p && [
		w.MaxDiagnostics,
		w.MaxCoverage,
		w.MaxManifestBytes
	].some((e) => i.has(e)) || !t && (s !== null || i.has(w.MaxOutputBytes))) return k("INVALID_ARGUMENT", r, t);
	let g = {
		cursor: s,
		isColorDisabled: o,
		isJson: t,
		maxOutputBytes: c,
		path: l,
		pathsInput: u,
		repositoryDirectory: d,
		resourceLimits: Object.freeze({ ...a })
	};
	return {
		invocation: Object.freeze({
			command: r,
			options: Object.freeze(g)
		}),
		kind: "command"
	};
}, He = Object.freeze({
	COMPOSITION_STATE_INVALID: Object.freeze({
		message: "The installed composition state is invalid.",
		retryable: !1,
		source: "cli"
	}),
	CONTENT_INVALID: Object.freeze({
		message: "The requested canonical asset is not valid moldea text.",
		retryable: !1,
		source: "cli"
	}),
	CONTENT_PATH_INVALID: Object.freeze({
		message: "The content path must identify one canonical moldea text asset.",
		retryable: !1,
		source: "cli"
	}),
	CURSOR_INVALID: Object.freeze({
		message: "The continuation cursor is invalid for this request.",
		retryable: !1,
		source: "cli"
	}),
	CURSOR_SNAPSHOT_CHANGED: Object.freeze({
		message: "The continuation cursor belongs to a different repository snapshot.",
		retryable: !0,
		source: "cli"
	}),
	GIT_ACCESS_DENIED: Object.freeze({
		message: "Git access was denied.",
		retryable: !0,
		source: "git"
	}),
	GIT_COMMAND_FAILED: Object.freeze({
		message: "The Git command failed.",
		retryable: !0,
		source: "git"
	}),
	GIT_CONTENT_TRANSFORM_UNSUPPORTED: Object.freeze({
		message: "The requested file uses an unsupported Git content transformation.",
		retryable: !1,
		source: "git"
	}),
	GIT_NOT_FOUND: Object.freeze({
		message: "The Git executable is unavailable.",
		retryable: !1,
		source: "git"
	}),
	GIT_OPERATION_ABORTED: Object.freeze({
		message: "The Git operation was aborted.",
		retryable: !0,
		source: "git"
	}),
	GIT_OUTPUT_INVALID: Object.freeze({
		message: "Git returned invalid output.",
		retryable: !1,
		source: "git"
	}),
	GIT_REPOSITORY_NOT_FOUND: Object.freeze({
		message: "The selected path is not inside a Git repository.",
		retryable: !1,
		source: "git"
	}),
	GIT_SPARSE_CHECKOUT_UNSUPPORTED: Object.freeze({
		message: "Sparse Git checkouts are unsupported.",
		retryable: !1,
		source: "git"
	}),
	GIT_VERSION_INVALID: Object.freeze({
		message: "The Git version output is invalid.",
		retryable: !1,
		source: "git"
	}),
	GIT_VERSION_UNSUPPORTED: Object.freeze({
		message: "The installed Git version is unsupported.",
		retryable: !1,
		source: "git"
	}),
	GIT_WORK_TREE_REQUIRED: Object.freeze({
		message: "A usable Git working tree is required.",
		retryable: !1,
		source: "git"
	}),
	INTERNAL_ERROR: Object.freeze({
		message: "The command could not be completed.",
		retryable: !1,
		source: "cli"
	}),
	INVALID_ARGUMENT: Object.freeze({
		message: "The command invocation is invalid.",
		retryable: !1,
		source: "cli"
	}),
	OUTPUT_BUDGET_TOO_SMALL: Object.freeze({
		message: "The output byte budget cannot contain the next complete result.",
		retryable: !1,
		source: "cli"
	}),
	PATH_INPUT_INVALID: Object.freeze({
		message: "The scope path input is invalid. Use leading-slash repository-logical paths and NUL-delimited UTF-8 on stdin.",
		retryable: !1,
		source: "cli"
	}),
	RESOURCE_LIMIT_CONFIGURATION_INVALID: Object.freeze({
		message: "The resource-limit configuration is invalid.",
		retryable: !1,
		source: "cli"
	}),
	RESOURCE_LIMIT_EXCEEDED: Object.freeze({
		message: "A resource limit was exceeded.",
		retryable: !1,
		source: "cli"
	}),
	WORKING_TREE_UNSTABLE: Object.freeze({
		message: "The working tree did not remain stable.",
		retryable: !0,
		source: "cli"
	})
}), Ue = "Usage: moldea <command> [options]\n\nCommands:\n  validate       Validate the current moldea project.\n  inspect        Inspect content-free project metadata.\n  scope          Match changed paths to declared moldea relationships.\n  content        Read one canonical moldea asset explicitly.\n  composition    Report the installed CLI composition state.\n\nGlobal options:\n  --help     Show top-level help.\n  --version  Show the CLI version.\n\nRun \"moldea <command> --help\" for command-specific options.\n", We = "  --repository <path>                Select a Git working-tree directory.\n  --json                             Emit one machine-readable JSON result.\n  --no-color                         Disable ANSI styling in human output.\n", Ge = "  --max-entries <integer>            Override the repository entry limit.\n  --max-file-bytes <integer>         Override the per-file byte limit.\n  --max-total-bytes <integer>        Override the total cached-byte limit.\n", Ke = `${Ge}  --max-manifest-bytes <integer>     Override the manifest byte limit.
  --max-diagnostics <integer>        Override the diagnostic count limit.
`, qe = "  --max-output-bytes <integer>       Bound JSON output from 4096 to 1048576 bytes.\n  --cursor <opaque-cursor>           Continue a prior JSON result page.\n", Je = `${We}${Ke}  --max-coverage <integer>           Override the binding coverage count limit.
${qe}`, Ye = `${We}${Ke}${qe}`, Xe = `${We}${Ge}${qe}`, Ze = {
	[C.Composition]: "Usage: moldea composition [options]\n\nReport the installed CLI composition state.\n\nOptions:\n  --json      Emit one machine-readable JSON result.\n  --no-color  Disable ANSI styling in human output.\n  --help      Show this help.\n",
	[C.Inspect]: `Usage: moldea inspect [options]

Inspect content-free metadata for the current moldea project.

Options:
${Je}  --help                             Show this help.
`,
	[C.Scope]: `Usage: moldea scope (--path <logical-path> | --paths-stdin) [options]

Match changed repository paths to declared moldea relationships. The stdin form accepts NUL-delimited UTF-8 logical paths.

Options:
${Ye}  --path <logical-path>               Match one repository-logical path.
  --paths-stdin                      Read NUL-delimited paths from stdin.
  --help                             Show this help.
`,
	[C.Content]: `Usage: moldea content --path <canonical-logical-path> [options]

Read one canonical moldea text asset in bounded Unicode-safe chunks.

Options:
${Xe}  --path <canonical-logical-path>     Select exactly one canonical moldea file.
  --help                             Show this help.
`,
	[C.Validate]: `Usage: moldea validate [options]

Validate the current moldea project.

Options:
${Je}  --help                             Show this help.
`
}, Qe = Object.freeze({}), $e = (e, t = Qe) => {
	let n = He[e];
	return Object.freeze({
		code: e,
		details: Object.freeze({ ...t }),
		message: n.message,
		path: null,
		retryable: n.retryable,
		source: n.source
	});
}, et = (e) => Object.freeze({
	cliVersion: e.cliVersion,
	command: e.command,
	error: e.error,
	result: e.result,
	schemaVersion: 9,
	status: e.status
}), tt = (e) => `${r(et(e), { strict: !0 })}\n`, nt = [
	"agentId",
	"capabilityKind",
	"capabilityId",
	"decisionId",
	"contextPath",
	"integrationPath"
], rt = (e) => nt.flatMap((t) => {
	let n = e[t];
	return n === void 0 ? [] : [`${t}=${n}`];
}).join(", "), it = (e) => {
	let t = e.path === null ? "" : e.range === null ? ` ${e.path}` : ` ${e.path}:${e.range.start.line}:${e.range.start.column}`, n = [`${e.source}:${e.code}${t} ${e.message}`];
	return e.pointer !== null && n.push(`  pointer: ${e.pointer}`), e.entity !== null && n.push(`  entity: ${rt(e.entity)}`), e.severity === "warning" && (n.push(`  subject: ${e.subject}`), e.qualifier !== null && n.push(`  qualifier: ${e.qualifier}`)), n.join("\n");
}, at = (e, t, n = 0) => {
	let r = [`The moldea project is ${e ? n > 0 ? "valid with warnings" : "valid" : "invalid"}.`];
	return t !== null && r.push(`Repository format: ${t}`), r;
}, A = (e, t, n) => `${e === 1 ? t : n}: ${e}`, ot = (e) => e === null ? Ue : Ze[e], st = (e) => `${e.source}:${e.code} ${e.message}\n`, j = (e, t, n, r, i) => tt({
	cliVersion: i,
	command: e,
	error: n,
	result: t,
	status: r
}), ct = (e, t, n) => j(t, null, e, "error", n), lt = (e, t) => `${[
	"The installed CLI composition state is valid.",
	`CLI version: ${t}`,
	`Supported Node.js: ${e.supportedNodeRange}`,
	"JSON output schema: 9",
	`Minimum Git: ${e.minimumGitVersion}`,
	`Repository formats: ${e.repositoryFormatVersions.join(", ")}`,
	"Packages:",
	...e.packages.map(({ name: e, version: t }) => `  ${e}: ${t}`)
].join("\n")}\n`, ut = (e, t) => j(C.Composition, e, null, "valid", t), dt = (e) => `Coverage: ${e.bindings} bindings, ${e.exportsPassed} exports confirmed, ${e.exportsFailed} exports missing, ${e.exportsNotChecked} not checked`, ft = (e) => {
	let t = at(e.valid, e.formatVersion, e.warningCount);
	t.push(dt(e.coverageCounts));
	for (let n of e.page.records) n.kind === "diagnostic" && !(n.severity === "warning" && n.accepted) && t.push(it(n));
	return t.push(A(e.diagnosticCount, "Diagnostic", "Diagnostics")), t.push(A(e.errorCount, "Error", "Errors")), t.push(A(e.warningCount, "Warning", "Warnings")), t.push(`${e.acceptedWarningCount} accepted ${e.acceptedWarningCount === 1 ? "warning" : "warnings"}`), e.page.cursor !== null && t.push("Additional records are available through JSON pagination."), `${t.join("\n")}\n`;
}, pt = (e, t) => j(C.Validate, {
	valid: e.valid,
	coverageCounts: e.coverageCounts,
	diagnosticCount: e.diagnosticCount,
	errorCount: e.errorCount,
	warningCount: e.warningCount,
	acceptedWarningCount: e.acceptedWarningCount,
	page: e.page
}, null, e.valid ? "valid" : "invalid", t), mt = (e) => {
	let t = at(e.valid, e.formatVersion, e.counts.warnings);
	t.push(dt(e.coverageCounts)), t.push(`${e.counts.acceptedWarnings} accepted ${e.counts.acceptedWarnings === 1 ? "warning" : "warnings"}`);
	for (let n of e.page.records) n.kind === "diagnostic" && !(n.severity === "warning" && n.accepted) && t.push(it(n));
	for (let [n, r] of Object.entries(e.counts)) t.push(`${n}: ${r}`);
	return `${t.join("\n")}\n`;
}, ht = (e, t) => j(C.Inspect, {
	valid: e.valid,
	counts: e.counts,
	page: e.page
}, null, e.valid ? "valid" : "invalid", t), gt = (e) => `${[
	`The moldea scope result is ${e.valid ? "valid" : "invalid"}.`,
	`Relevant: ${e.relevant ? "yes" : "no"}`,
	...Object.entries(e.counts).map(([e, t]) => `${e}: ${t}`)
].join("\n")}\n`, _t = (e, t) => j(C.Scope, e, null, e.valid ? "valid" : "invalid", t), vt = (e) => `${[
	`Path: ${e.asset.path}`,
	`Content identity: ${e.asset.contentIdentity ?? "unavailable"}`,
	`Bytes: ${e.chunk.byteStart}-${e.chunk.byteEnd} of ${e.asset.totalBytes}`,
	e.cursor === null ? "Cursor: none" : `Cursor: ${e.cursor}`,
	...e.cursor === null ? [] : ["Continue this asset by passing the cursor to a JSON content request."],
	"",
	e.chunk.content
].join("\n")}\n`, yt = (e, t) => j(C.Content, e, null, "valid", t), bt = (e) => {
	let t = e.diagnostics.filter((e) => e.severity === "error").length;
	if (!(Number.isSafeInteger(e.errorCount) && Number.isSafeInteger(e.warningCount) && e.errorCount === t && e.acceptedWarningCount === e.diagnostics.filter((e) => e.severity === "warning" && e.accepted === !0).length && e.warningCount === e.diagnostics.length - t - e.acceptedWarningCount && e.diagnosticCount === e.errorCount + e.warningCount + e.acceptedWarningCount && e.valid === (e.summary !== null && e.errorCount === 0) && (e.valid || e.errorCount > 0))) throw TypeError("The Core validation result is internally inconsistent.");
}, xt = (e, t) => {
	let n = {
		code: e.code,
		group: e.group,
		entity: e.entity,
		key: D(t),
		kind: "diagnostic",
		message: e.message,
		path: e.path,
		pointer: e.pointer,
		range: e.range,
		source: e.source
	};
	return e.severity === "warning" ? Object.freeze({
		...n,
		severity: "warning",
		subject: e.subject,
		qualifier: e.qualifier,
		acceptable: e.acceptable,
		accepted: e.accepted === !0,
		reason: e.accepted === !0 ? e.reason : null
	}) : Object.freeze({
		...n,
		severity: "error"
	});
}, St = (e) => e.fileCheck !== "passed" || e.exportCheck !== "passed", Ct = (e, t) => {
	if (e.kind === "diagnostic") return xt(e.diagnostic, t);
	let { agentId: n, byteLength: r, decisionId: i, kind: a, path: o } = e.metadata;
	return Object.freeze({
		agentId: n,
		byteLength: r,
		decisionId: i,
		key: D(t),
		kind: "metadata",
		metadataKind: a,
		path: o
	});
}, wt = (e) => {
	bt(e);
	let t = e.diagnostics.map(xt), n = Object.freeze([...t, ...e.coverage.filter(St).map((e, n) => Object.freeze({
		entity: e.entity,
		relationship: e.relationship,
		path: e.path,
		symbol: e.symbol,
		fileCheck: e.fileCheck,
		...e.exportCheck === "not-checked" ? {
			exportCheck: e.exportCheck,
			exportNotCheckedReason: e.exportNotCheckedReason
		} : { exportCheck: e.exportCheck },
		key: D(t.length + n),
		kind: "coverage"
	}))]), r = E({
		diagnostics: t,
		coverage: e.coverage,
		coverageCounts: e.coverageCounts,
		acceptedWarningCount: e.acceptedWarningCount,
		errorCount: e.errorCount,
		formatVersion: e.formatVersion,
		summary: e.summary,
		valid: e.valid,
		warningCount: e.warningCount
	});
	return Object.freeze({
		records: n,
		diagnosticCount: e.diagnosticCount,
		acceptedWarningCount: e.acceptedWarningCount,
		coverageCounts: e.coverageCounts,
		errorCount: e.errorCount,
		formatVersion: e.formatVersion,
		snapshotDigest: r,
		valid: e.valid,
		warningCount: e.warningCount
	});
}, Tt = (e) => {
	let t = Object.freeze(e.records.map(({ item: t }, n) => Ct(t, e.startIndex + n))), n = new Map(e.records.map(({ nextCursor: t }, n) => [D(e.startIndex + n), t]));
	return Object.freeze({
		counts: e.counts,
		formatVersion: e.formatVersion,
		getSourceCursor: (e) => n.get(e.key) ?? null,
		records: t,
		snapshotDigest: e.inspectionDigest,
		coverageCounts: e.coverageCounts,
		valid: e.valid
	});
}, Et = "/dev/null", M = {
	GIT_NOT_FOUND: "GIT_NOT_FOUND",
	GIT_COMMAND_FAILED: "GIT_COMMAND_FAILED",
	GIT_INVALID_ARGUMENT: "GIT_INVALID_ARGUMENT",
	GIT_OUTPUT_INVALID: "GIT_OUTPUT_INVALID",
	GIT_REPOSITORY_NOT_FOUND: "GIT_REPOSITORY_NOT_FOUND",
	GIT_ACCESS_DENIED: "GIT_ACCESS_DENIED"
}, N = (e) => new t("An argument isn't valid.", {
	code: M.GIT_INVALID_ARGUMENT,
	data: { argument: e }
}), P = (e) => new t("Git's output isn't in the expected format.", {
	code: M.GIT_OUTPUT_INVALID,
	data: { subcommand: e }
}), F = (e) => typeof e == "string" && e.length > 0 && !e.includes("\0"), Dt = "ssh -o BatchMode=yes -o ConnectTimeout=10", Ot = {
	GIT_TERMINAL_PROMPT: "0",
	GIT_ASKPASS: "",
	GCM_INTERACTIVE: "never",
	GIT_OPTIONAL_LOCKS: "0",
	GIT_NO_REPLACE_OBJECTS: "1",
	GIT_NO_LAZY_FETCH: "1",
	GIT_LITERAL_PATHSPECS: "1",
	GIT_ALLOW_PROTOCOL: "",
	LC_ALL: "C",
	LANG: "C",
	LANGUAGE: "C"
}, kt = new Set(Object.keys(Ot)), At = (e) => {
	let t = e.toUpperCase();
	return !t.startsWith("GIT_") && !t.startsWith("SSH_ASKPASS") && !kt.has(t);
}, jt = ({ isolateConfig: e = !1, sshCommand: t = Dt, baseEnv: n = process.env } = {}) => ({
	...Object.fromEntries(Object.entries(n).filter(([e]) => At(e))),
	...Ot,
	GIT_SSH_COMMAND: t,
	...e ? {
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_CONFIG_GLOBAL: Et,
		GIT_ATTR_NOSYSTEM: "1"
	} : {}
}), Mt = 1048576, Nt = [
	"-c",
	"core.fsmonitor=",
	"-c",
	"core.askPass=",
	"-c",
	"core.pager=cat",
	"-c",
	"color.ui=false",
	"-c",
	"submodule.recurse=false"
], Pt = ["-c", "credential.helper="], Ft = /^fatal: not a git repository/mu, It = /^fatal: (?:detected dubious ownership in repository at |.*: Permission denied\r?$)/mu, Lt = async (e) => {
	try {
		return (await f(e)).isDirectory();
	} catch {
		return !1;
	}
}, Rt = (e) => Array.isArray(e) && e.every((e) => typeof e == "string" && !e.includes("\0")), zt = (e) => {
	let t = e.toUpperCase();
	return t !== "GIT_ASKPASS" && t !== "GIT_TERMINAL_PROMPT" && t !== "GCM_INTERACTIVE" && !t.startsWith("SSH_ASKPASS");
}, I = async (e, { cwd: r, timeoutSeconds: i = 30, maxOutputBytes: a = Mt, input: o, signal: s, isolateConfig: c = !1, useCredentialHelpers: l = !1, env: u, encoding: d }) => {
	if (!Rt(e)) throw N("args");
	if (!F(r) || !await Lt(r)) throw N("cwd");
	let f = {
		...jt({ isolateConfig: c }),
		...Object.fromEntries(Object.entries(u ?? {}).filter(([e]) => zt(e)))
	};
	try {
		return await _e({
			command: "git",
			args: [
				...Nt,
				...c ? ["-c", `core.attributesFile=${Et}`] : [],
				...l ? [] : Pt,
				"--no-pager",
				...e
			],
			cwd: r,
			env: f,
			timeoutSeconds: i,
			maxOutputBytes: a,
			...o === void 0 ? {} : { input: o },
			...s === void 0 ? {} : { signal: s },
			...d === void 0 ? {} : { encoding: d }
		});
	} catch (e) {
		let i = n(e) === m.PROCESS_START_FAILED && n(e.cause) === "ENOENT";
		throw i && process.platform === "win32" && r.length >= 260 ? N("cwd") : i ? new t("Git isn't installed, or isn't on the PATH.", {
			code: M.GIT_NOT_FOUND,
			cause: e
		}) : e;
	}
}, Bt = (e, n) => {
	if (e.exitCode === 0) return;
	let r = typeof e.stderr == "string" ? e.stderr : e.stderr.toString("utf8"), i = {
		subcommand: n,
		exitCode: e.exitCode
	};
	throw Ft.test(r) ? new t("The directory isn't in a Git repository.", {
		code: M.GIT_REPOSITORY_NOT_FOUND,
		data: i
	}) : It.test(r) ? new t("Git can't access the repository.", {
		code: M.GIT_ACCESS_DENIED,
		data: i
	}) : new t("The git command failed.", {
		code: M.GIT_COMMAND_FAILED,
		data: i
	});
}, Vt = /^([0-7]{6}) [0-9a-f]{40,64} ([0-3])$/, L = (e, t) => (Bt(e, t), e.stdout), Ht = (e, t) => {
	let n = L(e, t);
	if (e.stderr.length > 0) throw P(t);
	return n;
}, Ut = (e, t) => {
	try {
		return new TextDecoder("utf-8", {
			fatal: !0,
			ignoreBOM: !0
		}).decode(e);
	} catch {
		throw P(t);
	}
}, Wt = (e, t) => {
	let n = Ut(e, t);
	if (n === "") return [];
	let r = n.split("\0");
	if (r.pop() !== "") throw P(t);
	return r;
}, Gt = (e) => e.map((e) => {
	let t = e.indexOf("	"), n = t === -1 ? null : Vt.exec(e.slice(0, t));
	if (n === null || t === e.length - 1) throw P("ls-files");
	return {
		mode: n[1],
		stage: Number(n[2]),
		path: e.slice(t + 1)
	};
}), Kt = /^git version (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[.-][0-9A-Za-z]+)*(?: \([0-9A-Za-z](?:[0-9A-Za-z ._+/-]*[0-9A-Za-z])?\))?\r?\n$/, qt = (e) => {
	if (e === void 0) return ["--"];
	if (!Array.isArray(e) || !e.every(F)) throw N("paths");
	return ["--", ...e];
}, Jt = async (e, { paths: t, ...n } = {}) => Gt(Wt(Ht(await I([
	"ls-files",
	"--cached",
	"--stage",
	"--full-name",
	"-z",
	...qt(t)
], {
	...n,
	cwd: e,
	encoding: "buffer"
}), "ls-files"), "ls-files")), Yt = async (e, { paths: t, ...n } = {}) => Wt(Ht(await I([
	"ls-files",
	"--others",
	"--exclude-standard",
	"--full-name",
	"-z",
	...qt(t)
], {
	...n,
	cwd: e,
	encoding: "buffer"
}), "ls-files"), "ls-files"), Xt = async (e, t = {}) => {
	let n = L(await I(["rev-parse", "--is-inside-work-tree"], {
		...t,
		cwd: e
	}), "rev-parse").trim();
	if (n === "false") return null;
	if (n !== "true") throw P("rev-parse");
	let r = Ut(L(await I(["rev-parse", "--show-toplevel"], {
		...t,
		cwd: e,
		encoding: "buffer"
	}), "rev-parse"), "rev-parse"), i = r.endsWith("\n") ? r.slice(0, -1) : "";
	if (i === "" || i.includes("\n")) throw P("rev-parse");
	return i;
}, Zt = async (e, t, n, r = {}) => {
	if (!F(t) || t.startsWith("-") || /\s/.test(t)) throw N("key");
	if (typeof n != "boolean") throw N("defaultValue");
	let i = L(await I([
		"config",
		"--type=bool",
		`--default=${String(n)}`,
		"--get",
		t
	], {
		...r,
		cwd: e
	}), "config");
	if (i !== "true\n" && i !== "false\n") throw P("config");
	return i === "true\n";
}, Qt = async (e, t = {}) => {
	let n = L(await I(["version"], {
		...t,
		cwd: e
	}), "version"), r = Kt.exec(n), i = {
		major: Number(r?.[1]),
		minor: Number(r?.[2]),
		patch: Number(r?.[3])
	};
	if (!Object.values(i).every(Number.isSafeInteger)) throw P("version");
	return i;
}, $t = (e, t) => Object.freeze({
	kind: "failed",
	reason: e,
	...t === void 0 ? {} : { subcommand: t }
}), en = (e, t) => {
	if (t?.aborted === !0) return "aborted";
	switch (n(e)) {
		case M.GIT_NOT_FOUND: return "not-found";
		case M.GIT_REPOSITORY_NOT_FOUND: return "repository-not-found";
		case M.GIT_ACCESS_DENIED: return "access-denied";
		case M.GIT_OUTPUT_INVALID: return "output-invalid";
		case m.PROCESS_OUTPUT_TOO_LARGE: return "output-limit-exceeded";
		case m.PROCESS_START_FAILED: {
			let t = n(e.cause);
			return t === "EACCES" || t === "EPERM" ? "access-denied" : "command-failed";
		}
		default: return "command-failed";
	}
}, tn = async (e, t, n) => {
	try {
		return Object.freeze({
			kind: "completed",
			value: await e()
		});
	} catch (e) {
		return $t(en(e, t), n);
	}
}, nn = (e, t) => {
	if (e.stderr.byteLength > 4096) return "output-invalid";
	try {
		Bt(e, t);
	} catch (e) {
		return en(e);
	}
	return e.stderr.byteLength === 0 ? null : "output-invalid";
}, R = Object.freeze({
	major: 2,
	minor: 32,
	patch: 0
}), rn = `${R.major}.${R.minor}.${R.patch}`, an = 4096, on = (e) => {
	switch (e) {
		case "aborted": return "GIT_OPERATION_ABORTED";
		case "not-found": return "GIT_NOT_FOUND";
		case "access-denied": return "GIT_ACCESS_DENIED";
		case "output-limit-exceeded":
		case "output-invalid": return "GIT_VERSION_INVALID";
		case "repository-not-found":
		case "command-failed": return "GIT_COMMAND_FAILED";
	}
}, sn = (e) => e.major === R.major ? e.minor === R.minor ? e.patch >= R.patch : e.minor > R.minor : e.major > R.major, cn = (e = Qt) => async (t, n) => {
	let r = await tn(() => e(t, {
		maxOutputBytes: an,
		timeoutSeconds: 300,
		...n === void 0 ? {} : { signal: n }
	}), n);
	return r.kind === "failed" ? Object.freeze({
		errorCode: on(r.reason),
		kind: "failed"
	}) : sn(r.value) ? Object.freeze({
		kind: "supported",
		version: Object.freeze({ ...r.value })
	}) : Object.freeze({
		errorCode: "GIT_VERSION_UNSUPPORTED",
		kind: "failed"
	});
}, ln = class extends Error {
	code = "COMPOSITION_STATE_INVALID";
	constructor() {
		super($e("COMPOSITION_STATE_INVALID").message), this.name = "MoldeaCliCompositionException";
	}
}, z = e(((e, t) => {
	t.exports = {
		MAX_LENGTH: 256,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: 250,
		MAX_SAFE_INTEGER: 2 ** 53 - 1 || 9007199254740991,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION: "2.0.0",
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
})), B = e(((e, t) => {
	t.exports = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {};
})), V = e(((e, t) => {
	var { MAX_SAFE_COMPONENT_LENGTH: n, MAX_SAFE_BUILD_LENGTH: r, MAX_LENGTH: i } = z(), a = B();
	e = t.exports = {};
	var o = e.re = [], s = e.safeRe = [], c = e.src = [], l = e.safeSrc = [], u = e.t = {}, d = 0, f = "[a-zA-Z0-9-]", p = [
		["\\s", 1],
		["\\d", i],
		[f, r]
	], m = (e) => {
		for (let [t, n] of p) e = e.split(`${t}*`).join(`${t}{0,${n}}`).split(`${t}+`).join(`${t}{1,${n}}`);
		return e;
	}, h = (e, t, n) => {
		let r = m(t), i = d++;
		a(e, i, t), u[e] = i, c[i] = t, l[i] = r, o[i] = new RegExp(t, n ? "g" : void 0), s[i] = new RegExp(r, n ? "g" : void 0);
	};
	h("NUMERICIDENTIFIER", "0|[1-9]\\d*"), h("NUMERICIDENTIFIERLOOSE", "\\d+"), h("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${f}*`), h("MAINVERSION", `(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})`), h("MAINVERSIONLOOSE", `(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})`), h("PRERELEASEIDENTIFIER", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIER]})`), h("PRERELEASEIDENTIFIERLOOSE", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIERLOOSE]})`), h("PRERELEASE", `(?:-(${c[u.PRERELEASEIDENTIFIER]}(?:\\.${c[u.PRERELEASEIDENTIFIER]})*))`), h("PRERELEASELOOSE", `(?:-?(${c[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${c[u.PRERELEASEIDENTIFIERLOOSE]})*))`), h("BUILDIDENTIFIER", `${f}+`), h("BUILD", `(?:\\+(${c[u.BUILDIDENTIFIER]}(?:\\.${c[u.BUILDIDENTIFIER]})*))`), h("FULLPLAIN", `v?${c[u.MAINVERSION]}${c[u.PRERELEASE]}?${c[u.BUILD]}?`), h("FULL", `^${c[u.FULLPLAIN]}$`), h("LOOSEPLAIN", `[v=\\s]*${c[u.MAINVERSIONLOOSE]}${c[u.PRERELEASELOOSE]}?${c[u.BUILD]}?`), h("LOOSE", `^${c[u.LOOSEPLAIN]}$`), h("GTLT", "((?:<|>)?=?)"), h("XRANGEIDENTIFIERLOOSE", `${c[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), h("XRANGEIDENTIFIER", `${c[u.NUMERICIDENTIFIER]}|x|X|\\*`), h("XRANGEPLAIN", `[v=\\s]*(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:${c[u.PRERELEASE]})?${c[u.BUILD]}?)?)?`), h("XRANGEPLAINLOOSE", `[v=\\s]*(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:${c[u.PRERELEASELOOSE]})?${c[u.BUILD]}?)?)?`), h("XRANGE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAIN]}$`), h("XRANGELOOSE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAINLOOSE]}$`), h("COERCEPLAIN", `(^|[^\\d])(\\d{1,${n}})(?:\\.(\\d{1,${n}}))?(?:\\.(\\d{1,${n}}))?`), h("COERCE", `${c[u.COERCEPLAIN]}(?:$|[^\\d])`), h("COERCEFULL", c[u.COERCEPLAIN] + `(?:${c[u.PRERELEASE]})?(?:${c[u.BUILD]})?(?:$|[^\\d])`), h("COERCERTL", c[u.COERCE], !0), h("COERCERTLFULL", c[u.COERCEFULL], !0), h("LONETILDE", "(?:~>?)"), h("TILDETRIM", `(\\s*)${c[u.LONETILDE]}\\s+`, !0), e.tildeTrimReplace = "$1~", h("TILDE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAIN]}$`), h("TILDELOOSE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAINLOOSE]}$`), h("LONECARET", "(?:\\^)"), h("CARETTRIM", `(\\s*)${c[u.LONECARET]}\\s+`, !0), e.caretTrimReplace = "$1^", h("CARET", `^${c[u.LONECARET]}${c[u.XRANGEPLAIN]}$`), h("CARETLOOSE", `^${c[u.LONECARET]}${c[u.XRANGEPLAINLOOSE]}$`), h("COMPARATORLOOSE", `^${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]})$|^$`), h("COMPARATOR", `^${c[u.GTLT]}\\s*(${c[u.FULLPLAIN]})$|^$`), h("COMPARATORTRIM", `(\\s*)${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]}|${c[u.XRANGEPLAIN]})`, !0), e.comparatorTrimReplace = "$1$2$3", h("HYPHENRANGE", `^\\s*(${c[u.XRANGEPLAIN]})\\s+-\\s+(${c[u.XRANGEPLAIN]})\\s*$`), h("HYPHENRANGELOOSE", `^\\s*(${c[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${c[u.XRANGEPLAINLOOSE]})\\s*$`), h("STAR", "(<|>)?=?\\s*\\*"), h("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), h("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})), un = e(((e, t) => {
	var n = Object.freeze({ loose: !0 }), r = Object.freeze({});
	t.exports = (e) => e ? typeof e == "object" ? e : n : r;
})), dn = e(((e, t) => {
	var n = /^[0-9]+$/, r = (e, t) => {
		if (typeof e == "number" && typeof t == "number") return e === t ? 0 : e < t ? -1 : 1;
		let r = n.test(e), i = n.test(t);
		return r && i && (e = +e, t = +t), e === t ? 0 : r && !i ? -1 : i && !r ? 1 : e < t ? -1 : 1;
	};
	t.exports = {
		compareIdentifiers: r,
		rcompareIdentifiers: (e, t) => r(t, e)
	};
})), H = e(((e, t) => {
	var n = B(), { MAX_LENGTH: r, MAX_SAFE_INTEGER: i } = z(), { safeRe: a, t: o } = V(), s = un(), { compareIdentifiers: c } = dn(), l = (e, t) => {
		let n = t.split(".");
		if (n.length > e.length) return !1;
		for (let t = 0; t < n.length; t++) if (c(e[t], n[t]) !== 0) return !1;
		return !0;
	};
	t.exports = class e {
		constructor(t, c) {
			if (c = s(c), t instanceof e) {
				if (t.loose === !!c.loose && t.includePrerelease === !!c.includePrerelease) return t;
				t = t.version;
			} else if (typeof t != "string") throw TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
			if (t.length > r) throw TypeError(`version is longer than ${r} characters`);
			n("SemVer", t, c), this.options = c, this.loose = !!c.loose, this.includePrerelease = !!c.includePrerelease;
			let l = t.trim().match(c.loose ? a[o.LOOSE] : a[o.FULL]);
			if (!l) throw TypeError(`Invalid Version: ${t}`);
			if (this.raw = t, this.major = +l[1], this.minor = +l[2], this.patch = +l[3], this.major > i || this.major < 0) throw TypeError("Invalid major version");
			if (this.minor > i || this.minor < 0) throw TypeError("Invalid minor version");
			if (this.patch > i || this.patch < 0) throw TypeError("Invalid patch version");
			this.prerelease = l[4] ? l[4].split(".").map((e) => {
				if (/^[0-9]+$/.test(e)) {
					let t = +e;
					if (t >= 0 && t < i) return t;
				}
				return e;
			}) : [], this.build = l[5] ? l[5].split(".") : [], this.format();
		}
		format() {
			return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
		}
		toString() {
			return this.version;
		}
		compare(t) {
			if (n("SemVer.compare", this.version, this.options, t), !(t instanceof e)) {
				if (typeof t == "string" && t === this.version) return 0;
				t = new e(t, this.options);
			}
			return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
		}
		compareMain(t) {
			return t instanceof e || (t = new e(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : +(this.patch > t.patch);
		}
		comparePre(t) {
			if (t instanceof e || (t = new e(t, this.options)), this.prerelease.length && !t.prerelease.length) return -1;
			if (!this.prerelease.length && t.prerelease.length) return 1;
			if (!this.prerelease.length && !t.prerelease.length) return 0;
			let r = 0;
			do {
				let e = this.prerelease[r], i = t.prerelease[r];
				if (n("prerelease compare", r, e, i), e === void 0 && i === void 0) return 0;
				if (i === void 0) return 1;
				if (e === void 0) return -1;
				if (e !== i) return c(e, i);
			} while (++r);
		}
		compareBuild(t) {
			t instanceof e || (t = new e(t, this.options));
			let r = 0;
			do {
				let e = this.build[r], i = t.build[r];
				if (n("build compare", r, e, i), e === void 0 && i === void 0) return 0;
				if (i === void 0) return 1;
				if (e === void 0) return -1;
				if (e !== i) return c(e, i);
			} while (++r);
		}
		inc(e, t, n) {
			if (e.startsWith("pre")) {
				if (!t && n === !1) throw Error("invalid increment argument: identifier is empty");
				if (t) {
					let e = `-${t}`.match(this.options.loose ? a[o.PRERELEASELOOSE] : a[o.PRERELEASE]);
					if (!e || e[1] !== t) throw Error(`invalid identifier: ${t}`);
				}
			}
			switch (e) {
				case "premajor":
					this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", t, n);
					break;
				case "preminor":
					this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", t, n);
					break;
				case "prepatch":
					this.prerelease.length = 0, this.inc("patch", t, n), this.inc("pre", t, n);
					break;
				case "prerelease":
					this.prerelease.length === 0 && this.inc("patch", t, n), this.inc("pre", t, n);
					break;
				case "release":
					if (this.prerelease.length === 0) throw Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					(this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
					break;
				case "minor":
					(this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
					break;
				case "patch":
					this.prerelease.length === 0 && this.patch++, this.prerelease = [];
					break;
				case "pre": {
					let e = +!!Number(n);
					if (this.prerelease.length === 0) this.prerelease = [e];
					else {
						let r = this.prerelease.length;
						for (; --r >= 0;) typeof this.prerelease[r] == "number" && (this.prerelease[r]++, r = -2);
						if (r === -1) {
							if (t === this.prerelease.join(".") && n === !1) throw Error("invalid increment argument: identifier already exists");
							this.prerelease.push(e);
						}
					}
					if (t) {
						let r = [t, e];
						if (n === !1 && (r = [t]), l(this.prerelease, t)) {
							let e = this.prerelease[t.split(".").length];
							isNaN(e) && (this.prerelease = r);
						} else this.prerelease = r;
					}
					break;
				}
				default: throw Error(`invalid increment argument: ${e}`);
			}
			return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
		}
	};
})), U = e(((e, t) => {
	var n = H();
	t.exports = (e, t, r = !1) => {
		if (e instanceof n) return e;
		try {
			return new n(e, t);
		} catch (e) {
			if (!r) return null;
			throw e;
		}
	};
})), fn = e(((e, t) => {
	var n = U();
	t.exports = (e, t) => {
		let r = n(e, t);
		return r ? r.version : null;
	};
})), pn = e(((e, t) => {
	var n = U();
	t.exports = (e, t) => {
		let r = n(e.trim().replace(/^[=v]+/, ""), t);
		return r ? r.version : null;
	};
})), mn = e(((e, t) => {
	var n = H();
	t.exports = (e, t, r, i, a) => {
		typeof r == "string" && (a = i, i = r, r = void 0);
		try {
			return new n(e instanceof n ? e.version : e, r).inc(t, i, a).version;
		} catch {
			return null;
		}
	};
})), hn = e(((e, t) => {
	var n = U();
	t.exports = (e, t) => {
		let r = n(e, null, !0), i = n(t, null, !0), a = r.compare(i);
		if (a === 0) return null;
		let o = a > 0, s = o ? r : i, c = o ? i : r, l = !!s.prerelease.length;
		if (c.prerelease.length && !l) {
			if (!c.patch && !c.minor) return "major";
			if (c.compareMain(s) === 0) return c.minor && !c.patch ? "minor" : "patch";
		}
		let u = l ? "pre" : "";
		return r.major === i.major ? r.minor === i.minor ? r.patch === i.patch ? "prerelease" : u + "patch" : u + "minor" : u + "major";
	};
})), gn = e(((e, t) => {
	var n = H();
	t.exports = (e, t) => new n(e, t).major;
})), _n = e(((e, t) => {
	var n = H();
	t.exports = (e, t) => new n(e, t).minor;
})), vn = e(((e, t) => {
	var n = H();
	t.exports = (e, t) => new n(e, t).patch;
})), yn = e(((e, t) => {
	var n = U();
	t.exports = (e, t) => {
		let r = n(e, t);
		return r && r.prerelease.length ? r.prerelease : null;
	};
})), W = e(((e, t) => {
	var n = H();
	t.exports = (e, t, r) => new n(e, r).compare(new n(t, r));
})), bn = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(t, e, r);
})), xn = e(((e, t) => {
	var n = W();
	t.exports = (e, t) => n(e, t, !0);
})), G = e(((e, t) => {
	var n = H();
	t.exports = (e, t, r) => {
		let i = new n(e, r), a = new n(t, r);
		return i.compare(a) || i.compareBuild(a);
	};
})), Sn = e(((e, t) => {
	var n = G();
	t.exports = (e, t) => e.sort((e, r) => n(e, r, t));
})), Cn = e(((e, t) => {
	var n = G();
	t.exports = (e, t) => e.sort((e, r) => n(r, e, t));
})), K = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) > 0;
})), q = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) < 0;
})), wn = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) === 0;
})), Tn = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) !== 0;
})), J = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) >= 0;
})), Y = e(((e, t) => {
	var n = W();
	t.exports = (e, t, r) => n(e, t, r) <= 0;
})), En = e(((e, t) => {
	var n = wn(), r = Tn(), i = K(), a = J(), o = q(), s = Y();
	t.exports = (e, t, c, l) => {
		switch (t) {
			case "===": return typeof e == "object" && (e = e.version), typeof c == "object" && (c = c.version), e === c;
			case "!==": return typeof e == "object" && (e = e.version), typeof c == "object" && (c = c.version), e !== c;
			case "":
			case "=":
			case "==": return n(e, c, l);
			case "!=": return r(e, c, l);
			case ">": return i(e, c, l);
			case ">=": return a(e, c, l);
			case "<": return o(e, c, l);
			case "<=": return s(e, c, l);
			default: throw TypeError(`Invalid operator: ${t}`);
		}
	};
})), Dn = e(((e, t) => {
	var n = H(), r = U(), { safeRe: i, t: a } = V();
	t.exports = (e, t) => {
		if (e instanceof n) return e;
		if (typeof e == "number" && (e = String(e)), typeof e != "string") return null;
		t ||= {};
		let o = null;
		if (!t.rtl) o = e.match(t.includePrerelease ? i[a.COERCEFULL] : i[a.COERCE]);
		else {
			let n = t.includePrerelease ? i[a.COERCERTLFULL] : i[a.COERCERTL], r;
			for (; (r = n.exec(e)) && (!o || o.index + o[0].length !== e.length);) (!o || r.index + r[0].length !== o.index + o[0].length) && (o = r), n.lastIndex = r.index + r[1].length + r[2].length;
			n.lastIndex = -1;
		}
		if (o === null) return null;
		let s = o[2];
		return r(`${s}.${o[3] || "0"}.${o[4] || "0"}${t.includePrerelease && o[5] ? `-${o[5]}` : ""}${t.includePrerelease && o[6] ? `+${o[6]}` : ""}`, t);
	};
})), On = e(((e, t) => {
	var n = U(), r = z(), i = H(), a = (e, t, n) => {
		if (!r.RELEASE_TYPES.includes(t)) return null;
		let i = o(e, n);
		return i && s(i, t);
	}, o = (e, t) => n(e instanceof i ? e.version : e, t), s = (e, t) => {
		if (c(t)) return e.version;
		switch (e.prerelease = [], t) {
			case "major":
				e.minor = 0, e.patch = 0;
				break;
			case "minor": e.patch = 0;
		}
		return e.format();
	}, c = (e) => e.startsWith("pre");
	t.exports = a;
})), kn = e(((e, t) => {
	t.exports = class {
		constructor() {
			this.max = 1e3, this.map = new Map();
		}
		get(e) {
			let t = this.map.get(e);
			if (t !== void 0) return this.map.delete(e), this.map.set(e, t), t;
		}
		delete(e) {
			return this.map.delete(e);
		}
		set(e, t) {
			if (!this.delete(e) && t !== void 0) {
				if (this.map.size >= this.max) {
					let e = this.map.keys().next().value;
					this.delete(e);
				}
				this.map.set(e, t);
			}
			return this;
		}
	};
})), X = e(((e, t) => {
	var n = /\s+/g;
	t.exports = class e {
		constructor(t, r) {
			if (r = i(r), t instanceof e) return t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease ? t : new e(t.raw, r);
			if (t instanceof a) return this.raw = t.value, this.set = [[t]], this.formatted = void 0, this;
			if (this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease, this.raw = t.trim().replace(n, " "), this.set = this.raw.split("||").map((e) => this.parseRange(e.trim())).filter((e) => e.length), !this.set.length) throw TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				let e = this.set[0];
				if (this.set = this.set.filter((e) => !_(e[0])), this.set.length === 0) this.set = [e];
				else if (this.set.length > 1) {
					for (let e of this.set) if (e.length === 1 && v(e[0])) {
						this.set = [e];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let e = 0; e < this.set.length; e++) {
					e > 0 && (this.formatted += "||");
					let t = this.set[e];
					for (let e = 0; e < t.length; e++) e > 0 && (this.formatted += " "), this.formatted += t[e].toString().trim();
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(e) {
			e = e.replace(g, "");
			let t = ((this.options.includePrerelease && m) | (this.options.loose && h)) + ":" + e, n = r.get(t);
			if (n) return n;
			let i = this.options.loose, s = i ? c[u.HYPHENRANGELOOSE] : c[u.HYPHENRANGE];
			e = e.replace(s, le(this.options.includePrerelease)), o("hyphen replace", e), e = e.replace(c[u.COMPARATORTRIM], d), o("comparator trim", e), e = e.replace(c[u.TILDETRIM], f), o("tilde trim", e), e = e.replace(c[u.CARETTRIM], p), o("caret trim", e);
			let l = e.split(" ").map((e) => b(e, this.options)).join(" ").split(/\s+/).map((e) => ce(e, this.options));
			i && (l = l.filter((e) => (o("loose invalid filter", e, this.options), !!e.match(c[u.COMPARATORLOOSE])))), o("range list", l);
			let v = new Map(), y = l.map((e) => new a(e, this.options));
			for (let e of y) {
				if (_(e)) return [e];
				v.set(e.value, e);
			}
			v.size > 1 && v.has("") && v.delete("");
			let x = [...v.values()];
			return r.set(t, x), x;
		}
		intersects(t, n) {
			if (!(t instanceof e)) throw TypeError("a Range is required");
			return this.set.some((e) => y(e, n) && t.set.some((t) => y(t, n) && e.every((e) => t.every((t) => e.intersects(t, n)))));
		}
		test(e) {
			if (!e) return !1;
			if (typeof e == "string") try {
				e = new s(e, this.options);
			} catch {
				return !1;
			}
			for (let t = 0; t < this.set.length; t++) if (ue(this.set[t], e, this.options)) return !0;
			return !1;
		}
	};
	var r = new (kn())(), i = un(), a = Z(), o = B(), s = H(), { safeRe: c, src: l, t: u, comparatorTrimReplace: d, tildeTrimReplace: f, caretTrimReplace: p } = V(), { FLAG_INCLUDE_PRERELEASE: m, FLAG_LOOSE: h } = z(), g = new RegExp(l[u.BUILD], "g"), _ = (e) => e.value === "<0.0.0-0", v = (e) => e.value === "", y = (e, t) => {
		let n = !0, r = e.slice(), i = r.pop();
		for (; n && r.length;) n = r.every((e) => i.intersects(e, t)), i = r.pop();
		return n;
	}, b = (e, t) => (e = e.replace(c[u.BUILD], ""), o("comp", e, t), e = re(e, t), o("caret", e), e = te(e, t), o("tildes", e), e = ae(e, t), o("xrange", e), e = se(e, t), o("stars", e), e), x = (e) => !e || e.toLowerCase() === "x" || e === "*", ee = (e, t, n) => x(e) && !x(t) || x(t) && n && !x(n), te = (e, t) => e.trim().split(/\s+/).map((e) => ne(e, t)).join(" "), ne = (e, t) => {
		let n = t.loose ? c[u.TILDELOOSE] : c[u.TILDE], r = t.includePrerelease ? "-0" : "";
		return e.replace(n, (t, n, i, a, s) => {
			o("tilde", e, t, n, i, a, s);
			let c;
			return x(n) ? c = "" : x(i) ? c = `>=${n}.0.0${r} <${+n + 1}.0.0-0` : x(a) ? c = `>=${n}.${i}.0${r} <${n}.${+i + 1}.0-0` : s ? (o("replaceTilde pr", s), c = `>=${n}.${i}.${a}-${s} <${n}.${+i + 1}.0-0`) : c = `>=${n}.${i}.${a} <${n}.${+i + 1}.0-0`, o("tilde return", c), c;
		});
	}, re = (e, t) => e.trim().split(/\s+/).map((e) => ie(e, t)).join(" "), ie = (e, t) => {
		o("caret", e, t);
		let n = t.loose ? c[u.CARETLOOSE] : c[u.CARET], r = t.includePrerelease ? "-0" : "";
		return e.replace(n, (t, n, i, a, s) => {
			o("caret", e, t, n, i, a, s);
			let c;
			return x(n) ? c = "" : x(i) ? c = `>=${n}.0.0${r} <${+n + 1}.0.0-0` : x(a) ? c = n === "0" ? `>=${n}.${i}.0${r} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.0${r} <${+n + 1}.0.0-0` : s ? (o("replaceCaret pr", s), c = n === "0" ? i === "0" ? `>=${n}.${i}.${a}-${s} <${n}.${i}.${+a + 1}-0` : `>=${n}.${i}.${a}-${s} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.${a}-${s} <${+n + 1}.0.0-0`) : (o("no pr"), c = n === "0" ? i === "0" ? `>=${n}.${i}.${a} <${n}.${i}.${+a + 1}-0` : `>=${n}.${i}.${a} <${n}.${+i + 1}.0-0` : `>=${n}.${i}.${a} <${+n + 1}.0.0-0`), o("caret return", c), c;
		});
	}, ae = (e, t) => (o("replaceXRanges", e, t), e.split(/\s+/).map((e) => oe(e, t)).join(" ")), oe = (e, t) => {
		e = e.trim();
		let n = t.loose ? c[u.XRANGELOOSE] : c[u.XRANGE];
		return e.replace(n, (n, r, i, a, s, c) => {
			if (o("xRange", e, n, r, i, a, s, c), ee(i, a, s)) return e;
			let l = x(i), u = l || x(a), d = u || x(s), f = d;
			return r === "=" && f && (r = ""), c = t.includePrerelease ? "-0" : "", l ? n = r === ">" || r === "<" ? "<0.0.0-0" : "*" : r && f ? (u && (a = 0), s = 0, r === ">" ? (r = ">=", u ? (i = +i + 1, a = 0, s = 0) : (a = +a + 1, s = 0)) : r === "<=" && (r = "<", u ? i = +i + 1 : a = +a + 1), r === "<" && (c = "-0"), n = `${r + i}.${a}.${s}${c}`) : u ? n = `>=${i}.0.0${c} <${+i + 1}.0.0-0` : d && (n = `>=${i}.${a}.0${c} <${i}.${+a + 1}.0-0`), o("xRange return", n), n;
		});
	}, se = (e, t) => (o("replaceStars", e, t), e.trim().replace(c[u.STAR], "")), ce = (e, t) => (o("replaceGTE0", e, t), e.trim().replace(c[t.includePrerelease ? u.GTE0PRE : u.GTE0], "")), le = (e) => (t, n, r, i, a, o, s, c, l, u, d, f) => (n = x(r) ? "" : x(i) ? `>=${r}.0.0${e ? "-0" : ""}` : x(a) ? `>=${r}.${i}.0${e ? "-0" : ""}` : o ? `>=${n}` : `>=${n}${e ? "-0" : ""}`, c = x(l) ? "" : x(u) ? `<${+l + 1}.0.0-0` : x(d) ? `<${l}.${+u + 1}.0-0` : f ? `<=${l}.${u}.${d}-${f}` : e ? `<${l}.${u}.${+d + 1}-0` : `<=${c}`, `${n} ${c}`.trim()), ue = (e, t, n) => {
		for (let n = 0; n < e.length; n++) if (!e[n].test(t)) return !1;
		if (t.prerelease.length && !n.includePrerelease) {
			for (let n = 0; n < e.length; n++) if (o(e[n].semver), e[n].semver !== a.ANY && e[n].semver.prerelease.length > 0) {
				let r = e[n].semver;
				if (r.major === t.major && r.minor === t.minor && r.patch === t.patch) return !0;
			}
			return !1;
		}
		return !0;
	};
})), Z = e(((e, t) => {
	var n = Symbol("SemVer ANY");
	t.exports = class e {
		static get ANY() {
			return n;
		}
		constructor(t, i) {
			if (i = r(i), t instanceof e) {
				if (t.loose === !!i.loose) return t;
				t = t.value;
			}
			t = t.trim().split(/\s+/).join(" "), s("comparator", t, i), this.options = i, this.loose = !!i.loose, this.parse(t), this.value = this.semver === n ? "" : this.operator + this.semver.version, s("comp", this);
		}
		parse(e) {
			let t = this.options.loose ? i[a.COMPARATORLOOSE] : i[a.COMPARATOR], r = e.match(t);
			if (!r) throw TypeError(`Invalid comparator: ${e}`);
			this.operator = r[1] === void 0 ? "" : r[1], this.operator === "=" && (this.operator = ""), this.semver = r[2] ? new c(r[2], this.options.loose) : n;
		}
		toString() {
			return this.value;
		}
		test(e) {
			if (s("Comparator.test", e, this.options.loose), this.semver === n || e === n) return !0;
			if (typeof e == "string") try {
				e = new c(e, this.options);
			} catch {
				return !1;
			}
			return o(e, this.operator, this.semver, this.options);
		}
		intersects(t, n) {
			if (!(t instanceof e)) throw TypeError("a Comparator is required");
			return this.operator === "" ? this.value === "" || new l(t.value, n).test(this.value) : t.operator === "" ? t.value === "" || new l(this.value, n).test(t.semver) : (n = r(n), n.includePrerelease && (this.value === "<0.0.0-0" || t.value === "<0.0.0-0") || !n.includePrerelease && (this.value.startsWith("<0.0.0") || t.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && t.operator.startsWith(">") || this.operator.startsWith("<") && t.operator.startsWith("<") || this.semver.version === t.semver.version && this.operator.includes("=") && t.operator.includes("=") || o(this.semver, "<", t.semver, n) && this.operator.startsWith(">") && t.operator.startsWith("<") || o(this.semver, ">", t.semver, n) && this.operator.startsWith("<") && t.operator.startsWith(">")));
		}
	};
	var r = un(), { safeRe: i, t: a } = V(), o = En(), s = B(), c = H(), l = X();
})), Q = e(((e, t) => {
	var n = X();
	t.exports = (e, t, r) => {
		try {
			t = new n(t, r);
		} catch {
			return !1;
		}
		return t.test(e);
	};
})), An = e(((e, t) => {
	var n = X();
	t.exports = (e, t) => new n(e, t).set.map((e) => e.map((e) => e.value).join(" ").trim().split(" "));
})), jn = e(((e, t) => {
	var n = H(), r = X();
	t.exports = (e, t, i) => {
		let a = null, o = null, s = null;
		try {
			s = new r(t, i);
		} catch {
			return null;
		}
		return e.forEach((e) => {
			s.test(e) && (!a || o.compare(e) === -1) && (a = e, o = new n(a, i));
		}), a;
	};
})), Mn = e(((e, t) => {
	var n = H(), r = X();
	t.exports = (e, t, i) => {
		let a = null, o = null, s = null;
		try {
			s = new r(t, i);
		} catch {
			return null;
		}
		return e.forEach((e) => {
			s.test(e) && (!a || o.compare(e) === 1) && (a = e, o = new n(a, i));
		}), a;
	};
})), Nn = e(((e, t) => {
	var n = H(), r = X(), i = K();
	t.exports = (e, t) => {
		e = new r(e, t);
		let a = new n("0.0.0");
		if (e.test(a) || (a = new n("0.0.0-0"), e.test(a))) return a;
		a = null;
		for (let t = 0; t < e.set.length; ++t) {
			let r = e.set[t], o = null;
			r.forEach((e) => {
				let t = new n(e.semver.version);
				switch (e.operator) {
					case ">": t.prerelease.length === 0 ? t.patch++ : t.prerelease.push(0), t.raw = t.format();
					case "":
					case ">=":
						(!o || i(t, o)) && (o = t);
						break;
					case "<":
					case "<=": break;
					default: throw Error(`Unexpected operation: ${e.operator}`);
				}
			}), o && (!a || i(a, o)) && (a = o);
		}
		return a && e.test(a) ? a : null;
	};
})), Pn = e(((e, t) => {
	var n = X();
	t.exports = (e, t) => {
		try {
			return new n(e, t).range || "*";
		} catch {
			return null;
		}
	};
})), Fn = e(((e, t) => {
	var n = H(), r = Z(), { ANY: i } = r, a = X(), o = Q(), s = K(), c = q(), l = Y(), u = J();
	t.exports = (e, t, d, f) => {
		e = new n(e, f), t = new a(t, f);
		let p, m, h, g, _;
		switch (d) {
			case ">":
				p = s, m = l, h = c, g = ">", _ = ">=";
				break;
			case "<":
				p = c, m = u, h = s, g = "<", _ = "<=";
				break;
			default: throw TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (o(e, t, f)) return !1;
		for (let n = 0; n < t.set.length; ++n) {
			let a = t.set[n], o = null, s = null;
			if (a.forEach((e) => {
				e.semver === i && (e = new r(">=0.0.0")), o ||= e, s ||= e, p(e.semver, o.semver, f) ? o = e : h(e.semver, s.semver, f) && (s = e);
			}), o.operator === g || o.operator === _ || (!s.operator || s.operator === g) && m(e, s.semver) || s.operator === _ && h(e, s.semver)) return !1;
		}
		return !0;
	};
})), In = e(((e, t) => {
	var n = Fn();
	t.exports = (e, t, r) => n(e, t, ">", r);
})), Ln = e(((e, t) => {
	var n = Fn();
	t.exports = (e, t, r) => n(e, t, "<", r);
})), Rn = e(((e, t) => {
	var n = X();
	t.exports = (e, t, r) => (e = new n(e, r), t = new n(t, r), e.intersects(t, r));
})), zn = e(((e, t) => {
	var n = Q(), r = W();
	t.exports = (e, t, i) => {
		let a = [], o = null, s = null, c = e.sort((e, t) => r(e, t, i));
		for (let e of c) n(e, t, i) ? (s = e, o ||= e) : (s && a.push([o, s]), s = null, o = null);
		o && a.push([o, null]);
		let l = [];
		for (let [e, t] of a) e === t ? l.push(e) : !t && e === c[0] ? l.push("*") : t ? e === c[0] ? l.push(`<=${t}`) : l.push(`${e} - ${t}`) : l.push(`>=${e}`);
		let u = l.join(" || "), d = typeof t.raw == "string" ? t.raw : String(t);
		return u.length < d.length ? u : t;
	};
})), Bn = e(((e, t) => {
	var n = X(), r = Z(), { ANY: i } = r, a = Q(), o = W(), s = (e, t, r = {}) => {
		if (e === t) return !0;
		e = new n(e, r), t = new n(t, r);
		let i = !1;
		OUTER: for (let n of e.set) {
			for (let e of t.set) {
				let t = u(n, e, r);
				if (i ||= t !== null, t) continue OUTER;
			}
			if (i) return !1;
		}
		return !0;
	}, c = [new r(">=0.0.0-0")], l = [new r(">=0.0.0")], u = (e, t, n) => {
		if (e === t) return !0;
		if (e.length === 1 && e[0].semver === i) {
			if (t.length === 1 && t[0].semver === i) return !0;
			e = n.includePrerelease ? c : l;
		}
		if (t.length === 1 && t[0].semver === i) {
			if (n.includePrerelease) return !0;
			t = l;
		}
		let r = new Set(), s, u;
		for (let t of e) t.operator === ">" || t.operator === ">=" ? s = d(s, t, n) : t.operator === "<" || t.operator === "<=" ? u = f(u, t, n) : r.add(t.semver);
		if (r.size > 1) return null;
		let p;
		if (s && u && (p = o(s.semver, u.semver, n), p > 0 || p === 0 && (s.operator !== ">=" || u.operator !== "<="))) return null;
		for (let e of r) {
			if (s && !a(e, String(s), n) || u && !a(e, String(u), n)) return null;
			for (let r of t) if (!a(e, String(r), n)) return !1;
			return !0;
		}
		let m, h, g, _, v = u && !n.includePrerelease && u.semver.prerelease.length ? u.semver : !1, y = s && !n.includePrerelease && s.semver.prerelease.length ? s.semver : !1;
		v && v.prerelease.length === 1 && u.operator === "<" && v.prerelease[0] === 0 && (v = !1);
		for (let e of t) {
			if (_ = _ || e.operator === ">" || e.operator === ">=", g = g || e.operator === "<" || e.operator === "<=", s) {
				if (y && e.semver.prerelease && e.semver.prerelease.length && e.semver.major === y.major && e.semver.minor === y.minor && e.semver.patch === y.patch && (y = !1), e.operator === ">" || e.operator === ">=") {
					if (m = d(s, e, n), m === e && m !== s) return !1;
				} else if (s.operator === ">=" && !e.test(s.semver)) return !1;
			}
			if (u) {
				if (v && e.semver.prerelease && e.semver.prerelease.length && e.semver.major === v.major && e.semver.minor === v.minor && e.semver.patch === v.patch && (v = !1), e.operator === "<" || e.operator === "<=") {
					if (h = f(u, e, n), h === e && h !== u) return !1;
				} else if (u.operator === "<=" && !e.test(u.semver)) return !1;
			}
			if (!e.operator && (u || s) && p !== 0) return !1;
		}
		return !(s && g && !u && p !== 0 || u && _ && !s && p !== 0 || y || v);
	}, d = (e, t, n) => {
		if (!e) return t;
		let r = o(e.semver, t.semver, n);
		return r > 0 ? e : r < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
	}, f = (e, t, n) => {
		if (!e) return t;
		let r = o(e.semver, t.semver, n);
		return r < 0 ? e : r > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
	};
	t.exports = s;
})), Vn = e(((e, t) => {
	var n = V(), r = z(), i = H(), a = dn();
	t.exports = {
		parse: U(),
		valid: fn(),
		clean: pn(),
		inc: mn(),
		diff: hn(),
		major: gn(),
		minor: _n(),
		patch: vn(),
		prerelease: yn(),
		compare: W(),
		rcompare: bn(),
		compareLoose: xn(),
		compareBuild: G(),
		sort: Sn(),
		rsort: Cn(),
		gt: K(),
		lt: q(),
		eq: wn(),
		neq: Tn(),
		gte: J(),
		lte: Y(),
		cmp: En(),
		coerce: Dn(),
		truncate: On(),
		Comparator: Z(),
		Range: X(),
		satisfies: Q(),
		toComparators: An(),
		maxSatisfying: jn(),
		minSatisfying: Mn(),
		minVersion: Nn(),
		validRange: Pn(),
		outside: Fn(),
		gtr: In(),
		ltr: Ln(),
		intersects: Rn(),
		simplifyRange: zn(),
		subset: Bn(),
		SemVer: i,
		re: n.re,
		src: n.src,
		tokens: n.t,
		SEMVER_SPEC_VERSION: r.SEMVER_SPEC_VERSION,
		RELEASE_TYPES: r.RELEASE_TYPES,
		compareIdentifiers: a.compareIdentifiers,
		rcompareIdentifiers: a.rcompareIdentifiers
	};
})), $ = Vn(), Hn = Object.freeze([
	"@moldea.ai/core",
	"@moldea.ai/repository",
	"@moldea.ai/repository-fs"
]), Un = Object.freeze({
	"@moldea.ai/core": "^10.0.1",
	"@moldea.ai/repository": "^4.0.0",
	"@moldea.ai/repository-fs": "^4.0.0"
}), Wn = (e, t) => {
	if (e.length !== t.length || new Set(e).size !== e.length || new Set(t).size !== t.length) return !1;
	let n = new Set(t);
	return e.every((e) => n.has(e));
}, Gn = (e) => e.length > 0 && e.every((e) => Number.isSafeInteger(e) && e > 0) && new Set(e).size === e.length, Kn = (e) => {
	let { dependencies: t, installedPackageVersions: n, supportedNodeRange: r, version: i } = e.packageMetadata;
	if ((0, $.valid)(i) === null || r === null || (0, $.validRange)(r) === null || (0, $.valid)(e.minimumGitVersion) === null || e.outputSchemaVersion !== 9 || t === null || n === null || !Gn(e.coreSupportedRepositoryFormatVersions)) return !1;
	let a = [...Hn], o = Object.keys(t).filter((e) => e.startsWith("@moldea.ai/")), s = Object.keys(n);
	return !Wn(o, a) || !Wn(s, a) ? !1 : a.every((e) => {
		let r = n[e], i = t[e], a = Un[e];
		return r !== void 0 && (0, $.valid)(r) !== null && a !== void 0 && (i === a || i === `workspace:${a}`) && (0, $.satisfies)(r, a);
	});
}, qn = (e, t) => e < t ? -1 : +(e > t), Jn = (e) => {
	let t = Object.entries(e.packageMetadata.installedPackageVersions ?? {}).map(([e, t]) => ({
		name: e,
		version: t
	})).sort((e, t) => qn(e.name, t.name));
	return o({
		minimumGitVersion: e.minimumGitVersion,
		packages: t,
		repositoryFormatVersions: [...e.coreSupportedRepositoryFormatVersions].sort((e, t) => e - t),
		supportedNodeRange: e.packageMetadata.supportedNodeRange ?? ""
	});
}, Yn = Object.freeze({ kind: "invalid" }), Xn = (e) => {
	try {
		return Kn(e) ? Object.freeze({
			kind: "valid",
			result: Jn(e)
		}) : Yn;
	} catch {
		return Yn;
	}
}, Zn = (e) => Xn({
	coreSupportedRepositoryFormatVersions: a,
	minimumGitVersion: rn,
	outputSchemaVersion: 9,
	packageMetadata: e.packageMetadata
});
//#endregion
export { _t as A, be as B, mt as C, yt as D, ut as E, Me as F, C as H, D as I, E as L, $e as M, Ve as N, ct as O, O as P, Ae as R, st as S, ft as T, m as U, T as V, Tt as _, Vn as a, lt as b, nn as c, Yt as d, Zt as f, xt as g, I as h, Kn as i, pt as j, ht as k, $t as l, Xt as m, Xn as n, ln as o, Jt as p, Jn as r, cn as s, Zn as t, tn as u, wt as v, gt as w, vt as x, ot as y, ke as z };
