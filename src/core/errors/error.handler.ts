/**
 * ============================= GLOBAL ERROR HANDLER =============================
 */

import { EngineResponse } from "../contract/response";
import { logger } from "../logger/logger";
import { buildError } from "../utils/response.builder";
import { ExecutionContext } from "../context"; // ✅ FIX

export function handleError(
    err: unknown,
    request?: unknown
): EngineResponse {

    const req = request as {
        __ctx?: ExecutionContext; // ✅ FIXED TYPE
    };

    const ctx = req?.__ctx;

    const e = err as { message?: string };

    // -------------------------------
    // LOGGING
    // -------------------------------
    logger.error({
        requestId: ctx?.requestId,
        engine: ctx?.engine, // ✅ now perfectly typed
        action: "ENGINE_ERROR_HANDLER",
        message: e?.message || "Unhandled error",
        meta: err,
    });

    // -------------------------------
    // RESPONSE
    // -------------------------------
    return buildError(err);
}