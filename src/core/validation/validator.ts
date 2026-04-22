import { EngineRequest } from "../contract/request";

type UnknownRecord = Record<string, unknown>;

// ===============================
// TYPE GUARDS
// ===============================

function isPlainObject(value: unknown): value is UnknownRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

// ===============================
// ASSERTIONS (FAIL FAST)
// ===============================

function assertPlainObject(value: unknown, code: string): UnknownRecord {
    if (!isPlainObject(value)) {
        throw new Error(code);
    }
    return value;
}

function assertOptionalObject(
    value: unknown,
    code: string
): UnknownRecord | undefined {
    if (value === undefined) return undefined;

    if (!isPlainObject(value)) {
        throw new Error(code);
    }

    return value;
}

function assertString(value: unknown, code: string): string {
    if (typeof value !== "string") {
        throw new Error(code);
    }

    const normalized = value.trim();

    if (normalized.length === 0) {
        throw new Error(code);
    }

    return normalized;
}

// ===============================
// SANITIZER (SHALLOW IMMUTABLE COPY)
// ===============================

function sanitizeObject(obj: UnknownRecord): UnknownRecord {
    const clean: UnknownRecord = {};

    for (const key of Object.keys(obj)) {
        const value = obj[key];

        // prevent prototype pollution
        if (key === "__proto__" || key === "constructor") continue;

        clean[key] = value;
    }

    return Object.freeze(clean);
}

// ===============================
// VALIDATOR
// ===============================

export function validateRequest(body: unknown): EngineRequest {
    const root = assertPlainObject(body, "INVALID_REQUEST");

    const actionRaw = assertPlainObject(
        root.action,
        "INVALID_ACTION"
    );

    const procedure = assertString(
        actionRaw.procedure,
        "INVALID_PROCEDURE"
    );

    const params = assertOptionalObject(
        actionRaw.params,
        "INVALID_PARAMS"
    );

    const form = assertOptionalObject(
        actionRaw.form,
        "INVALID_FORM"
    );

    const auth = assertOptionalObject(
        root.auth,
        "INVALID_AUTH"
    );

    const meta = assertOptionalObject(
        root.meta,
        "INVALID_META"
    );

    const project =
        root.project !== undefined
            ? assertString(root.project, "INVALID_PROJECT")
            : undefined;

    const request: EngineRequest = Object.freeze({
        action: Object.freeze({
            procedure,
            params: params ? sanitizeObject(params) : undefined,
            form: form ? sanitizeObject(form) : undefined,
        }),
        auth: auth ? sanitizeObject(auth) : undefined,
        meta: meta ? sanitizeObject(meta) : undefined,
        project,
    });

    return request;
}