import { a as e, c as t, r as n } from "./chunk-24ea7c23.mjs";
import r from "node:process";
//#region ../core/dist/chunks/lifecycle-z05THc0s.js
var i = (n) => {
	let r = 0, i = Promise.resolve();
	return async (a) => {
		if (r >= 4) throw e();
		r++;
		let o = i.then(() => new Promise((r, i) => {
			try {
				n(t(a), (t) => {
					t === null ? r() : i(e(t));
				});
			} catch (t) {
				i(t instanceof Error ? t : e(t));
			}
		}));
		i = o.catch(() => {});
		try {
			await o;
		} finally {
			r--;
		}
	};
}, a = () => {
	let e = new Set([
		"systemroot",
		"windir",
		"temp",
		"tmp",
		"tmpdir"
	]);
	return Object.fromEntries(Object.entries(r.env).filter(([t]) => e.has(t.toLowerCase())));
}, o = (e, t) => {
	let r = !1, i;
	return {
		closed: new Promise((t) => {
			e.once("close", () => {
				r = !0, clearTimeout(i), t();
			});
		}),
		terminate: () => {
			r || i !== void 0 || (i = setTimeout(() => {
				r || e.kill("SIGKILL");
			}, n), t());
		}
	};
};
//#endregion
export { i as n, o as r, a as t };
