import { runProcedure } from "./executor/hybrid.executor";
import { EngineRequest } from "./contract/request";
import { guardProcedure } from "./security/procedure.guard";
import { ENV } from "../config/env";
import { createExecutionContext } from "./context";
import { logger } from "./logger/logger";
import { buildError } from "./utils/response.builder";

// ===============================
// Types
// ===============================

interface ExecutionContext {
    requestId: string;
    startTime: number;
    auth?: unknown;
    token?: unknown;
}

// ===============================
// Entry Point
// ===============================

export async function run(request: EngineRequest) {

    // -------------------------------
    // STEP 1: CONTEXT INIT
    // -------------------------------
    const rawRequest = request as unknown as {
        __ctx?: ExecutionContext;
        __auth?: unknown;
        __token?: unknown;
        procedure?: unknown;
    };

    const ctx: ExecutionContext =
        rawRequest.__ctx || createExecutionContext();

    // Attach auth/token safely
    if (rawRequest.__auth) {
        ctx.auth = rawRequest.__auth;
    }

    if (rawRequest.__token) {
        ctx.token = rawRequest.__token;
    }

    try {

        // -------------------------------
        // STEP 2: PROJECT
        // -------------------------------
        const project = request.project || ENV.project;

        if (!project) {
            throw {
                type: "INVALID_REQUEST",
                message: "Project not provided",
            };
        }

        // -------------------------------
        // STEP 3: PROCEDURE (SAFE)
        // -------------------------------
        let procedure: string | undefined;

        if (typeof request.action?.procedure === "string") {
            procedure = request.action.procedure;
        } else if (typeof rawRequest.procedure === "string") {
            procedure = rawRequest.procedure;
        }

        if (!procedure) {
            throw {
                type: "INVALID_REQUEST",
                message: "Procedure name missing",
            };
        }

        // -------------------------------
        // STEP 4: REQUEST START LOG
        // -------------------------------
        logger.api({
            requestId: ctx.requestId,
            action: "API_REQUEST_START",
            message: "Incoming engine request",
            project,
            procedure,
        });

        // -------------------------------
        // STEP 5: SECURITY GUARD
        // -------------------------------
        guardProcedure(project, procedure);

        // -------------------------------
        // STEP 6: ATTACH CONTEXT
        // -------------------------------
        request.project = project;
        rawRequest.__ctx = ctx;

        // -------------------------------
        // STEP 7: EXECUTION
        // -------------------------------
        const response = await runProcedure(request);

        // -------------------------------
        // STEP 8: SUCCESS LOG
        // -------------------------------
        logger.api({
            requestId: ctx.requestId,
            action: "API_RESPONSE_SUCCESS",
            message: "Engine response sent",
            durationMs: Date.now() - ctx.startTime,
            project,
            procedure,
        });

        return response;

    } catch (err: unknown) {

        const e = err as { message?: string };

        // -------------------------------
        // STEP 9: ERROR LOG
        // -------------------------------
        logger.error({
            requestId: ctx.requestId,
            engine: "api",
            action: "API_EXECUTION_ERROR",
            message: e?.message || "Unhandled engine error",
            meta: err,
        });

        // -------------------------------
        // STEP 10: RETURN STANDARD ERROR
        // -------------------------------
        return buildError(err);
    }
}