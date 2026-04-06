import { runProcedure } from "./executor/hybrid.executor";
import { EngineRequest } from "./contract/request";
import { guardProcedure } from "./security/procedure.guard";
import { ENV } from "../config/env";
import { createExecutionContext } from "./context";
import { logger } from "./logger/logger";

/**
 * ============================================================
 * ENGINE ENTRY POINT
 * ============================================================
 *
 * This function is the central orchestrator of the backend engine.
 *
 * Execution Flow:
 * 1. Attach execution context (requestId, timing, auth)
 * 2. Validate and resolve project + procedure
 * 3. Run security guard (prevent unauthorized procedure access)
 * 4. Forward request to executor pipeline (SQL / Supabase)
 * 5. Log full lifecycle (start → success / error)
 *
 * NOTE:
 * - This function should NOT contain business logic
 * - It only coordinates the pipeline
 * - All heavy logic lives in SQL or executor layer
 */
export async function run(request: EngineRequest) {
    /**
     * ============================================================
     * STEP 1: CONTEXT INITIALIZATION
     * ============================================================
     *
     * Use context passed from Express layer (app.ts → routes.ts)
     * This ensures full request tracing across system.
     *
     * Fallback to new context only if missing (safety)
     */
    const existingCtx = (request as any).__context;
    const ctx = existingCtx || createExecutionContext();

    /**
     * ============================================================
     * STEP 2: AUTH CONTEXT INJECTION
     * ============================================================
     *
     * Auth middleware attaches:
     * - __auth → decoded user/session data
     * - __token → raw JWT token
     *
     * We move these into execution context for global availability
     */
    const auth = (request as any).__auth;
    const token = (request as any).__token;

    if (auth) {
        (ctx as any).auth = auth;
    }

    if (token) {
        (ctx as any).token = token;
    }

    try {
        /**
         * ============================================================
         * STEP 3: PROJECT RESOLUTION
         * ============================================================
         *
         * Priority:
         * 1. Request-level project (multi-tenant support)
         * 2. ENV default project
         */
        const project = request.project || ENV.project;

        /**
         * ============================================================
         * STEP 4: PROCEDURE RESOLUTION
         * ============================================================
         *
         * Supports both:
         * - Standard contract: request.action.procedure
         * - Fallback: request.procedure (legacy support)
         */
        const procedure =
            request.action?.procedure ||
            (request as any)?.procedure;

        /**
         * Defensive validation (VERY IMPORTANT)
         */
        if (!procedure || typeof procedure !== "string") {
            throw new Error("INVALID_REQUEST: Procedure name missing");
        }

        /**
         * ============================================================
         * STEP 5: REQUEST START LOG
         * ============================================================
         *
         * Logs incoming request for tracing and debugging
         */
        logger.api({
            requestId: ctx.requestId,
            action: "API_REQUEST_START",
            message: "Incoming engine request",
            project,
            procedure,
        });

        /**
         * ============================================================
         * STEP 6: SECURITY GUARD
         * ============================================================
         *
         * Validates whether:
         * - Procedure exists
         * - Procedure is allowed for this project
         *
         * This prevents:
         * - Invalid procedure calls
         * - Unauthorized access
         */
        guardProcedure(project, procedure);

        /**
         * ============================================================
         * STEP 7: ATTACH NORMALIZED DATA
         * ============================================================
         *
         * - Attach resolved project into request
         * - Attach execution context for downstream layers
         */
        request.project = project;
        (request as any).__ctx = ctx;

        /**
         * ============================================================
         * STEP 8: EXECUTION PIPELINE
         * ============================================================
         *
         * Delegates execution to:
         * hybrid.executor → (SQL / Supabase)
         */
        const response = await runProcedure(request);

        /**
         * ============================================================
         * STEP 9: SUCCESS LOG
         * ============================================================
         *
         * Logs execution duration and success state
         */
        logger.api({
            requestId: ctx.requestId,
            action: "API_RESPONSE_SUCCESS",
            message: "Engine response sent",
            durationMs: Date.now() - ctx.startTime,
            project,
            procedure,
        });

        return response;
    } catch (err: any) {
        /**
         * ============================================================
         * STEP 10: ERROR LOGGING
         * ============================================================
         *
         * Centralized error logging.
         * DO NOT handle response here — let global handler do it.
         */
        logger.error({
            requestId: ctx.requestId,
            engine: "api",
            action: "API_EXECUTION_ERROR",
            message: err?.message || "Unhandled engine error",
            meta: err,
        });

        /**
         * Re-throw error so global error handler can format response
         */
        throw err;
    }
}