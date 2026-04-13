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
// CONTEXT (STRICT PROPAGATION)
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