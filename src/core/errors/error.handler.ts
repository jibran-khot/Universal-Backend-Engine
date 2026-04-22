/**
 * ============================= GLOBAL ERROR HANDLER =============================
 */

import { EngineResponse } from "../contract/response";
import { logger } from "../logger/logger";
import { buildError } from "../utils/response.builder";
import { ExecutionContext } from "../context";

// ===============================
// TYPES
// ===============================

type RequestWithContext = {
    __ctx?: ExecutionContext;
};

type ErrorLike = {
    message?: string;
    stack?: string;
};

// ===============================
// HELPERS
// ===============================

function extractMessage(err: unknown): string {
    if (err instanceof Error && typeof err.message === "string") {
        return err.message;
    }

    if (typeof err === "object" && err !== null && "message" in err) {
        const msg = (err as ErrorLike).message;
        if (typeof msg === "string") return msg;
    }

    if (typeof err === "string") return err;

    return "UNHANDLED_ERROR";
}

function extractStack(err: unknown): string | undefined {
    if (err instanceof Error && err.stack) {
        return err.stack;
    }

    if (typeof err === "object" && err !== null && "stack" in err) {
        const stack = (err as ErrorLike).stack;
        if (typeof stack === "string") return stack;
    }

    return undefined;
}

// ===============================
// HANDLER
// ===============================

export function handleError(
    err: unknown,
    request?: unknown
): EngineResponse {
    const req = request as RequestWithContext;
    const ctx = req?.__ctx;

    const message = extractMessage(err);

    const requestId =
        ctx?.requestId && typeof ctx.requestId === "string"
            ? ctx.requestId
            : "UNKNOWN_REQUEST_ID";

    // -------------------------------
    // LOGGING (STRUCTURED + SAFE)
    // -------------------------------
    logger.error({
        requestId,
        engine: ctx?.engine,
        action: "ENGINE_ERROR_HANDLER",
        message,
        meta: {
            error: err,
            stack: extractStack(err),
        },
    });

    // -------------------------------
    // RESPONSE (STANDARDIZED)
    // -------------------------------
    return buildError(err);
}