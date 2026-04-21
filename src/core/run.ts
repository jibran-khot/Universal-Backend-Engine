import { runProcedure } from "./executor/hybrid.executor";
import { EngineRequest } from "./contract/request";
import { guardProcedure } from "./security/procedure.guard";
import { ENV } from "../config/env";
import { ExecutionContext } from "./context";
import { logger } from "./logger/logger";
import { buildError } from "./utils/response.builder";

type SafeRequest = Readonly<EngineRequest & { project: string }>;

type ExecutionInput = Readonly<{
    request: SafeRequest;
    ctx: ExecutionContext;
    procedure: string;
    project: string;
}>;

type RequestWithMeta = EngineRequest & {
    __ctx?: ExecutionContext;
    __auth?: unknown;
    __token?: unknown;
};

// ===============================
// RESOLVERS
// ===============================

function resolveProject(request: EngineRequest): string {
    const project = request.project ?? ENV.project;

    if (typeof project !== "string" || project.trim() === "") {
        throw new Error("INVALID_PROJECT");
    }

    return project;
}

function resolveProcedure(request: EngineRequest): string {
    const procedure = request.action?.procedure;

    if (typeof procedure !== "string" || procedure.trim() === "") {
        throw new Error("INVALID_PROCEDURE");
    }

    return procedure;
}

// ===============================
// CONTEXT
// ===============================

function extractContext(request: RequestWithMeta): ExecutionContext {
    const ctx = request.__ctx;

    if (
        !ctx ||
        typeof ctx.requestId !== "string" ||
        typeof ctx.startTime !== "number"
    ) {
        throw new Error("MISSING_REQUEST_CONTEXT");
    }

    return ctx;
}

// ===============================
// INPUT BUILDER
// ===============================

function buildExecutionInput(request: RequestWithMeta): ExecutionInput {
    const project = resolveProject(request);
    const procedure = resolveProcedure(request);
    const ctx = extractContext(request);

    const safeRequest: SafeRequest = Object.freeze({
        ...request,
        project,
    });

    return Object.freeze({
        request: safeRequest,
        ctx,
        procedure,
        project,
    });
}

// ===============================
// RESPONSE VALIDATION (FIXED)
// ===============================

function validateSqlResponse(response: any) {

    if (!response) {
        throw new Error("ENGINE_ERROR: NO_RESPONSE");
    }

    const tables = response?.data?.tables;

    if (!tables || Object.keys(tables).length === 0) {
        throw new Error("ENGINE_ERROR: EMPTY_SQL_RESPONSE");
    }

    // ✅ FIX: find first NON-EMPTY table
    let validTable: any[] | null = null;

    for (const key of Object.keys(tables)) {
        const table = tables[key];

        if (Array.isArray(table) && table.length > 0) {
            validTable = table;
            break;
        }
    }

    if (!validTable) {
        throw new Error("ENGINE_ERROR: NO_ROWS_RETURNED");
    }

    const firstRow = validTable[0];

    if (typeof firstRow.StatusCode !== "number") {
        throw new Error("ENGINE_ERROR: INVALID_SQL_CONTRACT");
    }

    // ✅ STRICT: propagate SQL error
    if (firstRow.StatusCode >= 400) {
        throw new Error(firstRow.Message || "SQL_ERROR");
    }
}

// ===============================
// RUN
// ===============================

export async function run(request: EngineRequest) {
    let input: ExecutionInput | null = null;

    try {
        input = buildExecutionInput(request as RequestWithMeta);

        logger.api({
            requestId: input.ctx.requestId,
            action: "API_REQUEST_START",
            message: "Incoming engine request",
            project: input.project,
            procedure: input.procedure,
        });

        guardProcedure({
            project: input.project,
            procedure: input.procedure,
            requestId: input.ctx.requestId,
        });

        const response = await runProcedure(input);

        // ✅ FIX APPLIED HERE
        validateSqlResponse(response);

        logger.api({
            requestId: input.ctx.requestId,
            action: "API_RESPONSE_SUCCESS",
            message: "Engine response sent",
            durationMs: Date.now() - input.ctx.startTime,
            project: input.project,
            procedure: input.procedure,
        });

        return response;

    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "UNHANDLED_ENGINE_ERROR";

        const requestId = input?.ctx.requestId ?? "UNKNOWN_REQUEST_ID";

        logger.error({
            requestId,
            engine: "api",
            action: "API_EXECUTION_ERROR",
            message,
            meta: err,
        });

        return buildError(err);
    }
}