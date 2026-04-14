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

function assertOptionalObject(value: unknown, code: string): UnknownRecord | undefined {
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
        "INVALID_REQUEST"
    );

    const form = assertOptionalObject(
        actionRaw.form,
        "INVALID_REQUEST"
    );

    const auth = assertOptionalObject(
        root.auth,
        "INVALID_REQUEST"
    );

    const meta = assertOptionalObject(
        root.meta,
        "INVALID_REQUEST"
    );

    const project =
        root.project !== undefined
            ? assertString(root.project, "INVALID_PROJECT")
            : undefined;

    const request: EngineRequest = Object.freeze({
        action: Object.freeze({
            procedure,
            params: params ? Object.freeze({ ...params }) : undefined,
            form: form ? Object.freeze({ ...form }) : undefined,
        }),
        auth: auth ? Object.freeze({ ...auth }) : undefined,
        meta: meta ? Object.freeze({ ...meta }) : undefined,
        project,
    });

    return request;
}