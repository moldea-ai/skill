//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/shared/constants.js
var UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR";
var REDACTED_VALUE = "[redacted]";
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/shared/utilities.js
var stringifyWithinDepth = (value) => {
	const levels = new WeakMap();
	const limitDepth = function(_key, member) {
		if (typeof member === "object" && member !== null) {
			const level = (levels.get(this) ?? 0) + 1;
			if (level > 256) throw new RangeError("The value is nested too deeply to serialize.");
			levels.set(member, level);
		}
		return member;
	};
	return JSON.stringify(value, limitDepth);
};
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/error-handler/utilities.js
var collectSensitiveRanges = (message, sensitiveValues) => {
	const sensitiveRanges = [];
	sensitiveValues.forEach((sensitiveValue) => {
		let matchStart = message.indexOf(sensitiveValue);
		while (matchStart !== -1) {
			sensitiveRanges.push({
				start: matchStart,
				end: matchStart + sensitiveValue.length
			});
			matchStart = message.indexOf(sensitiveValue, matchStart + 1);
		}
	});
	return sensitiveRanges;
};
var mergeOverlappingRanges = (sensitiveRanges) => {
	const sortedSensitiveRanges = [...sensitiveRanges].sort((firstRange, secondRange) => firstRange.start - secondRange.start || secondRange.end - firstRange.end);
	const mergedSensitiveRanges = [];
	sortedSensitiveRanges.forEach((currentRange) => {
		const previousRange = mergedSensitiveRanges.at(-1);
		if (!previousRange || currentRange.start >= previousRange.end) {
			mergedSensitiveRanges.push({ ...currentRange });
			return;
		}
		if (currentRange.end > previousRange.end) previousRange.end = currentRange.end;
	});
	return mergedSensitiveRanges;
};
var redactSensitiveValues = (message, sensitiveValues) => {
	const uniqueSensitiveValues = [...new Set(sensitiveValues.filter((sensitiveValue) => sensitiveValue.length > 0))];
	if (!uniqueSensitiveValues.length) return message;
	const sensitiveRanges = mergeOverlappingRanges(collectSensitiveRanges(message, uniqueSensitiveValues));
	if (!sensitiveRanges.length) return message;
	const redactedMessageParts = [];
	let nextMessageIndex = 0;
	sensitiveRanges.forEach((sensitiveRange) => {
		redactedMessageParts.push(message.slice(nextMessageIndex, sensitiveRange.start), REDACTED_VALUE);
		nextMessageIndex = sensitiveRange.end;
	});
	redactedMessageParts.push(message.slice(nextMessageIndex));
	return redactedMessageParts.join("");
};
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/error-handler/index.js
var getErrorCode = (error) => {
	if (typeof error !== "object" || error === null) return null;
	const { code } = error;
	return typeof code === "string" && code.length > 0 ? code : null;
};
var hasErrorCode = (error, code) => code.length > 0 && (typeof error === "string" ? error : getErrorCode(error)) === code;
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/exception/constants.js
var EXCEPTION_BRAND = Symbol.for("jg-exception.Exception");
var EXCEPTION_SEVERITIES = ["expected", "critical"];
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/exception/redaction.js
var BUILT_PROPERTIES = new Set([
	"name",
	"message",
	"stack",
	"cause"
]);
var VERBATIM_EXCEPTION_PROPERTIES = new Set(["severity", "shouldLog"]);
var MAX_PROTOTYPE_DEPTH = 32;
var ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;
var findDescriptor = (target, key) => {
	let current = target;
	for (let depth = 0; current !== null && depth < MAX_PROTOTYPE_DEPTH; depth += 1) {
		const descriptor = Reflect.getOwnPropertyDescriptor(current, key);
		if (descriptor !== void 0) return descriptor;
		current = Reflect.getPrototypeOf(current);
	}
	return {};
};
var ENGINE_STACK_GETTER = Reflect.get(findDescriptor(new Error(), "stack"), "get");
var readDescriptor = (target, descriptor) => {
	if ("value" in descriptor) return descriptor.value;
	const getter = Reflect.get(descriptor, "get");
	return typeof getter === "function" && getter === ENGINE_STACK_GETTER ? Reflect.apply(getter, target, []) : void 0;
};
var readProperty = (target, key, isInherited) => {
	try {
		return readDescriptor(target, isInherited ? findDescriptor(target, key) : Reflect.getOwnPropertyDescriptor(target, key) ?? {});
	} catch {
		return;
	}
};
var readDataEntries = (target) => {
	let keys;
	try {
		keys = Reflect.ownKeys(target);
	} catch {
		return [];
	}
	return keys.flatMap((key) => {
		if (typeof key !== "string") return [];
		try {
			const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
			return descriptor?.enumerable === true && "value" in descriptor ? [[key, descriptor.value]] : [];
		} catch {
			return [];
		}
	});
};
var defineValue = (target, key, value, enumerable) => {
	Object.defineProperty(target, key, {
		value,
		enumerable,
		writable: true,
		configurable: true
	});
};
var isPrimitive = (value) => value === null || typeof value !== "object" && typeof value !== "function";
var redactPrimitive = (value, values) => {
	if (typeof value === "string") return redactSensitiveValues(value, values);
	if (value === null || value === void 0) return value;
	const text = String(value);
	const redacted = redactSensitiveValues(text, values);
	return redacted === text ? value : redacted;
};
var redactJson = (value, values, ancestors, depth) => {
	if (typeof value !== "object" || value === null) return typeof value === "function" || typeof value === "symbol" || typeof value === "bigint" ? void 0 : redactPrimitive(value, values);
	if (ancestors.has(value)) return;
	if (depth >= 256) throw new RangeError("The data is nested too deeply to copy.");
	ancestors.add(value);
	try {
		const entries = readDataEntries(value);
		if (Array.isArray(value)) {
			const copy = [];
			for (const [key, item] of entries) if (ARRAY_INDEX.test(key)) copy[Number(key)] = redactJson(item, values, ancestors, depth + 1) ?? null;
			return copy;
		}
		const copy = {};
		for (const [key, item] of entries) {
			const redacted = redactJson(item, values, ancestors, depth + 1);
			if (redacted !== void 0) defineValue(copy, key, redacted, true);
		}
		return copy;
	} finally {
		ancestors.delete(value);
	}
};
var redactData = (data, values) => {
	try {
		return redactJson(data, values, new Set(), 0);
	} catch {
		return null;
	}
};
var createSnapshot = (cause, context, depth) => {
	const { values, exceptionClass, snapshots } = context;
	const isRecognisedException = readProperty(cause, EXCEPTION_BRAND, false) === true;
	const message = readProperty(cause, "message", false);
	const snapshot = Reflect.construct(Error, [typeof message === "string" ? redactSensitiveValues(message, values) : ""], isRecognisedException ? exceptionClass : Error);
	snapshots.set(cause, snapshot);
	const name = readProperty(cause, "name", true);
	defineValue(snapshot, "name", typeof name === "string" ? redactSensitiveValues(name, values) : "Error", false);
	const stack = readProperty(cause, "stack", true);
	if (typeof stack === "string") defineValue(snapshot, "stack", redactSensitiveValues(stack, values), false);
	else Reflect.deleteProperty(snapshot, "stack");
	for (const [key, value] of readDataEntries(cause)) if (!(BUILT_PROPERTIES.has(key) || isRecognisedException && key === "data") && isPrimitive(value)) defineValue(snapshot, key, isRecognisedException && VERBATIM_EXCEPTION_PROPERTIES.has(key) ? value : redactPrimitive(value, values), true);
	if (isRecognisedException) {
		Object.defineProperty(snapshot, EXCEPTION_BRAND, { value: true });
		const data = readProperty(cause, "data", false);
		defineValue(snapshot, "data", data === void 0 ? void 0 : redactData(data, values), true);
	}
	let hasCause;
	try {
		hasCause = Reflect.getOwnPropertyDescriptor(cause, "cause") !== void 0;
	} catch {
		hasCause = false;
	}
	if (hasCause && depth < 256) defineValue(snapshot, "cause", redactCause(readProperty(cause, "cause", false), context, depth + 1), false);
	return snapshot;
};
var redactCause = (cause, context, depth) => {
	if (isPrimitive(cause)) return redactPrimitive(cause, context.values);
	if (context.snapshots.has(cause)) return context.snapshots.get(cause);
	return createSnapshot(cause, context, depth);
};
var toRedactionValues = (redact) => {
	const values = new Set();
	try {
		for (const value of Array.isArray(redact) ? redact : []) if (typeof value === "string" && value.length > 0) {
			values.add(value);
			try {
				values.add(encodeURIComponent(value));
			} catch {}
		}
	} catch {}
	return [...values];
};
var redactExceptionParts = (parts, redact, exceptionClass) => {
	const values = toRedactionValues(redact);
	if (values.length === 0) return parts;
	let message;
	try {
		message = redactSensitiveValues(new Error(parts.message).message, values);
	} catch {
		message = "";
	}
	return {
		message,
		data: parts.data === void 0 ? void 0 : redactData(parts.data, values),
		cause: redactCause(parts.cause, {
			values,
			exceptionClass,
			snapshots: new Map()
		}, 1)
	};
};
//#endregion
//#region ../../node_modules/.pnpm/jg-exception@1.7.1/node_modules/jg-exception/dist/exception/exception.js
var toSerializableData = (data) => {
	try {
		const serialized = stringifyWithinDepth(data);
		return serialized === void 0 ? null : JSON.parse(serialized);
	} catch {
		return null;
	}
};
var isExceptionSeverity = (value) => EXCEPTION_SEVERITIES.includes(value);
var Exception = class Exception extends Error {
	code;
	data;
	constructor(message, options) {
		const { code, data, cause, redact, severity, shouldLog } = options ?? { code: "" };
		const parts = redactExceptionParts({
			message,
			data,
			cause
		}, redact, Exception);
		super(parts.message, parts.cause === void 0 ? void 0 : { cause: parts.cause });
		this.name = "Exception";
		this.code = typeof code === "string" && code.length > 0 ? code : UNKNOWN_ERROR_CODE;
		this.data = parts.data;
		if (isExceptionSeverity(severity)) this.severity = severity;
		if (shouldLog === true) this.shouldLog = true;
		Object.defineProperty(this, EXCEPTION_BRAND, { value: true });
	}
	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			data: toSerializableData(this.data)
		};
	}
	toString() {
		return `${this.name} [${this.code}]: ${this.message}`;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/shared/errors.js
var ERRORS = {
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
};
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/validations/validations.js
var isNumberValid = (value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => typeof value === "number" && value >= min && value <= max;
var isIntegerValid = (value, min, max) => isNumberValid(value, min, max) && Number.isInteger(value);
var isObjectValid = (value, allowEmpty) => value !== null && typeof value === "object" && !Array.isArray(value) && (allowEmpty || Object.keys(value).length > 0);
var isArrayValid = (value, allowEmpty) => Array.isArray(value) && (allowEmpty || value.length > 0);
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/transformers/validations.js
var canJsonBeSerialized = (value) => {
	if (!isObjectValid(value, true) && !isArrayValid(value, true)) throw new Exception(`The JSON value must be an object or an array in order to be stringified. Received: ${String(value)}`, { code: ERRORS.UNSUPPORTED_DATA_TYPE });
};
var validateJsonSerializationResult = (value, result) => {
	if (typeof result !== "string" || !result.length) throw new Exception(`Stringifying the JSON value '${String(value)}' produced an invalid result: ${String(result)}.`, { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
};
var validateByteLimit = (maxBytes) => {
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Exception("The byte limit must be a non-negative safe integer.", {
		code: ERRORS.INVALID_BYTE_LIMIT,
		data: { maxBytes: String(maxBytes) }
	});
};
//#endregion
//#region ../../node_modules/.pnpm/jg-utilities@1.7.2/node_modules/jg-utilities/dist/transformers/json.js
var formatJsonPath = (path) => path.reduce((formatted, step) => {
	if (typeof step === "number") return `${formatted}[${step}]`;
	return /^[A-Za-z_$][\w$]*$/.test(step) ? `${formatted}.${step}` : `${formatted}[${JSON.stringify(step)}]`;
}, "$");
var throwUnserializable = (path, problem) => {
	throw new Exception(`Failed to stringify the JSON value deterministically: the value at ${formatJsonPath(path)} ${problem}.`, { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
};
var toJsonInput = (value, key) => {
	const converted = typeof value === "object" && value !== null && typeof value.toJSON === "function" ? value.toJSON(key) : value;
	if (converted instanceof Number) return Number(converted);
	if (converted instanceof String || converted instanceof Boolean) return converted.valueOf();
	return converted;
};
var serializeSorted = (value, strict, ancestors, path) => {
	switch (typeof value) {
		case "string":
		case "boolean": return JSON.stringify(value);
		case "number":
			if (strict && !Number.isFinite(value)) throwUnserializable(path, `is ${String(value)}, which JSON can't hold`);
			return JSON.stringify(value);
		case "bigint": return throwUnserializable(path, "is a BigInt, which JSON can't hold");
		case "undefined":
		case "function":
		case "symbol": return strict ? throwUnserializable(path, `is ${typeof value}`) : void 0;
	}
	if (value === null) return "null";
	const container = value;
	if (ancestors.has(container)) throwUnserializable(path, "refers back to an object that contains it");
	const isArray = Array.isArray(container);
	if (strict && !isArray) {
		const prototype = Object.getPrototypeOf(container);
		if (prototype !== Object.prototype && prototype !== null) throwUnserializable(path, "is not a plain object");
		if (Object.getOwnPropertySymbols(container).length > 0) throwUnserializable(path, "has a symbol key");
	}
	ancestors.add(container);
	const parts = [];
	if (isArray) for (let index = 0; index < container.length; index += 1) {
		if (strict && !Object.hasOwn(container, index)) throwUnserializable([...path, index], "is a hole in the array");
		path.push(index);
		const item = strict ? container[index] : toJsonInput(container[index], String(index));
		parts.push(serializeSorted(item, strict, ancestors, path) ?? "null");
		path.pop();
	}
	else {
		const record = container;
		for (const key of Object.keys(record).sort()) {
			path.push(key);
			const serialized = serializeSorted(strict ? record[key] : toJsonInput(record[key], key), strict, ancestors, path);
			if (serialized !== void 0) parts.push(`${JSON.stringify(key)}:${serialized}`);
			path.pop();
		}
	}
	ancestors.delete(container);
	return isArray ? `[${parts.join(",")}]` : `{${parts.join(",")}}`;
};
var stringifyJsonDeterministically = (value, { strict = false } = {}) => {
	canJsonBeSerialized(value);
	try {
		const serialized = serializeSorted(strict ? value : toJsonInput(value, ""), strict, new Set(), []);
		validateJsonSerializationResult(value, serialized);
		return serialized;
	} catch (error) {
		if (getErrorCode(error) !== ERRORS.UNABLE_TO_SERIALIZE_JSON) throw new Exception(`Failed to stringify the JSON value deterministically '${String(value)}'.`, {
			code: ERRORS.UNABLE_TO_SERIALIZE_JSON,
			cause: error
		});
		throw error;
	}
};
var MAX_MEASURED_JSON_DEPTH = 64;
var SHORT_JSON_ESCAPES = new Set([
	8,
	9,
	10,
	12,
	13,
	34,
	92
]);
var measureJsonString = (text, maxBytes) => {
	let bytes = 2;
	for (let index = 0; index < text.length && bytes <= maxBytes; index += 1) {
		const code = text.charCodeAt(index);
		if (SHORT_JSON_ESCAPES.has(code)) bytes += 2;
		else if (code < 32) bytes += 6;
		else if (code < 128) bytes += 1;
		else if (code < 2048) bytes += 2;
		else if (code >= 55296 && code <= 56319 && (text.charCodeAt(index + 1) & 64512) === 56320) {
			bytes += 4;
			index += 1;
		} else bytes += code >= 55296 && code <= 57343 ? 6 : 3;
	}
	return bytes;
};
var measureJsonValue = (value, maxBytes, ancestors, depth) => {
	if (depth > MAX_MEASURED_JSON_DEPTH) throw new Exception(`The value is nested more than ${MAX_MEASURED_JSON_DEPTH} levels deep.`, { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
	switch (typeof value) {
		case "string": return measureJsonString(value, maxBytes);
		case "number": return Number.isFinite(value) ? String(value).length : 4;
		case "boolean": return value ? 4 : 5;
		case "bigint": throw new Exception("The value holds a BigInt, which JSON can't hold.", { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
		case "undefined":
		case "function":
		case "symbol": return;
	}
	if (value === null) return 4;
	const container = value;
	if (ancestors.has(container)) throw new Exception("The value refers back to an object that contains it.", { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
	ancestors.add(container);
	let bytes = 2;
	let count = 0;
	if (Array.isArray(container)) for (let index = 0; index < container.length && bytes <= maxBytes; index += 1) {
		const item = toJsonInput(container[index], String(index));
		bytes += (count === 0 ? 0 : 1) + (measureJsonValue(item, maxBytes, ancestors, depth + 1) ?? 4);
		count += 1;
	}
	else {
		const record = container;
		for (const key of Object.keys(record)) {
			if (bytes > maxBytes) break;
			const item = measureJsonValue(toJsonInput(record[key], key), maxBytes, ancestors, depth + 1);
			if (item !== void 0) {
				bytes += (count === 0 ? 0 : 1) + measureJsonString(key, maxBytes) + 1 + item;
				count += 1;
			}
		}
	}
	ancestors.delete(container);
	return bytes;
};
var measureJsonBytes = (value, maxBytes) => {
	validateByteLimit(maxBytes);
	let bytes;
	try {
		bytes = measureJsonValue(toJsonInput(value, ""), maxBytes, new Set(), 0);
	} catch (error) {
		if (getErrorCode(error) === ERRORS.UNABLE_TO_SERIALIZE_JSON) throw error;
		throw new Exception("Failed to measure the JSON value.", {
			code: ERRORS.UNABLE_TO_SERIALIZE_JSON,
			cause: error
		});
	}
	if (bytes === void 0) throw new Exception(`JSON.stringify writes nothing for ${typeof value} values.`, { code: ERRORS.UNABLE_TO_SERIALIZE_JSON });
	return bytes;
};
//#endregion
//#region ../core/dist/chunks/exceptions-AT654xUL.js
var CORE_OPERATIONS = [
	"create-core",
	"normalize-text",
	"calculate-content-digest",
	"parse-manifest",
	"match-manifest-scope",
	"parse-decision",
	"create-project-inspection",
	"read-canonical-content-page",
	"validate-project"
];
var CONFIGURATION_ERROR_MESSAGES = { INVALID_RESOURCE_LIMIT: "A Core resource limit is invalid." };
var OPERATION_ERROR_MESSAGES = {
	ABORTED: "The Core operation was aborted.",
	CONTENT_INVALID: "The canonical content is not valid UTF-8 text.",
	INVALID_ARGUMENT: "The Core operation received an invalid argument.",
	INSPECTION_BUSY: "Project inspection capacity is busy. Try again shortly.",
	INSPECTION_TIMEOUT: "The isolated project inspection timed out.",
	INSPECTION_PROCESS_FAILED: "The isolated project inspection failed.",
	RESOURCE_LIMIT_EXCEEDED: "A Core resource limit was exceeded."
};
var OPERATION_ERROR_RETRYABILITY = {
	ABORTED: true,
	CONTENT_INVALID: false,
	INVALID_ARGUMENT: false,
	INSPECTION_BUSY: true,
	INSPECTION_TIMEOUT: true,
	INSPECTION_PROCESS_FAILED: false,
	RESOURCE_LIMIT_EXCEEDED: false
};
var isCoreOperation = (input) => CORE_OPERATIONS.some((operation) => operation === input);
var isCoreConfigurationErrorCode = (input) => typeof input === "string" && Object.hasOwn(CONFIGURATION_ERROR_MESSAGES, input);
var isCoreOperationErrorCode = (input) => typeof input === "string" && Object.hasOwn(OPERATION_ERROR_MESSAGES, input);
var CoreConfigurationException = class extends Exception {
	code;
	operation;
	constructor(options) {
		super(CONFIGURATION_ERROR_MESSAGES[options.code], {
			code: options.code,
			cause: options.cause
		});
		this.code = options.code;
		this.name = "CoreConfigurationException";
		this.operation = options.operation;
	}
};
var CoreOperationException = class extends Exception {
	code;
	operation;
	retryable;
	limit;
	limitMaximum;
	nextAction;
	observedUsage;
	constructor(options) {
		super(OPERATION_ERROR_MESSAGES[options.code], {
			code: options.code,
			cause: options.cause
		});
		this.code = options.code;
		this.name = "CoreOperationException";
		this.operation = options.operation;
		this.retryable = OPERATION_ERROR_RETRYABILITY[options.code];
		this.limit = options.limit ?? null;
		this.limitMaximum = options.limitMaximum ?? null;
		this.nextAction = options.nextAction ?? null;
		this.observedUsage = options.observedUsage ?? null;
	}
};
//#endregion
export { isCoreOperationErrorCode as a, validateByteLimit as c, ERRORS as d, Exception as f, isCoreOperation as i, isIntegerValid as l, hasErrorCode as m, CoreOperationException as n, measureJsonBytes as o, getErrorCode as p, isCoreConfigurationErrorCode as r, stringifyJsonDeterministically as s, CoreConfigurationException as t, isObjectValid as u };
