import { n as e } from "./chunk-2cc3bf5c.mjs";
import { a as t, c as n, l as r, n as i, o as a } from "./chunk-24ea7c23.mjs";
import { n as o } from "./chunk-cea1378f.mjs";
import s from "node:process";
import { Worker as c } from "node:worker_threads";
//#region ../core/dist/node-runner.js
var l, u, d, f, p = !1, m = !1, h = new Set(), g = o((e, n) => {
	if (s.send === void 0 || !s.connected) throw t();
	s.send(e, n);
}), _ = async (e) => {
	if (p) return;
	p = !0, clearTimeout(f);
	let t = l?.terminate();
	if (e !== void 0 && u !== void 0 && s.connected) try {
		await g({
			attemptId: u,
			kind: "failure",
			failure: r(e)
		});
	} catch {}
	await t, h.clear(), s.removeListener("message", x), s.removeListener("disconnect", v), s.connected && s.disconnect();
}, v = () => {
	_();
}, y = (e) => {
	try {
		let n = a(e);
		if (p) return;
		if (n.attemptId !== u) throw t();
		if (n.kind === "ready") {
			if (d !== void 0 || m) throw t();
			d = n.maxAnalysisHeapBytes;
		} else if (n.kind === "reader-request") {
			if (!m || h.has(n.requestId) || h.size >= 4) throw t();
			h.add(n.requestId);
		} else if (n.kind === "failure" && n.failure.options.limit === "maxAnalysisHeapBytes") throw t();
		else if (![
			"prepared",
			"page",
			"failure"
		].includes(n.kind)) throw t();
		g(n).catch((e) => _(e));
	} catch (e) {
		_(e);
	}
}, b = (r) => {
	if (u !== void 0 || p) throw t();
	u = r.attemptId, clearTimeout(f);
	let a = Math.min(i, r.deadline - Date.now());
	if (a <= 0) {
		_(new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
		return;
	}
	f = setTimeout(() => {
		_(new e({
			code: "INSPECTION_TIMEOUT",
			operation: "create-project-inspection"
		}));
	}, a), l = new c(new URL(new URL("./analysis-worker.mjs", import.meta.url).href), {
		execArgv: [],
		env: s.env,
		stdout: !0,
		stderr: !0,
		resourceLimits: {
			maxOldGenerationSizeMb: 512,
			maxYoungGenerationSizeMb: 24
		},
		workerData: n(r)
	});
	let o = 0, m = (e) => {
		o += e.byteLength, o > 32768 && _(t());
	};
	l.stdout.on("data", m), l.stderr.on("data", m), l.on("message", y), l.on("messageerror", (e) => {
		_(t(e));
	}), l.once("error", (n) => {
		_(n.code === "ERR_WORKER_OUT_OF_MEMORY" && d !== void 0 ? new e({
			code: "RESOURCE_LIMIT_EXCEEDED",
			operation: "create-project-inspection",
			limit: "maxAnalysisHeapBytes",
			limitMaximum: d,
			observedUsage: null,
			nextAction: "review-inspection-capacity"
		}) : t(n));
	}), l.once("exit", () => {
		p || _(t());
	});
}, x = (e) => {
	try {
		let r = a(e);
		if (p) return;
		if (r.kind === "start") {
			b(r);
			return;
		}
		if (r.attemptId !== u || l === void 0) throw t();
		if (r.kind === "dispose") {
			_();
			return;
		}
		if (r.kind === "run") {
			if (d === void 0 || m) throw t();
			m = !0;
		} else if (r.kind === "reader-response" || r.kind === "reader-failure") {
			if (!h.delete(r.requestId)) throw t();
		} else if (r.kind !== "read-page" || !m) throw t();
		l.postMessage(n(r));
	} catch (e) {
		_(e);
	}
};
s.on("disconnect", v), s.on("message", x), f = setTimeout(() => {
	_();
}, i), (s.send === void 0 || !s.connected) && _();
//#endregion
export {};
