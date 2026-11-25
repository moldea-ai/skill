import { u as isObjectValid } from "./chunk-728df961.mjs";
import { c as isRepositoryPath, i as RepositorySourceException, l as parseRepositoryPath } from "./chunk-8d6114d2.mjs";
import { Buffer } from "node:buffer";
//#region ../core/dist/chunks/repository-rpc-DVgCPLGx.js
var invalidSource = () => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation: "create-reader",
		path: null,
		retryable: false
	});
};
var isInteger = (input) => typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
var keysMatch = (input, keys) => Object.keys(input).length === keys.length && keys.every((key) => Object.hasOwn(input, key));
var parseSnapshot = (input) => {
	if (!isObjectValid(input, true) || !keysMatch(input, ["id", "sourceKind"]) || typeof input["id"] !== "string" || input["id"].length === 0 || typeof input["sourceKind"] !== "string" || input["sourceKind"].length === 0) return invalidSource();
	return {
		id: input["id"],
		sourceKind: input["sourceKind"]
	};
};
var parseRpcEntry = (input) => {
	if (input === null) return null;
	if (!isObjectValid(input, true)) return invalidSource();
	const entry = input;
	if (!keysMatch(entry, [
		"path",
		"type",
		"byteLength",
		"contentIdentity"
	]) || !isRepositoryPath(entry["path"]) || entry["type"] !== "file" && entry["type"] !== "directory" && entry["type"] !== "symlink" || entry["byteLength"] !== null && !isInteger(entry["byteLength"]) || entry["contentIdentity"] !== null && typeof entry["contentIdentity"] !== "string") return invalidSource();
	return {
		path: entry["path"],
		type: entry["type"],
		byteLength: entry["byteLength"],
		contentIdentity: entry["contentIdentity"]
	};
};
var parseRpcEntryPage = (input) => {
	if (!isObjectValid(input, true)) return invalidSource();
	const page = input;
	if (!keysMatch(page, [
		"entries",
		"isComplete",
		"nextCursor",
		"snapshot"
	]) || !Array.isArray(page["entries"]) || page["entries"].length > 128 || typeof page["isComplete"] !== "boolean" || page["nextCursor"] !== null && typeof page["nextCursor"] !== "string") return invalidSource();
	const entries = [];
	for (const candidate of page["entries"]) {
		const entry = parseRpcEntry(candidate);
		if (entry === null) return invalidSource();
		entries.push(entry);
	}
	return {
		entries,
		isComplete: page["isComplete"],
		nextCursor: page["nextCursor"],
		snapshot: parseSnapshot(page["snapshot"])
	};
};
var parseRpcLinkText = (input) => {
	if (input === null) return null;
	if (typeof input !== "string" || Buffer.byteLength(input, "utf8") > 4096) return invalidSource();
	return input;
};
var parseRpcFilePage = (input) => {
	if (!isObjectValid(input, true)) return invalidSource();
	const filePage = input;
	if (!keysMatch(filePage, [
		"bytes",
		"isComplete",
		"nextOffset",
		"offset",
		"snapshot",
		"totalBytes"
	]) || typeof filePage["bytes"] !== "string" || filePage["bytes"].length > Math.ceil(65536 / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(filePage["bytes"]) || typeof filePage["isComplete"] !== "boolean" || !isInteger(filePage["offset"]) || !isInteger(filePage["totalBytes"]) || filePage["nextOffset"] !== null && !isInteger(filePage["nextOffset"])) return invalidSource();
	const bytes = Buffer.from(filePage["bytes"], "base64");
	if (bytes.byteLength > 65536 || bytes.toString("base64") !== filePage["bytes"]) return invalidSource();
	return {
		bytes,
		isComplete: filePage["isComplete"],
		nextOffset: filePage["nextOffset"],
		offset: filePage["offset"],
		snapshot: parseSnapshot(filePage["snapshot"]),
		totalBytes: filePage["totalBytes"]
	};
};
var encodeFilePage = (page, maxBytes) => {
	if (!(page.bytes instanceof Uint8Array) || page.bytes.byteLength > maxBytes) return invalidSource();
	const result = {
		...page,
		bytes: Buffer.from(page.bytes.buffer, page.bytes.byteOffset, page.bytes.byteLength).toString("base64")
	};
	parseRpcFilePage(result);
	return result;
};
var executeRepositoryRpc = async (sources, request, signal) => {
	const getReader = (source) => source === "repository" ? sources.repository : sources.instructions ?? invalidSource();
	if (request.method === "readLinkText") return parseRpcLinkText(await getReader(request.source).readLinkText(parseRepositoryPath(request.path), { signal }));
	if (request.method === "getEntry") return parseRpcEntry(await getReader(request.source).getEntry(parseRepositoryPath(request.path), { signal }));
	const reader = sources.repository;
	if (request.method === "listEntriesPage") return parseRpcEntryPage(await reader.listEntriesPage({
		maxEntries: request.maxEntries,
		signal,
		...request.prefix === void 0 ? {} : { prefix: parseRepositoryPath(request.prefix) },
		...request.cursor === void 0 ? {} : { cursor: request.cursor }
	}));
	return encodeFilePage(await getReader(request.source).readFilePage(parseRepositoryPath(request.path), {
		maxBytes: request.maxBytes,
		offset: request.offset,
		signal
	}), request.maxBytes);
};
//#endregion
export { parseRpcLinkText as a, parseRpcFilePage as i, parseRpcEntry as n, parseRpcEntryPage as r, executeRepositoryRpc as t };
