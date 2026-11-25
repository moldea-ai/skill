import { f as Exception, u as isObjectValid } from "./chunk-728df961.mjs";
//#region ../repository/dist/chunks/links-DPog2q0N.js
var SOURCE_ERROR_MESSAGES = {
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
};
var RepositoryPathException = class extends Exception {
	code;
	constructor(options) {
		super("The repository path is invalid.", {
			code: "INVALID_REPOSITORY_PATH",
			cause: options?.cause
		});
		this.code = "INVALID_REPOSITORY_PATH";
		this.name = "RepositoryPathException";
	}
};
var RepositorySourceException = class extends Exception {
	code;
	operation;
	path;
	resource;
	retryable;
	constructor(options) {
		super(SOURCE_ERROR_MESSAGES[options.code], {
			code: options.code,
			cause: options.cause
		});
		this.code = options.code;
		this.name = "RepositorySourceException";
		this.operation = options.operation;
		this.path = options.path;
		this.resource = options.resource ?? null;
		this.retryable = options.retryable;
	}
};
var SHA256_INITIAL_STATE = [
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
];
var SHA256_ROUND_CONSTANTS = [
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
];
var rotateRight = (value, shift) => value >>> shift | value << 32 - shift;
var processSha256Block = (state, input, offset, schedule) => {
	for (let index = 0; index < 16; index += 1) {
		const wordOffset = offset + index * 4;
		schedule[index] = (input[wordOffset] ?? 0) << 24 | (input[wordOffset + 1] ?? 0) << 16 | (input[wordOffset + 2] ?? 0) << 8 | (input[wordOffset + 3] ?? 0);
	}
	for (let index = 16; index < 64; index += 1) {
		const first = schedule[index - 15] ?? 0;
		const second = schedule[index - 2] ?? 0;
		const firstSigma = rotateRight(first, 7) ^ rotateRight(first, 18) ^ first >>> 3;
		const secondSigma = rotateRight(second, 17) ^ rotateRight(second, 19) ^ second >>> 10;
		schedule[index] = (schedule[index - 16] ?? 0) + firstSigma + (schedule[index - 7] ?? 0) + secondSigma >>> 0;
	}
	let a = state[0] ?? 0;
	let b = state[1] ?? 0;
	let c = state[2] ?? 0;
	let d = state[3] ?? 0;
	let e = state[4] ?? 0;
	let f = state[5] ?? 0;
	let g = state[6] ?? 0;
	let h = state[7] ?? 0;
	for (let index = 0; index < 64; index += 1) {
		const sumOne = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
		const choice = e & f ^ ~e & g;
		const temporaryOne = h + sumOne + choice + (SHA256_ROUND_CONSTANTS[index] ?? 0) + (schedule[index] ?? 0) >>> 0;
		const temporaryTwo = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
		h = g;
		g = f;
		f = e;
		e = d + temporaryOne >>> 0;
		d = c;
		c = b;
		b = a;
		a = temporaryOne + temporaryTwo >>> 0;
	}
	state[0] = (state[0] ?? 0) + a >>> 0;
	state[1] = (state[1] ?? 0) + b >>> 0;
	state[2] = (state[2] ?? 0) + c >>> 0;
	state[3] = (state[3] ?? 0) + d >>> 0;
	state[4] = (state[4] ?? 0) + e >>> 0;
	state[5] = (state[5] ?? 0) + f >>> 0;
	state[6] = (state[6] ?? 0) + g >>> 0;
	state[7] = (state[7] ?? 0) + h >>> 0;
};
var sha256 = (parts) => {
	const state = [...SHA256_INITIAL_STATE];
	const schedule = new Uint32Array(64);
	const pending = new Uint8Array(64);
	let pendingLength = 0;
	let totalByteLength = 0n;
	const update = (input) => {
		totalByteLength += BigInt(input.byteLength);
		let offset = 0;
		if (pendingLength > 0) {
			const copied = Math.min(64 - pendingLength, input.byteLength);
			pending.set(input.subarray(0, copied), pendingLength);
			pendingLength += copied;
			offset = copied;
			if (pendingLength === 64) {
				processSha256Block(state, pending, 0, schedule);
				pendingLength = 0;
			}
		}
		while (offset + 64 <= input.byteLength) {
			processSha256Block(state, input, offset, schedule);
			offset += 64;
		}
		if (offset < input.byteLength) {
			pending.set(input.subarray(offset), 0);
			pendingLength = input.byteLength - offset;
		}
	};
	for (const part of parts) {
		const length = BigInt(part.byteLength);
		const lengthPrefix = new Uint8Array(8);
		const lengthView = new DataView(lengthPrefix.buffer);
		lengthView.setUint32(0, Number(length >> 32n), false);
		lengthView.setUint32(4, Number(length & 4294967295n), false);
		update(lengthPrefix);
		update(part);
	}
	const finalLength = pendingLength < 56 ? 64 : 128;
	const finalBlocks = new Uint8Array(finalLength);
	finalBlocks.set(pending.subarray(0, pendingLength));
	finalBlocks[pendingLength] = 128;
	const bitLength = totalByteLength * 8n;
	const finalView = new DataView(finalBlocks.buffer);
	finalView.setUint32(finalLength - 8, Number(bitLength >> 32n), false);
	finalView.setUint32(finalLength - 4, Number(bitLength & 4294967295n), false);
	for (let offset = 0; offset < finalLength; offset += 64) processSha256Block(state, finalBlocks, offset, schedule);
	const digest = new Uint8Array(32);
	const digestView = new DataView(digest.buffer);
	state.forEach((word, index) => digestView.setUint32(index * 4, word, false));
	return digest;
};
var createRepositoryIdentity = (parts) => {
	const digest = sha256(parts);
	return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
var encoder = new TextEncoder();
var ENVELOPE_KEYS = new Set([
	"checksum",
	"payload",
	"version"
]);
var createRepositoryCursor = (payload) => {
	const serializedPayload = JSON.stringify(payload);
	return JSON.stringify({
		checksum: createRepositoryIdentity([encoder.encode(serializedPayload)]),
		payload: serializedPayload,
		version: 1
	});
};
var decodeRepositoryCursor = (cursor) => {
	const envelope = JSON.parse(cursor);
	if (!isObjectValid(envelope, true) || Reflect.ownKeys(envelope).some((key) => typeof key !== "string" || !ENVELOPE_KEYS.has(key)) || envelope["version"] !== 1 || typeof envelope["payload"] !== "string" || typeof envelope["checksum"] !== "string" || envelope["checksum"] !== createRepositoryIdentity([encoder.encode(envelope["payload"])])) throw new TypeError("The repository cursor is invalid.");
	return JSON.parse(envelope["payload"]);
};
var parsePositivePageInteger = (value, operation, path) => {
	if (!Number.isSafeInteger(value) || value <= 0) throw new RepositorySourceException({
		code: "INVALID_PAGE_REQUEST",
		operation,
		path,
		retryable: false
	});
	return value;
};
var WINDOWS_DRIVE_PREFIX_PATTERN = /^\/[A-Za-z]:/u;
var hasASCIIControlCharacter = (value) => {
	for (let index = 0; index < value.length; index += 1) {
		const codeUnit = value.charCodeAt(index);
		if (codeUnit <= 31 || codeUnit === 127) return true;
	}
	return false;
};
var isRepositoryPath = (value) => {
	if (typeof value !== "string" || !value.isWellFormed()) return false;
	if (value === "/") return true;
	if (!value.startsWith("/") || value.startsWith("//") || value.endsWith("/") || value.includes("\\") || hasASCIIControlCharacter(value) || WINDOWS_DRIVE_PREFIX_PATTERN.test(value)) return false;
	return value.slice(1).split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
};
var parseRepositoryPath = (value) => {
	if (!isRepositoryPath(value)) throw new RepositoryPathException();
	return value;
};
var compareRepositoryPaths = (left, right) => {
	const leftSegments = left.split("/");
	const rightSegments = right.split("/");
	const sharedLength = Math.min(leftSegments.length, rightSegments.length);
	for (let index = 0; index < sharedLength; index += 1) {
		const leftSegment = leftSegments[index] ?? "";
		const rightSegment = rightSegments[index] ?? "";
		if (leftSegment < rightSegment) return -1;
		if (leftSegment > rightSegment) return 1;
	}
	return leftSegments.length - rightSegments.length;
};
var REPOSITORY_ROOT = parseRepositoryPath("/");
var COMPARISON_CURSOR_KEYS = new Set([
	"baseCursor",
	"baseSnapshotId",
	"candidateCursor",
	"candidateSnapshotId",
	"pendingFile"
]);
var PENDING_FILE_CURSOR_KEYS = new Set(["offset", "path"]);
var throwIfAborted = (signal) => {
	if (signal?.aborted) throw new RepositorySourceException({
		cause: signal.reason,
		code: "ABORTED",
		operation: "list-changes-page",
		path: null,
		retryable: false
	});
};
var invalidComparisonCursor = (cause) => {
	return new RepositorySourceException({
		cause,
		code: "INVALID_PAGE_REQUEST",
		operation: "list-changes-page",
		path: null,
		retryable: false
	});
};
var parseComparisonCursor = (cursor, baseSnapshotId, candidateSnapshotId) => {
	if (cursor === void 0) return {
		baseCursor: null,
		baseSnapshotId,
		candidateCursor: null,
		candidateSnapshotId,
		pendingFile: null
	};
	try {
		const parsed = decodeRepositoryCursor(cursor);
		if (typeof parsed !== "object" || parsed === null || Reflect.ownKeys(parsed).some((key) => typeof key !== "string" || !COMPARISON_CURSOR_KEYS.has(key)) || parsed.baseSnapshotId !== baseSnapshotId || parsed.candidateSnapshotId !== candidateSnapshotId || typeof parsed.baseCursor !== "string" && parsed.baseCursor !== null || typeof parsed.candidateCursor !== "string" && parsed.candidateCursor !== null || parsed.pendingFile !== null && (typeof parsed.pendingFile !== "object" || Reflect.ownKeys(parsed.pendingFile).some((key) => typeof key !== "string" || !PENDING_FILE_CURSOR_KEYS.has(key)) || typeof parsed.pendingFile.path !== "string" || !Number.isSafeInteger(parsed.pendingFile.offset) || parsed.pendingFile.offset < 0)) throw new Error("invalid comparison cursor");
		return parsed;
	} catch (cause) {
		throw invalidComparisonCursor(cause);
	}
};
var invalidSourceData = (path, cause) => {
	throw new RepositorySourceException({
		cause,
		code: "INVALID_SOURCE_DATA",
		operation: "list-changes-page",
		path,
		retryable: false
	});
};
var getNextEntry = async (reader, cursor, signal) => {
	if (cursor === "") return null;
	const page = await reader.listEntriesPage({
		...cursor === null ? {} : { cursor },
		maxEntries: 1,
		prefix: REPOSITORY_ROOT,
		...signal === void 0 ? {} : { signal }
	});
	if (page.snapshot.id !== reader.snapshot.id || page.entries.length > 1) throw invalidComparisonCursor();
	const entry = page.entries[0];
	if (entry === void 0) {
		if (!page.isComplete || page.nextCursor !== null) throw invalidComparisonCursor();
		return null;
	}
	if (!page.isComplete && page.nextCursor === null) throw invalidComparisonCursor();
	return {
		cursorAfter: page.nextCursor ?? "",
		entry
	};
};
var classifySharedEntryMetadata = (baseEntry, candidateEntry, canCompareContentIdentities) => {
	if (baseEntry.type !== candidateEntry.type) return {
		baseEntry,
		candidateEntry,
		kind: "type-changed",
		path: baseEntry.path
	};
	if (baseEntry.type !== "file") return null;
	if (baseEntry.byteLength !== null && candidateEntry.byteLength !== null && baseEntry.byteLength !== candidateEntry.byteLength) return {
		baseEntry,
		candidateEntry,
		kind: "modified",
		path: baseEntry.path
	};
	if (canCompareContentIdentities && baseEntry.contentIdentity !== null && candidateEntry.contentIdentity !== null && baseEntry.contentIdentity === candidateEntry.contentIdentity) return null;
	if (baseEntry.byteLength === 0 && candidateEntry.byteLength === 0) return null;
};
var validateFilePage = (page, entry, expectedSnapshotId, expectedOffset, maxBytes) => {
	const nextOffset = expectedOffset + page.bytes.byteLength;
	if (!(page.bytes instanceof Uint8Array) || page.bytes.byteLength > maxBytes || page.offset !== expectedOffset || page.snapshot.id !== expectedSnapshotId || !Number.isSafeInteger(page.totalBytes) || page.totalBytes < expectedOffset || nextOffset > page.totalBytes || entry.byteLength !== null && page.totalBytes !== entry.byteLength || page.isComplete !== (nextOffset === page.totalBytes) || page.nextOffset !== (page.isComplete ? null : nextOffset) || !page.isComplete && page.bytes.byteLength === 0) invalidSourceData(entry.path);
};
var compareFileRange = async (base, candidate, baseEntry, candidateEntry, offset, maxBytesRead, signal) => {
	const maxBaseBytes = Math.floor(maxBytesRead / 2);
	if (maxBaseBytes < 1) return {
		bytesRead: 0,
		isComplete: false,
		isEqual: true,
		nextOffset: offset
	};
	const basePage = await base.readFilePage(baseEntry.path, {
		maxBytes: maxBaseBytes,
		offset,
		...signal === void 0 ? {} : { signal }
	});
	validateFilePage(basePage, baseEntry, base.snapshot.id, offset, maxBaseBytes);
	let bytesRead = basePage.bytes.byteLength;
	let candidateOffset = offset;
	let comparedBytes = 0;
	let candidateTotalBytes = null;
	const candidateTargetBytes = Math.max(basePage.bytes.byteLength, 1);
	while (comparedBytes < candidateTargetBytes) {
		const remainingTargetBytes = candidateTargetBytes - comparedBytes;
		const candidatePage = await candidate.readFilePage(candidateEntry.path, {
			maxBytes: remainingTargetBytes,
			offset: candidateOffset,
			...signal === void 0 ? {} : { signal }
		});
		validateFilePage(candidatePage, candidateEntry, candidate.snapshot.id, candidateOffset, remainingTargetBytes);
		candidateTotalBytes = candidatePage.totalBytes;
		bytesRead += candidatePage.bytes.byteLength;
		if (basePage.totalBytes !== candidatePage.totalBytes) return {
			bytesRead,
			isComplete: true,
			isEqual: false,
			nextOffset: offset
		};
		for (let index = 0; index < candidatePage.bytes.byteLength; index += 1) if (basePage.bytes[comparedBytes + index] !== candidatePage.bytes[index]) return {
			bytesRead,
			isComplete: true,
			isEqual: false,
			nextOffset: offset
		};
		comparedBytes += candidatePage.bytes.byteLength;
		candidateOffset += candidatePage.bytes.byteLength;
		if (candidatePage.isComplete) break;
	}
	if (candidateTotalBytes === null) invalidSourceData(candidateEntry.path);
	const nextOffset = offset + basePage.bytes.byteLength;
	const isComplete = nextOffset === basePage.totalBytes && nextOffset === candidateTotalBytes;
	return {
		bytesRead,
		isComplete,
		isEqual: true,
		nextOffset
	};
};
var RepositoryComparison = class {
	baseSnapshot;
	candidateSnapshot;
	#base;
	#candidate;
	constructor(base, candidate) {
		this.#base = base;
		this.#candidate = candidate;
		this.baseSnapshot = base.snapshot;
		this.candidateSnapshot = candidate.snapshot;
	}
	async listChangesPage(options) {
		const maxChanges = parsePositivePageInteger(options.maxChanges, "list-changes-page", null);
		const maxEntriesVisited = parsePositivePageInteger(options.maxEntriesVisited, "list-changes-page", null);
		const maxBytesRead = parsePositivePageInteger(options.maxBytesRead, "list-changes-page", null);
		if (maxBytesRead < 2) throw invalidComparisonCursor();
		throwIfAborted(options.signal);
		const cursor = parseComparisonCursor(options.cursor, this.baseSnapshot.id, this.candidateSnapshot.id);
		let baseCursor = cursor.baseCursor;
		let candidateCursor = cursor.candidateCursor;
		let pendingFile = cursor.pendingFile;
		const changes = [];
		let bytesRead = 0;
		let entriesVisited = 0;
		let baseNext;
		let candidateNext;
		while (entriesVisited < maxEntriesVisited && changes.length < maxChanges) {
			throwIfAborted(options.signal);
			[baseNext, candidateNext] = await Promise.all([baseNext === void 0 ? getNextEntry(this.#base, baseCursor, options.signal) : Promise.resolve(baseNext), candidateNext === void 0 ? getNextEntry(this.#candidate, candidateCursor, options.signal) : Promise.resolve(candidateNext)]);
			if (baseNext === null) baseCursor = "";
			if (candidateNext === null) candidateCursor = "";
			if (baseNext === null && candidateNext === null) break;
			const baseEntry = baseNext?.entry;
			const candidateEntry = candidateNext?.entry;
			if (pendingFile !== null && (baseEntry?.path !== pendingFile.path || candidateEntry?.path !== pendingFile.path)) throw invalidComparisonCursor();
			if (candidateEntry === void 0 || baseEntry !== void 0 && compareRepositoryPaths(baseEntry.path, candidateEntry.path) < 0) {
				changes.push({
					baseEntry: baseEntry ?? null,
					candidateEntry: null,
					kind: "deleted",
					path: baseEntry?.path ?? REPOSITORY_ROOT
				});
				baseCursor = baseNext?.cursorAfter ?? "";
				baseNext = void 0;
			} else if (baseEntry === void 0 || compareRepositoryPaths(candidateEntry.path, baseEntry.path) < 0) {
				changes.push({
					baseEntry: null,
					candidateEntry,
					kind: "added",
					path: candidateEntry.path
				});
				candidateCursor = candidateNext?.cursorAfter ?? "";
				candidateNext = void 0;
			} else {
				const change = classifySharedEntryMetadata(baseEntry, candidateEntry, this.baseSnapshot.sourceKind === this.candidateSnapshot.sourceKind);
				if (change !== void 0) {
					if (change !== null) changes.push(change);
					baseCursor = baseNext?.cursorAfter ?? "";
					candidateCursor = candidateNext?.cursorAfter ?? "";
					baseNext = void 0;
					candidateNext = void 0;
					pendingFile = null;
				} else if (maxBytesRead - bytesRead < 2) break;
				else {
					const comparison = await compareFileRange(this.#base, this.#candidate, baseEntry, candidateEntry, pendingFile?.offset ?? 0, maxBytesRead - bytesRead, options.signal);
					bytesRead += comparison.bytesRead;
					if (!comparison.isEqual) changes.push({
						baseEntry,
						candidateEntry,
						kind: "modified",
						path: baseEntry.path
					});
					if (comparison.isComplete) {
						baseCursor = baseNext?.cursorAfter ?? "";
						candidateCursor = candidateNext?.cursorAfter ?? "";
						baseNext = void 0;
						candidateNext = void 0;
						pendingFile = null;
					} else pendingFile = {
						offset: comparison.nextOffset,
						path: baseEntry.path
					};
				}
			}
			entriesVisited += 1;
			if (pendingFile !== null) break;
		}
		const isComplete = baseCursor === "" && candidateCursor === "" && pendingFile === null;
		const nextCursor = isComplete ? null : createRepositoryCursor({
			baseCursor,
			baseSnapshotId: this.baseSnapshot.id,
			candidateCursor,
			candidateSnapshotId: this.candidateSnapshot.id,
			pendingFile
		});
		return {
			baseSnapshot: this.baseSnapshot,
			bytesRead,
			candidateSnapshot: this.candidateSnapshot,
			changes,
			entriesVisited,
			isComplete,
			nextCursor
		};
	}
};
var createRepositoryComparison = async (base, candidate, options) => {
	if (options?.signal?.aborted) throw new RepositorySourceException({
		cause: options.signal.reason,
		code: "ABORTED",
		operation: "create-comparison",
		path: null,
		retryable: false
	});
	await Promise.resolve();
	return new RepositoryComparison(base, candidate);
};
var REPOSITORY_LINK_TEXT_MAX_BYTES = 4096;
var DRIVE_PREFIX_PATTERN = /^[A-Za-z]:/u;
var resolveLinkText = (linkPath, text) => {
	if (text === null || text === "") return { kind: "unsupported" };
	if (text.startsWith("/") || DRIVE_PREFIX_PATTERN.test(text)) return { kind: "outside" };
	const segments = text.split("/");
	if (segments.at(-1) === "") return { kind: "unsupported" };
	const namedSegments = segments.filter((segment) => segment !== "" && segment !== ".");
	const directorySegments = linkPath.split("/").slice(1, -1);
	let segmentIndex = 0;
	while (namedSegments[segmentIndex] === "..") {
		if (directorySegments.length === 0) return { kind: "outside" };
		directorySegments.pop();
		segmentIndex += 1;
	}
	const remainingSegments = namedSegments.slice(segmentIndex);
	if (remainingSegments.includes("..")) return { kind: "unsupported" };
	const candidate = `/${[...directorySegments, ...remainingSegments].join("/")}`;
	return isRepositoryPath(candidate) ? {
		kind: "path",
		path: candidate
	} : { kind: "unsupported" };
};
var resolveRepositoryLink = async (source, path, options) => {
	const visitedPaths = new Set();
	let currentPath = parseRepositoryPath(path);
	for (let followedLinks = 0;; followedLinks += 1) {
		if (visitedPaths.has(currentPath)) return { state: "loop" };
		visitedPaths.add(currentPath);
		const entry = await source.getEntry(currentPath, options);
		if (entry === null) return { state: "missing" };
		if (entry.type === "file") return {
			state: "file",
			targetPath: currentPath
		};
		if (entry.type !== "symlink") return { state: "not-file" };
		if (followedLinks === 32) return { state: "loop" };
		const step = resolveLinkText(currentPath, await source.readLinkText(currentPath, options));
		if (step.kind !== "path") return { state: step.kind };
		currentPath = step.path;
	}
};
//#endregion
export { compareRepositoryPaths as a, isRepositoryPath as c, RepositorySourceException as i, parseRepositoryPath as l, REPOSITORY_ROOT as n, createRepositoryComparison as o, RepositoryPathException as r, createRepositoryIdentity as s, REPOSITORY_LINK_TEXT_MAX_BYTES as t, resolveRepositoryLink as u };
