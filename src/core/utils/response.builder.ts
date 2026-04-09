/**
 * ============================================================
 * RESPONSE BUILDER (ENGINE LEVEL)
 * ============================================================
 *
 * Purpose:
 * - Enforce EngineResponse contract globally
 * - Convert thrown errors → EngineResponse
 * - Normalize final API output
 */

import { EngineResponse } from "../contract/response";

// ===============================
// Types
// ===============================

type ErrorInput = {
    type?: string;
    message?: string;
    meta?: unknown;
};

// ===============================
// SUCCESS BUILDER
// ===============================

export function buildSuccess<T = unknown>(
    data?: T,
    message: string = "Success",
    meta?: Record<string, unknown>
): EngineResponse<T> {

    return {
        status: {
            code: 200,
            success: true,
            message,
        },
        data,
        meta,
        statusCode: 200,
        message,
    };
}

// ===============================
// ERROR BUILDER
// ===============================

export function buildError(
    err: unknown
): EngineResponse {

    const e = err as ErrorInput;

    const type = e?.type || "SERVER_ERROR";
    const message =
        e?.message || "Internal server error";

    const statusCode = resolveStatusCode(type);

    return {
        status: {
            code: statusCode,
            success: false,
            message,
        },
        error: {
            code: type,
            message,
            type: "SYSTEM",
            retryable: false,
            details: e?.meta || err,
        },
        statusCode,
        message,
    };
}

// ===============================
// STATUS CODE MAPPING
// ===============================

function resolveStatusCode(type: string): number {

    switch (type) {
        case "INVALID_REQUEST":
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

        default:
            return 500;
    }
}