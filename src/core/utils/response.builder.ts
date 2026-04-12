import { EngineResponse } from "../contract/response";

type ErrorCode =
    | "INVALID_REQUEST"
    | "INVALID_ACTION"
    | "INVALID_PROCEDURE"
    | "INVALID_PROJECT"
    | "PROCEDURE_NOT_ALLOWED"
    | "AUTH_ERROR"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "SQL_EXECUTION_FAILED"
    | "NO_ENGINE_AVAILABLE"
    | "SERVER_ERROR";

type SafeError = Readonly<{
    code: ErrorCode;
    message: string;
}>;

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeMeta(meta: unknown): Readonly<Record<string, unknown>> | undefined {
    if (!isObject(meta)) return undefined;
    return Object.freeze({ ...meta });
}

function resolveStatusCode(code: ErrorCode): number {
    switch (code) {
        case "INVALID_REQUEST":
        case "INVALID_ACTION":
        case "INVALID_PROCEDURE":
        case "INVALID_PROJECT":
            return 400;

        case "AUTH_ERROR":
            return 401;

        case "FORBIDDEN":
        case "PROCEDURE_NOT_ALLOWED":
            return 403;

        case "NOT_FOUND":
            return 404;

        case "VALIDATION_ERROR":
            return 422;

        case "SQL_EXECUTION_FAILED":
        case "NO_ENGINE_AVAILABLE":
        case "SERVER_ERROR":
        default:
            return 500;
    }
}

function normalizeError(err: unknown): SafeError {
    if (err instanceof Error) {
        return {
            code: "SERVER_ERROR",
            message: err.message || "Internal server error",
        };
    }

    if (isObject(err)) {
        const code =
            typeof err.type === "string"
                ? (err.type as ErrorCode)
                : "SERVER_ERROR";

        const message =
            typeof err.message === "string"
                ? err.message
                : "Internal server error";

        return { code, message };
    }

    return {
        code: "SERVER_ERROR",
        message: "Internal server error",
    };
}

export function buildSuccess<T = unknown>(
    data?: T,
    message: string = "Success",
    meta?: unknown
): EngineResponse<T> {
    const safeMeta = normalizeMeta(meta);

    return Object.freeze({
        status: Object.freeze({
            code: 200,
            success: true,
            message,
        }),
        data,
        meta: safeMeta,
        statusCode: 200,
        message,
    });
}

export function buildError(err: unknown): EngineResponse {
    const normalized = normalizeError(err);
    const statusCode = resolveStatusCode(normalized.code);

    return Object.freeze({
        status: Object.freeze({
            code: statusCode,
            success: false,
            message: normalized.message,
        }),
        error: Object.freeze({
            code: normalized.code,
            message: normalized.message,
            type: "SYSTEM",
            retryable: false,
        }),
        statusCode,
        message: normalized.message,
    });
}