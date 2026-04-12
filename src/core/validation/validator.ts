import { EngineRequest } from "../contract/request";

type UnknownRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is UnknownRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function assertPlainObject(value: unknown, code: string): UnknownRecord {
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

function normalizeObject(value: unknown): Readonly<UnknownRecord> {
    if (!isPlainObject(value)) {
        return Object.freeze({});
    }

    return Object.freeze({ ...value });
}

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

    const params = normalizeObject(actionRaw.params);
    const form = normalizeObject(actionRaw.form);
    const auth = normalizeObject(root.auth);
    const meta = normalizeObject(root.meta);

    const request: EngineRequest = Object.freeze({
        action: Object.freeze({
            procedure,
            params,
            form,
        }),
        auth,
        meta,
    });

    return request;
}