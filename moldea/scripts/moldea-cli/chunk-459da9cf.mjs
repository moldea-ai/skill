import { d as ERRORS, f as Exception, m as hasErrorCode, n as CoreOperationException, u as isObjectValid } from "./chunk-728df961.mjs";
import { a as createCoreOperationOptionsSnapshot, c as locateDiagnosticRanges, d as normalizeDiagnostics, f as parseStrictYaml, g as countUtf8Bytes, h as compareCodePoints, i as createCoreDiagnosticCollector, l as measureYamlRetainedBytes, o as createNullPrototypeRecord, p as deepFreeze, r as countDiagnosticsBySeverity, s as escapeJsonPointerSegment, t as ACCEPTABLE_WARNING_CODES, u as normalizeCoreOptions } from "./chunk-a5514957.mjs";
import { a as compareRepositoryPaths, c as isRepositoryPath, i as RepositorySourceException, l as parseRepositoryPath, n as REPOSITORY_ROOT, s as createRepositoryIdentity, u as resolveRepositoryLink } from "./chunk-8d6114d2.mjs";
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/utils/marked-region.js
var BYTE_ORDER_MARK = "﻿";
var throwInvalidRegion = (problem) => {
	throw new Exception(problem, { code: ERRORS.INVALID_MARKED_REGION });
};
var validateMarkers = ({ start, end }) => {
	for (const marker of [start, end]) if (typeof marker !== "string" || marker === "" || /[\r\n]/.test(marker)) throwInvalidRegion("Each region marker must be a non-empty single line.");
	if (start.includes(end) || end.includes(start)) throwInvalidRegion("Neither region marker may contain the other.");
};
var findMarkedRegion = (text, markers) => {
	validateMarkers(markers);
	let start;
	let end;
	let lineStart = 0;
	while (lineStart < text.length) {
		const newline = text.indexOf("\n", lineStart);
		const lineEnd = newline === -1 ? text.length : newline + 1;
		const hasCarriageReturn = newline > lineStart && text[newline - 1] === "\r";
		const contentEnd = newline === -1 ? text.length : newline - (hasCarriageReturn ? 1 : 0);
		const contentStart = lineStart === 0 && text.startsWith(BYTE_ORDER_MARK) ? 1 : lineStart;
		const content = text.slice(contentStart, contentEnd);
		for (const kind of ["start", "end"]) {
			if (!content.includes(markers[kind])) continue;
			if (content !== markers[kind]) throwInvalidRegion(`The ${kind} marker must fill its whole line.`);
			if (kind === "start") {
				if (start !== void 0 || end !== void 0) throwInvalidRegion("The document must hold one start marker, before one end marker.");
				start = {
					offset: contentStart,
					lineEnding: hasCarriageReturn ? "\r\n" : "\n"
				};
			} else {
				if (end !== void 0) throwInvalidRegion("The document must hold one end marker.");
				end = lineEnd;
			}
		}
		lineStart = lineEnd;
	}
	if (start === void 0 && end === void 0) return null;
	if (start === void 0 || end === void 0) return throwInvalidRegion("The document must hold both region markers, or neither.");
	return {
		start: start.offset,
		end,
		lineEnding: start.lineEnding
	};
};
//#endregion
//#region ../core/dist/chunks/scope-DQc5j2tD.js
var STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
var WINDOWS_RESERVED_ID_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/u;
var LINE_BREAK_CHARACTERS = [
	"\n",
	"\r",
	"",
	"\u2028",
	"\u2029"
];
var UNSUPPORTED_GLOB_PATTERN = /[!?[\]{}]/u;
var hasLineBreak = (value) => {
	return LINE_BREAK_CHARACTERS.some((lineBreak) => value.includes(lineBreak));
};
var isRepositoryFormatWhitespace = (codePoint) => {
	return codePoint >= 9 && codePoint <= 13 || codePoint === 32 || codePoint === 133 || codePoint === 160 || codePoint === 5760 || codePoint >= 8192 && codePoint <= 8202 || codePoint === 8232 || codePoint === 8233 || codePoint === 8239 || codePoint === 8287 || codePoint === 12288;
};
var countUnicodeScalars = (value) => {
	const scalars = value[Symbol.iterator]();
	let count = 0;
	while (scalars.next().done !== true) count += 1;
	return count;
};
var hasNonWhitespace = (value) => {
	for (const scalar of value) if (!isRepositoryFormatWhitespace(scalar.codePointAt(0) ?? 0)) return true;
	return false;
};
var hasSurroundingWhitespace = (value) => {
	const firstCodePoint = value.codePointAt(0);
	const lastCodePoint = value.codePointAt(value.length - 1);
	return firstCodePoint !== void 0 && isRepositoryFormatWhitespace(firstCodePoint) || lastCodePoint !== void 0 && isRepositoryFormatWhitespace(lastCodePoint);
};
var trimRepositoryFormatWhitespace = (value) => {
	let start = 0;
	let end = value.length;
	while (start < end) {
		const codePoint = value.codePointAt(start);
		if (codePoint === void 0 || !isRepositoryFormatWhitespace(codePoint)) break;
		start += codePoint > 65535 ? 2 : 1;
	}
	while (end > start) {
		const codePoint = value.codePointAt(end - 1);
		if (codePoint === void 0 || !isRepositoryFormatWhitespace(codePoint)) break;
		end -= 1;
	}
	return value.slice(start, end);
};
var isNonEmptySingleLine = (value) => {
	return value.length > 0 && !hasLineBreak(value);
};
var isStableId = (value) => {
	return value.length <= 64 && STABLE_ID_PATTERN.test(value);
};
var isReservedId = (value) => WINDOWS_RESERVED_ID_PATTERN.test(value);
var isCapabilityDescription = (value) => {
	const scalarLength = countUnicodeScalars(value);
	return scalarLength >= 1 && scalarLength <= 1e3 && !hasSurroundingWhitespace(value) && !hasLineBreak(value) && !value.includes("\0");
};
var parseManifestPath = (value) => {
	return value !== "/" && isRepositoryPath(value) ? parseRepositoryPath(value) : null;
};
var isCanonicalManifestPath = (path) => {
	return path === "/moldea/moldea.yaml";
};
var parseDecisionIdFromPath = (path) => {
	const match = /^\/moldea\/decisions\/(\d{13})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u.exec(path);
	const id = match?.[1];
	const slug = match?.[2];
	return id !== void 0 && slug !== void 0 && isStableId(slug) ? id : null;
};
var isContextPath = (path, allowProject) => {
	if (allowProject && path === "/moldea/project.md") return true;
	return path.startsWith("/moldea/context/") && path.endsWith(".md");
};
var isDecisionPath = (path) => {
	return parseDecisionIdFromPath(path) !== null;
};
var isMirrorPath = (path) => {
	return path !== "/moldea" && !path.startsWith("/moldea/");
};
var hasUnsupportedGlobMetacharacter = (value) => {
	return UNSUPPORTED_GLOB_PATTERN.test(value);
};
var isSimpleGlob = (value) => {
	if (hasUnsupportedGlobMetacharacter(value) || value.includes("***")) return false;
	if (value.slice(1).split("/").some((segment) => segment.includes("**") && segment !== "**")) return false;
	return value.includes("*") && isRepositoryPath(value.replaceAll("*", "x"));
};
var isRepositorySymbol = (value) => {
	return isNonEmptySingleLine(value) && !value.includes("\0");
};
var isCanonicalMoldeaPath = (path) => {
	return path === "/moldea" || path.startsWith("/moldea/");
};
var encoder$2 = new TextEncoder();
var decoder$1 = new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
var collectNulDiagnostics = (value, path, diagnostics) => {
	let column = 1;
	let line = 1;
	let offset = 0;
	for (const scalar of value) {
		if (scalar === "\0") diagnostics.add({
			code: "MOLDEA_TEXT_NUL_FORBIDDEN",
			path,
			range: {
				end: {
					column: column + 1,
					line,
					offset: offset + 1
				},
				start: {
					column,
					line,
					offset
				}
			}
		});
		if (scalar === "\n") {
			column = 1;
			line += 1;
		} else column += 1;
		offset += 1;
	}
};
var invalidArgument$1$1 = (operation) => {
	throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation
	});
};
var enforceFileLimit = (byteLength, limits, operation, limit) => {
	if (byteLength <= limits[limit]) return;
	throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit,
		limitMaximum: limits[limit],
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: byteLength,
		operation
	});
};
var invalidResult = (diagnostics) => {
	return deepFreeze({
		diagnostics: [...diagnostics],
		text: null,
		valid: false
	});
};
var readInput = (input, limits, operation, limit, diagnostics) => {
	if (!isObjectValid(input, true)) return invalidArgument$1$1(operation);
	const pathCandidate = input["path"];
	const content = input["content"];
	if (typeof pathCandidate !== "string" || typeof content !== "string" && !(content instanceof Uint8Array)) return invalidArgument$1$1(operation);
	const path = parseRepositoryPath(pathCandidate);
	if (typeof content === "string") {
		enforceFileLimit(countUtf8Bytes(content, limits[limit]), limits, operation, limit);
		if (!content.isWellFormed()) {
			diagnostics.add({
				code: "MOLDEA_TEXT_INVALID_UNICODE",
				path
			});
			return invalidResult(diagnostics.finalize());
		}
		return {
			path,
			value: content
		};
	}
	enforceFileLimit(content.byteLength, limits, operation, limit);
	const bytes = new Uint8Array(content);
	try {
		return {
			path,
			value: decoder$1.decode(bytes)
		};
	} catch {
		diagnostics.add({
			code: "MOLDEA_TEXT_INVALID_UTF8",
			path
		});
		return invalidResult(diagnostics.finalize());
	}
};
var normalizeTextDocument = (input, limits, operation, limit = "maxFileBytes") => {
	const diagnostics = createCoreDiagnosticCollector(limits, operation);
	const decoded = readInput(input, limits, operation, limit, diagnostics);
	if ("valid" in decoded) return decoded;
	const value = (decoded.value.startsWith("﻿") ? decoded.value.slice(1) : decoded.value).replace(/\r\n?/gu, "\n");
	collectNulDiagnostics(value, decoded.path, diagnostics);
	if (diagnostics.size > 0) return invalidResult(diagnostics.finalize());
	const text = deepFreeze({
		scalarLength: countUnicodeScalars(value),
		utf8ByteLength: countUtf8Bytes(value),
		value
	});
	return deepFreeze({
		diagnostics: [],
		text,
		valid: true
	});
};
var toLowercaseHex = (bytes) => {
	let value = "";
	for (const byte of bytes) value += byte.toString(16).padStart(2, "0");
	return value;
};
var calculateNormalizedTextDigest = async (text) => {
	const bytes = encoder$2.encode(text.value);
	return `sha256:${toLowercaseHex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)))}`;
};
var calculateContentDigest = async (input, limits) => {
	const normalized = normalizeTextDocument(input, limits, "calculate-content-digest");
	if (!normalized.valid || normalized.text === null) return deepFreeze({
		diagnostics: normalized.diagnostics,
		digest: null,
		text: null,
		valid: false
	});
	const digest = await calculateNormalizedTextDigest(normalized.text);
	return deepFreeze({
		diagnostics: [],
		digest,
		text: normalized.text,
		valid: true
	});
};
var matchesSegment = (pattern, value) => {
	let patternIndex = 0;
	let valueIndex = 0;
	let starIndex = -1;
	let starValueIndex = -1;
	while (valueIndex < value.length) {
		if (pattern[patternIndex] === value[valueIndex]) {
			patternIndex += 1;
			valueIndex += 1;
			continue;
		}
		if (pattern[patternIndex] === "*") {
			starIndex = patternIndex;
			starValueIndex = valueIndex;
			patternIndex += 1;
			continue;
		}
		if (starIndex === -1) return false;
		patternIndex = starIndex + 1;
		starValueIndex += 1;
		valueIndex = starValueIndex;
	}
	while (pattern[patternIndex] === "*") patternIndex += 1;
	return patternIndex === pattern.length;
};
var matchesRepositoryGlob = (patternSegments, path) => {
	const pathSegments = path.slice(1).split("/");
	let reachable = new Uint8Array(pathSegments.length + 1);
	reachable[0] = 1;
	for (const patternSegment of patternSegments) {
		const next = new Uint8Array(pathSegments.length + 1);
		if (patternSegment === "**") {
			let canReach = false;
			for (let index = 0; index < reachable.length; index += 1) {
				canReach ||= reachable[index] === 1;
				next[index] = canReach ? 1 : 0;
			}
		} else for (let index = 0; index < pathSegments.length; index += 1) if (reachable[index] === 1 && matchesSegment(patternSegment, pathSegments[index] ?? "")) next[index + 1] = 1;
		reachable = next;
	}
	return reachable[pathSegments.length] === 1;
};
var childPointer$1 = (pointer, segment) => {
	return `${pointer}/${escapeJsonPointerSegment(segment)}`;
};
var createOwner = (kind, id, agentId = null) => ({
	agentId,
	id,
	kind
});
var compareOwners = (left, right) => {
	return compareCodePoints(left.kind, right.kind) || compareCodePoints(left.agentId ?? "", right.agentId ?? "") || compareCodePoints(left.id, right.id);
};
var getDeclarationValue = (declaration) => {
	return declaration.kind === "exact" ? declaration.path : declaration.pattern;
};
var compareDeclarations = (left, right) => {
	return compareOwners(left.owner, right.owner) || compareCodePoints(left.field, right.field) || compareCodePoints(getDeclarationValue(left.declaration), getDeclarationValue(right.declaration)) || compareCodePoints(left.pointer, right.pointer);
};
var addExactDeclaration = (declarations, owner, field, pointer, reference) => {
	declarations.push({
		declaration: typeof reference === "string" ? {
			kind: "exact",
			path: reference,
			symbol: null
		} : {
			kind: "exact",
			path: reference.path,
			symbol: reference.symbol ?? null
		},
		field,
		owner,
		pointer
	});
};
var addReferenceDeclarations = (declarations, references, owner, field, pointer) => {
	for (const [index, reference] of (references ?? []).entries()) addExactDeclaration(declarations, owner, field, childPointer$1(pointer, String(index)), reference);
};
var addAffectedByDeclarations = (declarations, affectedBy, owner, pointer) => {
	for (const [index, pattern] of (affectedBy ?? []).entries()) declarations.push({
		declaration: pattern.includes("*") ? {
			kind: "glob",
			pattern
		} : {
			kind: "exact",
			path: pattern,
			symbol: null
		},
		field: "affectedBy",
		owner,
		pointer: childPointer$1(pointer, String(index))
	});
};
var addCapabilityDeclarations = (declarations, capabilityId, capability, agentId, pointer) => {
	const owner = createOwner(capability.kind, capabilityId, agentId);
	addExactDeclaration(declarations, owner, "implementation", childPointer$1(pointer, "implementation"), capability.value.implementation);
	if (capability.value.registration !== void 0) addExactDeclaration(declarations, owner, "registration", childPointer$1(pointer, "registration"), capability.value.registration);
	if (capability.kind === "tool") for (const field of ["inputSchema", "outputSchema"]) {
		const reference = capability.value[field];
		if (reference !== void 0) addExactDeclaration(declarations, owner, field, childPointer$1(pointer, field), reference);
	}
	addAffectedByDeclarations(declarations, capability.value.affectedBy, owner, childPointer$1(pointer, "affectedBy"));
};
var addAgentDeclarations = (declarations, agentId, agent) => {
	const pointer = childPointer$1("/agents", agentId);
	const owner = createOwner("agent", agentId, agentId);
	const bindingsPointer = childPointer$1(pointer, "bindings");
	for (const field of [
		"runtimeAgent",
		"inputSchema",
		"outputSchema",
		"instructionLoader"
	]) {
		const reference = agent.bindings?.[field];
		if (reference !== void 0) addExactDeclaration(declarations, owner, field, childPointer$1(bindingsPointer, field), reference);
	}
	addAffectedByDeclarations(declarations, agent.affectedBy, owner, childPointer$1(pointer, "affectedBy"));
	for (const capabilityId of Object.keys(agent.tools ?? {}).sort(compareCodePoints)) {
		const tool = agent.tools?.[capabilityId];
		if (tool !== void 0) addCapabilityDeclarations(declarations, capabilityId, {
			kind: "tool",
			value: tool
		}, agentId, childPointer$1(childPointer$1(pointer, "tools"), capabilityId));
	}
	for (const capabilityId of Object.keys(agent.skills ?? {}).sort(compareCodePoints)) {
		const skill = agent.skills?.[capabilityId];
		if (skill !== void 0) addCapabilityDeclarations(declarations, capabilityId, {
			kind: "skill",
			value: skill
		}, agentId, childPointer$1(childPointer$1(pointer, "skills"), capabilityId));
	}
	for (const [index, mirror] of (agent.mirrors ?? []).entries()) addExactDeclaration(declarations, owner, "mirrors", childPointer$1(childPointer$1(pointer, "mirrors"), String(index)), mirror);
};
var collectManifestScopeDeclarations = (manifest) => {
	const declarations = [];
	for (const kind of ["context", "decision"]) {
		const relationships = kind === "context" ? manifest.context : manifest.decisions;
		for (const ownerId of Object.keys(relationships ?? {}).sort(compareCodePoints)) {
			const relationship = relationships?.[ownerId];
			if (relationship === void 0) continue;
			const owner = createOwner(kind, ownerId);
			const pointer = childPointer$1(kind === "context" ? "/context" : "/decisions", ownerId);
			addReferenceDeclarations(declarations, relationship.bindings, owner, "bindings", childPointer$1(pointer, "bindings"));
			addAffectedByDeclarations(declarations, relationship.affectedBy, owner, childPointer$1(pointer, "affectedBy"));
		}
	}
	for (const agentId of Object.keys(manifest.agents ?? {}).sort(compareCodePoints)) {
		const agent = manifest.agents?.[agentId];
		if (agent !== void 0) addAgentDeclarations(declarations, agentId, agent);
	}
	return declarations.sort(compareDeclarations);
};
var compileManifestScope = (manifest, limits) => {
	const declarations = collectManifestScopeDeclarations(manifest);
	if (declarations.length > limits.maxEntries) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxEntries",
		limitMaximum: limits.maxEntries,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: declarations.length,
		operation: "match-manifest-scope"
	});
	const exact = new Map();
	const globalGlobs = [];
	const globsByFirstSegment = new Map();
	for (const declaration of declarations) {
		if (declaration.declaration.kind === "exact") {
			const existing = exact.get(declaration.declaration.path) ?? [];
			existing.push(declaration);
			exact.set(declaration.declaration.path, existing);
			continue;
		}
		const segments = declaration.declaration.pattern.slice(1).split("/");
		const compiled = {
			declaration,
			segments
		};
		const firstSegment = segments[0] ?? "";
		if (firstSegment === "**" || firstSegment.includes("*")) globalGlobs.push(compiled);
		else {
			const existing = globsByFirstSegment.get(firstSegment) ?? [];
			existing.push(compiled);
			globsByFirstSegment.set(firstSegment, existing);
		}
	}
	return {
		declarations,
		exact,
		globalGlobs,
		globsByFirstSegment
	};
};
var compareMatches = (left, right) => {
	return compareOwners(left.owner, right.owner) || compareCodePoints(left.field, right.field) || compareCodePoints(getDeclarationValue(left.declaration), getDeclarationValue(right.declaration)) || compareCodePoints(left.inputPath, right.inputPath) || compareCodePoints(left.pointer, right.pointer);
};
var createMatch = (inputPath, relationship) => ({
	declaration: relationship.declaration,
	field: relationship.field,
	inputPath,
	owner: relationship.owner,
	pointer: relationship.pointer
});
var addMatch = (matches, inputPath, relationship, limits) => {
	if (matches.length >= limits.maxEntries) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxEntries",
		limitMaximum: limits.maxEntries,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: matches.length + 1,
		operation: "match-manifest-scope"
	});
	matches.push(createMatch(inputPath, relationship));
};
var addGlobMatches = (matches, inputPath, declarations, limits) => {
	for (const compiled of declarations) if (matchesRepositoryGlob(compiled.segments, inputPath)) addMatch(matches, inputPath, compiled.declaration, limits);
};
var calculateManifestScopeInputDigest = async (paths) => {
	const value = paths.join("\0");
	return calculateNormalizedTextDigest({
		scalarLength: countUnicodeScalars(value),
		utf8ByteLength: countUtf8Bytes(value),
		value
	});
};
var matchParsedManifestScope = (manifest, paths, limits) => {
	const compiled = compileManifestScope(manifest, limits);
	const matches = [];
	const matchedOwners = new Set();
	const matchedPaths = new Set();
	for (const path of paths) {
		const firstSegment = path.slice(1).split("/", 1)[0] ?? "";
		const exactDeclarations = compiled.exact.get(path) ?? [];
		for (const relationship of exactDeclarations) addMatch(matches, path, relationship, limits);
		addGlobMatches(matches, path, compiled.globalGlobs, limits);
		addGlobMatches(matches, path, compiled.globsByFirstSegment.get(firstSegment) ?? [], limits);
	}
	matches.sort(compareMatches);
	for (const match of matches) {
		matchedOwners.add(`${match.owner.kind}\0${match.owner.agentId ?? ""}\0${match.owner.id}`);
		matchedPaths.add(match.inputPath);
	}
	return deepFreeze({
		counts: {
			declarations: compiled.declarations.length,
			inputPaths: paths.length,
			matchedOwners: matchedOwners.size,
			matchedPaths: matchedPaths.size,
			matches: matches.length
		},
		matches
	});
};
var childPointer$2 = (pointer, key) => {
	return `${pointer}/${escapeJsonPointerSegment(key)}`;
};
var addInvalidValue = (context, pointer, range, reason, entity = null) => {
	context.diagnostics.add({
		code: "MOLDEA_MANIFEST_VALUE_INVALID",
		details: { reason },
		entity,
		path: context.path,
		pointer,
		range
	});
};
var readMapping$1 = (node, pointer, allowedProperties, context, entity = null) => {
	if (node.kind !== "mapping") {
		addInvalidValue(context, pointer, node.range, "mapping-required", entity);
		return null;
	}
	const entries = new Map();
	for (const entry of node.entries) {
		if (entry.key.kind !== "scalar" || typeof entry.key.value !== "string") {
			addInvalidValue(context, pointer, entry.key.range, "string-key-required", entity);
			continue;
		}
		const key = entry.key.value;
		if (allowedProperties !== null && !allowedProperties.has(key)) {
			context.diagnostics.add({
				code: "MOLDEA_MANIFEST_PROPERTY_UNKNOWN",
				entity,
				path: context.path,
				pointer: childPointer$2(pointer, key),
				range: entry.key.range
			});
			continue;
		}
		entries.set(key, {
			key: entry.key,
			value: entry.value
		});
	}
	return entries;
};
var readString = (entry, pointer, context, options = {}) => {
	if (entry === void 0) {
		if (options.required === true) addInvalidValue(context, pointer, null, "required", options.entity ?? null);
		return null;
	}
	if (entry.value.kind !== "scalar" || typeof entry.value.value !== "string") {
		addInvalidValue(context, pointer, entry.value.range, "string-required", options.entity ?? null);
		return null;
	}
	const value = entry.value.value;
	if (!hasNonWhitespace(value) || options.singleLine === true && !isNonEmptySingleLine(value)) {
		addInvalidValue(context, pointer, entry.value.range, "string-invalid", options.entity ?? null);
		return null;
	}
	return value;
};
var validateStableId = (value, range, pointer, context, entity = null) => {
	if (!isStableId(value)) {
		context.diagnostics.add({
			code: "MOLDEA_ID_INVALID",
			entity,
			path: context.path,
			pointer,
			range
		});
		return false;
	}
	if (isReservedId(value)) {
		context.diagnostics.add({
			code: "MOLDEA_ID_RESERVED",
			entity,
			path: context.path,
			pointer,
			range
		});
		return false;
	}
	return true;
};
var readReference = (node, pointer, context, entity = null) => {
	const entries = readMapping$1(node, pointer, new Set(["path", "symbol"]), context, entity);
	if (entries === null) return null;
	const pathEntry = entries.get("path");
	if (pathEntry?.value.kind !== "scalar" || typeof pathEntry.value.value !== "string") {
		context.diagnostics.add({
			code: "MOLDEA_PATH_INVALID",
			details: { reason: pathEntry === void 0 ? "missing" : "type" },
			entity,
			path: context.path,
			pointer: childPointer$2(pointer, "path"),
			range: pathEntry?.value.range ?? null
		});
		return null;
	}
	const path = parseManifestPath(pathEntry.value.value);
	if (path === null) {
		context.diagnostics.add({
			code: "MOLDEA_PATH_INVALID",
			entity,
			path: context.path,
			pointer: childPointer$2(pointer, "path"),
			range: pathEntry.value.range
		});
		return null;
	}
	const symbolEntry = entries.get("symbol");
	if (symbolEntry === void 0) return { path };
	if (symbolEntry.value.kind !== "scalar" || typeof symbolEntry.value.value !== "string" || !isRepositorySymbol(symbolEntry.value.value)) {
		context.diagnostics.add({
			code: "MOLDEA_SYMBOL_INVALID",
			entity,
			path: context.path,
			pointer: childPointer$2(pointer, "symbol"),
			range: symbolEntry.value.range
		});
		return null;
	}
	if (isCanonicalMoldeaPath(path)) {
		context.diagnostics.add({
			code: "MOLDEA_SYMBOL_FORBIDDEN",
			entity,
			path: context.path,
			pointer: childPointer$2(pointer, "symbol"),
			range: symbolEntry.value.range
		});
		return null;
	}
	return {
		path,
		symbol: symbolEntry.value.value
	};
};
var readReferenceList = (node, pointer, context, entity = null) => {
	if (node.kind !== "sequence" || node.items.length === 0) {
		addInvalidValue(context, pointer, node.range, "non-empty-sequence-required", entity);
		return [];
	}
	const references = [];
	const seen = new Set();
	node.items.forEach((item, index) => {
		const reference = readReference(item, childPointer$2(pointer, String(index)), context, entity);
		if (reference === null) return;
		const key = `${reference.path}\0${reference.symbol ?? ""}`;
		if (seen.has(key)) {
			context.diagnostics.add({
				code: "MOLDEA_PATH_DUPLICATE",
				entity,
				path: context.path,
				pointer: childPointer$2(pointer, String(index)),
				range: item.range
			});
			return;
		}
		seen.add(key);
		references.push(reference);
	});
	return references;
};
var readAffectedBy = (node, pointer, context, entity = null) => {
	if (node.kind !== "sequence" || node.items.length === 0) {
		addInvalidValue(context, pointer, node.range, "non-empty-sequence-required", entity);
		return [];
	}
	const values = [];
	const seen = new Set();
	node.items.forEach((item, index) => {
		const itemPointer = childPointer$2(pointer, String(index));
		if (item.kind !== "scalar" || typeof item.value !== "string") {
			addInvalidValue(context, itemPointer, item.range, "string-required", entity);
			return;
		}
		const isGlob = item.value.includes("*") || hasUnsupportedGlobMetacharacter(item.value);
		if (!(isGlob ? isSimpleGlob(item.value) : parseManifestPath(item.value) !== null)) {
			context.diagnostics.add({
				code: isGlob ? "MOLDEA_GLOB_INVALID" : "MOLDEA_PATH_INVALID",
				entity,
				path: context.path,
				pointer: itemPointer,
				range: item.range
			});
			return;
		}
		if (seen.has(item.value)) {
			context.diagnostics.add({
				code: isGlob ? "MOLDEA_PATTERN_DUPLICATE" : "MOLDEA_PATH_DUPLICATE",
				entity,
				path: context.path,
				pointer: itemPointer,
				range: item.range
			});
			return;
		}
		seen.add(item.value);
		values.push(item.value);
	});
	return values;
};
var readRelationship = (node, pointer, context) => {
	const entries = readMapping$1(node, pointer, new Set(["affectedBy", "bindings"]), context);
	if (entries === null) return null;
	const bindingsEntry = entries.get("bindings");
	const affectedByEntry = entries.get("affectedBy");
	if (bindingsEntry === void 0 && affectedByEntry === void 0) context.diagnostics.add({
		code: "MOLDEA_CONTEXT_RELATIONSHIP_EMPTY",
		path: context.path,
		pointer,
		range: node.range
	});
	return {
		...bindingsEntry === void 0 ? {} : { bindings: readReferenceList(bindingsEntry.value, childPointer$2(pointer, "bindings"), context) },
		...affectedByEntry === void 0 ? {} : { affectedBy: readAffectedBy(affectedByEntry.value, childPointer$2(pointer, "affectedBy"), context) }
	};
};
var readRelationshipRecord = (node, pointer, kind, context) => {
	const entries = readMapping$1(node, pointer, null, context);
	if (entries === null) return null;
	const normalized = [];
	for (const [key, entry] of [...entries].sort(([left], [right]) => compareCodePoints(left, right))) {
		const path = parseManifestPath(key);
		if (!(path !== null && (kind === "context" ? isContextPath(path, true) : isDecisionPath(path)))) {
			context.diagnostics.add({
				code: kind === "context" ? "MOLDEA_CONTEXT_PATH_INVALID" : "MOLDEA_DECISION_FILENAME_INVALID",
				path: context.path,
				pointer: childPointer$2(pointer, key),
				range: entry.key.range
			});
			continue;
		}
		const relationship = readRelationship(entry.value, childPointer$2(pointer, key), context);
		if (relationship !== null) normalized.push([key, relationship]);
	}
	return createNullPrototypeRecord(normalized);
};
var readPathList = (node, pointer, kind, context, entity) => {
	if (node.kind !== "sequence") {
		addInvalidValue(context, pointer, node.range, "sequence-required", entity);
		return [];
	}
	const paths = [];
	const seen = new Set();
	node.items.forEach((item, index) => {
		const itemPointer = childPointer$2(pointer, String(index));
		if (item.kind !== "scalar" || typeof item.value !== "string") {
			addInvalidValue(context, itemPointer, item.range, "string-required", entity);
			return;
		}
		const path = parseManifestPath(item.value);
		if (!(path !== null && (kind === "context" ? isContextPath(path, false) : kind === "decision" ? isDecisionPath(path) : isMirrorPath(path))) || path === null) {
			const code = kind === "context" ? "MOLDEA_CONTEXT_PATH_INVALID" : kind === "decision" ? "MOLDEA_DECISION_FILENAME_INVALID" : path !== null && !isMirrorPath(path) ? "MOLDEA_MIRROR_PATH_INSIDE_MOLDEA" : "MOLDEA_MIRROR_PATH_INVALID";
			context.diagnostics.add({
				code,
				entity,
				path: context.path,
				pointer: itemPointer,
				range: item.range
			});
			return;
		}
		if (seen.has(path)) {
			context.diagnostics.add({
				code: kind === "mirror" ? "MOLDEA_MIRROR_PATH_DUPLICATE" : "MOLDEA_PATH_DUPLICATE",
				entity,
				path: context.path,
				pointer: itemPointer,
				range: item.range
			});
			return;
		}
		if (kind === "mirror" && context.mirrorPaths.has(path)) {
			context.diagnostics.add({
				code: "MOLDEA_MIRROR_PATH_DUPLICATE",
				entity,
				path: context.path,
				pointer: itemPointer,
				range: item.range
			});
			return;
		}
		seen.add(path);
		if (kind === "mirror") context.mirrorPaths.add(path);
		paths.push(path);
	});
	return paths;
};
var readBindings = (node, pointer, context, agentId) => {
	const entity = { agentId };
	const entries = readMapping$1(node, pointer, new Set([
		"inputSchema",
		"instructionLoader",
		"outputSchema",
		"runtimeAgent"
	]), context, entity);
	if (entries === null) return null;
	const referenceProperty = (key) => {
		const entry = entries.get(key);
		return entry === void 0 ? null : readReference(entry.value, childPointer$2(pointer, key), context, entity);
	};
	const inputSchema = referenceProperty("inputSchema");
	const instructionLoader = referenceProperty("instructionLoader");
	const outputSchema = referenceProperty("outputSchema");
	const runtimeAgent = referenceProperty("runtimeAgent");
	return {
		...runtimeAgent === null ? {} : { runtimeAgent },
		...inputSchema === null ? {} : { inputSchema },
		...outputSchema === null ? {} : { outputSchema },
		...instructionLoader === null ? {} : { instructionLoader }
	};
};
var readCapability = (node, pointer, context, agentId, capabilityId, kind) => {
	const entity = {
		agentId,
		capabilityId,
		capabilityKind: kind
	};
	const entries = readMapping$1(node, pointer, kind === "tool" ? new Set([
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
	]), context, entity);
	if (entries === null) return null;
	const name = readString(entries.get("name"), childPointer$2(pointer, "name"), context, {
		entity,
		required: true,
		singleLine: true
	});
	const descriptionEntry = entries.get("description");
	let description = null;
	if (descriptionEntry === void 0) context.diagnostics.add({
		code: "MOLDEA_CAPABILITY_DESCRIPTION_MISSING",
		entity,
		path: context.path,
		pointer: childPointer$2(pointer, "description")
	});
	else if (descriptionEntry.value.kind !== "scalar" || typeof descriptionEntry.value.value !== "string" || !isCapabilityDescription(descriptionEntry.value.value)) context.diagnostics.add({
		code: "MOLDEA_CAPABILITY_DESCRIPTION_INVALID",
		entity,
		path: context.path,
		pointer: childPointer$2(pointer, "description"),
		range: descriptionEntry.value.range
	});
	else description = descriptionEntry.value.value;
	const implementationEntry = entries.get("implementation");
	let implementation = null;
	if (implementationEntry === void 0) context.diagnostics.add({
		code: kind === "tool" ? "MOLDEA_TOOL_IMPLEMENTATION_MISSING" : "MOLDEA_SKILL_IMPLEMENTATION_MISSING",
		entity,
		path: context.path,
		pointer: childPointer$2(pointer, "implementation")
	});
	else implementation = readReference(implementationEntry.value, childPointer$2(pointer, "implementation"), context, entity);
	const optionalReference = (key) => {
		const entry = entries.get(key);
		return entry === void 0 ? null : readReference(entry.value, childPointer$2(pointer, key), context, entity);
	};
	const registration = optionalReference("registration");
	const inputSchema = kind === "tool" ? optionalReference("inputSchema") : null;
	const outputSchema = kind === "tool" ? optionalReference("outputSchema") : null;
	const affectedByEntry = entries.get("affectedBy");
	const affectedBy = affectedByEntry === void 0 ? null : readAffectedBy(affectedByEntry.value, childPointer$2(pointer, "affectedBy"), context, entity);
	if (name === null || description === null || implementation === null) return null;
	return {
		name,
		description,
		implementation,
		...registration === null ? {} : { registration },
		...inputSchema === null ? {} : { inputSchema },
		...outputSchema === null ? {} : { outputSchema },
		...affectedBy === null ? {} : { affectedBy }
	};
};
var readCapabilities = (node, pointer, context, agentId, kind) => {
	const entries = readMapping$1(node, pointer, null, context, { agentId });
	if (entries === null) return null;
	const normalized = [];
	for (const [capabilityId, entry] of [...entries].sort(([left], [right]) => compareCodePoints(left, right))) {
		const entity = {
			agentId,
			capabilityId,
			capabilityKind: kind
		};
		const capabilityPointer = childPointer$2(pointer, capabilityId);
		validateStableId(capabilityId, entry.key.range, capabilityPointer, context, entity);
		const capability = readCapability(entry.value, capabilityPointer, context, agentId, capabilityId, kind);
		if (capability !== null) normalized.push([capabilityId, capability]);
	}
	return createNullPrototypeRecord(normalized);
};
var findMappingProperty = (node, property) => {
	if (node.kind !== "mapping") return null;
	for (const entry of node.entries) if (entry.key.kind === "scalar" && entry.key.value === property) return entry.value;
	return null;
};
var detectSupportedManifestVersion = (node) => {
	if (node.kind !== "mapping") return null;
	const versionNode = findMappingProperty(node, "version");
	return versionNode?.kind === "scalar" && versionNode.value === 1n ? 1 : null;
};
var validateAgentOwnedIdUniqueness = (node, pointer, context, agentId) => {
	const seen = new Set();
	for (const property of ["tools", "skills"]) {
		const record = findMappingProperty(node, property);
		if (record?.kind !== "mapping") continue;
		for (const entry of record.entries) {
			if (entry.key.kind !== "scalar" || typeof entry.key.value !== "string") continue;
			if (seen.has(entry.key.value)) context.diagnostics.add({
				code: "MOLDEA_ID_DUPLICATE",
				entity: { agentId },
				path: context.path,
				pointer: childPointer$2(childPointer$2(pointer, property), entry.key.value),
				range: entry.key.range
			});
			seen.add(entry.key.value);
		}
	}
};
var readAgent = (node, pointer, context, agentId) => {
	const entity = { agentId };
	const entries = readMapping$1(node, pointer, new Set([
		"affectedBy",
		"bindings",
		"context",
		"decisions",
		"mirrors",
		"skills",
		"tools"
	]), context, entity);
	if (entries === null) return null;
	validateAgentOwnedIdUniqueness(node, pointer, context, agentId);
	const bindingsEntry = entries.get("bindings");
	const bindings = bindingsEntry === void 0 ? null : readBindings(bindingsEntry.value, childPointer$2(pointer, "bindings"), context, agentId);
	const contextEntry = entries.get("context");
	const contextPaths = contextEntry === void 0 ? null : readPathList(contextEntry.value, childPointer$2(pointer, "context"), "context", context, entity);
	const decisionsEntry = entries.get("decisions");
	const decisions = decisionsEntry === void 0 ? null : readPathList(decisionsEntry.value, childPointer$2(pointer, "decisions"), "decision", context, entity);
	const toolsEntry = entries.get("tools");
	const tools = toolsEntry === void 0 ? null : readCapabilities(toolsEntry.value, childPointer$2(pointer, "tools"), context, agentId, "tool");
	const skillsEntry = entries.get("skills");
	const skills = skillsEntry === void 0 ? null : readCapabilities(skillsEntry.value, childPointer$2(pointer, "skills"), context, agentId, "skill");
	const affectedByEntry = entries.get("affectedBy");
	const affectedBy = affectedByEntry === void 0 ? null : readAffectedBy(affectedByEntry.value, childPointer$2(pointer, "affectedBy"), context, entity);
	const mirrorsEntry = entries.get("mirrors");
	const mirrors = mirrorsEntry === void 0 ? null : readPathList(mirrorsEntry.value, childPointer$2(pointer, "mirrors"), "mirror", context, entity);
	return {
		...contextPaths === null ? {} : { context: contextPaths },
		...decisions === null ? {} : { decisions },
		...bindings === null ? {} : { bindings },
		...tools === null ? {} : { tools },
		...skills === null ? {} : { skills },
		...affectedBy === null ? {} : { affectedBy },
		...mirrors === null ? {} : { mirrors }
	};
};
var readAgents = (node, pointer, context) => {
	const entries = readMapping$1(node, pointer, null, context);
	if (entries === null) return null;
	const normalized = [];
	for (const [agentId, entry] of [...entries].sort(([left], [right]) => compareCodePoints(left, right))) {
		const agentPointer = childPointer$2(pointer, agentId);
		validateStableId(agentId, entry.key.range, agentPointer, context, { agentId });
		const agent = readAgent(entry.value, agentPointer, context, agentId);
		if (agent !== null) normalized.push([agentId, agent]);
	}
	return createNullPrototypeRecord(normalized);
};
var readAcceptedWarnings = (node, context) => {
	const report = (entry, field, range, reason) => {
		context.diagnostics.add({
			code: "MOLDEA_MANIFEST_VALUE_INVALID",
			path: context.path,
			pointer: entry === null ? "/acceptedWarnings" : `/acceptedWarnings/${entry}/${escapeJsonPointerSegment(field)}`,
			range,
			details: {
				entry,
				field,
				reason
			}
		});
	};
	if (node.kind !== "sequence") {
		report(null, "acceptedWarnings", node.range, "sequence-required");
		return null;
	}
	if (node.items.length > context.limits.maxAcceptedWarnings) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		operation: context.operation,
		limit: "maxAcceptedWarnings",
		limitMaximum: context.limits.maxAcceptedWarnings,
		observedUsage: node.items.length,
		nextAction: "reduce-input-or-increase-limit"
	});
	const accepted = [];
	const identities = new Set();
	for (const [index, item] of node.items.entries()) {
		if (item.kind !== "mapping") {
			report(index, "entry", item.range, "mapping-required");
			continue;
		}
		const fields = new Map();
		let isValid = true;
		for (const entry of item.entries) if (entry.key.kind !== "scalar" || typeof entry.key.value !== "string" || ![
			"code",
			"subject",
			"qualifier",
			"reason"
		].includes(entry.key.value)) {
			report(index, entry.key.kind === "scalar" && typeof entry.key.value === "string" ? entry.key.value : "key", entry.key.range, "unknown-field");
			isValid = false;
		} else fields.set(entry.key.value, entry.value);
		const scalar = (field) => {
			const value = fields.get(field);
			if (value?.kind !== "scalar" || typeof value.value !== "string" || !hasNonWhitespace(value.value)) {
				report(index, field, value?.range ?? item.range, value === void 0 ? "required" : "non-empty-string-required");
				isValid = false;
				return null;
			}
			return value.value;
		};
		const code = scalar("code");
		const subjectText = scalar("subject");
		const reason = scalar("reason");
		const subject = subjectText === null ? null : parseManifestPath(subjectText);
		const qualifierNode = fields.get("qualifier");
		let qualifier = null;
		if (qualifierNode !== void 0 && !(qualifierNode.kind === "scalar" && qualifierNode.value === null)) {
			qualifier = scalar("qualifier");
			if (qualifier !== null && !isNonEmptySingleLine(qualifier)) {
				report(index, "qualifier", qualifierNode.range, "single-line-required");
				isValid = false;
			}
		}
		const acceptedCode = ACCEPTABLE_WARNING_CODES.find((candidate) => candidate === code);
		if (code !== null && acceptedCode === void 0) {
			report(index, "code", fields.get("code").range, "code-not-acceptable");
			isValid = false;
		}
		if (subjectText !== null && subject === null) {
			report(index, "subject", fields.get("subject").range, "repository-path-required");
			isValid = false;
		}
		if (reason !== null && countUnicodeScalars(reason) > 256) {
			report(index, "reason", fields.get("reason").range, "maximum-256-characters");
			isValid = false;
		}
		if (!isValid || acceptedCode === void 0 || subject === null || reason === null) continue;
		const identity = JSON.stringify([
			acceptedCode,
			subject,
			qualifier
		]);
		if (identities.has(identity)) {
			report(index, "code", fields.get("code").range, "duplicate-identity");
			continue;
		}
		identities.add(identity);
		accepted.push({
			code: acceptedCode,
			subject,
			...qualifierNode === void 0 ? {} : { qualifier },
			reason
		});
	}
	return accepted;
};
var validateManifest = (node, path, diagnostics, limits, operation) => {
	const context = {
		diagnostics,
		operation,
		limits,
		mirrorPaths: new Set(),
		path
	};
	if (node.kind !== "mapping") {
		diagnostics.add({
			code: "MOLDEA_MANIFEST_ROOT_INVALID",
			path,
			range: node.range
		});
		return null;
	}
	const versionNode = findMappingProperty(node, "version");
	if (versionNode === null) {
		diagnostics.add({
			code: "MOLDEA_MANIFEST_VERSION_MISSING",
			path,
			pointer: "/version"
		});
		return null;
	}
	if (!(versionNode.kind === "scalar" && typeof versionNode.value === "bigint") || versionNode.kind !== "scalar" || versionNode.value <= 0n) {
		diagnostics.add({
			code: "MOLDEA_MANIFEST_VERSION_INVALID",
			path,
			pointer: "/version",
			range: versionNode.range
		});
		return null;
	}
	if (versionNode.value !== 1n) {
		diagnostics.add({
			code: "MOLDEA_MANIFEST_VERSION_UNSUPPORTED",
			path,
			pointer: "/version",
			range: versionNode.range
		});
		return null;
	}
	const entries = readMapping$1(node, "", new Set([
		"acceptedWarnings",
		"agents",
		"context",
		"decisions",
		"version"
	]), context);
	if (entries === null) return null;
	const acceptedWarningsEntry = entries.get("acceptedWarnings");
	const acceptedWarnings = acceptedWarningsEntry === void 0 ? null : readAcceptedWarnings(acceptedWarningsEntry.value, context);
	const contextEntry = entries.get("context");
	const contextRelationships = contextEntry === void 0 ? null : readRelationshipRecord(contextEntry.value, "/context", "context", context);
	const decisionsEntry = entries.get("decisions");
	const decisionRelationships = decisionsEntry === void 0 ? null : readRelationshipRecord(decisionsEntry.value, "/decisions", "decision", context);
	const agentsEntry = entries.get("agents");
	const agents = agentsEntry === void 0 ? null : readAgents(agentsEntry.value, "/agents", context);
	return {
		version: 1,
		...acceptedWarnings === null ? {} : { acceptedWarnings },
		...contextRelationships === null ? {} : { context: contextRelationships },
		...decisionRelationships === null ? {} : { decisions: decisionRelationships },
		...agents === null ? {} : { agents }
	};
};
var findLineIndex = (lineStarts, offset) => {
	let lower = 0;
	let upper = lineStarts.length - 1;
	while (lower < upper) {
		const middle = Math.ceil((lower + upper) / 2);
		if ((lineStarts[middle] ?? 0) <= offset) lower = middle;
		else upper = middle - 1;
	}
	return lower;
};
var createSourceLocator = (value) => {
	const scalarOffsets = new Uint32Array(value.length + 1);
	const lineStarts = [0];
	let scalarOffset = 0;
	for (let codeUnitOffset = 0; codeUnitOffset < value.length;) {
		const codePoint = value.codePointAt(codeUnitOffset);
		const width = codePoint !== void 0 && codePoint > 65535 ? 2 : 1;
		scalarOffsets[codeUnitOffset] = scalarOffset;
		for (let interiorOffset = 1; interiorOffset < width; interiorOffset += 1) scalarOffsets[codeUnitOffset + interiorOffset] = scalarOffset;
		codeUnitOffset += width;
		scalarOffset += 1;
		scalarOffsets[codeUnitOffset] = scalarOffset;
		if (codePoint === 10) lineStarts.push(codeUnitOffset);
	}
	const locatePosition = (candidateOffset) => {
		const codeUnitOffset = Math.max(0, Math.min(value.length, candidateOffset));
		const lineIndex = findLineIndex(lineStarts, codeUnitOffset);
		const lineStart = lineStarts[lineIndex] ?? 0;
		const positionScalarOffset = scalarOffsets[codeUnitOffset] ?? 0;
		return {
			column: positionScalarOffset - (scalarOffsets[lineStart] ?? 0) + 1,
			line: lineIndex + 1,
			offset: positionScalarOffset
		};
	};
	return Object.freeze({ locateRange: (startOffset, endOffset) => ({
		end: locatePosition(endOffset),
		start: locatePosition(startOffset)
	}) });
};
var inspectManifestDocument = async (input, options, operation = "parse-manifest") => {
	options = createCoreOperationOptionsSnapshot(options);
	const normalized = normalizeTextDocument(input, options.limits, operation, "maxManifestBytes");
	const path = parseRepositoryPath(input.path);
	const diagnostics = createCoreDiagnosticCollector(options.limits, operation);
	if (!isCanonicalManifestPath(path)) diagnostics.add({
		code: "MOLDEA_MANIFEST_PATH_INVALID",
		path
	});
	for (const diagnostic of normalized.diagnostics) diagnostics.merge(diagnostic);
	if (!normalized.valid || normalized.text === null) return deepFreeze({
		asset: null,
		diagnostics: diagnostics.finalize(),
		formatVersion: null,
		manifest: null,
		valid: false,
		yamlRoot: null
	});
	const locator = createSourceLocator(normalized.text.value);
	const parsed = parseStrictYaml(normalized.text.value, path, locator, diagnostics);
	const formatVersion = parsed.value === null ? null : detectSupportedManifestVersion(parsed.value);
	const manifest = parsed.valid && parsed.value !== null ? validateManifest(parsed.value, path, diagnostics, options.limits, operation) : null;
	const locatedDiagnostics = locateDiagnosticRanges(diagnostics.finalize(), new Map(parsed.value === null ? [] : [[path, parsed.value]]));
	if (manifest === null || diagnostics.size > 0) return deepFreeze({
		asset: null,
		diagnostics: locatedDiagnostics,
		formatVersion,
		manifest: null,
		valid: false,
		yamlRoot: parsed.value
	});
	const digest = await calculateNormalizedTextDigest(normalized.text);
	const asset = {
		content: normalized.text.value,
		digest,
		path,
		scalarLength: normalized.text.scalarLength,
		utf8ByteLength: normalized.text.utf8ByteLength
	};
	return deepFreeze({
		asset,
		diagnostics: locatedDiagnostics,
		formatVersion,
		manifest,
		valid: true,
		yamlRoot: parsed.value
	});
};
var parseManifestDocument = async (input, options, operation = "parse-manifest") => {
	const inspection = await inspectManifestDocument(input, options, operation);
	return deepFreeze({
		asset: inspection.asset,
		diagnostics: inspection.diagnostics,
		manifest: inspection.manifest,
		valid: inspection.valid
	});
};
var invalidArgument$3 = () => {
	throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "match-manifest-scope"
	});
};
var resourceLimitExceeded$1 = (limit, limitMaximum, observedUsage) => {
	throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit,
		limitMaximum,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage,
		operation: "match-manifest-scope"
	});
};
var normalizeManifestScopeInput = (input, limits) => {
	if (!isObjectValid(input, true)) return invalidArgument$3();
	const manifest = input["manifest"];
	const pathCandidates = input["paths"];
	if (!isObjectValid(manifest, true) || !Array.isArray(pathCandidates)) return invalidArgument$3();
	if (pathCandidates.length > limits.maxEntries) return resourceLimitExceeded$1("maxEntries", limits.maxEntries, pathCandidates.length);
	const uniquePaths = new Set();
	let totalBytes = 0;
	for (const [index, candidate] of pathCandidates.entries()) {
		if (typeof candidate !== "string") return invalidArgument$3();
		const path = parseRepositoryPath(candidate);
		totalBytes += countUtf8Bytes(path) + (index === 0 ? 0 : 1);
		if (totalBytes > limits.maxTotalBytesRead) return resourceLimitExceeded$1("maxTotalBytesRead", limits.maxTotalBytesRead, totalBytes);
		uniquePaths.add(path);
	}
	return {
		manifest,
		paths: [...uniquePaths].sort(compareCodePoints)
	};
};
var matchManifestScope = async (input, options) => {
	const normalized = normalizeManifestScopeInput(input, options.limits);
	const inputDigest = await calculateManifestScopeInputDigest(normalized.paths);
	const parsed = await parseManifestDocument(normalized.manifest, options, "match-manifest-scope");
	if (!parsed.valid || parsed.asset === null || parsed.manifest === null) return deepFreeze({
		counts: {
			declarations: 0,
			inputPaths: normalized.paths.length,
			matchedOwners: 0,
			matchedPaths: 0,
			matches: 0
		},
		diagnostics: parsed.diagnostics,
		inputDigest,
		manifestDigest: null,
		matches: [],
		relevant: false,
		valid: false
	});
	const matched = matchParsedManifestScope(parsed.manifest, normalized.paths, options.limits);
	return deepFreeze({
		counts: matched.counts,
		diagnostics: [],
		inputDigest,
		manifestDigest: parsed.asset.digest,
		matches: matched.matches,
		relevant: matched.matches.length > 0,
		valid: true
	});
};
//#endregion
//#region ../core/dist/chunks/core-Ce0OlySB.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var decoder = new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
var invalidArgument$2 = () => {
	throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "read-canonical-content-page"
	});
};
var invalidContent = () => {
	throw new CoreOperationException({
		code: "CONTENT_INVALID",
		operation: "read-canonical-content-page"
	});
};
var isRepositoryReader$1 = (candidate) => typeof candidate === "object" && candidate !== null && typeof candidate.getEntry === "function" && typeof candidate.readFilePage === "function";
var readBytes = async (repository, path, offset, maxBytes, signal) => {
	const chunks = [];
	let byteLength = 0;
	let nextOffset = offset;
	let lastPage = null;
	let totalBytes = null;
	while (byteLength < maxBytes) {
		const page = await repository.readFilePage(path, {
			maxBytes: maxBytes - byteLength,
			offset: nextOffset,
			...signal === void 0 ? {} : { signal }
		});
		if (page.snapshot.id !== repository.snapshot.id || page.offset !== nextOffset || page.bytes.byteLength > maxBytes - byteLength || page.totalBytes < page.offset + page.bytes.byteLength || totalBytes !== null && page.totalBytes !== totalBytes || page.bytes.byteLength === 0 && !page.isComplete) throw new RepositorySourceException({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path,
			retryable: false
		});
		chunks.push(page.bytes);
		byteLength += page.bytes.byteLength;
		totalBytes = page.totalBytes;
		lastPage = page;
		if (page.isComplete || byteLength === maxBytes) break;
		if (page.nextOffset !== page.offset + page.bytes.byteLength) throw new RepositorySourceException({
			code: "INVALID_SOURCE_DATA",
			operation: "read-file-page",
			path,
			retryable: false
		});
		nextOffset = page.nextOffset;
	}
	if (lastPage === null) return invalidArgument$2();
	const bytes = new Uint8Array(byteLength);
	let writeOffset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, writeOffset);
		writeOffset += chunk.byteLength;
	}
	return {
		bytes,
		lastPage
	};
};
var decodeSafePrefix = (bytes, maximumBytes) => {
	const minimumCandidate = Math.max(0, maximumBytes - 3);
	for (let end = maximumBytes; end >= minimumCandidate; end -= 1) try {
		const content = decoder.decode(bytes.subarray(0, end));
		if (end === 0 && bytes.byteLength > 0) continue;
		return [content, end];
	} catch {}
	return invalidContent();
};
var readCanonicalContentPage = async (input, options) => {
	if (typeof input !== "object" || input === null || Reflect.ownKeys(input).some((key) => key !== "maxBytes" && key !== "offset" && key !== "path" && key !== "repository" && key !== "signal") || !isRepositoryReader$1(input.repository) || !Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1 || input.maxBytes > options.limits.maxFileBytes || !Number.isSafeInteger(input.offset) || input.offset < 0) return invalidArgument$2();
	const path = parseRepositoryPath(input.path);
	if (!path.startsWith("/moldea/")) return invalidArgument$2();
	const operationOptions = input.signal === void 0 ? void 0 : { signal: input.signal };
	const entry = await input.repository.getEntry(path, operationOptions);
	if (entry === null) throw new RepositorySourceException({
		code: "ENTRY_NOT_FOUND",
		operation: "read-file-page",
		path,
		retryable: false
	});
	if (entry.type !== "file" || entry.byteLength === null) throw new RepositorySourceException({
		code: "ENTRY_NOT_FILE",
		operation: "read-file-page",
		path,
		retryable: false
	});
	if (entry.byteLength > options.limits.maxFileBytes) throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxFileBytes",
		limitMaximum: options.limits.maxFileBytes,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage: entry.byteLength,
		operation: "read-canonical-content-page"
	});
	if (input.offset > entry.byteLength) return invalidArgument$2();
	if (input.offset === entry.byteLength) return deepFreeze({
		byteEnd: input.offset,
		byteStart: input.offset,
		content: "",
		contentIdentity: entry.contentIdentity,
		isComplete: true,
		nextOffset: null,
		path,
		source: input.repository.snapshot,
		totalBytes: entry.byteLength
	});
	const lookaheadBytes = Math.min(entry.byteLength - input.offset, input.maxBytes + 3);
	const { bytes, lastPage } = await readBytes(input.repository, path, input.offset, lookaheadBytes, input.signal);
	if (lastPage.totalBytes !== entry.byteLength || (bytes[0] & 192) === 128) return invalidArgument$2();
	const [content, consumedBytes] = decodeSafePrefix(bytes, Math.min(input.maxBytes, bytes.byteLength));
	const byteEnd = input.offset + consumedBytes;
	const isComplete = byteEnd === entry.byteLength;
	return deepFreeze({
		byteEnd,
		byteStart: input.offset,
		content,
		contentIdentity: entry.contentIdentity,
		isComplete,
		nextOffset: isComplete ? null : byteEnd,
		path,
		source: input.repository.snapshot,
		totalBytes: entry.byteLength
	});
};
var DECISION_STATUSES = new Set([
	"accepted",
	"proposed",
	"rejected",
	"superseded"
]);
var DECISION_ID_PATTERN = /^\d{13}$/u;
var CREATED_AT_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;
var getEntity = (decisionId) => {
	return decisionId === null ? null : { decisionId };
};
var addInvalidFrontmatter = (context, range, reason, pointer = null) => {
	context.diagnostics.add({
		code: "MOLDEA_DECISION_FRONTMATTER_INVALID",
		details: { reason },
		entity: getEntity(context.decisionId),
		path: context.path,
		pointer,
		range
	});
};
var isCanonicalCreatedAt = (value) => {
	if (!CREATED_AT_PATTERN.test(value)) return false;
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
};
var readMapping = (node, context) => {
	if (node.kind !== "mapping") {
		addInvalidFrontmatter(context, node.range, "mapping-required");
		return null;
	}
	const entries = new Map();
	for (const entry of node.entries) {
		if (entry.key.kind !== "scalar" || typeof entry.key.value !== "string") {
			addInvalidFrontmatter(context, entry.key.range, "string-key-required");
			continue;
		}
		const key = entry.key.value;
		if (key !== "status" && key !== "createdAt" && key !== "supersedes") {
			context.diagnostics.add({
				code: "MOLDEA_DECISION_PROPERTY_UNKNOWN",
				entity: getEntity(context.decisionId),
				path: context.path,
				pointer: `/${escapeJsonPointerSegment(key)}`,
				range: entry.key.range
			});
			continue;
		}
		entries.set(key, entry.value);
	}
	return entries;
};
var readStatus = (node, context) => {
	if (node?.kind !== "scalar" || typeof node.value !== "string" || !DECISION_STATUSES.has(node.value)) {
		context.diagnostics.add({
			code: "MOLDEA_DECISION_STATUS_INVALID",
			entity: getEntity(context.decisionId),
			path: context.path,
			pointer: "/status",
			range: node?.range ?? null
		});
		return null;
	}
	return node.value;
};
var readCreatedAt = (node, context) => {
	if (node?.kind !== "scalar" || typeof node.value !== "string" || !isCanonicalCreatedAt(node.value)) {
		context.diagnostics.add({
			code: "MOLDEA_DECISION_CREATED_AT_INVALID",
			entity: getEntity(context.decisionId),
			path: context.path,
			pointer: "/createdAt",
			range: node?.range ?? null
		});
		return null;
	}
	if (context.decisionId !== null && Date.parse(node.value) !== Number(context.decisionId)) context.diagnostics.add({
		code: "MOLDEA_DECISION_TIMESTAMP_MISMATCH",
		entity: getEntity(context.decisionId),
		path: context.path,
		pointer: "/createdAt",
		range: node.range
	});
	return node.value;
};
var readSupersedes = (node, context) => {
	if (node === void 0) return [];
	if (node.kind !== "sequence" || node.items.length === 0) {
		addInvalidFrontmatter(context, node.range, "non-empty-supersedes-sequence-required", "/supersedes");
		return null;
	}
	const supersedes = [];
	const seen = new Set();
	node.items.forEach((item, index) => {
		const pointer = `/supersedes/${index}`;
		if (item.kind !== "scalar" || typeof item.value !== "string" || !DECISION_ID_PATTERN.test(item.value)) {
			addInvalidFrontmatter(context, item.range, "decision-id-string-required", pointer);
			return;
		}
		if (seen.has(item.value)) {
			context.diagnostics.add({
				code: "MOLDEA_ID_DUPLICATE",
				entity: getEntity(context.decisionId),
				path: context.path,
				pointer,
				range: item.range
			});
			return;
		}
		seen.add(item.value);
		supersedes.push(item.value);
		if (item.value === context.decisionId) context.diagnostics.add({
			code: "MOLDEA_DECISION_SELF_SUPERSESSION",
			entity: getEntity(context.decisionId),
			path: context.path,
			pointer,
			range: item.range
		});
	});
	return supersedes.sort(compareCodePoints);
};
var extractDecisionSections = (value, locator, context) => {
	const firstLineEnd = value.indexOf("\n");
	const openingLineEnd = firstLineEnd === -1 ? value.length : firstLineEnd;
	if (value.slice(0, openingLineEnd) !== "---") {
		context.diagnostics.add({
			code: "MOLDEA_DECISION_FRONTMATTER_MISSING",
			entity: getEntity(context.decisionId),
			path: context.path,
			range: locator.locateRange(0, openingLineEnd)
		});
		return null;
	}
	let lineStart = firstLineEnd === -1 ? value.length : firstLineEnd + 1;
	while (lineStart <= value.length) {
		const nextLineBreak = value.indexOf("\n", lineStart);
		const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
		if (value.slice(lineStart, lineEnd) === "---") {
			const bodyStart = nextLineBreak === -1 ? lineEnd : nextLineBreak + 1;
			return {
				body: value.slice(bodyStart),
				bodyRange: locator.locateRange(bodyStart, value.length),
				yaml: value.slice(0, lineStart)
			};
		}
		if (nextLineBreak === -1) break;
		lineStart = nextLineBreak + 1;
	}
	context.diagnostics.add({
		code: "MOLDEA_DECISION_FRONTMATTER_MISSING",
		entity: getEntity(context.decisionId),
		path: context.path,
		range: locator.locateRange(value.length, value.length)
	});
	return null;
};
var validateDecisionFrontmatter = (node, context) => {
	const initialDiagnosticCount = context.diagnostics.size;
	const entries = readMapping(node, context);
	if (entries === null) return null;
	const status = readStatus(entries.get("status"), context);
	const createdAt = readCreatedAt(entries.get("createdAt"), context);
	const supersedes = readSupersedes(entries.get("supersedes"), context);
	if (status === null || createdAt === null || supersedes === null || context.diagnostics.size > initialDiagnosticCount) return null;
	return {
		createdAt,
		status,
		supersedes
	};
};
var validateDecisionBody = (body, range, context) => {
	if (hasNonWhitespace(body)) return true;
	context.diagnostics.add({
		code: "MOLDEA_DECISION_BODY_EMPTY",
		entity: getEntity(context.decisionId),
		path: context.path,
		range
	});
	return false;
};
var inspectDecisionDocument = async (input, options, operation = "parse-decision") => {
	options = createCoreOperationOptionsSnapshot(options);
	const normalized = normalizeTextDocument(input, options.limits, operation);
	const path = parseRepositoryPath(input.path);
	const diagnostics = createCoreDiagnosticCollector(options.limits, operation);
	const decisionId = parseDecisionIdFromPath(path);
	if (decisionId === null) diagnostics.add({
		code: "MOLDEA_DECISION_FILENAME_INVALID",
		path
	});
	for (const diagnostic of normalized.diagnostics) diagnostics.merge(diagnostic);
	if (!normalized.valid || normalized.text === null) return deepFreeze({
		decision: null,
		diagnostics: diagnostics.finalize(),
		valid: false,
		yamlRoot: null
	});
	const context = {
		decisionId,
		diagnostics,
		path
	};
	const locator = createSourceLocator(normalized.text.value);
	const sections = extractDecisionSections(normalized.text.value, locator, context);
	let metadata = null;
	let yamlRoot = null;
	if (sections !== null) {
		validateDecisionBody(sections.body, sections.bodyRange, context);
		const parsed = parseStrictYaml(sections.yaml, path, locator, diagnostics);
		yamlRoot = parsed.value;
		if (parsed.valid && parsed.value !== null) metadata = validateDecisionFrontmatter(parsed.value, context);
	}
	const locatedDiagnostics = locateDiagnosticRanges(diagnostics.finalize(), new Map(yamlRoot === null ? [] : [[path, yamlRoot]]));
	if (decisionId === null || sections === null || metadata === null || diagnostics.size > 0) return deepFreeze({
		decision: null,
		diagnostics: locatedDiagnostics,
		valid: false,
		yamlRoot
	});
	const digest = await calculateNormalizedTextDigest(normalized.text);
	const asset = {
		content: normalized.text.value,
		digest,
		path,
		scalarLength: normalized.text.scalarLength,
		utf8ByteLength: normalized.text.utf8ByteLength
	};
	return deepFreeze({
		decision: {
			asset,
			body: sections.body,
			createdAt: metadata.createdAt,
			id: decisionId,
			path,
			status: metadata.status,
			supersedes: metadata.supersedes
		},
		diagnostics: locatedDiagnostics,
		valid: true,
		yamlRoot
	});
};
var parseDecisionDocument = async (input, options, operation = "parse-decision") => {
	const inspection = await inspectDecisionDocument(input, options, operation);
	return deepFreeze({
		decision: inspection.decision,
		diagnostics: inspection.diagnostics,
		valid: inspection.valid
	});
};
var iterateProjectAgentAssignments = function* (project) {
	for (const agent of project.agents) yield { agentId: agent.id };
};
var createAssetItem = (asset, kind, agentId = null, decisionId = null) => ({
	agentId,
	byteLength: asset.utf8ByteLength,
	canonicalDigest: null,
	decisionId,
	digest: asset.digest,
	kind,
	path: asset.path,
	scalarLength: asset.scalarLength
});
var iterateProjectMetadata = function* (project) {
	yield createAssetItem(project.manifest.asset, "manifest");
	yield createAssetItem(project.project, "project");
	for (const context of project.context) yield createAssetItem(context.asset, "context");
	for (const { decision } of project.decisions) yield createAssetItem(decision.asset, "decision", null, decision.id);
	for (const agent of project.agents) {
		yield createAssetItem(agent.description.asset, "agent-description", agent.id);
		yield createAssetItem(agent.instruction, "agent-instruction", agent.id);
		for (const mirror of agent.mirrors) yield {
			agentId: agent.id,
			byteLength: mirror.byteLength,
			canonicalDigest: mirror.canonicalDigest,
			decisionId: null,
			digest: mirror.digest,
			kind: "mirror",
			path: mirror.path,
			scalarLength: mirror.scalarLength
		};
	}
};
var createProjectSummary = (project) => ({
	counts: {
		agents: project.agents.length,
		context: project.context.length,
		decisions: project.decisions.length,
		mirrors: project.agents.reduce((count, agent) => count + agent.mirrors.length, 0)
	},
	manifestDigest: project.manifest.asset.digest,
	manifestPath: project.manifest.asset.path,
	projectDigest: project.project.digest,
	projectPath: project.project.path
});
var countBindingCoverage = (coverage) => ({
	bindings: coverage.length,
	exportsPassed: coverage.filter((record) => record.exportCheck === "passed").length,
	exportsFailed: coverage.filter((record) => record.exportCheck === "failed").length,
	exportsNotChecked: coverage.filter((record) => record.exportCheck === "not-checked").length
});
var ledgers = new WeakMap();
var registerRetainedMemory = (reader, ledger) => {
	if (ledgers.has(reader)) throw new TypeError("The inspection reader is already registered.");
	ledgers.set(reader, ledger);
};
var getRetainedMemory = (reader) => {
	const ledger = ledgers.get(reader);
	if (ledger === void 0) throw new TypeError("The inspection reader has no retained-memory ledger.");
	return ledger;
};
var reserveRetainedBytesIfTracked = (reader, bytes) => {
	ledgers.get(reader)?.reserve(bytes);
};
var MANIFEST_PATH$2 = parseRepositoryPath("/moldea/moldea.yaml");
var INSTRUCTION_PATHS = new Set([
	"/AGENTS.md",
	"/CLAUDE.md",
	"/.claude/CLAUDE.md",
	"/CLAUDE.local.md"
].map((path) => parseRepositoryPath(path)));
var SOURCE_PAGE_ENTRIES = 256;
var SOURCE_PAGE_BYTES = 65536;
var CANONICAL_BYTE_RETENTION_MULTIPLIER = 4;
var RETAINED_PATH_FIXED_BYTES = 64;
var RETAINED_PATH_BYTE_MULTIPLIER = 2;
var encoder$1 = new TextEncoder();
var invalidSourceData$3 = (operation, path) => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation,
		path,
		retryable: false
	});
};
var copyReaderEntry$1 = (candidate, operation, fallbackPath, expectedPath) => {
	if (typeof candidate !== "object" || candidate === null) return invalidSourceData$3(operation, fallbackPath);
	const record = candidate;
	const pathCandidate = record["path"];
	const typeCandidate = record["type"];
	const byteLength = record["byteLength"];
	const contentIdentity = record["contentIdentity"];
	if (typeof pathCandidate !== "string" || !isRepositoryPath(pathCandidate)) return invalidSourceData$3(operation, fallbackPath);
	const path = parseRepositoryPath(pathCandidate);
	if (expectedPath !== void 0 && path !== expectedPath) return invalidSourceData$3(operation, path);
	if (typeCandidate !== "file" && typeCandidate !== "directory" && typeCandidate !== "symlink") return invalidSourceData$3(operation, path);
	if (typeCandidate === "file" ? !Number.isSafeInteger(byteLength) || byteLength < 0 || contentIdentity !== null && typeof contentIdentity !== "string" : byteLength !== null || contentIdentity !== null) return invalidSourceData$3(operation, path);
	return {
		byteLength,
		contentIdentity,
		path,
		type: typeCandidate
	};
};
var isStrictDescendant = (path, prefix) => {
	if (path === prefix) return false;
	const descendantPrefix = prefix === REPOSITORY_ROOT ? REPOSITORY_ROOT : `${prefix}/`;
	return path.startsWith(descendantPrefix);
};
var throwResourceLimitExceeded = (limit, limitMaximum, observedUsage) => {
	throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit,
		limitMaximum,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage,
		operation: "validate-project"
	});
};
var createSourceOptions = (sessionSignal, operationSignal) => {
	const signal = sessionSignal === void 0 ? operationSignal : operationSignal === void 0 || operationSignal === sessionSignal ? sessionSignal : AbortSignal.any([sessionSignal, operationSignal]);
	return signal === void 0 ? void 0 : { signal };
};
var createRepositoryInspectionSession = (repository, limits, signal, instructions) => {
	const seenPaths = new Set();
	let canonicalBytes = 0;
	let peakRetainedBytes = 0;
	let retainedBytes = 0;
	let totalBytesRead = 0;
	const createAbortedException = (abortedSignal) => {
		return new CoreOperationException({
			cause: abortedSignal.reason,
			code: "ABORTED",
			operation: "validate-project"
		});
	};
	const reserveRetainedBytes = (byteLength) => {
		if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > limits.maxRetainedBytes - retainedBytes) return throwResourceLimitExceeded("maxRetainedBytes", limits.maxRetainedBytes, retainedBytes + byteLength);
		retainedBytes += byteLength;
		peakRetainedBytes = Math.max(peakRetainedBytes, retainedBytes);
	};
	const observeTransientBytes = (byteLength) => {
		if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > limits.maxRetainedBytes - retainedBytes) return throwResourceLimitExceeded("maxRetainedBytes", limits.maxRetainedBytes, retainedBytes + byteLength);
		peakRetainedBytes = Math.max(peakRetainedBytes, retainedBytes + byteLength);
	};
	const registerPath = (path) => {
		if (path === REPOSITORY_ROOT || seenPaths.has(path)) return;
		if (seenPaths.size >= limits.maxEntries) return throwResourceLimitExceeded("maxEntries", limits.maxEntries, seenPaths.size + 1);
		reserveRetainedBytes(RETAINED_PATH_FIXED_BYTES + encoder$1.encode(path).byteLength * RETAINED_PATH_BYTE_MULTIPLIER);
		seenPaths.add(path);
	};
	const throwIfSignalAborted = (operationSignal) => {
		const abortedSignal = signal?.aborted ? signal : operationSignal?.aborted ? operationSignal : null;
		if (abortedSignal !== null) throw createAbortedException(abortedSignal);
	};
	throwIfSignalAborted();
	const reserveReadBytes = (byteLength) => {
		if (byteLength > limits.maxTotalBytesRead - totalBytesRead) return throwResourceLimitExceeded("maxTotalBytesRead", limits.maxTotalBytesRead, totalBytesRead + byteLength);
		totalBytesRead += byteLength;
	};
	const repositoryPages = {
		readPage: (path, options) => repository.readFilePage(path, options),
		snapshotId: repository.snapshot.id
	};
	const getEntryFrom = async (source, path, options) => {
		const parsedPath = parseRepositoryPath(path);
		throwIfSignalAborted(options?.signal);
		registerPath(parsedPath);
		const candidate = await source.getEntry(parsedPath, createSourceOptions(signal, options?.signal));
		throwIfSignalAborted(options?.signal);
		return candidate === null ? null : copyReaderEntry$1(candidate, "get-entry", parsedPath, parsedPath);
	};
	const getEntry = (path, options) => getEntryFrom(repository, path, options);
	const iterateEntries = (options) => {
		const prefix = options?.prefix === void 0 ? REPOSITORY_ROOT : parseRepositoryPath(options.prefix);
		return { async *[Symbol.asyncIterator]() {
			registerPath(prefix);
			const yieldedPaths = new Set();
			let cursor;
			let previousPath = null;
			do {
				throwIfSignalAborted(options?.signal);
				const page = await repository.listEntriesPage({
					...cursor === void 0 ? {} : { cursor },
					maxEntries: Math.min(SOURCE_PAGE_ENTRIES, limits.maxEntries),
					prefix,
					...createSourceOptions(signal, options?.signal) ?? {}
				});
				if (page.snapshot.id !== repository.snapshot.id || page.entries.length === 0 && !page.isComplete) return invalidSourceData$3("list-entries-page", prefix);
				for (const candidate of page.entries) {
					throwIfSignalAborted(options?.signal);
					const entry = copyReaderEntry$1(candidate, "list-entries-page", prefix);
					if (!isStrictDescendant(entry.path, prefix) || yieldedPaths.has(entry.path) || previousPath !== null && compareRepositoryPaths(previousPath, entry.path) >= 0) return invalidSourceData$3("list-entries-page", entry.path);
					yieldedPaths.add(entry.path);
					previousPath = entry.path;
					registerPath(entry.path);
					yield entry;
				}
				if (page.isComplete) {
					if (page.nextCursor !== null) return invalidSourceData$3("list-entries-page", prefix);
					return;
				}
				if (page.nextCursor === null || page.nextCursor === cursor) return invalidSourceData$3("list-entries-page", prefix);
				cursor = page.nextCursor;
			} while (true);
		} };
	};
	const loadFile = async (path, operationSignal, isSource = false, pages = repositoryPages) => {
		const multiplier = isSource ? 1 : CANONICAL_BYTE_RETENTION_MULTIPLIER;
		const fileLimit = path === MANIFEST_PATH$2 ? "maxManifestBytes" : "maxFileBytes";
		const availableRetainedBytes = limits.maxRetainedBytes - retainedBytes;
		if (availableRetainedBytes < 1) return throwResourceLimitExceeded("maxRetainedBytes", limits.maxRetainedBytes, retainedBytes + 1);
		const firstPageMaximumBytes = Math.min(SOURCE_PAGE_BYTES, Math.max(1, limits[fileLimit]), availableRetainedBytes);
		observeTransientBytes(firstPageMaximumBytes);
		const firstPage = await pages.readPage(path, {
			maxBytes: firstPageMaximumBytes,
			offset: 0,
			...createSourceOptions(signal, operationSignal) ?? {}
		});
		throwIfSignalAborted(operationSignal);
		if (firstPage.snapshot.id !== pages.snapshotId || firstPage.offset !== 0 || !(firstPage.bytes instanceof Uint8Array) || !Number.isSafeInteger(firstPage.totalBytes) || firstPage.totalBytes < 0 || firstPage.bytes.byteLength > SOURCE_PAGE_BYTES || firstPage.bytes.byteLength > firstPage.totalBytes || firstPage.bytes.byteLength === 0 && !firstPage.isComplete) return invalidSourceData$3("read-file-page", path);
		if (firstPage.totalBytes > limits[fileLimit]) return throwResourceLimitExceeded(fileLimit, limits[fileLimit], firstPage.totalBytes);
		const firstPageBytes = firstPage.bytes.byteLength;
		const retainedBytesAvailableForCanonicalContent = limits.maxRetainedBytes - retainedBytes - firstPageBytes;
		if (retainedBytesAvailableForCanonicalContent < 0 || firstPage.totalBytes > Math.floor(retainedBytesAvailableForCanonicalContent / multiplier)) {
			const projectedUsage = retainedBytes + firstPageBytes + firstPage.totalBytes * multiplier;
			return throwResourceLimitExceeded("maxRetainedBytes", limits.maxRetainedBytes, Number.isSafeInteger(projectedUsage) ? projectedUsage : Number.MAX_SAFE_INTEGER);
		}
		reserveReadBytes(firstPage.totalBytes);
		const canonicalRetainedBytes = firstPage.totalBytes * multiplier;
		observeTransientBytes(canonicalRetainedBytes + firstPageBytes);
		reserveRetainedBytes(canonicalRetainedBytes);
		if (!isSource) canonicalBytes += firstPage.totalBytes;
		const content = new Uint8Array(firstPage.totalBytes);
		let offset = 0;
		let page = firstPage;
		let isFirstPage = true;
		while (isFirstPage || offset < content.byteLength) {
			isFirstPage = false;
			if (page.snapshot.id !== pages.snapshotId || page.offset !== offset || page.totalBytes !== content.byteLength || !(page.bytes instanceof Uint8Array) || page.bytes.byteLength > SOURCE_PAGE_BYTES || page.bytes.byteLength > content.byteLength - offset || page.bytes.byteLength === 0 && !page.isComplete) return invalidSourceData$3("read-file-page", path);
			content.set(page.bytes, offset);
			offset += page.bytes.byteLength;
			if (page.isComplete) {
				if (page.nextOffset !== null || offset !== content.byteLength) return invalidSourceData$3("read-file-page", path);
				break;
			}
			if (page.nextOffset !== offset) return invalidSourceData$3("read-file-page", path);
			page = await pages.readPage(path, {
				maxBytes: Math.min(SOURCE_PAGE_BYTES, Math.max(1, content.byteLength - offset)),
				offset,
				...createSourceOptions(signal, operationSignal) ?? {}
			});
			throwIfSignalAborted(operationSignal);
		}
		return content;
	};
	const awaitWithCancellation = async (promise, operationSignal) => {
		const callerSignal = createSourceOptions(signal, operationSignal)?.signal;
		if (callerSignal === void 0) return promise;
		return new Promise((resolve, reject) => {
			const cleanup = () => callerSignal.removeEventListener("abort", abort);
			const abort = () => {
				cleanup();
				reject(createAbortedException(callerSignal));
			};
			if (callerSignal.aborted) abort();
			else callerSignal.addEventListener("abort", abort, { once: true });
			promise.then((result) => {
				cleanup();
				resolve(result);
			}, (error) => {
				cleanup();
				reject(error instanceof Error ? error : new RepositorySourceException({
					cause: error,
					code: "INVALID_SOURCE_DATA",
					operation: "read-file-page",
					path: null,
					retryable: false
				}));
			});
		});
	};
	const readCompleteFile = async (path, options) => {
		const parsedPath = parseRepositoryPath(path);
		throwIfSignalAborted(options?.signal);
		registerPath(parsedPath);
		const content = await awaitWithCancellation(loadFile(parsedPath, options?.signal), options?.signal);
		throwIfSignalAborted(options?.signal);
		return content.slice();
	};
	const readRetainedSource = async (path, pages) => {
		throwIfSignalAborted();
		registerPath(path);
		const bytes = await awaitWithCancellation(loadFile(path, void 0, true, pages));
		throwIfSignalAborted();
		let isReleased = false;
		return {
			bytes,
			release: () => {
				if (!isReleased) retainedBytes -= bytes.byteLength;
				isReleased = true;
			}
		};
	};
	const readerFor = (path) => instructions !== void 0 && INSTRUCTION_PATHS.has(path) ? instructions : repository;
	const pagesFor = (path) => {
		const source = readerFor(path);
		return source === repository ? repositoryPages : {
			readPage: (pagePath, options) => source.readFilePage(pagePath, options),
			snapshotId: source.snapshot.id
		};
	};
	const readLinkText = async (path, options) => {
		const parsedPath = parseRepositoryPath(path);
		throwIfSignalAborted(options?.signal);
		registerPath(parsedPath);
		const text = await awaitWithCancellation(readerFor(parsedPath).readLinkText(parsedPath, createSourceOptions(signal, options?.signal)), options?.signal);
		throwIfSignalAborted(options?.signal);
		if (text !== null && (typeof text !== "string" || encoder$1.encode(text).byteLength > 4096)) return invalidSourceData$3("read-link-text", parsedPath);
		return text;
	};
	const instructionView = Object.freeze({
		getEntry: (path, options) => {
			const parsedPath = parseRepositoryPath(path);
			return getEntryFrom(readerFor(parsedPath), parsedPath, options);
		},
		readLinkText,
		readSourceFile: (path) => {
			const parsedPath = parseRepositoryPath(path);
			return readRetainedSource(parsedPath, pagesFor(parsedPath));
		}
	});
	const reader = Object.freeze({
		getEntry,
		iterateEntries,
		readCompleteFile
	});
	registerRetainedMemory(reader, {
		reserve: reserveRetainedBytes,
		tryReserve: (bytes) => {
			if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > limits.maxRetainedBytes - retainedBytes) return false;
			reserveRetainedBytes(bytes);
			return true;
		},
		release: (bytes) => {
			if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > retainedBytes) throw new TypeError("The retained-memory release is invalid.");
			retainedBytes -= bytes;
		},
		readSourceFile: (path) => readRetainedSource(path, repositoryPages)
	});
	return Object.freeze({
		getResourceUsage: () => Object.freeze({
			canonicalBytes,
			peakRetainedBytes,
			retainedBytes,
			totalBytesRead
		}),
		instructions: instructionView,
		reader,
		throwIfAborted: throwIfSignalAborted
	});
};
var OPENING_HEADING_PATTERN = /^#{1,6} /u;
var findNonblankLine = (lines, startIndex) => {
	for (let index = startIndex; index < lines.length; index += 1) {
		const line = lines[index];
		if (line !== void 0 && hasNonWhitespace(line)) return index;
	}
	return null;
};
var validateAgentDescription = (asset, agentId, limits) => {
	const diagnostics = createCoreDiagnosticCollector(limits, "validate-project");
	const value = trimRepositoryFormatWhitespace(asset.content);
	const scalarLength = countUnicodeScalars(value);
	if (scalarLength === 0) diagnostics.add({
		code: "MOLDEA_AGENT_DESCRIPTION_INVALID",
		details: { reason: "empty" },
		entity: { agentId },
		path: asset.path
	});
	if (scalarLength > 1e3) diagnostics.add({
		code: "MOLDEA_AGENT_DESCRIPTION_INVALID",
		details: { reason: "too-long" },
		entity: { agentId },
		path: asset.path
	});
	const finalizedDiagnostics = diagnostics.finalize();
	return deepFreeze({
		description: finalizedDiagnostics.length === 0 ? {
			asset,
			scalarLength,
			value
		} : null,
		diagnostics: finalizedDiagnostics,
		valid: finalizedDiagnostics.length === 0
	});
};
var validateAgentInstruction = (asset, agentId, limits) => {
	const diagnostics = createCoreDiagnosticCollector(limits, "validate-project");
	if (!hasNonWhitespace(asset.content)) {
		diagnostics.add({
			code: "MOLDEA_AGENT_INSTRUCTION_EMPTY",
			entity: { agentId },
			path: asset.path
		});
		return deepFreeze({
			diagnostics: diagnostics.finalize(),
			instruction: null,
			valid: false
		});
	}
	const identityToken = `\`${agentId}\``;
	const lines = asset.content.split("\n");
	const openingIndex = findNonblankLine(lines, 0);
	let identityIndex = openingIndex;
	if (openingIndex !== null && OPENING_HEADING_PATTERN.test(lines[openingIndex] ?? "")) identityIndex = findNonblankLine(lines, openingIndex + 1);
	if (identityIndex === null || !(lines[identityIndex] ?? "").includes(identityToken)) diagnostics.add({
		code: "MOLDEA_AGENT_IDENTITY_INVALID",
		details: { reason: asset.content.includes(identityToken) ? "misplaced" : "missing" },
		entity: { agentId },
		path: asset.path
	});
	const finalizedDiagnostics = diagnostics.finalize();
	return deepFreeze({
		diagnostics: finalizedDiagnostics,
		instruction: asset,
		valid: finalizedDiagnostics.length === 0
	});
};
var invalidSourceData$2 = (path) => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation: "read-file-page",
		path,
		retryable: false
	});
};
var readRepositoryTextAsset = async (repository, path, limits, signal) => {
	const content = await repository.readCompleteFile(path, signal === void 0 ? void 0 : { signal });
	if (!(content instanceof Uint8Array)) return invalidSourceData$2(path);
	const normalized = normalizeTextDocument({
		content,
		path
	}, limits, "validate-project");
	if (!normalized.valid || normalized.text === null) return deepFreeze({
		asset: null,
		diagnostics: normalized.diagnostics,
		valid: false
	});
	const asset = {
		content: normalized.text.value,
		digest: await calculateNormalizedTextDigest(normalized.text),
		path,
		scalarLength: normalized.text.scalarLength,
		utf8ByteLength: normalized.text.utf8ByteLength
	};
	return deepFreeze({
		asset,
		diagnostics: [],
		valid: true
	});
};
var addDiagnostics$3 = (collector, diagnostics) => {
	for (const diagnostic of diagnostics) collector.merge(diagnostic);
};
var isBlockedPath$1 = (path, blockedPaths) => {
	let candidate = path;
	while (candidate.length > 0) {
		if (blockedPaths.has(candidate)) return true;
		const separatorIndex = candidate.lastIndexOf("/");
		if (separatorIndex <= 0) return false;
		candidate = candidate.slice(0, separatorIndex);
	}
	return false;
};
var readDescription = async (repository, path, agentId, options, collector, signal) => {
	const readResult = await readRepositoryTextAsset(repository, path, options.limits, signal);
	addDiagnostics$3(collector, readResult.diagnostics);
	if (readResult.asset === null) return null;
	const validation = validateAgentDescription(readResult.asset, agentId, options.limits);
	addDiagnostics$3(collector, validation.diagnostics);
	return validation.description;
};
var readInstruction = async (repository, path, agentId, options, collector, signal) => {
	const readResult = await readRepositoryTextAsset(repository, path, options.limits, signal);
	addDiagnostics$3(collector, readResult.diagnostics);
	if (readResult.asset === null) return null;
	const validation = validateAgentInstruction(readResult.asset, agentId, options.limits);
	addDiagnostics$3(collector, validation.diagnostics);
	return validation.instruction;
};
var inspectAgentAssets = async (repository, manifest, discovery, options, signal) => {
	options = createCoreOperationOptionsSnapshot(options);
	const collector = createCoreDiagnosticCollector(options.limits, "validate-project");
	const agents = [];
	const registeredAgents = manifest.agents ?? {};
	const registeredIds = new Set(Object.keys(registeredAgents));
	const discoveredById = new Map(discovery.inventory.agents.map((agent) => [agent.id, agent]));
	const blockedPaths = new Set(discovery.diagnostics.flatMap((diagnostic) => diagnostic.path === null ? [] : [diagnostic.path]));
	for (const discovered of discovery.inventory.agents) if (!registeredIds.has(discovered.id)) collector.add({
		code: "MOLDEA_AGENT_DIRECTORY_UNREGISTERED",
		entity: { agentId: discovered.id },
		path: discovered.path
	});
	for (const agentId of [...registeredIds].sort(compareCodePoints)) {
		const declaration = registeredAgents[agentId];
		if (declaration === void 0) continue;
		const discovered = discoveredById.get(agentId);
		if (discovered === void 0) {
			const directoryPath = parseRepositoryPath(`/moldea/agents/${agentId}`);
			if (!isBlockedPath$1(directoryPath, blockedPaths)) collector.add({
				code: "MOLDEA_AGENT_DIRECTORY_MISSING",
				entity: { agentId },
				path: directoryPath
			});
			agents.push({
				declaration,
				description: null,
				id: agentId,
				instruction: null
			});
			continue;
		}
		let description = null;
		let instruction = null;
		if (discovered.description === null) {
			const path = parseRepositoryPath(`${discovered.path}/description.md`);
			if (!isBlockedPath$1(path, blockedPaths)) collector.add({
				code: "MOLDEA_AGENT_DESCRIPTION_MISSING",
				entity: { agentId },
				path
			});
		} else description = await readDescription(repository, discovered.description, agentId, options, collector, signal);
		if (discovered.instruction === null) {
			const path = parseRepositoryPath(`${discovered.path}/instruction.md`);
			if (!isBlockedPath$1(path, blockedPaths)) collector.add({
				code: "MOLDEA_AGENT_INSTRUCTION_MISSING",
				entity: { agentId },
				path
			});
		} else instruction = await readInstruction(repository, discovered.instruction, agentId, options, collector, signal);
		agents.push({
			declaration,
			description,
			id: agentId,
			instruction
		});
	}
	const diagnostics = collector.finalize();
	return deepFreeze({
		agents,
		diagnostics,
		valid: diagnostics.length === 0
	});
};
var AGENT_ASSET_PATTERN = /^\/moldea\/agents\/([^/]+)\/(description|instruction)\.md$/u;
var AGENT_DIRECTORY_PATTERN = /^\/moldea\/agents\/([^/]+)$/u;
var DECISION_CANDIDATE_PATTERN = /^\/moldea\/decisions\/[^/]+\.md$/u;
var readCanonicalFile = (path) => {
	if (path === "/moldea/moldea.yaml") return {
		agentId: null,
		fileKind: "manifest",
		kind: "canonical-file"
	};
	if (path === "/moldea/project.md") return {
		agentId: null,
		fileKind: "project",
		kind: "canonical-file"
	};
	if (isContextPath(path, false)) return {
		agentId: null,
		fileKind: "context",
		kind: "canonical-file"
	};
	if (DECISION_CANDIDATE_PATTERN.test(path)) return {
		agentId: null,
		fileKind: "decision",
		kind: "canonical-file"
	};
	const agentAsset = AGENT_ASSET_PATTERN.exec(path);
	if (agentAsset === null) return null;
	const agentId = agentAsset[1];
	const fileName = agentAsset[2];
	if (agentId === void 0 || fileName === void 0) return null;
	return {
		agentId,
		fileKind: fileName === "description" ? "agent-description" : "agent-instruction",
		kind: "canonical-file"
	};
};
var readAgentDirectoryId = (path) => {
	return AGENT_DIRECTORY_PATTERN.exec(path)?.[1] ?? null;
};
var isRequiredDirectoryPath = (path) => {
	return path === "/moldea" || path === "/moldea/context" || path === "/moldea/decisions" || path === "/moldea/agents";
};
var isPermittedStructuralDirectoryPath = (path) => {
	return isRequiredDirectoryPath(path) || path.startsWith("/moldea/context/");
};
var classifyCanonicalEntry = (entry) => {
	const canonicalFile = readCanonicalFile(entry.path);
	if (canonicalFile !== null) {
		if (entry.type === "file") return canonicalFile;
		return entry.type === "symlink" ? { kind: "canonical-asset-symlink" } : {
			expectedType: "file",
			kind: "entry-type-invalid"
		};
	}
	const agentId = readAgentDirectoryId(entry.path);
	if (agentId !== null) return entry.type === "directory" ? {
		agentId,
		kind: "agent-directory"
	} : {
		expectedType: "directory",
		kind: "entry-type-invalid"
	};
	if (isRequiredDirectoryPath(entry.path)) return entry.type === "directory" ? { kind: "structural-directory" } : {
		expectedType: "directory",
		kind: "entry-type-invalid"
	};
	if (entry.type === "directory") return isPermittedStructuralDirectoryPath(entry.path) ? { kind: "structural-directory" } : { kind: "ignored-directory" };
	return { kind: "unrecognized" };
};
var MOLDEA_ROOT$1 = parseRepositoryPath("/moldea");
var MANIFEST_PATH$1 = parseRepositoryPath("/moldea/moldea.yaml");
var PROJECT_PATH$1 = parseRepositoryPath("/moldea/project.md");
var createWorkingInventory = () => ({
	agents: new Map(),
	context: new Set(),
	decisions: new Set(),
	manifest: null,
	project: null
});
var invalidSourceData$1 = (operation, path) => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation,
		path,
		retryable: false
	});
};
var copyReaderEntry = (candidate, operation, expectedPath) => {
	if (typeof candidate !== "object" || candidate === null) return invalidSourceData$1(operation, expectedPath ?? null);
	const record = candidate;
	const pathCandidate = record["path"];
	const typeCandidate = record["type"];
	const byteLength = record["byteLength"];
	const contentIdentity = record["contentIdentity"];
	if (typeof pathCandidate !== "string" || !isRepositoryPath(pathCandidate)) return invalidSourceData$1(operation, expectedPath ?? null);
	const path = parseRepositoryPath(pathCandidate);
	if (expectedPath !== void 0 && path !== expectedPath) return invalidSourceData$1(operation, path);
	if (typeCandidate !== "file" && typeCandidate !== "directory" && typeCandidate !== "symlink") return invalidSourceData$1(operation, path);
	if (typeCandidate === "file" ? !Number.isSafeInteger(byteLength) || byteLength < 0 || contentIdentity !== null && typeof contentIdentity !== "string" : byteLength !== null || contentIdentity !== null) return invalidSourceData$1(operation, path);
	return {
		byteLength,
		contentIdentity,
		path,
		type: typeCandidate
	};
};
var readExactEntry = async (repository, path, signal) => {
	const candidate = await repository.getEntry(path, signal === void 0 ? void 0 : { signal });
	return candidate === null ? null : copyReaderEntry(candidate, "get-entry", path);
};
var addEntryTypeDiagnostic = (diagnostics, entry, expectedType) => {
	diagnostics.add({
		code: "MOLDEA_ENTRY_TYPE_INVALID",
		details: {
			actualType: entry.type,
			expectedType
		},
		path: entry.path
	});
};
var getAgent = (agents, agentId) => {
	const existing = agents.get(agentId);
	if (existing !== void 0) return existing;
	const created = {
		description: null,
		id: agentId,
		instruction: null,
		path: parseRepositoryPath(`/moldea/agents/${agentId}`)
	};
	agents.set(agentId, created);
	return created;
};
var retainCanonicalFile = (inventory, path, fileKind, agentId) => {
	switch (fileKind) {
		case "manifest":
			inventory.manifest = path;
			return;
		case "project":
			inventory.project = path;
			return;
		case "context":
			inventory.context.add(path);
			return;
		case "decision":
			inventory.decisions.add(path);
			return;
	}
	if (agentId === null) return invalidSourceData$1("list-entries-page", path);
	const agent = getAgent(inventory.agents, agentId);
	if (fileKind === "agent-description") agent.description = path;
	else agent.instruction = path;
};
var finalizeInventory = (working) => {
	const sortPaths = (paths) => {
		return [...paths].sort(compareCodePoints);
	};
	const agents = [...working.agents.values()].sort((left, right) => compareCodePoints(left.id, right.id)).map((agent) => deepFreeze({ ...agent }));
	return deepFreeze({
		agents,
		context: sortPaths(working.context),
		decisions: sortPaths(working.decisions),
		manifest: working.manifest,
		project: working.project
	});
};
var finalizeResult = (working, diagnostics) => {
	const finalizedDiagnostics = diagnostics.finalize();
	return deepFreeze({
		diagnostics: finalizedDiagnostics,
		inventory: finalizeInventory(working),
		valid: finalizedDiagnostics.length === 0
	});
};
var retainFoundationEntry = (entry, expectedPath, missingCode, working, diagnostics) => {
	if (entry === null) {
		diagnostics.add({
			code: missingCode,
			path: expectedPath
		});
		return;
	}
	if (entry.type === "file") {
		if (expectedPath === MANIFEST_PATH$1) working.manifest = expectedPath;
		else working.project = expectedPath;
		return;
	}
	if (entry.type === "symlink") {
		diagnostics.add({
			code: "MOLDEA_CANONICAL_ASSET_SYMLINK",
			path: expectedPath
		});
		return;
	}
	addEntryTypeDiagnostic(diagnostics, entry, "file");
};
var checkFoundationListing = (listedEntry, exactEntry) => {
	if (exactEntry === null || exactEntry.type !== listedEntry.type) return invalidSourceData$1("list-entries-page", listedEntry.path);
};
var discoverCanonicalAssets = async (repository, limits, signal, foundations) => {
	const diagnostics = createCoreDiagnosticCollector(limits, "validate-project");
	const working = createWorkingInventory();
	const moldeaEntry = foundations === void 0 ? await readExactEntry(repository, MOLDEA_ROOT$1, signal) : foundations.moldeaRoot;
	if (moldeaEntry === null) {
		diagnostics.add({
			code: "MOLDEA_MANIFEST_MISSING",
			path: MANIFEST_PATH$1
		});
		diagnostics.add({
			code: "MOLDEA_PROJECT_FILE_MISSING",
			path: PROJECT_PATH$1
		});
		return finalizeResult(working, diagnostics);
	}
	if (moldeaEntry.type !== "directory") {
		addEntryTypeDiagnostic(diagnostics, moldeaEntry, "directory");
		return finalizeResult(working, diagnostics);
	}
	const manifestEntry = foundations === void 0 ? await readExactEntry(repository, MANIFEST_PATH$1, signal) : foundations.manifest;
	const projectEntry = foundations === void 0 ? await readExactEntry(repository, PROJECT_PATH$1, signal) : foundations.project;
	retainFoundationEntry(manifestEntry, MANIFEST_PATH$1, "MOLDEA_MANIFEST_MISSING", working, diagnostics);
	retainFoundationEntry(projectEntry, PROJECT_PATH$1, "MOLDEA_PROJECT_FILE_MISSING", working, diagnostics);
	const seenPaths = new Set();
	let listedManifest = false;
	let listedProject = false;
	const listOptions = signal === void 0 ? { prefix: MOLDEA_ROOT$1 } : {
		prefix: MOLDEA_ROOT$1,
		signal
	};
	for await (const candidate of repository.iterateEntries(listOptions)) {
		const entry = copyReaderEntry(candidate, "list-entries-page");
		if (!entry.path.startsWith("/moldea/")) return invalidSourceData$1("list-entries-page", entry.path);
		if (seenPaths.has(entry.path)) return invalidSourceData$1("list-entries-page", entry.path);
		seenPaths.add(entry.path);
		if (entry.path === MANIFEST_PATH$1) {
			checkFoundationListing(entry, manifestEntry);
			listedManifest = true;
			continue;
		}
		if (entry.path === PROJECT_PATH$1) {
			checkFoundationListing(entry, projectEntry);
			listedProject = true;
			continue;
		}
		const classification = classifyCanonicalEntry(entry);
		switch (classification.kind) {
			case "canonical-file":
				retainCanonicalFile(working, entry.path, classification.fileKind, classification.agentId);
				break;
			case "agent-directory":
				getAgent(working.agents, classification.agentId);
				break;
			case "canonical-asset-symlink":
				diagnostics.add({
					code: "MOLDEA_CANONICAL_ASSET_SYMLINK",
					path: entry.path
				});
				break;
			case "entry-type-invalid":
				addEntryTypeDiagnostic(diagnostics, entry, classification.expectedType);
				break;
			case "unrecognized": diagnostics.add({
				code: "MOLDEA_CANONICAL_PATH_UNRECOGNIZED",
				details: { entryType: entry.type },
				path: entry.path
			});
		}
	}
	if (manifestEntry !== null !== listedManifest) return invalidSourceData$1("list-entries-page", MANIFEST_PATH$1);
	if (projectEntry !== null !== listedProject) return invalidSourceData$1("list-entries-page", PROJECT_PATH$1);
	return finalizeResult(working, diagnostics);
};
var sortCandidates = (candidates) => {
	return [...candidates].sort((left, right) => compareCodePoints(left.path, right.path));
};
var buildGraphIndex = (candidates) => {
	const mutableGroups = new Map();
	for (const candidate of sortCandidates(candidates)) {
		if (candidate.id === null) continue;
		const group = mutableGroups.get(candidate.id) ?? [];
		group.push(candidate);
		mutableGroups.set(candidate.id, group);
	}
	const candidateGroups = new Map();
	const nodes = new Map();
	for (const id of [...mutableGroups.keys()].sort(compareCodePoints)) {
		const group = mutableGroups.get(id) ?? [];
		candidateGroups.set(id, group);
		if (group.length === 1 && group[0]?.decision !== null) {
			const decision = group[0]?.decision;
			if (decision !== void 0) nodes.set(id, decision);
		}
	}
	const edges = new Map();
	for (const [id, decision] of nodes) {
		const resolvedTargets = decision.supersedes.filter((targetId) => {
			const group = candidateGroups.get(targetId);
			return group?.length === 1 && group[0]?.decision !== null;
		});
		edges.set(id, resolvedTargets);
	}
	return {
		candidateGroups,
		edges,
		nodes
	};
};
var collectDuplicateDiagnostics = (index, diagnostics) => {
	for (const [id, candidates] of index.candidateGroups) {
		if (candidates.length < 2) continue;
		for (const candidate of candidates) diagnostics.add({
			code: "MOLDEA_DECISION_ID_DUPLICATE",
			details: { occurrences: candidates.length },
			entity: { decisionId: id },
			path: candidate.path
		});
	}
};
var collectReferenceDiagnostics = (index, diagnostics) => {
	for (const decision of index.nodes.values()) for (const targetId of decision.supersedes) {
		if (index.candidateGroups.has(targetId)) continue;
		diagnostics.add({
			code: "MOLDEA_DECISION_REFERENCE_MISSING",
			details: { referencedDecisionId: targetId },
			entity: { decisionId: decision.id },
			path: decision.path,
			pointer: "/supersedes"
		});
	}
};
var collectStatusDiagnostics = (index, diagnostics) => {
	const activelySupersededIds = new Set();
	for (const decision of index.nodes.values()) {
		if (decision.status !== "accepted" && decision.status !== "superseded") continue;
		for (const targetId of index.edges.get(decision.id) ?? []) {
			const target = index.nodes.get(targetId);
			if (target === void 0) continue;
			if (target.status === "superseded") {
				activelySupersededIds.add(targetId);
				continue;
			}
			diagnostics.add({
				code: "MOLDEA_DECISION_SUPERSESSION_STATUS_INVALID",
				details: {
					referencedDecisionId: targetId,
					sourceStatus: decision.status,
					targetStatus: target.status
				},
				entity: { decisionId: decision.id },
				path: decision.path,
				pointer: "/supersedes"
			});
		}
	}
	return activelySupersededIds;
};
var collectOrphanDiagnostics = (index, activelySupersededIds, diagnostics) => {
	for (const decision of index.nodes.values()) if (decision.status === "superseded" && !activelySupersededIds.has(decision.id)) diagnostics.add({
		code: "MOLDEA_DECISION_SUPERSEDED_ORPHAN",
		entity: { decisionId: decision.id },
		path: decision.path
	});
};
var calculateFinishOrder = (index) => {
	const visited = new Set();
	const finished = [];
	for (const startId of index.nodes.keys()) {
		if (visited.has(startId)) continue;
		const stack = [{
			id: startId,
			nextNeighbor: 0
		}];
		visited.add(startId);
		while (stack.length > 0) {
			const current = stack.at(-1);
			if (current === void 0) break;
			const neighbor = (index.edges.get(current.id) ?? [])[current.nextNeighbor];
			if (neighbor === void 0) {
				finished.push(current.id);
				stack.pop();
				continue;
			}
			current.nextNeighbor += 1;
			if (!visited.has(neighbor)) {
				visited.add(neighbor);
				stack.push({
					id: neighbor,
					nextNeighbor: 0
				});
			}
		}
	}
	return finished;
};
var buildReverseEdges = (index) => {
	const reverseEdges = new Map();
	for (const id of index.nodes.keys()) reverseEdges.set(id, []);
	for (const [sourceId, targets] of index.edges) for (const targetId of targets) reverseEdges.get(targetId)?.push(sourceId);
	for (const sources of reverseEdges.values()) sources.sort(compareCodePoints);
	return reverseEdges;
};
var findStronglyConnectedComponents = (index) => {
	const reverseEdges = buildReverseEdges(index);
	const visited = new Set();
	const components = [];
	for (const startId of [...calculateFinishOrder(index)].reverse()) {
		if (visited.has(startId)) continue;
		const component = [];
		const stack = [startId];
		visited.add(startId);
		while (stack.length > 0) {
			const currentId = stack.pop();
			if (currentId === void 0) break;
			component.push(currentId);
			for (const sourceId of [...reverseEdges.get(currentId) ?? []].reverse()) if (!visited.has(sourceId)) {
				visited.add(sourceId);
				stack.push(sourceId);
			}
		}
		components.push(component.sort(compareCodePoints));
	}
	return components.sort((left, right) => compareCodePoints(left[0] ?? "", right[0] ?? ""));
};
var collectCycleDiagnostics = (index, diagnostics) => {
	for (const component of findStronglyConnectedComponents(index)) {
		if (component.length < 2) continue;
		const cycleRepresentativeDecisionId = component[0];
		if (cycleRepresentativeDecisionId === void 0) continue;
		for (const decisionId of component) {
			const decision = index.nodes.get(decisionId);
			if (decision !== void 0) diagnostics.add({
				code: "MOLDEA_DECISION_SUPERSESSION_CYCLE",
				details: {
					cycleRepresentativeDecisionId,
					cycleSize: component.length
				},
				entity: { decisionId },
				path: decision.path,
				pointer: "/supersedes"
			});
		}
	}
};
var validateDecisionGraph = (candidates, limits) => {
	const diagnostics = createCoreDiagnosticCollector(limits, "validate-project");
	const index = buildGraphIndex(candidates);
	collectDuplicateDiagnostics(index, diagnostics);
	collectReferenceDiagnostics(index, diagnostics);
	collectCycleDiagnostics(index, diagnostics);
	collectOrphanDiagnostics(index, collectStatusDiagnostics(index, diagnostics), diagnostics);
	return diagnostics.finalize();
};
var invalidSourceData = (path) => {
	throw new RepositorySourceException({
		code: "INVALID_SOURCE_DATA",
		operation: "read-file-page",
		path,
		retryable: false
	});
};
var sortDecisions = (decisions) => {
	return [...decisions].sort((left, right) => {
		return compareCodePoints(left.id, right.id) || compareCodePoints(left.path, right.path);
	});
};
var readDecisionGraph = async (repository, paths, options, signal, retainYamlRoot) => {
	options = createCoreOperationOptionsSnapshot(options);
	const diagnostics = createCoreDiagnosticCollector(options.limits, "validate-project");
	const candidates = [];
	const decisions = [];
	const readOptions = signal === void 0 ? void 0 : { signal };
	for (const path of [...paths].sort(compareCodePoints)) {
		const content = await repository.readCompleteFile(path, readOptions);
		if (!(content instanceof Uint8Array)) return invalidSourceData(path);
		const parsed = await inspectDecisionDocument({
			content: content.slice(),
			path
		}, options, "validate-project");
		if (parsed.decision !== null && parsed.yamlRoot !== null) retainYamlRoot?.(path, parsed.yamlRoot);
		for (const diagnostic of parsed.diagnostics) diagnostics.merge(diagnostic);
		candidates.push({
			decision: parsed.decision,
			id: parseDecisionIdFromPath(path),
			path
		});
		if (parsed.decision !== null) decisions.push(parsed.decision);
	}
	for (const diagnostic of validateDecisionGraph(candidates, options.limits)) diagnostics.merge(diagnostic);
	const finalizedDiagnostics = diagnostics.finalize();
	return deepFreeze({
		decisions: sortDecisions(decisions),
		diagnostics: finalizedDiagnostics,
		valid: finalizedDiagnostics.length === 0
	});
};
var createDecisionEntity = (decisionPath, agentId) => {
	const decisionId = parseDecisionIdFromPath(decisionPath);
	return {
		...agentId === void 0 ? {} : { agentId },
		...decisionId === null ? {} : { decisionId }
	};
};
var validateContextRelationship = (referencedPath, pointer, validContextPaths, context, agentId) => {
	if (validContextPaths.has(referencedPath) || context.blockedPaths.has(referencedPath)) return;
	context.collector.add({
		code: "MOLDEA_REFERENCE_MISSING",
		details: { referencedPath },
		entity: agentId === void 0 ? null : { agentId },
		path: context.manifestPath,
		pointer
	});
};
var validateDecisionRelationship = (referencedPath, pointer, context, agentId) => {
	if (!context.discoveredDecisionPaths.has(referencedPath)) {
		if (context.blockedPaths.has(referencedPath)) return;
		context.collector.add({
			code: "MOLDEA_DECISION_REFERENCE_MISSING",
			details: { referencedPath },
			entity: createDecisionEntity(referencedPath, agentId),
			path: context.manifestPath,
			pointer
		});
		return;
	}
	const parsedDecision = context.parsedDecisionsByPath.get(referencedPath);
	if (parsedDecision === void 0 || parsedDecision.status === "accepted") return;
	context.collector.add({
		code: "MOLDEA_DECISION_RELATIONSHIP_INACTIVE",
		details: {
			referencedPath,
			targetStatus: parsedDecision.status
		},
		entity: createDecisionEntity(referencedPath, agentId),
		path: context.manifestPath,
		pointer
	});
};
var validateManifestRelationships = (manifestPath, manifest, discovery, decisions, limits) => {
	const collector = createCoreDiagnosticCollector(limits, "validate-project");
	const validAgentContextPaths = new Set(discovery.inventory.context);
	const validTopLevelContextPaths = new Set(validAgentContextPaths);
	if (discovery.inventory.project !== null) validTopLevelContextPaths.add(discovery.inventory.project);
	const validationContext = {
		blockedPaths: new Set(discovery.diagnostics.flatMap((diagnostic) => diagnostic.path === null ? [] : [diagnostic.path])),
		collector,
		discoveredDecisionPaths: new Set(discovery.inventory.decisions),
		manifestPath,
		parsedDecisionsByPath: new Map(decisions.map((decision) => [decision.path, decision])),
		validAgentContextPaths,
		validTopLevelContextPaths
	};
	for (const referencedPathValue of Object.keys(manifest.context ?? {}).sort(compareCodePoints)) validateContextRelationship(parseRepositoryPath(referencedPathValue), `/context/${escapeJsonPointerSegment(referencedPathValue)}`, validationContext.validTopLevelContextPaths, validationContext);
	for (const referencedPathValue of Object.keys(manifest.decisions ?? {}).sort(compareCodePoints)) validateDecisionRelationship(parseRepositoryPath(referencedPathValue), `/decisions/${escapeJsonPointerSegment(referencedPathValue)}`, validationContext);
	for (const agentId of Object.keys(manifest.agents ?? {}).sort(compareCodePoints)) {
		const agent = manifest.agents?.[agentId];
		if (agent === void 0) continue;
		const escapedAgentId = escapeJsonPointerSegment(agentId);
		for (const [index, referencedPath] of (agent.context ?? []).entries()) validateContextRelationship(referencedPath, `/agents/${escapedAgentId}/context/${index}`, validationContext.validAgentContextPaths, validationContext, agentId);
		for (const [index, referencedPath] of (agent.decisions ?? []).entries()) validateDecisionRelationship(referencedPath, `/agents/${escapedAgentId}/decisions/${index}`, validationContext, agentId);
	}
	return collector.finalize();
};
var MARKERS = {
	start: "<!-- moldea:start -->",
	end: "<!-- moldea:end -->"
};
var parseManagedIntegrationRegion = (text) => {
	try {
		const region = findMarkedRegion(text.replace(/(<!-- moldea:(?:start|end) -->)[ \t]+(?=\r?$)/gmu, "$1"), MARKERS);
		if (region === null) return "block-missing";
		const start = text.indexOf(MARKERS.start);
		const closingLineBreak = text.indexOf("\n", text.indexOf(MARKERS.end));
		return {
			start,
			end: closingLineBreak === -1 ? text.length : closingLineBreak + 1,
			lineEnding: region.lineEnding
		};
	} catch (error) {
		if (hasErrorCode(error, ERRORS.INVALID_MARKED_REGION)) return "block-invalid";
		throw error;
	}
};
var normalizeManagedIntegrationBlock = (text) => {
	const normalized = text.replaceAll("\r\n", "\n").replace(/(<!-- moldea:(?:start|end) -->)[ \t]+(?=\n|$)/gu, "$1");
	if (!normalized.startsWith(`${MARKERS.start}\n`) || !(normalized.endsWith(MARKERS.end) || normalized.endsWith(`${MARKERS.end}\n`))) return normalized;
	let start = MARKERS.start.length;
	let end = normalized.lastIndexOf(MARKERS.end);
	while (start < end && normalized[start] === "\n") start++;
	while (end > start && normalized[end - 1] === "\n") end--;
	return `${MARKERS.start}\n${normalized.slice(start, end)}\n${MARKERS.end}`;
};
var parseIntegrationBlock = (text) => {
	const region = parseManagedIntegrationRegion(text);
	if (typeof region === "string") return {
		kind: "missing",
		reason: region
	};
	const matches = text.slice(region.start, region.end).matchAll(/^node "<repo-root>\/([^"\r\n]+)\/scripts\/relevance-gate\.mjs"(?=[ \t\r]|$)([^\r\n]*)/gm);
	const paths = new Map();
	for (const match of matches) {
		const skillPath = match[1];
		const mode = /(?:^|[ \t])--adoption-only(?:[ \t]|$)/u.test(match[2] ?? "") ? "adoption" : "paths";
		if (skillPath === void 0 || paths.has(mode)) return {
			kind: "missing",
			reason: "skill-path-missing"
		};
		paths.set(mode, skillPath);
	}
	const skillPath = paths.get("paths") ?? paths.get("adoption");
	if (paths.size === 0 || paths.size === 2 && paths.get("adoption") !== skillPath) return {
		kind: "missing",
		reason: "skill-path-missing"
	};
	if (skillPath === void 0 || !/^[A-Za-z0-9._/-]+$/.test(skillPath) || skillPath.startsWith("/") || skillPath.endsWith("/") || skillPath.includes("//") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(skillPath)) return {
		kind: "missing",
		reason: "skill-path-invalid"
	};
	return {
		kind: "found",
		skillPath
	};
};
var ROOT_AGENTS_IMPORTS = new Set(["@AGENTS.md", "@./AGENTS.md"]);
var NESTED_AGENTS_IMPORTS = new Set(["@../AGENTS.md"]);
var hasAgentsImport = (text, isNested) => {
	const imports = isNested ? NESTED_AGENTS_IMPORTS : ROOT_AGENTS_IMPORTS;
	let fence = null;
	for (const rawLine of text.replace(/^\uFEFF/u, "").split(/\r\n|\n|\r/u)) {
		const line = rawLine.replace(/^[ \t]+|[ \t]+$/gu, "");
		const marker = /^(`{3,}|~{3,})/u.exec(line)?.[1];
		if (fence !== null) {
			if (marker !== void 0 && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
		} else if (marker !== void 0) fence = marker;
		else if (imports.has(line)) return true;
	}
	return false;
};
var readRetainedText = async (ledger, load) => {
	const source = await load();
	const reservation = source.bytes.byteLength * 8;
	let isReserved = false;
	try {
		ledger.reserve(reservation);
		isReserved = true;
		let text;
		try {
			text = new TextDecoder("utf-8", { fatal: true }).decode(source.bytes);
		} catch {
			text = null;
		}
		return {
			text,
			release: () => ledger.release(reservation)
		};
	} catch (error) {
		if (isReserved) ledger.release(reservation);
		throw error;
	} finally {
		source.release();
	}
};
var getAbsentKind = (error) => error instanceof RepositorySourceException ? error.code === "ENTRY_NOT_FOUND" ? "missing" : error.code === "ENTRY_NOT_FILE" ? "non-regular" : null : null;
var AGENTS_PATH$1 = parseRepositoryPath("/AGENTS.md");
var reportUnresolvedLink = (report, reason) => report("MOLDEA_INTEGRATION_LINK_UNRESOLVED", {
	entryKind: "symlink",
	reason
}, reason);
var checkAgentsDocument = async (context, report, load, entryDetails) => {
	const { ledger, reader, signal } = context;
	let document;
	try {
		document = await readRetainedText(ledger, load);
	} catch (error) {
		const absentKind = getAbsentKind(error);
		if (absentKind === null) throw error;
		return entryDetails["entryKind"] === "symlink" ? reportUnresolvedLink(report, absentKind === "missing" ? "missing" : "not-file") : report("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: absentKind });
	}
	try {
		if (document.text === null) return report("MOLDEA_INTEGRATION_BLOCK_MISSING", {
			...entryDetails,
			reason: "invalid-utf8"
		});
		const parsed = parseIntegrationBlock(document.text);
		if (parsed.kind === "missing") return report(parsed.reason.startsWith("block-") ? "MOLDEA_INTEGRATION_BLOCK_MISSING" : "MOLDEA_INTEGRATION_SKILL_MISSING", {
			...entryDetails,
			reason: parsed.reason
		});
		const { skillPath } = parsed;
		for (const file of ["SKILL.md", "scripts/relevance-gate.mjs"]) {
			const path = parseRepositoryPath(`/${skillPath}/${file}`);
			const skillEntry = await reader.getEntry(path, signal === void 0 ? void 0 : { signal });
			if (skillEntry?.type !== "file") return report("MOLDEA_INTEGRATION_SKILL_MISSING", {
				referencedPath: `/${skillPath}`,
				missingFile: path,
				entryKind: skillEntry?.type ?? "missing"
			});
		}
		const assetPath = parseRepositoryPath(`/${skillPath}/assets/managed-agents-block.md`);
		let asset;
		try {
			asset = await readRetainedText(ledger, () => ledger.readSourceFile(assetPath));
		} catch (error) {
			const entryKind = getAbsentKind(error);
			if (entryKind !== null) return report("MOLDEA_INTEGRATION_SKILL_MISSING", {
				referencedPath: `/${skillPath}`,
				missingFile: assetPath,
				entryKind
			});
			throw error;
		}
		try {
			if (asset.text === null) return report("MOLDEA_INTEGRATION_BLOCK_STALE", {
				referencedPath: `/${skillPath}`,
				reason: "invalid-utf8-asset"
			});
			const region = parseManagedIntegrationRegion(document.text);
			let occurrences = 0;
			let offset = 0;
			while ((offset = asset.text.indexOf("{{skill-path}}", offset)) !== -1) {
				occurrences++;
				offset += 14;
			}
			const renderedReservation = (asset.text.length + occurrences * skillPath.length) * 8;
			ledger.reserve(renderedReservation);
			try {
				const expected = normalizeManagedIntegrationBlock(asset.text.replaceAll("{{skill-path}}", skillPath).replace(/\r\n?/gu, "\n"));
				if (normalizeManagedIntegrationBlock(document.text.slice(region.start, region.end)) !== expected) return report("MOLDEA_INTEGRATION_BLOCK_STALE", { referencedPath: `/${skillPath}` });
			} finally {
				ledger.release(renderedReservation);
			}
		} finally {
			asset.release();
		}
	} finally {
		document.release();
	}
};
var inspectAgentsIntegration = async (context) => {
	const { instructions } = context;
	const report = (code, details, qualifier) => context.report(code, AGENTS_PATH$1, details, qualifier);
	const entry = await instructions.getEntry(AGENTS_PATH$1);
	if (entry === null) {
		report("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: "missing" });
		return { kind: "missing" };
	}
	if (entry.type === "directory") {
		report("MOLDEA_INTEGRATION_BLOCK_MISSING", { entryKind: "directory" });
		return { kind: "directory" };
	}
	if (entry.type === "file") {
		await checkAgentsDocument(context, report, () => instructions.readSourceFile(AGENTS_PATH$1), { entryKind: "file" });
		return { kind: "file" };
	}
	const resolution = await resolveRepositoryLink(instructions, AGENTS_PATH$1);
	if (resolution.state === "file") {
		const { targetPath } = resolution;
		await checkAgentsDocument(context, report, () => instructions.readSourceFile(targetPath), { entryKind: "symlink" });
	} else reportUnresolvedLink(report, resolution.state);
	return {
		kind: "link",
		resolution
	};
};
var AGENTS_PATH = parseRepositoryPath("/AGENTS.md");
var CLAUDE_PATH = parseRepositoryPath("/CLAUDE.md");
var NESTED_CLAUDE_PATH = parseRepositoryPath("/.claude/CLAUDE.md");
var LOCAL_CLAUDE_PATH = parseRepositoryPath("/CLAUDE.local.md");
var getAgentsTargetPath = (agents) => {
	if (agents.kind === "file") return AGENTS_PATH;
	return agents.kind === "link" && agents.resolution.state === "file" ? agents.resolution.targetPath : null;
};
var isLinkedToAgents = (path, resolution, agents) => {
	const agentsTargetPath = getAgentsTargetPath(agents);
	if (agents.kind === "link" && agentsTargetPath === path) return true;
	return resolution?.state === "file" && resolution.targetPath === agentsTargetPath;
};
var assessClaudeFile = async (context, path, agents) => {
	const { instructions, ledger } = context;
	const entry = await instructions.getEntry(path);
	if (entry === null) return { kind: "absent" };
	if (isLinkedToAgents(path, null, agents)) return { kind: "loads" };
	if (entry.type === "directory") return {
		entryKind: "directory",
		kind: "not-loading"
	};
	let load = () => instructions.readSourceFile(path);
	if (entry.type === "symlink") {
		const resolution = await resolveRepositoryLink(instructions, path);
		if (isLinkedToAgents(path, resolution, agents)) return { kind: "loads" };
		if (resolution.state !== "file") return {
			kind: "unresolved",
			reason: resolution.state
		};
		const { targetPath } = resolution;
		load = () => instructions.readSourceFile(targetPath);
	}
	let document;
	try {
		document = await readRetainedText(ledger, load);
	} catch (error) {
		const absentKind = getAbsentKind(error);
		if (absentKind === null) throw error;
		if (entry.type !== "symlink") return { kind: "absent" };
		return {
			kind: "unresolved",
			reason: absentKind === "missing" ? "missing" : "not-file"
		};
	}
	try {
		return document.text !== null && hasAgentsImport(document.text, path === NESTED_CLAUDE_PATH) ? { kind: "loads" } : {
			entryKind: entry.type,
			kind: "not-loading"
		};
	} finally {
		document.release();
	}
};
var inspectClaudeIntegration = async (context, agents) => {
	const counted = [];
	for (const path of [CLAUDE_PATH, NESTED_CLAUDE_PATH]) {
		const assessment = await assessClaudeFile(context, path, agents);
		if (assessment.kind === "loads") return;
		if (assessment.kind !== "absent") counted.push({
			assessment,
			path
		});
	}
	if (counted.length === 0) {
		const assessment = await assessClaudeFile(context, LOCAL_CLAUDE_PATH, agents);
		if (assessment.kind === "absent" || assessment.kind === "loads") return;
		counted.push({
			assessment,
			path: LOCAL_CLAUDE_PATH
		});
	}
	const unresolved = counted.find(({ assessment }) => assessment.kind === "unresolved");
	if (unresolved?.assessment.kind === "unresolved") {
		const { reason } = unresolved.assessment;
		context.report("MOLDEA_INTEGRATION_LINK_UNRESOLVED", unresolved.path, {
			entryKind: "symlink",
			reason
		}, reason);
		return;
	}
	const governing = counted[0];
	if (governing?.assessment.kind === "not-loading") context.report("MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING", governing.path, { entryKind: governing.assessment.entryKind });
};
var inspectCodingAgentIntegration = async (reader, instructions, limits, signal) => {
	const collector = createCoreDiagnosticCollector(limits, "validate-project");
	const context = {
		instructions,
		ledger: getRetainedMemory(reader),
		reader,
		report: (code, subject, details, qualifier) => {
			collector.add({
				code,
				path: subject,
				subject,
				qualifier: qualifier ?? null,
				entity: { integrationPath: subject },
				details
			});
		},
		...signal === void 0 ? {} : { signal }
	};
	await inspectClaudeIntegration(context, await inspectAgentsIntegration(context));
	return collector.finalize();
};
var getOwner = (owner) => {
	if (owner.kind === "context") return {
		subject: parseRepositoryPath(owner.id),
		entity: { contextPath: parseRepositoryPath(owner.id) }
	};
	if (owner.kind === "decision") return {
		subject: parseRepositoryPath(owner.id),
		entity: { decisionId: parseDecisionIdFromPath(parseRepositoryPath(owner.id)) ?? owner.id }
	};
	const agentId = owner.agentId ?? owner.id;
	return {
		subject: parseRepositoryPath(`/moldea/agents/${agentId}/instruction.md`),
		entity: {
			agentId,
			...owner.kind === "tool" || owner.kind === "skill" ? {
				capabilityId: owner.id,
				capabilityKind: owner.kind
			} : {}
		}
	};
};
var groupPatterns = (manifest) => {
	const groups = new Map();
	for (const declaration of collectManifestScopeDeclarations(manifest)) {
		if (declaration.field !== "affectedBy" || declaration.declaration.kind !== "glob") continue;
		const pattern = declaration.declaration.pattern;
		const segments = pattern.slice(1).split("/");
		const wildcard = segments.findIndex((segment) => segment.includes("*"));
		const prefix = parseRepositoryPath("/" + segments.slice(0, wildcard).join("/"));
		const group = groups.get(prefix) ?? [];
		group.push({
			declaration,
			pattern,
			segments
		});
		groups.set(prefix, group);
	}
	return groups;
};
var inspectImpactPatterns = async (reader, manifest, limits, signal) => {
	const unmatched = [];
	try {
		for (const [prefix, patterns] of groupPatterns(manifest)) {
			const pending = new Set(patterns);
			if ((await reader.getEntry(prefix, signal === void 0 ? void 0 : { signal }))?.type === "directory") for await (const candidate of reader.iterateEntries({
				prefix,
				...signal === void 0 ? {} : { signal }
			})) {
				if (candidate.type !== "file") continue;
				for (const pattern of pending) if (matchesRepositoryGlob(pattern.segments, candidate.path)) pending.delete(pattern);
				if (pending.size === 0) break;
			}
			unmatched.push(...pending);
		}
	} catch (error) {
		if (error instanceof CoreOperationException && error.code === "RESOURCE_LIMIT_EXCEEDED" || error instanceof RepositorySourceException && error.code === "RESOURCE_LIMIT_EXCEEDED") return {
			completed: false,
			diagnostics: []
		};
		throw error;
	}
	const collector = createCoreDiagnosticCollector(limits, "validate-project");
	for (const { declaration, pattern } of unmatched) {
		const { subject, entity } = getOwner(declaration.owner);
		collector.add({
			code: "MOLDEA_IMPACT_PATTERN_UNMATCHED",
			path: parseRepositoryPath("/moldea/moldea.yaml"),
			pointer: declaration.pointer,
			subject,
			qualifier: pattern,
			entity,
			details: {
				pattern,
				owner: subject
			}
		});
	}
	return {
		completed: true,
		diagnostics: collector.finalize()
	};
};
var identity = (entry) => JSON.stringify([
	entry.code,
	entry.subject,
	entry.qualifier ?? null
]);
var applyWarningAcceptances = (diagnostics, entries, completed, limits) => {
	const acceptances = new Map(entries.map((entry, index) => [identity(entry), {
		entry,
		index
	}]));
	const matched = new Set();
	const results = diagnostics.map((diagnostic) => {
		if (diagnostic.severity !== "warning" || !diagnostic.acceptable || !completed.has(diagnostic.code)) return diagnostic;
		const key = identity(diagnostic);
		const acceptance = acceptances.get(key);
		if (acceptance === void 0) return diagnostic;
		matched.add(key);
		return deepFreeze({
			...diagnostic,
			accepted: true,
			reason: acceptance.entry.reason
		});
	});
	const collector = createCoreDiagnosticCollector(limits, "validate-project");
	for (const [key, { entry, index }] of acceptances) {
		if (matched.has(key) || !completed.has(entry.code)) continue;
		const pointer = `/acceptedWarnings/${index}`;
		collector.add({
			code: "MOLDEA_ACCEPTANCE_UNMATCHED",
			path: parseRepositoryPath("/moldea/moldea.yaml"),
			pointer,
			subject: parseRepositoryPath("/moldea/moldea.yaml"),
			qualifier: pointer,
			details: {
				code: entry.code,
				subject: entry.subject,
				qualifier: entry.qualifier ?? null
			}
		});
	}
	return normalizeDiagnostics([...results, ...collector.finalize()]);
};
var addDiagnostics$2 = (collector, diagnostics) => {
	for (const diagnostic of diagnostics) collector.merge(diagnostic);
};
var addMirrorDiagnostic = (collector, code, manifestPath, mirrorPath, pointer, agentId, entry) => {
	collector.add({
		code,
		details: {
			...entry === void 0 ? {} : { actualType: entry.type },
			mirrorPath
		},
		entity: { agentId },
		path: manifestPath,
		pointer
	});
};
var inspectMirror = async (repository, manifestPath, canonicalInstruction, mirrorPath, pointer, agentId, options, collector, operationOptions, signal) => {
	const entry = await repository.getEntry(mirrorPath, operationOptions);
	if (entry === null) {
		addMirrorDiagnostic(collector, "MOLDEA_MIRROR_MISSING", manifestPath, mirrorPath, pointer, agentId);
		return null;
	}
	if (entry.type === "symlink") {
		addMirrorDiagnostic(collector, "MOLDEA_MIRROR_SYMLINK", manifestPath, mirrorPath, pointer, agentId, entry);
		return null;
	}
	if (entry.type !== "file") {
		addMirrorDiagnostic(collector, "MOLDEA_MIRROR_NOT_FILE", manifestPath, mirrorPath, pointer, agentId, entry);
		return null;
	}
	const mirrorResult = await readRepositoryTextAsset(repository, mirrorPath, options.limits, signal);
	addDiagnostics$2(collector, mirrorResult.diagnostics);
	if (mirrorResult.asset === null) return null;
	if (mirrorResult.asset.content !== canonicalInstruction.content) {
		addMirrorDiagnostic(collector, "MOLDEA_MIRROR_STALE", manifestPath, mirrorPath, pointer, agentId);
		return null;
	}
	return {
		byteLength: mirrorResult.asset.utf8ByteLength,
		canonicalDigest: canonicalInstruction.digest,
		digest: mirrorResult.asset.digest,
		path: mirrorPath,
		scalarLength: mirrorResult.asset.scalarLength
	};
};
var inspectMirrors = async (repository, manifestPath, agents, options, signal) => {
	options = createCoreOperationOptionsSnapshot(options);
	const collector = createCoreDiagnosticCollector(options.limits, "validate-project");
	const agentMirrors = [];
	const operationOptions = signal === void 0 ? void 0 : { signal };
	for (const agent of [...agents].sort((left, right) => compareCodePoints(left.id, right.id))) {
		const mirrors = [];
		if (agent.instruction !== null) {
			const declaredMirrors = agent.declaration.mirrors ?? [];
			for (const [index, mirrorPath] of declaredMirrors.entries()) {
				const mirror = await inspectMirror(repository, manifestPath, agent.instruction, mirrorPath, `/agents/${escapeJsonPointerSegment(agent.id)}/mirrors/${index}`, agent.id, options, collector, operationOptions, signal);
				if (mirror !== null) mirrors.push(mirror);
			}
		}
		agentMirrors.push({
			id: agent.id,
			mirrors
		});
	}
	const diagnostics = collector.finalize();
	return deepFreeze({
		agentMirrors,
		diagnostics,
		valid: diagnostics.length === 0
	});
};
var addDiagnostics$1 = (collector, diagnostics) => {
	for (const diagnostic of diagnostics) collector.merge(diagnostic);
};
var readProjectFile = async (repository, path, options, signal) => {
	options = createCoreOperationOptionsSnapshot(options);
	const collector = createCoreDiagnosticCollector(options.limits, "validate-project");
	let project = null;
	if (path !== null) {
		const result = await readRepositoryTextAsset(repository, path, options.limits, signal);
		addDiagnostics$1(collector, result.diagnostics);
		if (result.asset !== null) {
			if (hasNonWhitespace(result.asset.content)) project = result.asset;
			else collector.add({
				code: "MOLDEA_PROJECT_FILE_EMPTY",
				path: result.asset.path
			});
		}
	}
	const diagnostics = collector.finalize();
	return deepFreeze({
		diagnostics,
		project,
		valid: diagnostics.length === 0
	});
};
var readProjectAssets = async (repository, manifest, discovery, options, signal, projectFile) => {
	options = createCoreOperationOptionsSnapshot(options);
	const collector = createCoreDiagnosticCollector(options.limits, "validate-project");
	const context = [];
	const inspectedProject = projectFile ?? await readProjectFile(repository, discovery.inventory.project, options, signal);
	addDiagnostics$1(collector, inspectedProject.diagnostics);
	for (const path of [...discovery.inventory.context].sort(compareCodePoints)) {
		const result = await readRepositoryTextAsset(repository, path, options.limits, signal);
		addDiagnostics$1(collector, result.diagnostics);
		if (result.asset === null) continue;
		if (!hasNonWhitespace(result.asset.content)) {
			collector.add({
				code: "MOLDEA_CONTEXT_FILE_EMPTY",
				path
			});
			continue;
		}
		context.push({
			asset: result.asset,
			relationships: manifest?.context?.[path] ?? null
		});
	}
	const diagnostics = collector.finalize();
	return deepFreeze({
		context,
		diagnostics,
		project: inspectedProject.project,
		valid: diagnostics.length === 0
	});
};
var createIndexedDecisions = (decisions, manifest) => {
	return [...decisions].sort((left, right) => compareCodePoints(left.id, right.id) || compareCodePoints(left.path, right.path)).map((decision) => ({
		decision,
		relationships: manifest.value.decisions?.[decision.path] ?? null
	}));
};
var createIndexedAgents = (agents, agentMirrors) => {
	const mirrorsByAgent = new Map(agentMirrors.map((entry) => [entry.id, entry.mirrors]));
	const indexedAgents = [];
	if (mirrorsByAgent.size !== agents.length) return null;
	for (const agent of [...agents].sort((left, right) => compareCodePoints(left.id, right.id))) {
		const mirrors = mirrorsByAgent.get(agent.id);
		if (agent.description === null || agent.instruction === null || mirrors === void 0) return null;
		indexedAgents.push({
			context: [...agent.declaration.context ?? []].sort(compareCodePoints),
			decisions: [...agent.declaration.decisions ?? []].sort(compareCodePoints),
			declaration: agent.declaration,
			description: agent.description,
			id: agent.id,
			instruction: agent.instruction,
			mirrors: [...mirrors].sort((left, right) => compareCodePoints(left.path, right.path))
		});
	}
	return indexedAgents;
};
var createProjectIndex = (input) => {
	const agents = createIndexedAgents(input.agents, input.agentMirrors);
	if (agents === null) return null;
	return deepFreeze({
		agents,
		context: [...input.context].sort((left, right) => compareCodePoints(left.asset.path, right.asset.path)),
		decisions: createIndexedDecisions(input.decisions, input.manifest),
		formatVersion: 1,
		manifest: input.manifest,
		project: input.project
	});
};
var isSupportedExportSource = (path) => !/\.d\.(?:ts|tsx|mts|cts)$/.test(path) && /\.(?:ts|tsx|mts|cts|js|mjs|jsx)$/.test(path);
var readExportInventory = async (reader, path, byteLength, maxFileBytes) => {
	if (!isSupportedExportSource(path)) return {
		kind: "not-checked",
		reason: "unsupported-file-type"
	};
	const ledger = getRetainedMemory(reader);
	const reservation = 65536 + byteLength * 520;
	const readHeadroom = Math.max(1, byteLength + Math.min(65536, byteLength));
	if (byteLength > maxFileBytes || !ledger.tryReserve(reservation + readHeadroom)) return {
		kind: "not-checked",
		reason: "resource-limit"
	};
	ledger.release(readHeadroom);
	try {
		const source = await ledger.readSourceFile(path);
		try {
			if (source.bytes.byteLength !== byteLength) throw new RepositorySourceException({
				code: "INVALID_SOURCE_DATA",
				operation: "read-file-page",
				path,
				retryable: false
			});
			const { inventoryExports } = await import("./chunk-fcbcf4e3.mjs");
			const result = inventoryExports(path, source.bytes);
			if (result.kind === "parsed") {
				let bytes = 64;
				for (const name of result.names) bytes += 64 + name.length * 2;
				ledger.reserve(bytes);
			}
			return result;
		} finally {
			source.release();
		}
	} finally {
		ledger.release(reservation);
	}
};
var childPointer = (pointer, segment) => {
	return `${pointer}/${escapeJsonPointerSegment(segment)}`;
};
var addReferenceCandidates = (candidates, references, pointer, entity, relationship) => {
	for (const [index, reference] of (references ?? []).entries()) candidates.push({
		entity,
		kind: "reference",
		path: reference.path,
		pointer: childPointer(pointer, String(index)),
		...relationship === void 0 ? {} : { relationship },
		...reference.symbol === void 0 ? {} : { symbol: reference.symbol }
	});
};
var addImpactCandidates = (candidates, affectedBy, pointer, entity) => {
	for (const [index, pattern] of (affectedBy ?? []).entries()) {
		if (pattern.includes("*")) continue;
		candidates.push({
			entity,
			kind: "impact",
			path: parseRepositoryPath(pattern),
			pointer: childPointer(pointer, String(index))
		});
	}
};
var addRelationshipCandidates = (candidates, relationship, pointer, entity) => {
	addReferenceCandidates(candidates, relationship.bindings, childPointer(pointer, "bindings"), entity, pointer.startsWith("/context/") ? "context-binding" : "decision-binding");
	addImpactCandidates(candidates, relationship.affectedBy, childPointer(pointer, "affectedBy"), entity);
};
var addCapabilityCandidates = (candidates, capability, capabilityKind, capabilityId, agentId, collectionPointer, additionalReferences = []) => {
	const capabilityPointer = childPointer(collectionPointer, capabilityId);
	const capabilityEntity = {
		agentId,
		capabilityId,
		capabilityKind
	};
	candidates.push({
		entity: capabilityEntity,
		kind: `${capabilityKind}-implementation`,
		relationship: `${capabilityKind}-implementation`,
		...capability.implementation.symbol === void 0 ? {} : { symbol: capability.implementation.symbol },
		path: capability.implementation.path,
		pointer: childPointer(capabilityPointer, "implementation")
	});
	for (const [property, reference] of [["registration", capability.registration], ...additionalReferences]) if (reference !== void 0) candidates.push({
		entity: capabilityEntity,
		kind: "reference",
		path: reference.path,
		pointer: childPointer(capabilityPointer, property),
		relationship: `${capabilityKind}-${property === "inputSchema" ? "input-schema" : property === "outputSchema" ? "output-schema" : "registration"}`,
		...reference.symbol === void 0 ? {} : { symbol: reference.symbol }
	});
	addImpactCandidates(candidates, capability.affectedBy, childPointer(capabilityPointer, "affectedBy"), capabilityEntity);
};
var addAgentCandidates = (candidates, agentId, agent) => {
	const pointer = `/agents/${escapeJsonPointerSegment(agentId)}`;
	const entity = { agentId };
	const bindingsPointer = childPointer(pointer, "bindings");
	const bindings = agent.bindings;
	for (const property of [
		"runtimeAgent",
		"inputSchema",
		"outputSchema",
		"instructionLoader"
	]) {
		const reference = bindings?.[property];
		if (reference !== void 0) candidates.push({
			entity,
			kind: "reference",
			path: reference.path,
			pointer: childPointer(bindingsPointer, property),
			relationship: {
				runtimeAgent: "runtime-agent",
				inputSchema: "agent-input-schema",
				outputSchema: "agent-output-schema",
				instructionLoader: "instruction-loader"
			}[property],
			...reference.symbol === void 0 ? {} : { symbol: reference.symbol }
		});
	}
	addImpactCandidates(candidates, agent.affectedBy, childPointer(pointer, "affectedBy"), entity);
	const toolsPointer = childPointer(pointer, "tools");
	for (const capabilityId of Object.keys(agent.tools ?? {}).sort(compareCodePoints)) {
		const capability = agent.tools?.[capabilityId];
		if (capability !== void 0) addCapabilityCandidates(candidates, capability, "tool", capabilityId, agentId, toolsPointer, [["inputSchema", capability.inputSchema], ["outputSchema", capability.outputSchema]]);
	}
	const skillsPointer = childPointer(pointer, "skills");
	for (const capabilityId of Object.keys(agent.skills ?? {}).sort(compareCodePoints)) {
		const capability = agent.skills?.[capabilityId];
		if (capability !== void 0) addCapabilityCandidates(candidates, capability, "skill", capabilityId, agentId, skillsPointer);
	}
};
var collectCandidates = (manifest) => {
	const candidates = [];
	for (const property of ["context", "decisions"]) {
		const relationships = manifest[property];
		for (const referencedPath of Object.keys(relationships ?? {}).sort(compareCodePoints)) {
			const relationship = relationships?.[referencedPath];
			if (relationship === void 0) continue;
			const pointer = childPointer(`/${property}`, referencedPath);
			const decisionId = property === "decisions" ? parseDecisionIdFromPath(parseRepositoryPath(referencedPath)) : null;
			addRelationshipCandidates(candidates, relationship, pointer, decisionId === null ? { contextPath: parseRepositoryPath(referencedPath) } : { decisionId });
		}
	}
	for (const agentId of Object.keys(manifest.agents ?? {}).sort(compareCodePoints)) {
		const agent = manifest.agents?.[agentId];
		if (agent !== void 0) addAgentCandidates(candidates, agentId, agent);
	}
	return candidates.sort((left, right) => compareCodePoints(left.pointer, right.pointer));
};
var isBlockedPath = (path, blockedPaths) => {
	let candidate = path;
	while (candidate.length > 0) {
		if (blockedPaths.has(candidate)) return true;
		const separatorIndex = candidate.lastIndexOf("/");
		if (separatorIndex <= 0) return false;
		candidate = candidate.slice(0, separatorIndex);
	}
	return false;
};
var createCandidateDetails = (candidate, entry) => {
	const details = { [candidate.kind === "impact" ? "impactPath" : "referencedPath"]: candidate.path };
	if (entry !== null) details["actualType"] = entry.type;
	if (candidate.kind === "tool-implementation" || candidate.kind === "skill-implementation") details["reason"] = entry === null ? "missing" : entry.type === "symlink" ? "symlink" : "not-file";
	return details;
};
var getCandidateCode = (candidate, entry) => {
	if (entry?.type === "file") return null;
	if (candidate.kind === "tool-implementation") return "MOLDEA_TOOL_IMPLEMENTATION_MISSING";
	if (candidate.kind === "skill-implementation") return "MOLDEA_SKILL_IMPLEMENTATION_MISSING";
	if (candidate.kind === "impact") return entry === null ? "MOLDEA_IMPACT_PATH_MISSING" : "MOLDEA_IMPACT_PATH_NOT_FILE";
	if (entry === null) return "MOLDEA_REFERENCE_MISSING";
	return entry.type === "symlink" ? "MOLDEA_REFERENCE_SYMLINK" : "MOLDEA_REFERENCE_NOT_FILE";
};
var validateCandidate = (candidate, entry, manifestPath, collector) => {
	const code = getCandidateCode(candidate, entry);
	if (code === null) return;
	collector.add({
		code,
		details: createCandidateDetails(candidate, entry),
		entity: candidate.entity,
		path: manifestPath,
		pointer: candidate.pointer
	});
};
var validateRepositoryReferences = async (repository, manifestPath, manifest, discovery, limits, signal, coverage = []) => {
	const collector = createCoreDiagnosticCollector(limits, "validate-project");
	const blockedPaths = new Set(discovery.diagnostics.flatMap((diagnostic) => diagnostic.path === null ? [] : [diagnostic.path]));
	const inventories = new Map();
	const entryCache = new Map();
	const operationOptions = signal === void 0 ? void 0 : { signal };
	for (const candidate of collectCandidates(manifest)) {
		if (isBlockedPath(candidate.path, blockedPaths)) continue;
		let entryPromise = entryCache.get(candidate.path);
		if (entryPromise === void 0) {
			entryPromise = repository.getEntry(candidate.path, operationOptions);
			entryCache.set(candidate.path, entryPromise);
		}
		const entry = await entryPromise;
		validateCandidate(candidate, entry, manifestPath, collector);
		if (entry?.type !== "file" || candidate.relationship === void 0) continue;
		if (entry.byteLength === null) throw new TypeError("A repository file entry must declare its byte length.");
		if (coverage.length >= limits.maxCoverage) throw new CoreOperationException({
			code: "RESOURCE_LIMIT_EXCEEDED",
			operation: "validate-project",
			limit: "maxCoverage",
			limitMaximum: limits.maxCoverage,
			observedUsage: coverage.length + 1,
			nextAction: "reduce-input-or-increase-limit"
		});
		const base = {
			entity: candidate.entity ?? {},
			relationship: candidate.relationship,
			path: candidate.path,
			symbol: candidate.symbol ?? null,
			fileCheck: "passed"
		};
		let record;
		if (candidate.symbol === void 0) record = {
			...base,
			exportCheck: "not-checked",
			exportNotCheckedReason: "no-symbol"
		};
		else {
			let inventory = inventories.get(candidate.path);
			if (inventory === void 0) {
				inventory = await readExportInventory(repository, candidate.path, entry.byteLength, limits.maxFileBytes);
				inventories.set(candidate.path, inventory);
			}
			if (inventory.kind === "not-checked") record = {
				...base,
				exportCheck: "not-checked",
				exportNotCheckedReason: inventory.reason
			};
			else if (!inventory.complete) record = {
				...base,
				exportCheck: "not-checked",
				exportNotCheckedReason: "unresolved-exports"
			};
			else if (inventory.names.has(candidate.symbol)) record = {
				...base,
				exportCheck: "passed"
			};
			else {
				record = {
					...base,
					exportCheck: "failed"
				};
				collector.add({
					code: "MOLDEA_REFERENCE_EXPORT_MISSING",
					entity: candidate.entity,
					path: manifestPath,
					pointer: candidate.pointer,
					details: {
						referencedPath: candidate.path,
						symbol: candidate.symbol,
						relationship: candidate.relationship
					}
				});
			}
		}
		reserveRetainedBytesIfTracked(repository, 512 + JSON.stringify(record).length * 2);
		coverage.push(record);
	}
	return collector.finalize();
};
var MOLDEA_ROOT = parseRepositoryPath("/moldea");
var MANIFEST_PATH = parseRepositoryPath("/moldea/moldea.yaml");
var PROJECT_PATH = parseRepositoryPath("/moldea/project.md");
var addDiagnostics = (collector, diagnostics) => {
	for (const diagnostic of diagnostics) collector.merge(diagnostic);
};
var inspectUniversalProject = async (context, options) => {
	options = createCoreOperationOptionsSnapshot(options);
	const { session, signal } = context;
	const coverage = [];
	const collector = createCoreDiagnosticCollector(options.limits, "validate-project");
	const operationOptions = signal === void 0 ? void 0 : { signal };
	const yamlRoots = new Map();
	const memory = getRetainedMemory(session.reader);
	let retainedYamlBytes = 0;
	const retainYamlRoot = (path, root) => {
		const bytes = measureYamlRetainedBytes(root);
		memory.reserve(bytes);
		retainedYamlBytes += bytes;
		yamlRoots.set(path, root);
	};
	try {
		const moldeaRoot = await session.reader.getEntry(MOLDEA_ROOT, operationOptions);
		let manifestEntry = null;
		let projectEntry = null;
		let indexedManifest = null;
		let formatVersion = null;
		if (moldeaRoot?.type === "directory") {
			manifestEntry = await session.reader.getEntry(MANIFEST_PATH, operationOptions);
			if (manifestEntry?.type === "file") {
				const parsedManifest = await inspectManifestDocument({
					content: await session.reader.readCompleteFile(MANIFEST_PATH, operationOptions),
					path: MANIFEST_PATH
				}, options, "validate-project");
				if (parsedManifest.manifest !== null && parsedManifest.yamlRoot !== null) retainYamlRoot(MANIFEST_PATH, parsedManifest.yamlRoot);
				formatVersion = parsedManifest.formatVersion;
				addDiagnostics(collector, parsedManifest.diagnostics);
				if (parsedManifest.asset !== null && parsedManifest.manifest !== null) indexedManifest = {
					asset: parsedManifest.asset,
					value: parsedManifest.manifest
				};
			}
			projectEntry = await session.reader.getEntry(PROJECT_PATH, operationOptions);
		}
		const projectFile = await readProjectFile(session.reader, projectEntry?.type === "file" ? PROJECT_PATH : null, options, signal);
		addDiagnostics(collector, projectFile.diagnostics);
		const discovery = await discoverCanonicalAssets(session.reader, options.limits, signal, {
			manifest: manifestEntry,
			moldeaRoot,
			project: projectEntry
		});
		addDiagnostics(collector, discovery.diagnostics);
		session.throwIfAborted();
		const projectAssets = await readProjectAssets(session.reader, indexedManifest?.value ?? null, discovery, options, signal, projectFile);
		addDiagnostics(collector, projectAssets.diagnostics);
		const decisionGraph = await readDecisionGraph(session.reader, discovery.inventory.decisions, options, signal, retainYamlRoot);
		addDiagnostics(collector, decisionGraph.diagnostics);
		let agents = [];
		let agentMirrors = [];
		if (indexedManifest !== null) {
			const manifestPath = indexedManifest.asset.path;
			const agentAssets = await inspectAgentAssets(session.reader, indexedManifest.value, discovery, options, signal);
			agents = agentAssets.agents;
			addDiagnostics(collector, agentAssets.diagnostics);
			addDiagnostics(collector, validateManifestRelationships(manifestPath, indexedManifest.value, discovery, decisionGraph.decisions, options.limits));
			addDiagnostics(collector, await validateRepositoryReferences(session.reader, manifestPath, indexedManifest.value, discovery, options.limits, signal, coverage));
			const mirrorInspection = await inspectMirrors(session.reader, manifestPath, agents, options, signal);
			agentMirrors = mirrorInspection.agentMirrors;
			addDiagnostics(collector, mirrorInspection.diagnostics);
		}
		session.throwIfAborted();
		addDiagnostics(collector, await inspectCodingAgentIntegration(session.reader, session.instructions, options.limits, signal));
		const patterns = indexedManifest === null ? {
			completed: false,
			diagnostics: []
		} : await inspectImpactPatterns(session.reader, indexedManifest.value, options.limits, signal);
		session.throwIfAborted();
		addDiagnostics(collector, patterns.diagnostics);
		const diagnostics = locateDiagnosticRanges(applyWarningAcceptances(collector.finalize(), indexedManifest?.value.acceptedWarnings ?? [], new Set([...[
			"MOLDEA_INTEGRATION_BLOCK_MISSING",
			"MOLDEA_INTEGRATION_SKILL_MISSING",
			"MOLDEA_INTEGRATION_BLOCK_STALE",
			"MOLDEA_INTEGRATION_LINK_UNRESOLVED",
			"MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING"
		], ...patterns.completed ? ["MOLDEA_IMPACT_PATTERN_UNMATCHED"] : []]), options.limits), yamlRoots);
		const project = !diagnostics.some((diagnostic) => diagnostic.severity === "error") && indexedManifest !== null && projectAssets.project !== null ? createProjectIndex({
			agentMirrors,
			agents,
			context: projectAssets.context,
			decisions: decisionGraph.decisions,
			manifest: indexedManifest,
			project: projectAssets.project
		}) : null;
		return deepFreeze({
			diagnostics,
			coverage,
			formatVersion,
			project
		});
	} finally {
		yamlRoots.clear();
		memory.release(retainedYamlBytes);
	}
};
var invalidArgument$1 = () => {
	throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "validate-project"
	});
};
var isRepositoryReader = (candidate) => {
	return isObjectValid(candidate, true) && isObjectValid(candidate["snapshot"], true) && typeof candidate["snapshot"]["id"] === "string" && typeof candidate["snapshot"]["sourceKind"] === "string" && typeof candidate["compare"] === "function" && typeof candidate["getEntry"] === "function" && typeof candidate["listEntriesPage"] === "function" && typeof candidate["readFilePage"] === "function" && typeof candidate["readLinkText"] === "function";
};
var isAbortSignal = (candidate) => {
	return isObjectValid(candidate, true) && typeof candidate["aborted"] === "boolean" && typeof candidate["addEventListener"] === "function" && typeof candidate["removeEventListener"] === "function";
};
var validateInput = (candidate) => {
	try {
		if (!isObjectValid(candidate, true)) return invalidArgument$1();
		const repository = candidate["repository"];
		const instructions = candidate["instructions"];
		const signal = candidate["signal"];
		if (Reflect.ownKeys(candidate).some((key) => key !== "repository" && key !== "instructions" && key !== "signal") || !isRepositoryReader(repository) || instructions !== void 0 && !isRepositoryReader(instructions) || signal !== void 0 && !isAbortSignal(signal)) return invalidArgument$1();
		return {
			...instructions === void 0 ? {} : { instructions },
			repository,
			...signal === void 0 ? {} : { signal }
		};
	} catch (error) {
		if (error instanceof CoreOperationException) throw error;
		return invalidArgument$1();
	}
};
var validateProjectState = async (input, options) => {
	const validatedInput = validateInput(input);
	const operationOptions = createCoreOperationOptionsSnapshot(options);
	const session = createRepositoryInspectionSession(validatedInput.repository, operationOptions.limits, validatedInput.signal, validatedInput.instructions);
	const universal = await inspectUniversalProject({
		session,
		...validatedInput.signal === void 0 ? {} : { signal: validatedInput.signal }
	}, operationOptions);
	session.throwIfAborted();
	const counts = countDiagnosticsBySeverity(universal.diagnostics);
	return deepFreeze({
		project: universal.project,
		resourceUsage: session.getResourceUsage(),
		result: {
			diagnostics: universal.diagnostics,
			...counts,
			coverage: universal.coverage,
			coverageCounts: countBindingCoverage(universal.coverage),
			formatVersion: universal.formatVersion,
			source: validatedInput.repository.snapshot,
			summary: universal.project === null ? null : createProjectSummary(universal.project),
			valid: counts.errorCount === 0
		}
	});
};
var validateProject = async (input, options) => (await validateProjectState(input, options)).result;
var CURSOR_PREFIX = "core7";
var PREPARED_FIXED_BYTES = 512;
var PREPARED_ITEM_FIXED_BYTES = 64;
var PREPARED_TEXT_BYTE_MULTIPLIER = 2;
var PREPARED_VIEW_REFERENCE_BYTES = 8;
var encoder = new TextEncoder();
var invalidArgument = () => {
	throw new CoreOperationException({
		code: "INVALID_ARGUMENT",
		operation: "create-project-inspection"
	});
};
var resourceLimitExceeded = (limitMaximum, observedUsage) => {
	throw new CoreOperationException({
		code: "RESOURCE_LIMIT_EXCEEDED",
		limit: "maxRetainedBytes",
		limitMaximum,
		nextAction: "reduce-input-or-increase-limit",
		observedUsage,
		operation: "create-project-inspection"
	});
};
var serializeDeterministically = (candidate) => {
	if (candidate === null || typeof candidate !== "object") {
		const serialized = JSON.stringify(candidate);
		return serialized === void 0 ? "null" : serialized;
	}
	if (Array.isArray(candidate)) return `[${candidate.map((item) => serializeDeterministically(item)).join(",")}]`;
	return `{${Object.entries(candidate).filter(([, value]) => value !== void 0).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, value]) => `${JSON.stringify(key)}:${serializeDeterministically(value)}`).join(",")}}`;
};
var createIdentity = (parts) => createRepositoryIdentity((function* () {
	for (const part of parts) yield encoder.encode(part);
})());
var createItemBaseKey = (item) => {
	if (item.kind === "agent") return ["3", item.agent.agentId].join("\0");
	if (item.kind === "metadata") return [
		"0",
		item.metadata.path,
		item.metadata.kind,
		item.metadata.agentId ?? "",
		item.metadata.decisionId ?? "",
		item.metadata.digest
	].join(":");
	if (item.kind === "diagnostic") return [
		"1",
		item.diagnostic.source,
		item.diagnostic.code,
		item.diagnostic.path ?? "",
		createIdentity([serializeDeterministically(item.diagnostic)])
	].join(":");
	return [
		"2",
		item.coverage.path,
		item.coverage.relationship,
		item.coverage.entity.agentId ?? "",
		createIdentity([serializeDeterministically(item.coverage)])
	].join(":");
};
var createKeyedItems = (items) => {
	const sorted = Array.from(items, (item) => ({
		item,
		key: createItemBaseKey(item)
	})).sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
	let previousBaseKey = null;
	let occurrence = 0;
	for (const item of sorted) {
		const baseKey = item.key;
		occurrence = baseKey === previousBaseKey ? occurrence + 1 : 0;
		previousBaseKey = baseKey;
		item.key = `${baseKey}:${String(occurrence).padStart(10, "0")}`;
	}
	return sorted;
};
var createCursorChecksum = (inspectionDigest, lastKey, view) => createIdentity([
	CURSOR_PREFIX,
	inspectionDigest,
	lastKey,
	view
]);
var encodeCursor = (inspectionDigest, view, lastKey) => [
	CURSOR_PREFIX,
	view,
	encodeURIComponent(lastKey),
	inspectionDigest,
	createCursorChecksum(inspectionDigest, lastKey, view)
].join(":");
var decodeCursor = (cursor, inspectionDigest, view) => {
	if (cursor === void 0) return null;
	const match = /^core7:(all|diagnostics|coverage|metadata):([^:]+):(sha256:[0-9a-f]{64}):(sha256:[0-9a-f]{64})$/u.exec(cursor);
	if (match === null || match[1] !== view || match[3] !== inspectionDigest) return invalidArgument();
	let lastKey;
	try {
		lastKey = decodeURIComponent(match[2]);
	} catch {
		return invalidArgument();
	}
	if (lastKey.length === 0 || match[4] !== createCursorChecksum(inspectionDigest, lastKey, view)) return invalidArgument();
	return lastKey;
};
var createViews = (items) => deepFreeze({
	all: items,
	diagnostics: items.filter(({ item }) => item.kind === "diagnostic"),
	coverage: items.filter(({ item }) => item.kind === "coverage"),
	metadata: items.filter(({ item }) => item.kind === "metadata" || item.kind === "agent")
});
var addRetainedBytes = (current, additional, retainedBeforePreparation, maximum) => {
	const projectedUsage = retainedBeforePreparation + current + additional;
	if (!Number.isSafeInteger(additional) || additional < 0 || !Number.isSafeInteger(projectedUsage) || projectedUsage > maximum) return resourceLimitExceeded(maximum, Number.isSafeInteger(projectedUsage) ? projectedUsage : Number.MAX_SAFE_INTEGER);
	return current + additional;
};
var iterateProjectInspectionItems = function* (state) {
	if (state.project !== null) for (const metadata of iterateProjectMetadata(state.project)) yield {
		kind: "metadata",
		metadata
	};
	for (const diagnostic of state.result.diagnostics) yield {
		diagnostic,
		kind: "diagnostic"
	};
	for (const coverage of state.result.coverage) yield {
		coverage,
		kind: "coverage"
	};
	if (state.project !== null) for (const agent of iterateProjectAgentAssignments(state.project)) yield {
		agent,
		kind: "agent"
	};
};
var estimatePreparedProjectInspection = (state, baseCounts, maximum) => {
	const retainedBeforePreparation = state.resourceUsage.retainedBytes;
	let bytes = addRetainedBytes(0, PREPARED_FIXED_BYTES, retainedBeforePreparation, maximum);
	let metadataCount = 0;
	for (const item of iterateProjectInspectionItems(state)) {
		const key = `${createItemBaseKey(item)}:0000000000`;
		const encodedBytes = encoder.encode(key).byteLength + encoder.encode(serializeDeterministically(item)).byteLength;
		bytes = addRetainedBytes(bytes, PREPARED_ITEM_FIXED_BYTES + encodedBytes * PREPARED_TEXT_BYTE_MULTIPLIER + PREPARED_VIEW_REFERENCE_BYTES, retainedBeforePreparation, maximum);
		if (item.kind === "metadata") metadataCount += 1;
	}
	const counts = {
		agents: baseCounts.agents,
		context: baseCounts.context,
		decisions: baseCounts.decisions,
		diagnostics: baseCounts.diagnostics,
		errors: baseCounts.errors,
		coverage: baseCounts.coverage,
		metadata: metadataCount,
		mirrors: baseCounts.mirrors,
		warnings: baseCounts.warnings,
		acceptedWarnings: baseCounts.acceptedWarnings
	};
	bytes = addRetainedBytes(bytes, encoder.encode(serializeDeterministically({
		counts,
		formatVersion: state.result.formatVersion,
		inspectionDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
		source: state.result.source,
		summary: state.result.summary,
		valid: state.result.valid
	})).byteLength * PREPARED_TEXT_BYTE_MULTIPLIER, retainedBeforePreparation, maximum);
	return {
		counts,
		preparedBytes: bytes
	};
};
var createInspectionDigest = (counts, coverageCounts, formatVersion, items, summary, valid) => createIdentity((function* () {
	yield "core7-prepared-inspection";
	yield serializeDeterministically({
		counts,
		coverageCounts,
		formatVersion,
		summary,
		valid
	});
	for (const { key } of items) yield key;
})());
var findStartIndex = (items, lastKey) => {
	if (lastKey === null) return 0;
	let lower = 0;
	let upper = items.length - 1;
	while (lower <= upper) {
		const middle = lower + Math.floor((upper - lower) / 2);
		const candidate = items[middle];
		if (candidate === void 0) return invalidArgument();
		if (candidate.key === lastKey) return middle + 1;
		if (candidate.key < lastKey) lower = middle + 1;
		else upper = middle - 1;
	}
	return invalidArgument();
};
var createPreparedProjectInspection = (input) => {
	const { counts, coverageCounts, formatVersion, items, maxEntries, preparedBytes, resourceUsage: validationUsage, source, summary, valid } = input;
	const views = createViews(items);
	const inspectionDigest = createInspectionDigest(counts, coverageCounts, formatVersion, items, summary, valid);
	const resourceUsage = deepFreeze({
		canonicalBytes: validationUsage.canonicalBytes,
		peakRetainedBytes: Math.max(validationUsage.peakRetainedBytes, validationUsage.retainedBytes + preparedBytes),
		preparedBytes,
		retainedBytes: preparedBytes,
		totalBytesRead: validationUsage.totalBytesRead
	});
	const readPage = (pageInput) => {
		if (typeof pageInput !== "object" || pageInput === null || Reflect.ownKeys(pageInput).some((key) => key !== "cursor" && key !== "maxItems" && key !== "view") || !Number.isSafeInteger(pageInput.maxItems) || pageInput.maxItems < 1 || pageInput.maxItems > maxEntries || pageInput.cursor !== void 0 && typeof pageInput.cursor !== "string" || pageInput.view !== "all" && pageInput.view !== "diagnostics" && pageInput.view !== "coverage" && pageInput.view !== "metadata") return invalidArgument();
		const viewItems = views[pageInput.view];
		const startIndex = findStartIndex(viewItems, decodeCursor(pageInput.cursor, inspectionDigest, pageInput.view));
		const records = viewItems.slice(startIndex, startIndex + pageInput.maxItems).map(({ item, key }, index) => {
			return {
				item,
				nextCursor: startIndex + index + 1 >= viewItems.length ? null : encodeCursor(inspectionDigest, pageInput.view, key)
			};
		});
		const nextCursor = records.at(-1)?.nextCursor ?? null;
		return deepFreeze({
			counts,
			coverageCounts,
			formatVersion,
			inspectionDigest,
			page: {
				isComplete: nextCursor === null,
				nextCursor,
				records,
				totalItems: viewItems.length
			},
			source,
			summary,
			valid,
			view: pageInput.view
		});
	};
	return deepFreeze({
		counts,
		coverageCounts,
		formatVersion,
		inspectionDigest,
		readPage,
		resourceUsage,
		source,
		summary,
		valid
	});
};
var createProjectInspection = async (input, options) => {
	const state = await validateProjectState(input, options);
	const estimate = estimatePreparedProjectInspection(state, {
		agents: state.result.summary?.counts.agents ?? 0,
		context: state.result.summary?.counts.context ?? 0,
		decisions: state.result.summary?.counts.decisions ?? 0,
		diagnostics: state.result.diagnostics.length,
		errors: state.result.errorCount,
		coverage: state.result.coverage.length,
		mirrors: state.result.summary?.counts.mirrors ?? 0,
		warnings: state.result.warningCount,
		acceptedWarnings: state.result.acceptedWarningCount
	}, options.limits.maxRetainedBytes);
	const counts = deepFreeze(estimate.counts);
	const items = deepFreeze(createKeyedItems(iterateProjectInspectionItems(state)));
	return createPreparedProjectInspection({
		counts,
		coverageCounts: state.result.coverageCounts,
		formatVersion: state.result.formatVersion,
		items,
		maxEntries: options.limits.maxEntries,
		preparedBytes: estimate.preparedBytes,
		resourceUsage: state.resourceUsage,
		source: state.result.source,
		summary: state.result.summary,
		valid: state.result.valid
	});
};
var core_exports = __exportAll({ createCore: () => createCore });
var createCore = (options) => {
	const snapshot = normalizeCoreOptions(options);
	return deepFreeze({
		calculateContentDigest: (input) => {
			return calculateContentDigest(input, createCoreOperationOptionsSnapshot(snapshot).limits);
		},
		createProjectInspection: (input) => createProjectInspection(input, createCoreOperationOptionsSnapshot(snapshot)),
		validateProject: (input) => validateProject(input, createCoreOperationOptionsSnapshot(snapshot)),
		matchManifestScope: (input) => matchManifestScope(input, createCoreOperationOptionsSnapshot(snapshot)),
		normalizeText: (input) => {
			return normalizeTextDocument(input, createCoreOperationOptionsSnapshot(snapshot).limits, "normalize-text");
		},
		parseDecision: (input) => parseDecisionDocument(input, createCoreOperationOptionsSnapshot(snapshot)),
		parseManifest: (input) => parseManifestDocument(input, createCoreOperationOptionsSnapshot(snapshot)),
		readCanonicalContentPage: (input) => readCanonicalContentPage(input, createCoreOperationOptionsSnapshot(snapshot))
	});
};
//#endregion
export { parseIntegrationBlock as i, createCore as n, isSupportedExportSource as r, core_exports as t };
