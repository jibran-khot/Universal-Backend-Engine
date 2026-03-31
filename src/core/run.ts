import { runProcedure } from "./executor/hybrid.executor";
import { EngineRequest } from "./contract/request";
import { guardProcedure } from "./security/procedure.guard";
import { ENV } from "../config/env";
import { createExecutionContext } from "./context";
import { logger } from "./logger/logger";

/**
 * Universal engine entry point
 * Flow:
 * run → guard → resolver → executor
 */
export async function run(request: EngineRequest) {

    // Create execution context (Phase-3)
    const ctx = createExecutionContext();

    /**
     * Inject auth into execution context
     * Provided by auth.middleware via routes.ts
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

        // Resolve project
        const project = request.project || ENV.project;

        const procedure =
            request.action?.procedure ||
            (request as any)?.procedure;

        if (!procedure) {
            throw {
                type: "INVALID_REQUEST",
                message: "Procedure name missing"
            };
        }

        // API request start log
        logger.api({
            requestId: ctx.requestId,
            action: "API_REQUEST_START",
            message: "Incoming engine request",
            project,
            procedure
        });

        // Guard BEFORE SQL execution
        guardProcedure(project, procedure);

        // Attach project into request
        request.project = project;

        // Attach execution context into request
        (request as any).__ctx = ctx;

        // Execute through executor pipeline
        const response = await runProcedure(request);

        // API response log
        logger.api({
            requestId: ctx.requestId,
            action: "API_RESPONSE_SUCCESS",
            message: "Engine response sent",
            durationMs: Date.now() - ctx.startTime,
            project,
            procedure
        });

        return response;

    } catch (err: any) {

        // Central API error logging
        logger.error({
            requestId: ctx.requestId,
            engine: "api",
            action: "API_EXECUTION_ERROR",
            message: err?.message || "Unhandled engine error",
            meta: err
        });

        throw err;
    }
}
