import { a as createInspectionProcessFailure, c as encodeInspectionMessage, r as NODE_INSPECTION_TERMINATION_GRACE_MS } from "./chunk-ec3f49d3.mjs";
import process from "node:process";
//#region ../core/dist/chunks/lifecycle-z05THc0s.js
var createInspectionSender = (send) => {
	let queued = 0;
	let tail = Promise.resolve();
	return async (message) => {
		if (queued >= 4) throw createInspectionProcessFailure();
		queued++;
		const operation = tail.then(() => new Promise((resolve, reject) => {
			try {
				send(encodeInspectionMessage(message), (error) => {
					if (error !== null) reject(createInspectionProcessFailure(error));
					else resolve();
				});
			} catch (cause) {
				reject(cause instanceof Error ? cause : createInspectionProcessFailure(cause));
			}
		}));
		tail = operation.catch(() => {});
		try {
			await operation;
		} finally {
			queued--;
		}
	};
};
var createInspectionEnvironment = () => {
	const names = new Set([
		"systemroot",
		"windir",
		"temp",
		"tmp",
		"tmpdir"
	]);
	return Object.fromEntries(Object.entries(process.env).filter(([name]) => names.has(name.toLowerCase())));
};
var superviseInspectionChild = (child, requestStop) => {
	let hasClosed = false;
	let forceTimer;
	return {
		closed: new Promise((resolve) => {
			child.once("close", () => {
				hasClosed = true;
				clearTimeout(forceTimer);
				resolve();
			});
		}),
		terminate: () => {
			if (hasClosed || forceTimer !== void 0) return;
			forceTimer = setTimeout(() => {
				if (!hasClosed) child.kill("SIGKILL");
			}, NODE_INSPECTION_TERMINATION_GRACE_MS);
			requestStop();
		}
	};
};
//#endregion
export { createInspectionSender as n, superviseInspectionChild as r, createInspectionEnvironment as t };
