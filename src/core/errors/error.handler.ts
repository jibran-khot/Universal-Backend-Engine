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
};

// ===============================
// HANDLER
// ===============================

export function handleError(
    err: unknown,
    request?: unknown
): EngineResponse {

    const req = request as RequestWithContext;
    const ctx = req?.__ctx;

    const errorObj: ErrorLike =
        typeof err === "object" && err !== null ? (err as ErrorLike) : {};

    const message =
        typeof errorObj.message === "string"
            ? errorObj.message
            : "UNHANDLED_ERROR";

    const requestId =
        ctx?.requestId && typeof ctx.requestId === "string"
            ? ctx.requestId
            : "UNKNOWN_REQUEST_ID";

    // -------------------------------
    // LOGGING (DETERMINISTIC)
    // -------------------------------
    logger.error({
        requestId,
        engine: ctx?.engine,
        action: "ENGINE_ERROR_HANDLER",
        message,
        meta: err,
    });

    // -------------------------------
    // RESPONSE
    // -------------------------------
    return buildError(err);
}